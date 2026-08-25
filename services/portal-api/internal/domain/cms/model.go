package cms

import (
	"errors"
	"time"

	"teman-belajar-api/internal/domain/discoverability"
)

type ContentStatus string

const (
	StatusDraft     ContentStatus = "draft"
	StatusInReview  ContentStatus = "in_review"
	StatusApproved  ContentStatus = "approved"
	StatusPublished ContentStatus = "published"
	StatusArchived  ContentStatus = "archived"
)

var (
	ErrInvalidTransition = errors.New("invalid status transition")
	ErrValidationFailed  = errors.New("validation failed")
	ErrNotFound          = errors.New("content not found")
	ErrForbidden         = errors.New("forbidden")
	ErrConflict          = errors.New("content version conflict")
	ErrContentLocked     = errors.New("content must be draft before editing")
)

type News struct {
	ID          string                    `json:"id"`
	Slug        string                    `json:"slug"`
	Title       string                    `json:"title"`
	Excerpt     string                    `json:"excerpt"`
	Body        string                    `json:"body"`
	Status      ContentStatus             `json:"status"`
	CategoryID  *string                   `json:"category_id"`
	PublishedAt *time.Time                `json:"published_at"`
	CreatedAt   time.Time                 `json:"created_at"`
	CreatedBy   *string                   `json:"created_by"`
	UpdatedAt   time.Time                 `json:"updated_at"`
	UpdatedBy   *string                   `json:"updated_by"`
	Version     int64                     `json:"version"`
	SEO         *discoverability.Metadata `json:"seo,omitempty"`
}

type Announcement struct {
	ID          string                    `json:"id"`
	Slug        string                    `json:"slug"`
	Title       string                    `json:"title"`
	Body        string                    `json:"body"`
	Status      ContentStatus             `json:"status"`
	StartAt     *time.Time                `json:"start_at"`
	EndAt       *time.Time                `json:"end_at"`
	PublishedAt *time.Time                `json:"published_at"`
	CreatedAt   time.Time                 `json:"created_at"`
	CreatedBy   *string                   `json:"created_by"`
	UpdatedAt   time.Time                 `json:"updated_at"`
	UpdatedBy   *string                   `json:"updated_by"`
	Version     int64                     `json:"version"`
	SEO         *discoverability.Metadata `json:"seo,omitempty"`
}

type Pagination struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type NewsList struct {
	Data       []News     `json:"data"`
	Pagination Pagination `json:"pagination"`
}

type AnnouncementList struct {
	Data []Announcement `json:"data"`
}

// Validation & Logic

func (n *News) Validate() error {
	if n.Title == "" || n.Slug == "" || n.Body == "" {
		return ErrValidationFailed
	}
	if len(n.Title) > 200 {
		return ErrValidationFailed
	}
	if len(n.Slug) > 220 {
		return ErrValidationFailed
	}
	return nil
}

func (a *Announcement) Validate() error {
	if a.Title == "" || a.Slug == "" || a.Body == "" {
		return ErrValidationFailed
	}
	if a.StartAt != nil && a.EndAt != nil {
		if a.EndAt.Before(*a.StartAt) {
			return ErrValidationFailed
		}
	}
	return nil
}

// CanTransitionTo checks the canonical editorial workflow:
// draft -> in_review
// in_review -> approved
// approved -> published
// published -> archived
// (We also allow draft -> archived, and back to draft from in_review for rejections)
func CanTransitionTo(current, next ContentStatus, userRoles []string) bool {
	hasRole := func(role string) bool {
		for _, r := range userRoles {
			if r == role || r == "Portal Administrator" {
				return true
			}
		}
		return false
	}

	isEditor := hasRole("Content Editor")
	isReviewer := hasRole("Reviewer")

	switch current {
	case StatusDraft:
		if next == StatusInReview && isEditor {
			return true
		}
		if next == StatusArchived && (isEditor || isReviewer) {
			return true
		}
	case StatusInReview:
		if next == StatusApproved && isReviewer {
			return true
		}
		if next == StatusDraft && isReviewer { // Rejected back to draft
			return true
		}
	case StatusApproved:
		if next == StatusPublished && isReviewer {
			return true
		}
		if next == StatusDraft && (isEditor || isReviewer) {
			return true
		}
	case StatusPublished:
		if next == StatusArchived && (isEditor || isReviewer) {
			return true
		}
	}

	return false
}
