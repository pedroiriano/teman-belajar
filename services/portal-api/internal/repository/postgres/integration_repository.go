package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"time"

	"teman-belajar-api/internal/domain/integration"
)

// IntegrationRepository implements integration.Repository using PostgreSQL.
type IntegrationRepository struct {
	db *sql.DB
}

// NewIntegrationRepository creates a new IntegrationRepository.
func NewIntegrationRepository(db *sql.DB) *IntegrationRepository {
	return &IntegrationRepository{db: db}
}

// SaveEvent attempts an idempotent insert. On conflict (duplicate event_id),
// it checks the fingerprint to distinguish benign duplicate from collision.
func (r *IntegrationRepository) SaveEvent(ctx context.Context, event *integration.InboxEvent) (*integration.SaveResult, error) {
	// Attempt insert; ON CONFLICT DO NOTHING returns 0 rows affected for dups.
	res, err := r.db.ExecContext(ctx, `
		INSERT INTO integration.event_inbox
			(event_id, event_type, source, subject_id, occurred_at, schema_version,
			 payload, fingerprint, status, attempts, received_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (event_id) DO NOTHING`,
		event.EventID, event.EventType, event.Source, event.SubjectID,
		event.OccurredAt, event.SchemaVersion, event.Payload,
		event.Fingerprint, event.Status, event.Attempts,
		event.ReceivedAt, event.CreatedAt, event.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rowsAffected == 1 {
		return &integration.SaveResult{Saved: true}, nil
	}

	// event_id already exists — check fingerprint for collision detection.
	var existingFingerprint string
	err = r.db.QueryRowContext(ctx,
		`SELECT fingerprint FROM integration.event_inbox WHERE event_id = $1`,
		event.EventID,
	).Scan(&existingFingerprint)
	if err != nil {
		return nil, err
	}

	if existingFingerprint == event.Fingerprint {
		return &integration.SaveResult{Duplicate: true}, nil
	}
	return &integration.SaveResult{Collision: true}, nil
}

// ClaimPendingEvents atomically claims a batch of events for processing.
// It selects pending events whose next_attempt_at has passed (or is NULL),
// and also reclaims stale "processing" events older than staleThreshold.
func (r *IntegrationRepository) ClaimPendingEvents(ctx context.Context, batchSize int, staleThreshold time.Duration) ([]*integration.InboxEvent, error) {
	staleTime := time.Now().UTC().Add(-staleThreshold)
	rows, err := r.db.QueryContext(ctx, `
		UPDATE integration.event_inbox
		SET status = 'processing', updated_at = NOW()
		WHERE id IN (
			SELECT id FROM integration.event_inbox
			WHERE (
				status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
			) OR (
				status = 'processing' AND updated_at < $1
			)
			ORDER BY COALESCE(next_attempt_at, created_at) ASC
			FOR UPDATE SKIP LOCKED
			LIMIT $2
		)
		RETURNING id, event_id, event_type, source, subject_id, occurred_at,
		          schema_version, payload, fingerprint, status, attempts,
		          next_attempt_at, error_category, received_at, processed_at,
		          created_at, updated_at`,
		staleTime, batchSize,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*integration.InboxEvent
	for rows.Next() {
		e := &integration.InboxEvent{}
		err := rows.Scan(
			&e.ID, &e.EventID, &e.EventType, &e.Source, &e.SubjectID,
			&e.OccurredAt, &e.SchemaVersion, &e.Payload, &e.Fingerprint,
			&e.Status, &e.Attempts, &e.NextAttemptAt, &e.ErrorCategory,
			&e.ReceivedAt, &e.ProcessedAt, &e.CreatedAt, &e.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

// MarkProcessed marks an inbox event as processed within the given transaction.
func (r *IntegrationRepository) MarkProcessed(ctx context.Context, tx *sql.Tx, event *integration.InboxEvent) error {
	result, err := tx.ExecContext(ctx, `
		UPDATE integration.event_inbox
		SET status = 'processed', processed_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status = 'processing' AND updated_at = $2`,
		event.ID, event.UpdatedAt,
	)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("stale worker lease lost for event_id=%s", event.EventID)
	}
	return nil
}

// MarkFailed increments the attempt counter, computes backoff, and transitions
// to dead_letter if max attempts exceeded.
func (r *IntegrationRepository) MarkFailed(ctx context.Context, event *integration.InboxEvent, errCategory string, maxAttempts int, backoffBase time.Duration) error {
	newAttempts := event.Attempts + 1
	var newStatus string
	var nextAttempt *time.Time

	if newAttempts >= maxAttempts {
		newStatus = integration.StatusDeadLetter
	} else {
		newStatus = integration.StatusPending
		backoff := time.Duration(float64(backoffBase) * math.Pow(2, float64(newAttempts-1)))
		t := time.Now().UTC().Add(backoff)
		nextAttempt = &t
	}

	result, err := r.db.ExecContext(ctx, `
		UPDATE integration.event_inbox
		SET status = $1, attempts = $2, next_attempt_at = $3,
		    error_category = $4, updated_at = NOW()
		WHERE id = $5 AND status = 'processing' AND updated_at = $6`,
		newStatus, newAttempts, nextAttempt, errCategory, event.ID, event.UpdatedAt,
	)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("stale worker lease lost for event_id=%s", event.EventID)
	}
	return nil
}

// CreateOutboxEntry inserts an outbox record within the given transaction.
func (r *IntegrationRepository) CreateOutboxEntry(ctx context.Context, tx *sql.Tx, entry *integration.OutboxEvent) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO integration.event_outbox (inbox_event_id, event_type, payload, published, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (inbox_event_id) DO NOTHING`,
		entry.InboxEventID, entry.EventType, entry.Payload, entry.Published,
	)
	return err
}

// BeginTx starts a new database transaction.
func (r *IntegrationRepository) BeginTx(ctx context.Context) (*sql.Tx, error) {
	return r.db.BeginTx(ctx, nil)
}

// CountByStatus returns event counts grouped by status.
func (r *IntegrationRepository) CountByStatus(ctx context.Context) (map[string]int64, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT status, COUNT(*) FROM integration.event_inbox GROUP BY status`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int64)
	for rows.Next() {
		var status string
		var count int64
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		counts[status] = count
	}
	return counts, rows.Err()
}

// ListDeadLetter returns dead-letter events for reconciliation inspection.
func (r *IntegrationRepository) ListDeadLetter(ctx context.Context, limit, offset int) ([]*integration.InboxEvent, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, event_id, event_type, source, subject_id, occurred_at,
		       schema_version, fingerprint, status, attempts, error_category,
		       received_at, created_at, updated_at
		FROM integration.event_inbox
		WHERE status = 'dead_letter'
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*integration.InboxEvent
	for rows.Next() {
		e := &integration.InboxEvent{}
		err := rows.Scan(
			&e.ID, &e.EventID, &e.EventType, &e.Source, &e.SubjectID,
			&e.OccurredAt, &e.SchemaVersion, &e.Fingerprint, &e.Status,
			&e.Attempts, &e.ErrorCategory, &e.ReceivedAt, &e.CreatedAt, &e.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

// RequeueDeadLetter resets a dead-letter event to pending for reprocessing.
// Preserves attempt history by not resetting the attempts counter.
func (r *IntegrationRepository) RequeueDeadLetter(ctx context.Context, eventID string) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE integration.event_inbox
		SET status = 'pending', next_attempt_at = NULL, error_category = NULL, updated_at = NOW()
		WHERE event_id = $1 AND status = 'dead_letter'`,
		eventID,
	)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}
