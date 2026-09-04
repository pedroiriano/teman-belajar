package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"teman-belajar-api/internal/domain/schedule"
)

type ScheduleRepository struct {
	db *sql.DB
}

func NewScheduleRepository(db *sql.DB) *ScheduleRepository {
	return &ScheduleRepository{db: db}
}

var _ schedule.Repository = (*ScheduleRepository)(nil)

func (r *ScheduleRepository) List(ctx context.Context, month string, entityType string) ([]schedule.ScheduleEvent, error) {
	query := `
		SELECT
			id, entity_type, entity_id, title,
			TO_CHAR(target_date, 'YYYY-MM-DD') AS target_date,
			target_time, publish_at, status, owner,
			cohort_label, participants_count, description,
			executed_at, failure_reason, created_at, updated_at
		FROM publication_schedules
		WHERE 1=1
	`
	var args []interface{}
	idx := 1

	if month != "" {
		query += fmt.Sprintf(" AND TO_CHAR(target_date, 'YYYY-MM') = $%d", idx)
		args = append(args, month)
		idx++
	}

	if entityType != "" {
		query += fmt.Sprintf(" AND entity_type = $%d", idx)
		args = append(args, entityType)
		idx++
	}

	query += " ORDER BY target_date ASC, target_time ASC, created_at ASC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query schedules: %w", err)
	}
	defer rows.Close()

	var events []schedule.ScheduleEvent
	for rows.Next() {
		var ev schedule.ScheduleEvent
		var cohortLabel, desc, failureReason sql.NullString
		var executedAt sql.NullTime

		err := rows.Scan(
			&ev.ID, &ev.EntityType, &ev.EntityID, &ev.Title,
			&ev.TargetDate, &ev.TargetTime, &ev.PublishAt, &ev.Status, &ev.Owner,
			&cohortLabel, &ev.ParticipantsCount, &desc,
			&executedAt, &failureReason, &ev.CreatedAt, &ev.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan schedule: %w", err)
		}

		if cohortLabel.Valid {
			ev.CohortLabel = &cohortLabel.String
		}
		if desc.Valid {
			ev.Description = &desc.String
		}
		if failureReason.Valid {
			ev.FailureReason = &failureReason.String
		}
		if executedAt.Valid {
			ev.ExecutedAt = &executedAt.Time
		}

		events = append(events, ev)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate schedules: %w", err)
	}

	return events, nil
}

func (r *ScheduleRepository) Create(ctx context.Context, ev schedule.ScheduleEvent) (*schedule.ScheduleEvent, error) {
	query := `
		INSERT INTO publication_schedules (
			entity_type, entity_id, title, target_date, target_time,
			publish_at, status, owner, cohort_label, participants_count, description,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10, $11,
			$12, $13
		) RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRowContext(
		ctx, query,
		ev.EntityType, ev.EntityID, ev.Title, ev.TargetDate, ev.TargetTime,
		ev.PublishAt, ev.Status, ev.Owner, ev.CohortLabel, ev.ParticipantsCount, ev.Description,
		ev.CreatedAt, ev.UpdatedAt,
	).Scan(&ev.ID, &ev.CreatedAt, &ev.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("insert schedule: %w", err)
	}

	return &ev, nil
}

func (r *ScheduleRepository) GetByID(ctx context.Context, id string) (*schedule.ScheduleEvent, error) {
	query := `
		SELECT
			id, entity_type, entity_id, title,
			TO_CHAR(target_date, 'YYYY-MM-DD') AS target_date,
			target_time, publish_at, status, owner,
			cohort_label, participants_count, description,
			executed_at, failure_reason, created_at, updated_at
		FROM publication_schedules
		WHERE id = $1
	`
	var ev schedule.ScheduleEvent
	var cohortLabel, desc, failureReason sql.NullString
	var executedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&ev.ID, &ev.EntityType, &ev.EntityID, &ev.Title,
		&ev.TargetDate, &ev.TargetTime, &ev.PublishAt, &ev.Status, &ev.Owner,
		&cohortLabel, &ev.ParticipantsCount, &desc,
		&executedAt, &failureReason, &ev.CreatedAt, &ev.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, schedule.ErrNotFound
		}
		return nil, fmt.Errorf("get schedule: %w", err)
	}

	if cohortLabel.Valid {
		ev.CohortLabel = &cohortLabel.String
	}
	if desc.Valid {
		ev.Description = &desc.String
	}
	if failureReason.Valid {
		ev.FailureReason = &failureReason.String
	}
	if executedAt.Valid {
		ev.ExecutedAt = &executedAt.Time
	}

	return &ev, nil
}

func (r *ScheduleRepository) GetPendingExecution(ctx context.Context, cutoff time.Time, limit int) ([]schedule.ScheduleEvent, error) {
	query := `
		SELECT
			id, entity_type, entity_id, title,
			TO_CHAR(target_date, 'YYYY-MM-DD') AS target_date,
			target_time, publish_at, status, owner,
			cohort_label, participants_count, description,
			executed_at, failure_reason, created_at, updated_at
		FROM publication_schedules
		WHERE status = 'scheduled' AND publish_at <= $1
		ORDER BY publish_at ASC
		LIMIT $2
	`
	rows, err := r.db.QueryContext(ctx, query, cutoff, limit)
	if err != nil {
		return nil, fmt.Errorf("query pending schedules: %w", err)
	}
	defer rows.Close()

	var events []schedule.ScheduleEvent
	for rows.Next() {
		var ev schedule.ScheduleEvent
		var cohortLabel, desc, failureReason sql.NullString
		var executedAt sql.NullTime

		err := rows.Scan(
			&ev.ID, &ev.EntityType, &ev.EntityID, &ev.Title,
			&ev.TargetDate, &ev.TargetTime, &ev.PublishAt, &ev.Status, &ev.Owner,
			&cohortLabel, &ev.ParticipantsCount, &desc,
			&executedAt, &failureReason, &ev.CreatedAt, &ev.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan pending schedule: %w", err)
		}

		if cohortLabel.Valid {
			ev.CohortLabel = &cohortLabel.String
		}
		if desc.Valid {
			ev.Description = &desc.String
		}
		if failureReason.Valid {
			ev.FailureReason = &failureReason.String
		}
		if executedAt.Valid {
			ev.ExecutedAt = &executedAt.Time
		}

		events = append(events, ev)
	}

	return events, nil
}

func (r *ScheduleRepository) MarkExecuted(ctx context.Context, id string, executedAt time.Time) error {
	query := `
		UPDATE publication_schedules
		SET status = 'published', executed_at = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err := r.db.ExecContext(ctx, query, executedAt, id)
	return err
}

func (r *ScheduleRepository) MarkFailed(ctx context.Context, id string, reason string) error {
	query := `
		UPDATE publication_schedules
		SET status = 'failed', failure_reason = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err := r.db.ExecContext(ctx, query, reason, id)
	return err
}

func (r *ScheduleRepository) Cancel(ctx context.Context, id string) error {
	query := `
		UPDATE publication_schedules
		SET status = 'cancelled', updated_at = NOW()
		WHERE id = $1 AND status = 'scheduled'
	`
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return schedule.ErrNotFound
	}
	return nil
}
