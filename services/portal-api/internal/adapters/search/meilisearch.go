package search

import (
	"context"
	"fmt"

	"github.com/meilisearch/meilisearch-go"

	domainSearch "teman-belajar-api/internal/domain/search"
)

type MeilisearchClient struct {
	client meilisearch.ServiceManager
	index  string
}

// NewMeilisearchClient creates a new Meilisearch client
func NewMeilisearchClient(url, apiKey, indexName string) *MeilisearchClient {
	client := meilisearch.New(url, meilisearch.WithAPIKey(apiKey))

	return &MeilisearchClient{
		client: client,
		index:  indexName,
	}
}

// Search queries the Meilisearch engine and returns the unified result
func (m *MeilisearchClient) Search(ctx context.Context, query domainSearch.SearchQuery) (*domainSearch.SearchResult, error) {
	req := &meilisearch.SearchRequest{
		Limit:  int64(query.Limit),
		Offset: int64(query.Offset),
	}

	if query.Type != "" {
		req.Filter = []string{fmt.Sprintf("type = '%s'", query.Type)}
	}

	res, err := m.client.Index(m.index).Search(query.Query, req)
	if err != nil {
		return nil, fmt.Errorf("failed to search in meilisearch: %w", err)
	}

	var hits []domainSearch.SearchDocument
	for _, hit := range res.Hits {
		var doc domainSearch.SearchDocument
		if err := hit.DecodeInto(&doc); err != nil {
			// Skip decoding errors for individual hits
			continue
		}
		hits = append(hits, doc)
	}

	return &domainSearch.SearchResult{
		Hits:       hits,
		TotalHits:  int(res.EstimatedTotalHits),
		Limit:      query.Limit,
		Offset:     query.Offset,
		Processing: int(res.ProcessingTimeMs),
	}, nil
}
