package coursereview

import (
	"errors"
	"strings"
	"time"
)

type Status string

const (
	StatusPublished Status = "published"
	StatusHidden    Status = "hidden"
	StatusFlagged   Status = "flagged"
)

var (
	ErrNotFound        = errors.New("review not found")
	ErrInvalidRating   = errors.New("rating must be between 1 and 5")
	ErrInvalidContent  = errors.New("content must be between 5 and 2000 characters")
	ErrInvalidStatus   = errors.New("invalid review status")
	ErrUnauthorized    = errors.New("unauthorized to perform review operation")
	ErrProgramNotFound = errors.New("training program not found")
)

type Review struct {
	ID             string     `json:"id"`
	ProgramID      string     `json:"program_id"`
	ProgramSlug    string     `json:"program_slug"`
	MoodleCourseID *int64     `json:"moodle_course_id,omitempty"`
	UserSubject    string     `json:"user_subject"`
	AuthorName     string     `json:"author_name"`
	Rating         int        `json:"rating"`
	Title          string     `json:"title"`
	Content        string     `json:"content"`
	Status         Status     `json:"status"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type StarDistribution struct {
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
}

type RatingSummary struct {
	AverageRating float64                  `json:"average_rating"`
	TotalReviews  int                      `json:"total_reviews"`
	Distribution  map[int]StarDistribution `json:"distribution"`
}

type ReviewInput struct {
	Rating  int    `json:"rating"`
	Title   string `json:"title"`
	Content string `json:"content"`
}

func (in *ReviewInput) Validate() error {
	if in.Rating < 1 || in.Rating > 5 {
		return ErrInvalidRating
	}
	content := strings.TrimSpace(in.Content)
	if len(content) < 5 || len(content) > 2000 {
		return ErrInvalidContent
	}
	if len(in.Title) > 200 {
		in.Title = in.Title[:200]
	}
	in.Content = content
	in.Title = strings.TrimSpace(in.Title)
	return nil
}

type ListFilter struct {
	Rating   *int
	Page     int
	PageSize int
	SortBy   string // "newest", "highest", "lowest"
}

type AdminFilter struct {
	ProgramSlug string
	Status      string
	Rating      *int
	Query       string
	Page        int
	PageSize    int
}

type Pagination struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type ListResult struct {
	Summary    RatingSummary `json:"summary"`
	Reviews    []Review      `json:"reviews"`
	Pagination Pagination    `json:"pagination"`
}

type AdminListResult struct {
	Reviews    []Review   `json:"reviews"`
	Pagination Pagination `json:"pagination"`
}
