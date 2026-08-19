package analytics

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Event struct {
	ID        uuid.UUID       `json:"id"`
	VisitorID uuid.UUID       `json:"visitor_id"`
	ActorID   *uuid.UUID      `json:"actor_id,omitempty"`
	EventType string          `json:"event_type"`
	URL       string          `json:"url,omitempty"`
	Referrer  string          `json:"referrer,omitempty"`
	UserAgent string          `json:"user_agent,omitempty"`
	Metadata  json.RawMessage `json:"metadata,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
}

type PageDaily struct {
	Date           time.Time `json:"date"`
	Path           string    `json:"path"`
	Views          int       `json:"views"`
	UniqueVisitors int       `json:"unique_visitors"`
}

type LearningDaily struct {
	Date           time.Time `json:"date"`
	ActiveLearners int       `json:"active_learners"`
	Completions    int       `json:"completions"`
}

type SSODaily struct {
	Date            time.Time `json:"date"`
	SuccessfulLogins int       `json:"successful_logins"`
	FailedLogins     int       `json:"failed_logins"`
}

type Repository interface {
	InsertEvent(ctx context.Context, e *Event) error
	GetPageAnalytics(ctx context.Context, since time.Time) ([]PageDaily, error)
	GetLearningAnalytics(ctx context.Context, since time.Time) ([]LearningDaily, error)
	GetSSOAnalytics(ctx context.Context, since time.Time) ([]SSODaily, error)
	
	RollupPageDaily(ctx context.Context, date time.Time) error
	RollupSSODaily(ctx context.Context, date time.Time) error
	UpdateLearningDaily(ctx context.Context, data LearningDaily) error
}

