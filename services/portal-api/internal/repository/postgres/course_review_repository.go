package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"teman-belajar-api/internal/domain/coursereview"
)

type CourseReviewRepository struct {
	db *sql.DB
}

func NewCourseReviewRepository(db *sql.DB) *CourseReviewRepository {
	return &CourseReviewRepository{db: db}
}

func (r *CourseReviewRepository) GetProgramIDBySlug(ctx context.Context, slug string) (string, error) {
	var id string
	err := r.db.QueryRowContext(ctx, `SELECT id::text FROM training_programs WHERE slug = $1`, slug).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", coursereview.ErrProgramNotFound
		}
		return "", err
	}
	return id, nil
}

func (r *CourseReviewRepository) GetSummaryBySlug(ctx context.Context, programSlug string) (*coursereview.RatingSummary, error) {
	query := `
		SELECT 
			COALESCE(AVG(rating), 0)::FLOAT,
			COUNT(*),
			COALESCE(COUNT(CASE WHEN rating = 5 THEN 1 END), 0),
			COALESCE(COUNT(CASE WHEN rating = 4 THEN 1 END), 0),
			COALESCE(COUNT(CASE WHEN rating = 3 THEN 1 END), 0),
			COALESCE(COUNT(CASE WHEN rating = 2 THEN 1 END), 0),
			COALESCE(COUNT(CASE WHEN rating = 1 THEN 1 END), 0)
		FROM training_program_reviews
		WHERE program_slug = $1 AND status = 'published'
	`
	var avg float64
	var total, s5, s4, s3, s2, s1 int
	err := r.db.QueryRowContext(ctx, query, programSlug).Scan(&avg, &total, &s5, &s4, &s3, &s2, &s1)
	if err != nil {
		return nil, err
	}

	dist := make(map[int]coursereview.StarDistribution, 5)
	counts := map[int]int{5: s5, 4: s4, 3: s3, 2: s2, 1: s1}
	for i := 1; i <= 5; i++ {
		count := counts[i]
		pct := 0.0
		if total > 0 {
			pct = (float64(count) / float64(total)) * 100
		}
		dist[i] = coursereview.StarDistribution{
			Count:      count,
			Percentage: pct,
		}
	}

	return &coursereview.RatingSummary{
		AverageRating: avg,
		TotalReviews:  total,
		Distribution:  dist,
	}, nil
}

func (r *CourseReviewRepository) ListPublicBySlug(ctx context.Context, programSlug string, filter coursereview.ListFilter) ([]coursereview.Review, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM training_program_reviews WHERE program_slug = $1 AND status = 'published'`
	args := []any{programSlug}
	argIdx := 2

	if filter.Rating != nil && *filter.Rating >= 1 && *filter.Rating <= 5 {
		countQuery += fmt.Sprintf(` AND rating = $%d`, argIdx)
		args = append(args, *filter.Rating)
		argIdx++
	}

	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	orderBy := "created_at DESC"
	switch filter.SortBy {
	case "highest":
		orderBy = "rating DESC, created_at DESC"
	case "lowest":
		orderBy = "rating ASC, created_at DESC"
	}

	listQuery := fmt.Sprintf(`
		SELECT id::text, program_id::text, program_slug, moodle_course_id, user_subject, author_name, rating, title, content, status, created_at, updated_at
		FROM training_program_reviews
		WHERE program_slug = $1 AND status = 'published'
	`)
	listArgs := []any{programSlug}
	listArgIdx := 2

	if filter.Rating != nil && *filter.Rating >= 1 && *filter.Rating <= 5 {
		listQuery += fmt.Sprintf(` AND rating = $%d`, listArgIdx)
		listArgs = append(listArgs, *filter.Rating)
		listArgIdx++
	}

	offset := (filter.Page - 1) * filter.PageSize
	listQuery += fmt.Sprintf(` ORDER BY %s LIMIT $%d OFFSET $%d`, orderBy, listArgIdx, listArgIdx+1)
	listArgs = append(listArgs, filter.PageSize, offset)

	rows, err := r.db.QueryContext(ctx, listQuery, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	reviews := make([]coursereview.Review, 0)
	for rows.Next() {
		var rev coursereview.Review
		var moodleCourseID sql.NullInt64
		err := rows.Scan(
			&rev.ID, &rev.ProgramID, &rev.ProgramSlug, &moodleCourseID,
			&rev.UserSubject, &rev.AuthorName, &rev.Rating, &rev.Title,
			&rev.Content, &rev.Status, &rev.CreatedAt, &rev.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		if moodleCourseID.Valid {
			rev.MoodleCourseID = &moodleCourseID.Int64
		}
		reviews = append(reviews, rev)
	}

	return reviews, total, rows.Err()
}

func (r *CourseReviewRepository) GetByUserAndSlug(ctx context.Context, userSubject, programSlug string) (*coursereview.Review, error) {
	query := `
		SELECT id::text, program_id::text, program_slug, moodle_course_id, user_subject, author_name, rating, title, content, status, created_at, updated_at
		FROM training_program_reviews
		WHERE user_subject = $1 AND program_slug = $2
	`
	var rev coursereview.Review
	var moodleCourseID sql.NullInt64
	err := r.db.QueryRowContext(ctx, query, userSubject, programSlug).Scan(
		&rev.ID, &rev.ProgramID, &rev.ProgramSlug, &moodleCourseID,
		&rev.UserSubject, &rev.AuthorName, &rev.Rating, &rev.Title,
		&rev.Content, &rev.Status, &rev.CreatedAt, &rev.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, coursereview.ErrNotFound
		}
		return nil, err
	}
	if moodleCourseID.Valid {
		rev.MoodleCourseID = &moodleCourseID.Int64
	}
	return &rev, nil
}

func (r *CourseReviewRepository) Upsert(ctx context.Context, review *coursereview.Review) error {
	query := `
		INSERT INTO training_program_reviews (
			id, program_id, program_slug, moodle_course_id,
			user_subject, author_name, rating, title,
			content, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (program_id, user_subject)
		DO UPDATE SET
			rating = EXCLUDED.rating,
			title = EXCLUDED.title,
			content = EXCLUDED.content,
			author_name = EXCLUDED.author_name,
			status = EXCLUDED.status,
			updated_at = EXCLUDED.updated_at
	`
	_, err := r.db.ExecContext(ctx, query,
		review.ID, review.ProgramID, review.ProgramSlug, review.MoodleCourseID,
		review.UserSubject, review.AuthorName, review.Rating, review.Title,
		review.Content, string(review.Status), review.CreatedAt, review.UpdatedAt,
	)
	return err
}

func (r *CourseReviewRepository) DeleteByUserAndSlug(ctx context.Context, userSubject, programSlug string) error {
	query := `DELETE FROM training_program_reviews WHERE user_subject = $1 AND program_slug = $2`
	res, err := r.db.ExecContext(ctx, query, userSubject, programSlug)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return coursereview.ErrNotFound
	}
	return nil
}

func (r *CourseReviewRepository) ListAdmin(ctx context.Context, filter coursereview.AdminFilter) ([]coursereview.Review, int, error) {
	whereClauses := []string{"1=1"}
	args := []any{}
	argIdx := 1

	if strings.TrimSpace(filter.ProgramSlug) != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("program_slug = $%d", argIdx))
		args = append(args, strings.TrimSpace(filter.ProgramSlug))
		argIdx++
	}

	if strings.TrimSpace(filter.Status) != "" && filter.Status != "all" {
		whereClauses = append(whereClauses, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, strings.TrimSpace(filter.Status))
		argIdx++
	}

	if filter.Rating != nil && *filter.Rating >= 1 && *filter.Rating <= 5 {
		whereClauses = append(whereClauses, fmt.Sprintf("rating = $%d", argIdx))
		args = append(args, *filter.Rating)
		argIdx++
	}

	if strings.TrimSpace(filter.Query) != "" {
		q := "%" + strings.TrimSpace(filter.Query) + "%"
		whereClauses = append(whereClauses, fmt.Sprintf("(author_name ILIKE $%d OR title ILIKE $%d OR content ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, q)
		argIdx++
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	var total int
	// #nosec G201 -- whereSQL uses internal static conditions and query values are bound via args
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM training_program_reviews WHERE %s", whereSQL)
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (filter.Page - 1) * filter.PageSize
	// #nosec G201 -- whereSQL uses internal static conditions and query values are bound via args
	listQuery := fmt.Sprintf(`
		SELECT id::text, program_id::text, program_slug, moodle_course_id, user_subject, author_name, rating, title, content, status, created_at, updated_at
		FROM training_program_reviews
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, argIdx, argIdx+1)
	listArgs := append(args, filter.PageSize, offset)

	rows, err := r.db.QueryContext(ctx, listQuery, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	reviews := make([]coursereview.Review, 0)
	for rows.Next() {
		var rev coursereview.Review
		var moodleCourseID sql.NullInt64
		err := rows.Scan(
			&rev.ID, &rev.ProgramID, &rev.ProgramSlug, &moodleCourseID,
			&rev.UserSubject, &rev.AuthorName, &rev.Rating, &rev.Title,
			&rev.Content, &rev.Status, &rev.CreatedAt, &rev.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		if moodleCourseID.Valid {
			rev.MoodleCourseID = &moodleCourseID.Int64
		}
		reviews = append(reviews, rev)
	}

	return reviews, total, rows.Err()
}

func (r *CourseReviewRepository) UpdateStatus(ctx context.Context, id string, status coursereview.Status) error {
	query := `UPDATE training_program_reviews SET status = $1, updated_at = NOW() WHERE id = $2`
	res, err := r.db.ExecContext(ctx, query, string(status), id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return coursereview.ErrNotFound
	}
	return nil
}

func (r *CourseReviewRepository) GetByID(ctx context.Context, id string) (*coursereview.Review, error) {
	query := `
		SELECT id::text, program_id::text, program_slug, moodle_course_id, user_subject, author_name, rating, title, content, status, created_at, updated_at
		FROM training_program_reviews
		WHERE id = $1
	`
	var rev coursereview.Review
	var moodleCourseID sql.NullInt64
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&rev.ID, &rev.ProgramID, &rev.ProgramSlug, &moodleCourseID,
		&rev.UserSubject, &rev.AuthorName, &rev.Rating, &rev.Title,
		&rev.Content, &rev.Status, &rev.CreatedAt, &rev.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, coursereview.ErrNotFound
		}
		return nil, err
	}
	if moodleCourseID.Valid {
		rev.MoodleCourseID = &moodleCourseID.Int64
	}
	return &rev, nil
}
