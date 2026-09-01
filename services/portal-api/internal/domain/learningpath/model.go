package learningpath

import (
	"errors"
	"time"
)

type Status string
type ItemKind string
type SourceState string

const (
	StatusDraft       Status      = "draft"
	StatusInReview    Status      = "in_review"
	StatusApproved    Status      = "approved"
	StatusPublished   Status      = "published"
	StatusArchived    Status      = "archived"
	KindCourse        ItemKind    = "course"
	KindKnowledge     ItemKind    = "knowledge"
	KindMicrolearning ItemKind    = "microlearning"
	KindWebinar       ItemKind    = "webinar"
	SourceAvailable   SourceState = "available"
	SourceDegraded    SourceState = "degraded"
	SourceUnavailable SourceState = "unavailable"
)

var (
	ErrValidation                = errors.New("learning path validation failed")
	ErrNotFound                  = errors.New("learning path not found")
	ErrForbidden                 = errors.New("learning path operation forbidden")
	ErrConflict                  = errors.New("learning path version conflict")
	ErrInvalidTransition         = errors.New("invalid learning path transition")
	ErrOrphanSource              = errors.New("learning path source is orphaned")
	ErrUnauthorizedSource        = errors.New("learning path source is not publishable")
	ErrRequiredSourceUnavailable = errors.New("required learning path source is unavailable")
)

type Item struct {
	ID               string      `json:"id"`
	Key              string      `json:"key"`
	Kind             ItemKind    `json:"kind"`
	SourceRef        string      `json:"source_ref"`
	Label            string      `json:"label"`
	Summary          string      `json:"summary,omitempty"`
	URL              string      `json:"url,omitempty"`
	SourceState      SourceState `json:"source_state"`
	SourceCheckedAt  time.Time   `json:"source_checked_at"`
	SortOrder        int         `json:"sort_order"`
	Required         bool        `json:"required"`
	Milestone        bool        `json:"milestone"`
	PrerequisiteKeys []string    `json:"prerequisite_keys"`
}

type Version struct {
	ID          string     `json:"id"`
	Number      int        `json:"number"`
	Title       string     `json:"title"`
	Summary     string     `json:"summary"`
	Description string     `json:"description"`
	Status      Status     `json:"status"`
	PublishedAt *time.Time `json:"published_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Items       []Item     `json:"items"`
}

type Path struct {
	ID                     string     `json:"id"`
	Slug                   string     `json:"slug"`
	RowVersion             int64      `json:"row_version"`
	PublishedVersionNumber *int       `json:"published_version_number,omitempty"`
	ArchivedAt             *time.Time `json:"archived_at,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
	Version                Version    `json:"version"`
}

type ItemInput struct {
	Key              string   `json:"key"`
	Kind             ItemKind `json:"kind"`
	SourceRef        string   `json:"source_ref"`
	Label            string   `json:"label"`
	Summary          string   `json:"summary"`
	Required         bool     `json:"required"`
	Milestone        bool     `json:"milestone"`
	PrerequisiteKeys []string `json:"prerequisite_keys"`
}

type Input struct {
	Slug               string      `json:"slug"`
	Title              string      `json:"title"`
	Summary            string      `json:"summary"`
	Description        string      `json:"description"`
	Items              []ItemInput `json:"items"`
	ExpectedRowVersion int64       `json:"expected_row_version"`
}

type Filter struct {
	Query, Status  string
	Page, PageSize int
}
type Pagination struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}
type List struct {
	Data       []Path     `json:"data"`
	Pagination Pagination `json:"pagination"`
}

type ResolvedSource struct {
	Title, Summary, URL string
	State               SourceState
	CheckedAt           time.Time
}
type ItemProgress struct {
	ItemID   string  `json:"item_id"`
	Key      string  `json:"key"`
	State    string  `json:"state"`
	Progress float64 `json:"progress"`
	Locked   bool    `json:"locked"`
	Detail   string  `json:"detail,omitempty"`
}
type Progress struct {
	Path            Path              `json:"path"`
	BoundVersion    int               `json:"bound_version"`
	Items           []ItemProgress    `json:"items"`
	ProgressPercent float64           `json:"progress_percent"`
	CompletedItems  int               `json:"completed_items"`
	TotalItems      int               `json:"total_items"`
	NextStep        *Item             `json:"next_step,omitempty"`
	Provenance      map[string]string `json:"provenance"`
}

type Option struct {
	Kind      ItemKind    `json:"kind"`
	SourceRef string      `json:"source_ref"`
	Label     string      `json:"label"`
	Summary   string      `json:"summary,omitempty"`
	State     SourceState `json:"state"`
}
type Options struct {
	Data       []Option          `json:"data"`
	Provenance map[string]string `json:"provenance"`
}
