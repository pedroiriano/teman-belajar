package searchindex

import (
	"context"
	"os"
	"testing"

	"github.com/meilisearch/meilisearch-go"

	domainsearch "teman-belajar-api/internal/domain/search"
)

func TestMeilisearchIndexIdempotencyAndStaleRemoval(t *testing.T) {
	url := os.Getenv("TEST_MEILI_URL")
	apiKey := os.Getenv("TEST_MEILI_MASTER_KEY")
	if url == "" || apiKey == "" {
		t.Skip("TEST_MEILI_URL and TEST_MEILI_MASTER_KEY are required for Search index integration")
	}

	const indexUID = "teman_belajar_task007r_test"
	ctx := context.Background()
	index := NewMeilisearchIndex(url, apiKey, indexUID)
	deleteIndex := func() {
		if _, err := index.client.GetIndexWithContext(ctx, indexUID); err != nil {
			return
		}
		task, err := index.client.DeleteIndexWithContext(ctx, indexUID)
		if err != nil {
			t.Fatalf("delete test index: %v", err)
		}
		if err := index.wait(ctx, task); err != nil {
			t.Fatalf("wait for test index deletion: %v", err)
		}
	}
	deleteIndex()
	t.Cleanup(deleteIndex)

	if err := index.Configure(ctx); err != nil {
		t.Fatal(err)
	}
	documents := []domainsearch.IndexDocument{
		{
			DocumentID: "news_74000000-0000-0000-0000-000000000001",
			SourceType: "news",
			SourceID:   "74000000-0000-0000-0000-000000000001",
			Title:      "ALPHAONEUNIQUE",
			BodyText:   "public integration document",
			URL:        "/news/search-index-idempotency",
			Generation: "generation-one",
		},
		{
			DocumentID: "news_74000000-0000-0000-0000-000000000002",
			SourceType: "news",
			SourceID:   "74000000-0000-0000-0000-000000000002",
			Title:      "BETATWOUNIQUE",
			BodyText:   "document removed by the next generation",
			URL:        "/news/search-index-stale",
			Generation: "generation-one",
		},
	}

	if err := index.ReplaceSource(ctx, "news", documents); err != nil {
		t.Fatal(err)
	}
	if err := index.ReplaceSource(ctx, "news", documents); err != nil {
		t.Fatal(err)
	}
	assertSearchTotal(t, ctx, index, "ALPHAONEUNIQUE", 1)
	assertSearchTotal(t, ctx, index, "BETATWOUNIQUE", 1)

	documents[0].Generation = "generation-two"
	if err := index.ReplaceSource(ctx, "news", documents[:1]); err != nil {
		t.Fatal(err)
	}
	assertSearchTotal(t, ctx, index, "ALPHAONEUNIQUE", 1)
	assertSearchTotal(t, ctx, index, "BETATWOUNIQUE", 0)
}

func assertSearchTotal(t *testing.T, ctx context.Context, index *MeilisearchIndex, query string, want int64) {
	t.Helper()
	response, err := index.index.GetSearch().SearchWithContext(ctx, query, &meilisearch.SearchRequest{Limit: 20})
	if err != nil {
		t.Fatalf("search %q: %v", query, err)
	}
	if response.EstimatedTotalHits != want {
		t.Fatalf("search %q total=%d want=%d", query, response.EstimatedTotalHits, want)
	}
}
