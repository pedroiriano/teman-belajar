package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"teman-belajar-api/internal/domain/enrollment"
)

type EnrollmentRepository struct {
	db *sql.DB
}

func NewEnrollmentRepository(db *sql.DB) *EnrollmentRepository {
	return &EnrollmentRepository{db: db}
}

func (r *EnrollmentRepository) Create(ctx context.Context, e *enrollment.Enrollment) error {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	query := `
		INSERT INTO training_program_enrollments (
			id, user_subject, user_name, user_email,
			program_slug, program_title, cohort_id, cohort_label,
			status, notes, rejection_reason, applied_at,
			confirmed_at, confirmed_by, created_at, updated_at
		) VALUES (
			$1::uuid, $2, $3, $4,
			$5, $6, $7, $8,
			$9, $10, $11, $12,
			$13, $14, $15, $16
		)
	`
	var cohortID any = nil
	if e.CohortID != nil && *e.CohortID != "" {
		cohortID = *e.CohortID
	}

	var confirmedBy any = nil
	if e.ConfirmedBy != "" {
		confirmedBy = e.ConfirmedBy
	}

	_, err := r.db.ExecContext(
		ctx, query,
		e.ID, e.UserSubject, e.UserName, e.UserEmail,
		e.ProgramSlug, e.ProgramTitle, cohortID, e.CohortLabel,
		string(e.Status), e.Notes, e.RejectionReason, e.AppliedAt,
		e.ConfirmedAt, confirmedBy, e.CreatedAt, e.UpdatedAt,
	)
	return err
}

func (r *EnrollmentRepository) GetByID(ctx context.Context, id string) (*enrollment.Enrollment, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, enrollment.ErrNotFound
	}

	query := `
		SELECT 
			id::text, user_subject, user_name, user_email,
			program_slug, program_title, cohort_id::text, cohort_label,
			status, notes, rejection_reason, applied_at,
			confirmed_at, confirmed_by, created_at, updated_at
		FROM training_program_enrollments
		WHERE id = $1::uuid
	`
	var e enrollment.Enrollment
	var cohortID, notes, rejectionReason, confirmedBy sql.NullString
	var confirmedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&e.ID, &e.UserSubject, &e.UserName, &e.UserEmail,
		&e.ProgramSlug, &e.ProgramTitle, &cohortID, &e.CohortLabel,
		&e.Status, &notes, &rejectionReason, &e.AppliedAt,
		&confirmedAt, &confirmedBy, &e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, enrollment.ErrNotFound
		}
		return nil, err
	}

	if cohortID.Valid {
		val := cohortID.String
		e.CohortID = &val
	}
	if notes.Valid {
		e.Notes = notes.String
	}
	if rejectionReason.Valid {
		e.RejectionReason = rejectionReason.String
	}
	if confirmedAt.Valid {
		e.ConfirmedAt = &confirmedAt.Time
	}
	if confirmedBy.Valid {
		e.ConfirmedBy = confirmedBy.String
	}

	return &e, nil
}

func (r *EnrollmentRepository) GetByUserAndProgram(ctx context.Context, userSubject, programSlug string) (*enrollment.Enrollment, error) {
	query := `
		SELECT 
			id::text, user_subject, user_name, user_email,
			program_slug, program_title, cohort_id::text, cohort_label,
			status, notes, rejection_reason, applied_at,
			confirmed_at, confirmed_by, created_at, updated_at
		FROM training_program_enrollments
		WHERE user_subject = $1 AND program_slug = $2
		ORDER BY applied_at DESC
		LIMIT 1
	`
	var e enrollment.Enrollment
	var cohortID, notes, rejectionReason, confirmedBy sql.NullString
	var confirmedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, userSubject, programSlug).Scan(
		&e.ID, &e.UserSubject, &e.UserName, &e.UserEmail,
		&e.ProgramSlug, &e.ProgramTitle, &cohortID, &e.CohortLabel,
		&e.Status, &notes, &rejectionReason, &e.AppliedAt,
		&confirmedAt, &confirmedBy, &e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, enrollment.ErrNotFound
		}
		return nil, err
	}

	if cohortID.Valid {
		val := cohortID.String
		e.CohortID = &val
	}
	if notes.Valid {
		e.Notes = notes.String
	}
	if rejectionReason.Valid {
		e.RejectionReason = rejectionReason.String
	}
	if confirmedAt.Valid {
		e.ConfirmedAt = &confirmedAt.Time
	}
	if confirmedBy.Valid {
		e.ConfirmedBy = confirmedBy.String
	}

	return &e, nil
}

func (r *EnrollmentRepository) UpdateStatus(ctx context.Context, id string, status enrollment.Status, confirmedBy string, rejectionReason string) (*enrollment.Enrollment, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, enrollment.ErrNotFound
	}

	var query string
	var args []any

	switch status {
	case enrollment.StatusConfirmed:
		query = `
			UPDATE training_program_enrollments
			SET status = 'confirmed',
				confirmed_by = $1,
				confirmed_at = NOW(),
				updated_at = NOW()
			WHERE id = $2::uuid
			RETURNING
				id::text, user_subject, user_name, user_email,
				program_slug, program_title, cohort_id::text, cohort_label,
				status, notes, rejection_reason, applied_at,
				confirmed_at, confirmed_by, created_at, updated_at
		`
		args = []any{confirmedBy, id}
	case enrollment.StatusRejected:
		query = `
			UPDATE training_program_enrollments
			SET status = 'rejected',
				rejection_reason = $1,
				updated_at = NOW()
			WHERE id = $2::uuid
			RETURNING
				id::text, user_subject, user_name, user_email,
				program_slug, program_title, cohort_id::text, cohort_label,
				status, notes, rejection_reason, applied_at,
				confirmed_at, confirmed_by, created_at, updated_at
		`
		args = []any{rejectionReason, id}
	default:
		query = `
			UPDATE training_program_enrollments
			SET status = $1,
				updated_at = NOW()
			WHERE id = $2::uuid
			RETURNING
				id::text, user_subject, user_name, user_email,
				program_slug, program_title, cohort_id::text, cohort_label,
				status, notes, rejection_reason, applied_at,
				confirmed_at, confirmed_by, created_at, updated_at
		`
		args = []any{string(status), id}
	}

	var e enrollment.Enrollment
	var cohortID, notes, dbRejectionReason, dbConfirmedBy sql.NullString
	var confirmedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, args...).Scan(
		&e.ID, &e.UserSubject, &e.UserName, &e.UserEmail,
		&e.ProgramSlug, &e.ProgramTitle, &cohortID, &e.CohortLabel,
		&e.Status, &notes, &dbRejectionReason, &e.AppliedAt,
		&confirmedAt, &dbConfirmedBy, &e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, enrollment.ErrNotFound
		}
		return nil, err
	}

	if cohortID.Valid {
		val := cohortID.String
		e.CohortID = &val
	}
	if notes.Valid {
		e.Notes = notes.String
	}
	if dbRejectionReason.Valid {
		e.RejectionReason = dbRejectionReason.String
	}
	if confirmedAt.Valid {
		e.ConfirmedAt = &confirmedAt.Time
	}
	if dbConfirmedBy.Valid {
		e.ConfirmedBy = dbConfirmedBy.String
	}

	return &e, nil
}

func (r *EnrollmentRepository) List(ctx context.Context, filter enrollment.Filter) ([]enrollment.Enrollment, int, enrollment.Metrics, error) {
	// 1. Calculate overall metrics
	metricsQuery := `
		SELECT 
			COUNT(*),
			COALESCE(COUNT(CASE WHEN status = 'pending' THEN 1 END), 0),
			COALESCE(COUNT(CASE WHEN status = 'confirmed' THEN 1 END), 0),
			COALESCE(COUNT(CASE WHEN status = 'rejected' THEN 1 END), 0)
		FROM training_program_enrollments
	`
	metricsArgs := []any{}
	if filter.ProgramSlug != "" {
		metricsQuery += ` WHERE program_slug = $1`
		metricsArgs = append(metricsArgs, filter.ProgramSlug)
	}

	var metrics enrollment.Metrics
	err := r.db.QueryRowContext(ctx, metricsQuery, metricsArgs...).Scan(
		&metrics.TotalApplications,
		&metrics.PendingCount,
		&metrics.ConfirmedCount,
		&metrics.RejectedCount,
	)
	if err != nil {
		return nil, 0, metrics, err
	}

	// 2. Build filtered count & list queries
	whereClauses := []string{"1=1"}
	args := []any{}
	argIdx := 1

	if filter.ProgramSlug != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("program_slug = $%d", argIdx))
		args = append(args, filter.ProgramSlug)
		argIdx++
	}

	if filter.Status != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}

	if strings.TrimSpace(filter.Query) != "" {
		pattern := "%" + strings.TrimSpace(filter.Query) + "%"
		whereClauses = append(whereClauses, fmt.Sprintf(
			"(user_name ILIKE $%d OR user_email ILIKE $%d OR program_title ILIKE $%d OR cohort_label ILIKE $%d)",
			argIdx, argIdx, argIdx, argIdx,
		))
		args = append(args, pattern)
		argIdx++
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	var total int
	countSQL := fmt.Sprintf("SELECT COUNT(*) FROM training_program_enrollments WHERE %s", whereSQL)
	if err := r.db.QueryRowContext(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, metrics, err
	}

	// 3. Query records
	offset := (filter.Page - 1) * filter.PageSize
	listSQL := fmt.Sprintf(`
		SELECT 
			id::text, user_subject, user_name, user_email,
			program_slug, program_title, cohort_id::text, cohort_label,
			status, notes, rejection_reason, applied_at,
			confirmed_at, confirmed_by, created_at, updated_at
		FROM training_program_enrollments
		WHERE %s
		ORDER BY applied_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, argIdx, argIdx+1)
	args = append(args, filter.PageSize, offset)

	rows, err := r.db.QueryContext(ctx, listSQL, args...)
	if err != nil {
		return nil, 0, metrics, err
	}
	defer rows.Close()

	var results []enrollment.Enrollment
	for rows.Next() {
		var e enrollment.Enrollment
		var cohortID, notes, rejectionReason, confirmedBy sql.NullString
		var confirmedAt sql.NullTime

		if err := rows.Scan(
			&e.ID, &e.UserSubject, &e.UserName, &e.UserEmail,
			&e.ProgramSlug, &e.ProgramTitle, &cohortID, &e.CohortLabel,
			&e.Status, &notes, &rejectionReason, &e.AppliedAt,
			&confirmedAt, &confirmedBy, &e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, 0, metrics, err
		}

		if cohortID.Valid {
			val := cohortID.String
			e.CohortID = &val
		}
		if notes.Valid {
			e.Notes = notes.String
		}
		if rejectionReason.Valid {
			e.RejectionReason = rejectionReason.String
		}
		if confirmedAt.Valid {
			e.ConfirmedAt = &confirmedAt.Time
		}
		if confirmedBy.Valid {
			e.ConfirmedBy = confirmedBy.String
		}

		results = append(results, e)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, metrics, err
	}

	if results == nil {
		results = []enrollment.Enrollment{}
	}

	return results, total, metrics, nil
}
