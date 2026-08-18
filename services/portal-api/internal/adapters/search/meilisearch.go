package search

import (
	"context"
	"fmt"

	"github.com/meilisearch/meilisearch-go"

	"teman-belajar-api/internal/domain/engagement"
	domainsearch "teman-belajar-api/internal/domain/search"
)

type MeilisearchClient struct {
	client meilisearch.ServiceManager
	index  string
}

func NewMeilisearchClient(url, apiKey, indexName string) *MeilisearchClient {
	return &MeilisearchClient{
		client: meilisearch.New(url, meilisearch.WithAPIKey(apiKey)),
		index:  indexName,
	}
}

func (m *MeilisearchClient) Search(ctx context.Context, query domainsearch.Query) (domainsearch.Result, error) {
	request := &meilisearch.SearchRequest{
		Limit:  int64(query.PageSize),
		Offset: int64((query.Page - 1) * query.PageSize),
		AttributesToRetrieve: []string{
			"document_id", "source_type", "title", "summary", "url", "category_name", "tags", "published_at",
		},
	}

	filters := make([]string, 0, 3)
	if query.ContentType != "" {
		filters = append(filters, fmt.Sprintf("source_type = %q", string(query.ContentType)))
	}
	if query.CategoryID != "" {
		filters = append(filters, fmt.Sprintf("category_id = %q", query.CategoryID))
	}
	if query.Tag != "" {
		filters = append(filters, fmt.Sprintf("tags = %q", query.Tag))
	}
	if len(filters) > 0 {
		request.Filter = filters
	}
	if query.Sort == domainsearch.SortNewest {
		request.Sort = []string{"published_at:desc"}
	} else if query.Sort == domainsearch.SortOldest {
		request.Sort = []string{"published_at:asc"}
	}

	response, err := m.client.Index(m.index).SearchWithContext(ctx, query.Text, request)
	if err != nil {
		return domainsearch.Result{}, fmt.Errorf("search dependency unavailable: %w", err)
	}

	hits := make([]domainsearch.Hit, 0, len(response.Hits))
	for _, raw := range response.Hits {
		var document domainsearch.IndexDocument
		if err := raw.DecodeInto(&document); err != nil {
			continue
		}
		hits = append(hits, domainsearch.Hit{
			ID: document.DocumentID, ContentType: document.SourceType, Title: document.Title,
			Snippet: document.Summary, URL: document.URL, Category: document.CategoryName,
			Tags: document.Tags, PublishedAt: document.PublishedAt,
		})
	}

	return domainsearch.Result{Hits: hits, Total: int(response.EstimatedTotalHits)}, nil
}

func (m *MeilisearchClient) Discover(ctx context.Context, query engagement.CandidateQuery) ([]engagement.Candidate, error) {
	filters := []string{fmt.Sprintf("source_type = %q", string(query.TargetType))}
	if query.CategoryID != "" {
		filters = append(filters, fmt.Sprintf("category_id = %q", query.CategoryID))
	}
	request := &meilisearch.SearchRequest{
		Limit:                int64(query.Limit),
		AttributesToRetrieve: []string{"source_type", "source_id", "published_at"},
		Filter:               filters,
	}
	if query.Newest {
		request.Sort = []string{"published_at:desc"}
	}
	response, err := m.client.Index(m.index).SearchWithContext(ctx, query.Text, request)
	if err != nil {
		return nil, fmt.Errorf("search dependency unavailable: %w", err)
	}
	candidates := make([]engagement.Candidate, 0, len(response.Hits))
	for _, raw := range response.Hits {
		var document domainsearch.IndexDocument
		if err := raw.DecodeInto(&document); err != nil || document.SourceID == "" || document.SourceType != string(query.TargetType) {
			continue
		}
		candidates = append(candidates, engagement.Candidate{
			Target:      engagement.Target{Type: engagement.TargetType(document.SourceType), ID: document.SourceID},
			PublishedAt: document.PublishedAt,
		})
	}
	return candidates, nil
}
