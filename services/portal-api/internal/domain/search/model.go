package search

import "context"

// SearchDocument represents a unified item in the search engine.
type SearchDocument struct {
	ID          string   `json:"id"`
	Type        string   `json:"type"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	URL         string   `json:"url"`
	ImageURL    *string  `json:"image_url,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}

// SearchQuery contains parameters for a unified search request.
type SearchQuery struct {
	Query  string
	Type   string
	Limit  int
	Offset int
}

// SearchResult is the paginated response from the search engine.
type SearchResult struct {
	Hits       []SearchDocument `json:"hits"`
	TotalHits  int              `json:"total_hits"`
	Limit      int              `json:"limit"`
	Offset     int              `json:"offset"`
	Processing int              `json:"processing_time_ms"`
}

// SearchProvider defines the contract for communicating with an external search engine.
type SearchProvider interface {
	Search(ctx context.Context, query SearchQuery) (*SearchResult, error)
}
