package integration

import (
	"context"
	"database/sql"
	"time"
)

// SaveResult represents the outcome of an inbox save attempt.
type SaveResult struct {
	Saved     bool // true if a new row was inserted
	Duplicate bool // true if event_id already existed with same fingerprint
	Collision bool // true if event_id already existed with different fingerprint
}

// Repository defines the persistence interface for event inbox/outbox.
type Repository interface {
	// SaveEvent attempts to insert a new inbox event. Returns whether the event
	// was newly saved, was a benign duplicate, or was a collision.
	SaveEvent(ctx context.Context, event *InboxEvent) (*SaveResult, error)

	// ClaimPendingEvents atomically selects and claims a batch of events ready
	// for processing. Uses FOR UPDATE SKIP LOCKED for safe concurrency.
	// Also reclaims stale "processing" events older than staleThreshold.
	ClaimPendingEvents(ctx context.Context, batchSize int, staleThreshold time.Duration) ([]*InboxEvent, error)

	// MarkProcessed marks an event as processed within the given transaction.
	MarkProcessed(ctx context.Context, tx *sql.Tx, event *InboxEvent) error

	// MarkFailed increments attempts, computes next backoff, and transitions
	// to dead_letter if attempts exceed maxAttempts.
	MarkFailed(ctx context.Context, event *InboxEvent, errCategory string, maxAttempts int, backoffBase time.Duration) error

	// CreateOutboxEntry inserts an outbox record within the given transaction.
	CreateOutboxEntry(ctx context.Context, tx *sql.Tx, entry *OutboxEvent) error

	// BeginTx starts a new database transaction.
	BeginTx(ctx context.Context) (*sql.Tx, error)

	// CountByStatus returns event counts grouped by status for metrics.
	CountByStatus(ctx context.Context) (map[string]int64, error)

	// ListDeadLetter returns dead-letter events for reconciliation.
	ListDeadLetter(ctx context.Context, limit, offset int) ([]*InboxEvent, error)

	// RequeueDeadLetter resets a dead-letter event to pending for reprocessing.
	RequeueDeadLetter(ctx context.Context, eventID string) error
}
