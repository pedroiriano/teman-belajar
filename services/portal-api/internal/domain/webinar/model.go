package webinar

import (
	"context"
	"errors"
	"time"
)

var (
	ErrInvalidInput        = errors.New("invalid webinar input")
	ErrNotFound            = errors.New("webinar not found")
	ErrForbidden           = errors.New("webinar access forbidden")
	ErrUnavailable         = errors.New("webinar provider unavailable")
	ErrConfigurationNeeded = errors.New("webinar provider configuration required")
	ErrCapacityFull        = errors.New("webinar capacity full")
	ErrRegistrationClosed  = errors.New("webinar registration closed")
)

type Session struct {
	ID                  int       `json:"id"`
	CourseID            int       `json:"course_id"`
	Title               string    `json:"title"`
	Summary             string    `json:"summary"`
	StartsAt            time.Time `json:"starts_at"`
	EndsAt              time.Time `json:"ends_at"`
	Timezone            string    `json:"timezone"`
	Speakers            []string  `json:"speakers"`
	Capacity            int       `json:"capacity"`
	RegisteredCount     int       `json:"registered_count"`
	RegistrationState   string    `json:"registration_state"`
	Status              string    `json:"status"`
	Registered          bool      `json:"registered"`
	CancellationAllowed bool      `json:"cancellation_allowed"`
	JoinURL             string    `json:"join_url,omitempty"`
	RecordingURL        string    `json:"recording_url,omitempty"`
	AttendanceSeconds   int       `json:"attendance_seconds"`
	AttendanceState     string    `json:"attendance_state"`
	Source              string    `json:"source"`
	SyncedAt            time.Time `json:"synced_at"`
}

type Page struct {
	Items      []Session `json:"data"`
	Page       int       `json:"page"`
	PageSize   int       `json:"page_size"`
	Total      int       `json:"total"`
	TotalPages int       `json:"total_pages"`
	SyncedAt   time.Time `json:"synced_at"`
}

type Identity struct{ Subject string }

type ProviderPort interface {
	List(ctx context.Context, identity Identity, page, pageSize int) (Page, error)
	Get(ctx context.Context, identity Identity, id int) (Session, error)
	Register(ctx context.Context, identity Identity, id int, idempotencyKey string) (Session, error)
	Cancel(ctx context.Context, identity Identity, id int, idempotencyKey string) (Session, error)
}
