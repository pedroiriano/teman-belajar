package postgres

import (
	"context"
	"database/sql"
	"teman-belajar-api/internal/domain/audit"
)

type AuditRepository struct {
	db *sql.DB
}

func NewAuditRepository(db *sql.DB) *AuditRepository {
	return &AuditRepository{db: db}
}

func (r *AuditRepository) CreateEvent(ctx context.Context, event *audit.AuditEvent) error {
	query := `
		INSERT INTO audit_events (id, actor_user_id, action, target_type, target_id, result, trace_id, occurred_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	// Handle nullable actor_user_id (could be null for system actions, but here it's string. If empty string -> null)
	var actorID interface{}
	if event.ActorUserID != "" {
		actorID = event.ActorUserID
	}

	var traceID interface{}
	if event.TraceID != "" {
		traceID = event.TraceID
	}

	_, err := r.db.ExecContext(ctx, query,
		event.ID,
		actorID,
		event.Action,
		event.TargetType,
		event.TargetID,
		event.Result,
		traceID,
		event.OccurredAt,
	)

	return err
}
