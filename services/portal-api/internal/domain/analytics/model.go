package analytics

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Event struct {
	ID        uuid.UUID       `json:"id"`
	VisitorID *uuid.UUID      `json:"visitor_id,omitempty"`
	ActorID   *uuid.UUID      `json:"actor_id,omitempty"`
	EventType string          `json:"event_type"`
	URL       string          `json:"url,omitempty"`
	Referrer  string          `json:"referrer,omitempty"`
	UserAgent string          `json:"user_agent,omitempty"`
	Metadata  json.RawMessage `json:"metadata,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
}

type PageDaily struct {
	Date           string `json:"date"` // YYYY-MM-DD
	Path           string `json:"path"`
	Views          int    `json:"views"`
	UniqueVisitors int    `json:"unique_visitors"`
}

type LearningDaily struct {
	Date           string          `json:"date"` // YYYY-MM-DD
	ActiveLearners int             `json:"active_learners"`
	LearningStarts int             `json:"learning_starts"`
	Completions    int             `json:"completions"`
	CompletionRate float64         `json:"completion_rate"`
	TopCourses     json.RawMessage `json:"top_courses,omitempty"`
}

type SSODaily struct {
	Date             string `json:"date"` // YYYY-MM-DD
	SuccessfulLogins int    `json:"successful_logins"`
	FailedLogins     int    `json:"failed_logins"`
}

type SearchDaily struct {
	Date          string `json:"date"`
	TotalSearches int    `json:"total_searches"`
	ZeroResults   int    `json:"zero_results"`
	ResultClicks  int    `json:"result_clicks"`
}

type ContentDaily struct {
	Date           string `json:"date"`
	ContentType    string `json:"content_type"`
	TargetID       string `json:"target_id"`
	Views          int    `json:"views"`
	UniqueVisitors int    `json:"unique_visitors"`
}

type EngagementStats struct {
	Bookmarks int     `json:"bookmarks"`
	Ratings   int     `json:"ratings"`
	AvgRating float64 `json:"avg_rating"`
}

type PeriodUniqueVisitors struct {
	UniqueVisitors int `json:"unique_visitors"`
}

type Repository interface {
	InsertEvent(ctx context.Context, e *Event) error
	GetPageAnalytics(ctx context.Context, since string) ([]PageDaily, error)
	GetLearningAnalytics(ctx context.Context, since string) ([]LearningDaily, error)
	GetSSOAnalytics(ctx context.Context, since string) ([]SSODaily, error)
	GetPeriodUniqueVisitors(ctx context.Context, startUTC time.Time, endUTC time.Time) (int, error)
	GetSearchAnalytics(ctx context.Context, since string) ([]SearchDaily, error)
	GetContentAnalytics(ctx context.Context, since string) ([]ContentDaily, error)
	GetEngagementStats(ctx context.Context) (EngagementStats, error)

	RollupSearchDaily(ctx context.Context, reportingDate string, startUTC time.Time, endUTC time.Time) error
	RollupContentDaily(ctx context.Context, reportingDate string, startUTC time.Time, endUTC time.Time) error

	RollupPageDaily(ctx context.Context, reportingDate string, startUTC time.Time, endUTC time.Time) error
	RollupSSODaily(ctx context.Context, reportingDate string, startUTC time.Time, endUTC time.Time) error
	UpdateLearningDaily(ctx context.Context, data LearningDaily) error
	CleanupOldEvents(ctx context.Context, cutoffUTC time.Time) error
}
