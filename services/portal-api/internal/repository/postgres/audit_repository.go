package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"teman-belajar-api/internal/domain/audit"
)

type AuditRepository struct {
	db *sql.DB
}

func NewAuditRepository(db *sql.DB) *AuditRepository {
	return &AuditRepository{db: db}
}

func (r *AuditRepository) CreateEvent(ctx context.Context, event *audit.AuditEvent) error {
	sanitized := audit.SanitizeEvent(*event)
	metadata, err := json.Marshal(sanitized.Metadata)
	if err != nil {
		return fmt.Errorf("encode audit metadata: %w", err)
	}
	var actorID, traceID, maskedIP any
	if sanitized.ActorUserID != "" {
		actorID = sanitized.ActorUserID
	}
	if sanitized.TraceID != "" {
		traceID = sanitized.TraceID
	}
	if sanitized.IPMasked != "" {
		maskedIP = sanitized.IPMasked
	}
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO audit_events (
			id, actor_user_id, action, module, target_type, target_id, result,
			trace_id, ip_masked, metadata, occurred_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
	`, sanitized.ID, actorID, sanitized.Action, sanitized.Module, sanitized.TargetType,
		sanitized.TargetID, sanitized.Result, traceID, maskedIP, string(metadata), sanitized.OccurredAt)
	return err
}

func (r *AuditRepository) ListEvents(ctx context.Context, query audit.Query) ([]audit.AuditEvent, error) {
	nullString := func(value string) any {
		if value == "" {
			return nil
		}
		return value
	}
	nullTime := func(value time.Time) any {
		if value.IsZero() {
			return nil
		}
		return value.UTC()
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, actor_user_id, action, COALESCE(NULLIF(module, ''), target_type), target_type, target_id, result,
		       trace_id, ip_masked, metadata, occurred_at
		FROM audit_events
		WHERE ($1::uuid IS NULL OR actor_user_id = $1::uuid)
		  AND ($2::text IS NULL OR action = $2)
		  AND ($3::text IS NULL OR COALESCE(NULLIF(module, ''), target_type) = $3)
		  AND ($4::text IS NULL OR target_type = $4)
		  AND ($5::text IS NULL OR target_id = $5)
		  AND ($6::text IS NULL OR result = $6)
		  AND ($7::text IS NULL OR trace_id = $7)
		  AND ($8::timestamptz IS NULL OR occurred_at >= $8)
		  AND ($9::timestamptz IS NULL OR occurred_at < $9)
		  AND ($10::timestamptz IS NULL OR occurred_at < $10 OR (occurred_at = $10 AND id < $11::uuid))
		ORDER BY occurred_at DESC, id DESC LIMIT $12
	`, nullString(query.ActorUserID), nullString(query.Action), nullString(query.Module),
		nullString(query.TargetType), nullString(query.TargetID), nullString(query.Result),
		nullString(query.TraceID), nullTime(query.OccurredFrom), nullTime(query.OccurredTo),
		nullTime(query.BeforeOccurred), nullString(query.BeforeID), query.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]audit.AuditEvent, 0, query.Limit)
	for rows.Next() {
		item, err := scanAuditEvent(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *AuditRepository) GetEvent(ctx context.Context, id string) (audit.AuditEvent, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, actor_user_id, action, COALESCE(NULLIF(module, ''), target_type), target_type, target_id, result,
		       trace_id, ip_masked, metadata, occurred_at
		FROM audit_events WHERE id = $1::uuid
	`, id)
	return scanAuditEvent(row)
}

func (r *AuditRepository) DeleteBefore(ctx context.Context, cutoff time.Time, limit int) (int64, error) {
	result, err := r.db.ExecContext(ctx, `
		WITH expired AS (
			SELECT id FROM audit_events WHERE occurred_at < $1
			ORDER BY occurred_at, id LIMIT $2
		)
		DELETE FROM audit_events event USING expired WHERE event.id = expired.id
	`, cutoff.UTC(), limit)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

type auditScanner interface{ Scan(dest ...any) error }

func scanAuditEvent(scanner auditScanner) (audit.AuditEvent, error) {
	var item audit.AuditEvent
	var actorID, traceID, maskedIP sql.NullString
	var metadata []byte
	if err := scanner.Scan(&item.ID, &actorID, &item.Action, &item.Module, &item.TargetType,
		&item.TargetID, &item.Result, &traceID, &maskedIP, &metadata, &item.OccurredAt); err != nil {
		return audit.AuditEvent{}, err
	}
	item.ActorUserID, item.TraceID, item.IPMasked = actorID.String, traceID.String, maskedIP.String
	if len(metadata) > 0 {
		if err := json.Unmarshal(metadata, &item.Metadata); err != nil {
			return audit.AuditEvent{}, fmt.Errorf("decode audit metadata: %w", err)
		}
	}
	return item, nil
}
