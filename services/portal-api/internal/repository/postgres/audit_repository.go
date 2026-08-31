package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
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
	clauses := []string{"TRUE"}
	arguments := make([]any, 0, 12)
	add := func(clause string, value any) {
		arguments = append(arguments, value)
		clauses = append(clauses, fmt.Sprintf(clause, len(arguments)))
	}
	if query.ActorUserID != "" {
		add("actor_user_id = $%d::uuid", query.ActorUserID)
	}
	if query.Action != "" {
		add("action = $%d", query.Action)
	}
	if query.Module != "" {
		add("COALESCE(NULLIF(module, ''), target_type) = $%d", query.Module)
	}
	if query.TargetType != "" {
		add("target_type = $%d", query.TargetType)
	}
	if query.TargetID != "" {
		add("target_id = $%d", query.TargetID)
	}
	if query.Result != "" {
		add("result = $%d", query.Result)
	}
	if query.TraceID != "" {
		add("trace_id = $%d", query.TraceID)
	}
	if !query.OccurredFrom.IsZero() {
		add("occurred_at >= $%d", query.OccurredFrom.UTC())
	}
	if !query.OccurredTo.IsZero() {
		add("occurred_at < $%d", query.OccurredTo.UTC())
	}
	if !query.BeforeOccurred.IsZero() {
		arguments = append(arguments, query.BeforeOccurred.UTC())
		timePosition := len(arguments)
		arguments = append(arguments, query.BeforeID)
		idPosition := len(arguments)
		clauses = append(clauses, fmt.Sprintf("(occurred_at < $%d OR (occurred_at = $%d AND id < $%d::uuid))", timePosition, timePosition, idPosition))
	}
	arguments = append(arguments, query.Limit)
	statement := fmt.Sprintf(`
		SELECT id, actor_user_id, action, COALESCE(NULLIF(module, ''), target_type), target_type, target_id, result,
		       trace_id, ip_masked, metadata, occurred_at
		FROM audit_events WHERE %s
		ORDER BY occurred_at DESC, id DESC LIMIT $%d
	`, strings.Join(clauses, " AND "), len(arguments))
	rows, err := r.db.QueryContext(ctx, statement, arguments...)
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
