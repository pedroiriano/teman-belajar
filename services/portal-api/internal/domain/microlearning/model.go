package microlearning

import (
	"errors"
	"time"
)

type Status string
type Format string

const (
	StatusDraft     Status = "draft"
	StatusInReview  Status = "in_review"
	StatusApproved  Status = "approved"
	StatusPublished Status = "published"
	StatusArchived  Status = "archived"
	FormatArticle   Format = "article"
	FormatVideo     Format = "video"
	FormatQuick     Format = "quick"
)

var (
	ErrValidation        = errors.New("microlearning validation failed")
	ErrNotFound          = errors.New("microlearning not found")
	ErrForbidden         = errors.New("microlearning operation forbidden")
	ErrConflict          = errors.New("microlearning version conflict")
	ErrInvalidTransition = errors.New("invalid microlearning transition")
)

type Item struct {
	ID               string        `json:"id"`
	Slug             string        `json:"slug"`
	Title            string        `json:"title"`
	Summary          string        `json:"summary"`
	Body             string        `json:"body"`
	Format           Format        `json:"format"`
	DurationMinutes  int           `json:"duration_minutes"`
	VideoURL         string        `json:"video_url,omitempty"`
	FeaturedMediaID  string        `json:"featured_media_id,omitempty"`
	FeaturedMediaURL string        `json:"featured_media_url,omitempty"`
	Status           Status        `json:"status"`
	Version          int64         `json:"version"`
	SEOTitle         string        `json:"seo_title,omitempty"`
	SEODescription   string        `json:"seo_description,omitempty"`
	Indexable        bool          `json:"indexable"`
	PublishedAt      *time.Time    `json:"published_at,omitempty"`
	CreatedAt        time.Time     `json:"created_at"`
	UpdatedAt        time.Time     `json:"updated_at"`
	Related          []RelatedItem `json:"related"`
}

type RelatedItem struct {
	ID              string `json:"id"`
	Slug            string `json:"slug"`
	Title           string `json:"title"`
	Summary         string `json:"summary"`
	Format          Format `json:"format"`
	DurationMinutes int    `json:"duration_minutes"`
}

type Input struct {
	Slug            string   `json:"slug"`
	Title           string   `json:"title"`
	Summary         string   `json:"summary"`
	Body            string   `json:"body"`
	Format          Format   `json:"format"`
	DurationMinutes int      `json:"duration_minutes"`
	VideoURL        string   `json:"video_url"`
	FeaturedMediaID string   `json:"featured_media_id"`
	RelatedIDs      []string `json:"related_ids"`
	SEOTitle        string   `json:"seo_title"`
	SEODescription  string   `json:"seo_description"`
	Indexable       bool     `json:"indexable"`
	ExpectedVersion int64    `json:"expected_version"`
}

type ListFilter struct {
	Query    string
	Format   string
	Status   string
	Page     int
	PageSize int
}
type Pagination struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}
type List struct {
	Data       []Item     `json:"data"`
	Pagination Pagination `json:"pagination"`
}

type ProgressInput struct {
	ProgressPercent float64 `json:"progress_percent"`
	PositionSeconds int     `json:"position_seconds"`
}

type Progress struct {
	ItemID           string    `json:"item_id"`
	ProgressPercent  float64   `json:"progress_percent"`
	PositionSeconds  int       `json:"position_seconds"`
	UpdatedAt        time.Time `json:"updated_at"`
	Source           string    `json:"source"`
	State            string    `json:"state"`
	FormalCompletion bool      `json:"formal_completion"`
}
