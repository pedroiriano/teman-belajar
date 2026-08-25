package faq

import (
	"errors"
	"time"
)

type Status string

const (
	StatusDraft     Status = "draft"
	StatusInReview  Status = "in_review"
	StatusApproved  Status = "approved"
	StatusPublished Status = "published"
	StatusArchived  Status = "archived"
)

var (
	ErrValidation        = errors.New("faq validation failed")
	ErrNotFound          = errors.New("faq not found")
	ErrForbidden         = errors.New("faq operation forbidden")
	ErrConflict          = errors.New("faq version conflict")
	ErrInvalidTransition = errors.New("invalid faq transition")
	ErrCategoryInUse     = errors.New("faq category is in use")
)

type Category struct {
	ID          string    `json:"id"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	SortOrder   int       `json:"sort_order"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Item struct {
	ID                  string     `json:"id"`
	CategoryID          string     `json:"category_id"`
	CategoryName        string     `json:"category_name,omitempty"`
	CategorySlug        string     `json:"category_slug,omitempty"`
	CategoryDescription string     `json:"category_description,omitempty"`
	CategorySortOrder   int        `json:"category_sort_order,omitempty"`
	Slug                string     `json:"slug"`
	Question            string     `json:"question"`
	Answer              string     `json:"answer"`
	SortOrder           int        `json:"sort_order"`
	Status              Status     `json:"status"`
	MediaAssetID        *string    `json:"media_asset_id,omitempty"`
	MediaAlt            *string    `json:"media_alt,omitempty"`
	SEOTitle            string     `json:"seo_title"`
	MetaDescription     string     `json:"meta_description"`
	Indexable           bool       `json:"indexable"`
	Version             int64      `json:"version"`
	PublishedAt         *time.Time `json:"published_at,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

type CategoryInput struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	SortOrder   int    `json:"sort_order"`
}

type ItemInput struct {
	CategoryID      string  `json:"category_id"`
	Slug            string  `json:"slug"`
	Question        string  `json:"question"`
	Answer          string  `json:"answer"`
	SortOrder       int     `json:"sort_order"`
	MediaAssetID    *string `json:"media_asset_id"`
	MediaAlt        *string `json:"media_alt"`
	SEOTitle        string  `json:"seo_title"`
	MetaDescription string  `json:"meta_description"`
	Indexable       bool    `json:"indexable"`
	ExpectedVersion int64   `json:"expected_version"`
}

type ListFilter struct {
	Query      string
	Status     string
	CategoryID string
	Page       int
	PageSize   int
}

type Pagination struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type ItemList struct {
	Data       []Item     `json:"data"`
	Pagination Pagination `json:"pagination"`
}

type PublicCategory struct {
	Category PublicCategoryInfo `json:"category"`
	Items    []Item             `json:"items"`
}

type PublicCategoryInfo struct {
	ID          string `json:"id"`
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Description string `json:"description"`
	SortOrder   int    `json:"sort_order"`
}

type PublicResult struct {
	Data  []PublicCategory `json:"data"`
	Total int              `json:"total"`
}
