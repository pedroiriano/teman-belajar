package postgres

import (
	"context"
	"database/sql"
	"errors"

	"github.com/lib/pq"
	"teman-belajar-api/internal/domain/training"
)

type TrainingRepository struct{ db *sql.DB }

func NewTrainingRepository(db *sql.DB) *TrainingRepository { return &TrainingRepository{db: db} }

var _ training.Repository = (*TrainingRepository)(nil)

func mapTrainingWriteError(err error) error {
	var postgresError *pq.Error
	if errors.As(err, &postgresError) && (postgresError.Code == "23505" || postgresError.Code == "23503" || postgresError.Code == "23514") {
		return training.ErrConflict
	}
	return err
}

func (r *TrainingRepository) Create(ctx context.Context, item *training.Program, actor string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	_, err = tx.ExecContext(ctx, `INSERT INTO training_programs (id,slug,title,summary,description,audience,eligibility_text,status,version,published_at,created_at,created_by,updated_at,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$12)`, item.ID, item.Slug, item.Title, item.Summary, item.Description, item.Audience, item.EligibilityText, item.Status, item.Version, item.PublishedAt, item.CreatedAt, nullableActor(actor), item.UpdatedAt)
	if err != nil {
		return mapTrainingWriteError(err)
	}
	if err := replaceProgramChildren(ctx, tx, item); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *TrainingRepository) Update(ctx context.Context, item *training.Program, expectedVersion int64, actor string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(ctx, `UPDATE training_programs SET slug=$1,title=$2,summary=$3,description=$4,audience=$5,eligibility_text=$6,status=$7,version=$8,published_at=$9,updated_at=$10,updated_by=$11 WHERE id=$12 AND version=$13`, item.Slug, item.Title, item.Summary, item.Description, item.Audience, item.EligibilityText, item.Status, item.Version, item.PublishedAt, item.UpdatedAt, nullableActor(actor), item.ID, expectedVersion)
	if err != nil {
		return mapTrainingWriteError(err)
	}
	count, err := result.RowsAffected()
	if err != nil || count != 1 {
		return training.ErrConflict
	}
	if err := replaceProgramChildren(ctx, tx, item); err != nil {
		return err
	}
	return tx.Commit()
}

func replaceProgramChildren(ctx context.Context, tx *sql.Tx, item *training.Program) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM training_program_courses WHERE program_id=$1`, item.ID); err != nil {
		return err
	}
	for _, course := range item.Courses {
		if _, err := tx.ExecContext(ctx, `INSERT INTO training_program_courses (program_id,moodle_course_id,sort_order,required) VALUES ($1,$2,$3,$4)`, item.ID, course.MoodleCourseID, course.SortOrder, course.Required); err != nil {
			return mapTrainingWriteError(err)
		}
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM training_program_cohorts WHERE program_id=$1`, item.ID); err != nil {
		return err
	}
	for _, cohort := range item.Cohorts {
		if _, err := tx.ExecContext(ctx, `INSERT INTO training_program_cohorts (id,program_id,label,starts_at,ends_at,enrollment_opens_at,enrollment_closes_at,status,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, cohort.ID, item.ID, cohort.Label, cohort.StartsAt, cohort.EndsAt, cohort.EnrollmentOpensAt, cohort.EnrollmentClosesAt, cohort.Status, cohort.SortOrder); err != nil {
			return mapTrainingWriteError(err)
		}
	}
	return nil
}

type trainingScanner interface{ Scan(...any) error }

const trainingProgramColumns = `id,slug,title,summary,description,COALESCE(audience,''),COALESCE(eligibility_text,''),status,version,published_at,created_at,updated_at`

func scanTrainingProgram(scanner trainingScanner) (*training.Program, error) {
	var item training.Program
	err := scanner.Scan(&item.ID, &item.Slug, &item.Title, &item.Summary, &item.Description, &item.Audience, &item.EligibilityText, &item.Status, &item.Version, &item.PublishedAt, &item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, training.ErrNotFound
	}
	return &item, err
}

func (r *TrainingRepository) loadChildren(ctx context.Context, item *training.Program) error {
	courseRows, err := r.db.QueryContext(ctx, `SELECT moodle_course_id,sort_order,required FROM training_program_courses WHERE program_id=$1 ORDER BY sort_order`, item.ID)
	if err != nil {
		return err
	}
	defer courseRows.Close()
	item.Courses = make([]training.CourseRef, 0)
	for courseRows.Next() {
		var course training.CourseRef
		if err := courseRows.Scan(&course.MoodleCourseID, &course.SortOrder, &course.Required); err != nil {
			return err
		}
		item.Courses = append(item.Courses, course)
	}
	if err := courseRows.Err(); err != nil {
		return err
	}
	if err := courseRows.Close(); err != nil {
		return err
	}

	cohortRows, err := r.db.QueryContext(ctx, `SELECT id,label,starts_at,ends_at,enrollment_opens_at,enrollment_closes_at,status,sort_order FROM training_program_cohorts WHERE program_id=$1 ORDER BY sort_order`, item.ID)
	if err != nil {
		return err
	}
	defer cohortRows.Close()
	item.Cohorts = make([]training.Cohort, 0)
	for cohortRows.Next() {
		var cohort training.Cohort
		if err := cohortRows.Scan(&cohort.ID, &cohort.Label, &cohort.StartsAt, &cohort.EndsAt, &cohort.EnrollmentOpensAt, &cohort.EnrollmentClosesAt, &cohort.Status, &cohort.SortOrder); err != nil {
			return err
		}
		item.Cohorts = append(item.Cohorts, cohort)
	}
	return cohortRows.Err()
}

func (r *TrainingRepository) GetByID(ctx context.Context, id string) (*training.Program, error) {
	item, err := scanTrainingProgram(r.db.QueryRowContext(ctx, `SELECT `+trainingProgramColumns+` FROM training_programs WHERE id=$1`, id))
	if err != nil {
		return nil, err
	}
	return item, r.loadChildren(ctx, item)
}

func (r *TrainingRepository) GetPublishedBySlug(ctx context.Context, slug string) (*training.Program, error) {
	item, err := scanTrainingProgram(r.db.QueryRowContext(ctx, `SELECT `+trainingProgramColumns+` FROM training_programs WHERE slug=$1 AND status='published' AND published_at IS NOT NULL AND published_at<=NOW()`, slug))
	if err != nil {
		return nil, err
	}
	return item, r.loadChildren(ctx, item)
}

func (r *TrainingRepository) list(ctx context.Context, filter training.ListFilter, public bool) ([]training.Program, int, error) {
	status := filter.Status
	if status == "all" {
		status = ""
	}
	queryValue := "%" + filter.Query + "%"
	var total int
	if public {
		if err := r.db.QueryRowContext(ctx, `SELECT count(*) FROM training_programs WHERE ($1='' OR title ILIKE $2 OR summary ILIKE $2 OR audience ILIKE $2) AND status='published' AND published_at IS NOT NULL AND published_at<=NOW()`, filter.Query, queryValue).Scan(&total); err != nil {
			return nil, 0, err
		}
	} else {
		if err := r.db.QueryRowContext(ctx, `SELECT count(*) FROM training_programs WHERE ($1='' OR title ILIKE $2 OR summary ILIKE $2 OR audience ILIKE $2) AND ($3='' OR status=$3)`, filter.Query, queryValue, status).Scan(&total); err != nil {
			return nil, 0, err
		}
	}
	var rows *sql.Rows
	var err error
	if public {
		rows, err = r.db.QueryContext(ctx, `SELECT `+trainingProgramColumns+` FROM training_programs WHERE ($1='' OR title ILIKE $2 OR summary ILIKE $2 OR audience ILIKE $2) AND status='published' AND published_at IS NOT NULL AND published_at<=NOW() ORDER BY published_at DESC,title LIMIT $3 OFFSET $4`, filter.Query, queryValue, filter.PageSize, (filter.Page-1)*filter.PageSize)
	} else {
		rows, err = r.db.QueryContext(ctx, `SELECT `+trainingProgramColumns+` FROM training_programs WHERE ($1='' OR title ILIKE $2 OR summary ILIKE $2 OR audience ILIKE $2) AND ($3='' OR status=$3) ORDER BY CASE WHEN status='published' THEN 0 ELSE 1 END,published_at DESC NULLS LAST,updated_at DESC LIMIT $4 OFFSET $5`, filter.Query, queryValue, status, filter.PageSize, (filter.Page-1)*filter.PageSize)
	}
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]training.Program, 0)
	for rows.Next() {
		item, err := scanTrainingProgram(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	if err := rows.Close(); err != nil {
		return nil, 0, err
	}
	for i := range items {
		if err := r.loadChildren(ctx, &items[i]); err != nil {
			return nil, 0, err
		}
	}
	return items, total, nil
}

func (r *TrainingRepository) ListPublic(ctx context.Context, filter training.ListFilter) ([]training.Program, int, error) {
	return r.list(ctx, filter, true)
}

func (r *TrainingRepository) ListAdmin(ctx context.Context, filter training.ListFilter) ([]training.Program, int, error) {
	return r.list(ctx, filter, false)
}
