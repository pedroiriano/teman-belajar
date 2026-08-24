package search

import (
	"context"
	"time"
)

type ContentType string

const (
	ContentTypeCourse       ContentType = "course"
	ContentTypeKnowledge    ContentType = "knowledge"
	ContentTypeNews         ContentType = "news"
	ContentTypeAnnouncement ContentType = "announcement"
)

type Sort string

const (
	SortRelevance Sort = "relevance"
	SortNewest    Sort = "newest"
	SortOldest    Sort = "oldest"
)

// Query is engine-neutral. Every field is validated by the application service
// before it reaches a SearchProvider implementation.
type Query struct {
	Text        string
	ContentType ContentType
	CategoryID  string
	Tag         string
	Page        int
	PageSize    int
	Sort        Sort
}

// Hit is the Teman Belajar-owned public search DTO. It deliberately excludes
// source IDs, index generations, engine ranking data, and personal data.
type Hit struct {
	ID            string     `json:"id"`
	ContentType   string     `json:"content_type"`
	Title         string     `json:"title"`
	Snippet       string     `json:"snippet"`
	URL           string     `json:"url"`
	Category      string     `json:"category,omitempty"`
	HierarchyPath []string   `json:"hierarchy_path,omitempty"`
	Tags          []string   `json:"tags"`
	PublishedAt   *time.Time `json:"published_at,omitempty"`
}

type Result struct {
	Hits  []Hit
	Total int
}

// Provider isolates the application layer from the selected search engine.
type Provider interface {
	Search(ctx context.Context, query Query) (Result, error)
}
