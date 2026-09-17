package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/lib/pq"
	"teman-belajar-api/internal/domain/webinar"
)

var slugCleanRegex = regexp.MustCompile(`[^a-z0-9-]+`)

type WebinarRepository struct {
	db *sql.DB
}

func NewWebinarRepository(db *sql.DB) *WebinarRepository {
	return &WebinarRepository{db: db}
}

var _ webinar.Repository = (*WebinarRepository)(nil)

func slugify(text string) string {
	s := strings.ToLower(strings.TrimSpace(text))
	s = strings.ReplaceAll(s, " ", "-")
	s = slugCleanRegex.ReplaceAllString(s, "")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "webinar"
	}
	return s
}

func (r *WebinarRepository) List(ctx context.Context, filter webinar.Filter, subject string) (webinar.Page, error) {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	var conditions []string
	var args []interface{}
	argIdx := 1

	if filter.Status != "" && filter.Status != "all" {
		conditions = append(conditions, fmt.Sprintf("w.status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}

	if filter.Speaker != "" && filter.Speaker != "all" {
		conditions = append(conditions, fmt.Sprintf("w.speaker ILIKE $%d", argIdx))
		args = append(args, "%"+filter.Speaker+"%")
		argIdx++
	}

	if filter.Query != "" {
		conditions = append(conditions, fmt.Sprintf("(w.title ILIKE $%d OR w.speaker ILIKE $%d OR w.summary ILIKE $%d OR w.description ILIKE $%d)", argIdx, argIdx, argIdx, argIdx))
		args = append(args, "%"+filter.Query+"%")
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// #nosec G201 -- whereClause uses internal static conditions and query values are bound via args
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM webinars w %s", whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return webinar.Page{}, err
	}

	var regJoin string
	var regSelect string
	if subject != "" {
		regSelect = ", (CASE WHEN reg.status = 'registered' THEN true ELSE false END) as is_registered"
		// #nosec G201 -- argIdx parameter placeholder is numeric and query values are bound via args
		regJoin = fmt.Sprintf("LEFT JOIN webinar_registrations reg ON reg.webinar_id = w.id AND reg.user_id = $%d", argIdx)
		args = append(args, subject)
		argIdx++
	} else {
		regSelect = ", false as is_registered"
	}

	// #nosec G201 -- query clauses and parameter placeholders are strictly controlled
	query := fmt.Sprintf(`
		SELECT
			w.id, w.title, w.summary, w.description, w.speaker,
			w.starts_at, w.ends_at, w.timezone, w.capacity, w.registered_count,
			w.status, w.join_url, w.recording_url, w.provider, w.cover_image_url,
			w.created_at, w.updated_at %s
		FROM webinars w
		%s
		%s
		ORDER BY w.starts_at ASC, w.id ASC
		LIMIT $%d OFFSET $%d
	`, regSelect, regJoin, whereClause, argIdx, argIdx+1)
	args = append(args, pageSize, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return webinar.Page{}, err
	}
	defer rows.Close()

	var sessions []webinar.Session
	now := time.Now().UTC()
	for rows.Next() {
		var s webinar.Session
		var isRegistered bool
		var desc, cover string
		var startsAt, endsAt, createdAt, updatedAt time.Time

		err := rows.Scan(
			&s.ID, &s.Title, &s.Summary, &desc, &s.Speakers, // will map speaker below
			&startsAt, &endsAt, &s.Timezone, &s.Capacity, &s.RegisteredCount,
			&s.Status, &s.JoinURL, &s.RecordingURL, &s.Source, &cover,
			&createdAt, &updatedAt, &isRegistered,
		)
		if err != nil {
			// Speaker might be string or slice, let's scan as string
			var speakerStr string
			err = rows.Scan(
				&s.ID, &s.Title, &s.Summary, &desc, &speakerStr,
				&startsAt, &endsAt, &s.Timezone, &s.Capacity, &s.RegisteredCount,
				&s.Status, &s.JoinURL, &s.RecordingURL, &s.Source, &cover,
				&createdAt, &updatedAt, &isRegistered,
			)
			if err != nil {
				return webinar.Page{}, err
			}
			if speakerStr != "" {
				s.Speakers = []string{speakerStr}
			} else {
				s.Speakers = []string{}
			}
		}

		s.StartsAt = startsAt
		s.EndsAt = endsAt
		s.Registered = isRegistered
		s.CancellationAllowed = startsAt.After(now)
		s.SyncedAt = updatedAt
		if s.Registered {
			s.RegistrationState = "registered"
		} else if s.RegisteredCount >= s.Capacity {
			s.RegistrationState = "full"
		} else {
			s.RegistrationState = "open"
		}

		sessions = append(sessions, s)
	}

	if sessions == nil {
		sessions = []webinar.Session{}
	}

	totalPages := (total + pageSize - 1) / pageSize
	return webinar.Page{
		Items:      sessions,
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
		TotalPages: totalPages,
		SyncedAt:   time.Now().UTC(),
	}, nil
}

func (r *WebinarRepository) GetByID(ctx context.Context, id int, subject string) (webinar.Session, error) {
	var s webinar.Session
	var speakerStr, desc, cover string
	var startsAt, endsAt, createdAt, updatedAt time.Time
	var isRegistered bool

	var query string
	var args []interface{}
	if subject != "" {
		query = `
			SELECT
				w.id, w.title, w.summary, w.description, w.speaker,
				w.starts_at, w.ends_at, w.timezone, w.capacity, w.registered_count,
				w.status, w.join_url, w.recording_url, w.provider, w.cover_image_url,
				w.created_at, w.updated_at,
				(CASE WHEN reg.status = 'registered' THEN true ELSE false END) as is_registered
			FROM webinars w
			LEFT JOIN webinar_registrations reg ON reg.webinar_id = w.id AND reg.user_id = $2
			WHERE w.id = $1
		`
		args = []interface{}{id, subject}
	} else {
		query = `
			SELECT
				w.id, w.title, w.summary, w.description, w.speaker,
				w.starts_at, w.ends_at, w.timezone, w.capacity, w.registered_count,
				w.status, w.join_url, w.recording_url, w.provider, w.cover_image_url,
				w.created_at, w.updated_at,
				false as is_registered
			FROM webinars w
			WHERE w.id = $1
		`
		args = []interface{}{id}
	}

	err := r.db.QueryRowContext(ctx, query, args...).Scan(
		&s.ID, &s.Title, &s.Summary, &desc, &speakerStr,
		&startsAt, &endsAt, &s.Timezone, &s.Capacity, &s.RegisteredCount,
		&s.Status, &s.JoinURL, &s.RecordingURL, &s.Source, &cover,
		&createdAt, &updatedAt, &isRegistered,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return webinar.Session{}, webinar.ErrNotFound
	}
	if err != nil {
		return webinar.Session{}, err
	}

	s.StartsAt = startsAt
	s.EndsAt = endsAt
	s.Registered = isRegistered
	now := time.Now().UTC()
	s.CancellationAllowed = startsAt.After(now)
	s.SyncedAt = updatedAt
	if speakerStr != "" {
		s.Speakers = []string{speakerStr}
	} else {
		s.Speakers = []string{}
	}
	if s.Registered {
		s.RegistrationState = "registered"
	} else if s.RegisteredCount >= s.Capacity {
		s.RegistrationState = "full"
	} else {
		s.RegistrationState = "open"
	}

	return s, nil
}

func (r *WebinarRepository) Create(ctx context.Context, input webinar.CreateWebinarInput, actor string) (webinar.Session, error) {
	slug := input.Slug
	if slug == "" {
		slug = fmt.Sprintf("%s-%d", slugify(input.Title), time.Now().Unix())
	}
	tz := input.Timezone
	if tz == "" {
		tz = "Asia/Jakarta"
	}
	provider := input.Provider
	if provider == "" {
		provider = "zoom"
	}

	query := `
		INSERT INTO webinars (
			title, slug, summary, description, speaker,
			starts_at, ends_at, timezone, capacity,
			join_url, recording_url, provider, cover_image_url,
			created_by, updated_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13,
			$14, $14, NOW(), NOW()
		)
		RETURNING id, created_at, updated_at
	`

	var id int
	var createdAt, updatedAt time.Time
	err := r.db.QueryRowContext(
		ctx, query,
		input.Title, slug, input.Summary, input.Description, input.Speaker,
		input.StartsAt, input.EndsAt, tz, input.Capacity,
		input.JoinURL, input.RecordingURL, provider, input.CoverImageURL,
		actor,
	).Scan(&id, &createdAt, &updatedAt)

	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			// Slug conflict, retry with unique suffix
			slug = fmt.Sprintf("%s-%d", slugify(input.Title), time.Now().UnixNano())
			err = r.db.QueryRowContext(
				ctx, query,
				input.Title, slug, input.Summary, input.Description, input.Speaker,
				input.StartsAt, input.EndsAt, tz, input.Capacity,
				input.JoinURL, input.RecordingURL, provider, input.CoverImageURL,
				actor,
			).Scan(&id, &createdAt, &updatedAt)
		}
		if err != nil {
			return webinar.Session{}, err
		}
	}

	speakers := []string{}
	if input.Speaker != "" {
		speakers = []string{input.Speaker}
	}

	return webinar.Session{
		ID:                  id,
		Title:               input.Title,
		Summary:             input.Summary,
		StartsAt:            input.StartsAt,
		EndsAt:              input.EndsAt,
		Timezone:            tz,
		Speakers:            speakers,
		Capacity:            input.Capacity,
		RegisteredCount:     0,
		RegistrationState:   "open",
		Status:              "upcoming",
		Registered:          false,
		CancellationAllowed: true,
		JoinURL:             input.JoinURL,
		RecordingURL:        input.RecordingURL,
		Source:              provider,
		SyncedAt:            updatedAt,
	}, nil
}

func (r *WebinarRepository) Update(ctx context.Context, id int, input webinar.UpdateWebinarInput, actor string) (webinar.Session, error) {
	var sets []string
	var args []interface{}
	argIdx := 1

	if input.Title != nil {
		sets = append(sets, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, *input.Title)
		argIdx++
	}
	if input.Summary != nil {
		sets = append(sets, fmt.Sprintf("summary = $%d", argIdx))
		args = append(args, *input.Summary)
		argIdx++
	}
	if input.Description != nil {
		sets = append(sets, fmt.Sprintf("description = $%d", argIdx))
		args = append(args, *input.Description)
		argIdx++
	}
	if input.Speaker != nil {
		sets = append(sets, fmt.Sprintf("speaker = $%d", argIdx))
		args = append(args, *input.Speaker)
		argIdx++
	}
	if input.StartsAt != nil {
		sets = append(sets, fmt.Sprintf("starts_at = $%d", argIdx))
		args = append(args, *input.StartsAt)
		argIdx++
	}
	if input.EndsAt != nil {
		sets = append(sets, fmt.Sprintf("ends_at = $%d", argIdx))
		args = append(args, *input.EndsAt)
		argIdx++
	}
	if input.Timezone != nil {
		sets = append(sets, fmt.Sprintf("timezone = $%d", argIdx))
		args = append(args, *input.Timezone)
		argIdx++
	}
	if input.Capacity != nil {
		sets = append(sets, fmt.Sprintf("capacity = $%d", argIdx))
		args = append(args, *input.Capacity)
		argIdx++
	}
	if input.Status != nil {
		sets = append(sets, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *input.Status)
		argIdx++
	}
	if input.JoinURL != nil {
		sets = append(sets, fmt.Sprintf("join_url = $%d", argIdx))
		args = append(args, *input.JoinURL)
		argIdx++
	}
	if input.RecordingURL != nil {
		sets = append(sets, fmt.Sprintf("recording_url = $%d", argIdx))
		args = append(args, *input.RecordingURL)
		argIdx++
	}
	if input.Provider != nil {
		sets = append(sets, fmt.Sprintf("provider = $%d", argIdx))
		args = append(args, *input.Provider)
		argIdx++
	}
	if input.CoverImageURL != nil {
		sets = append(sets, fmt.Sprintf("cover_image_url = $%d", argIdx))
		args = append(args, *input.CoverImageURL)
		argIdx++
	}

	sets = append(sets, fmt.Sprintf("updated_by = $%d, updated_at = NOW()", argIdx))
	args = append(args, actor)
	argIdx++

	args = append(args, id)
	// #nosec G201 -- sets uses internal static column assignments and parameter placeholders
	query := fmt.Sprintf(`
		UPDATE webinars
		SET %s
		WHERE id = $%d
	`, strings.Join(sets, ", "), argIdx)

	result, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return webinar.Session{}, err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return webinar.Session{}, webinar.ErrNotFound
	}

	return r.GetByID(ctx, id, "")
}

func (r *WebinarRepository) Delete(ctx context.Context, id int, actor string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM webinars WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return webinar.ErrNotFound
	}
	return nil
}

func (r *WebinarRepository) Register(ctx context.Context, id int, identity webinar.Identity, userName, userEmail, key string) (webinar.Session, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return webinar.Session{}, err
	}
	defer tx.Rollback()

	var capacity, registeredCount int
	var status string
	var startsAt time.Time
	err = tx.QueryRowContext(ctx, `
		SELECT capacity, registered_count, starts_at, status
		FROM webinars
		WHERE id = $1
		FOR UPDATE
	`, id).Scan(&capacity, &registeredCount, &startsAt, &status)

	if errors.Is(err, sql.ErrNoRows) {
		return webinar.Session{}, webinar.ErrNotFound
	}
	if err != nil {
		return webinar.Session{}, err
	}

	if status == "cancelled" {
		return webinar.Session{}, webinar.ErrRegistrationClosed
	}
	now := time.Now().UTC()
	if !startsAt.After(now) {
		return webinar.Session{}, webinar.ErrRegistrationClosed
	}

	// Check existing registration
	var regStatus string
	err = tx.QueryRowContext(ctx, `
		SELECT status FROM webinar_registrations
		WHERE webinar_id = $1 AND user_id = $2
	`, id, identity.Subject).Scan(&regStatus)

	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return webinar.Session{}, err
	}

	if regStatus == "registered" {
		// Already registered
		_ = tx.Commit()
		return r.GetByID(ctx, id, identity.Subject)
	}

	if registeredCount >= capacity {
		return webinar.Session{}, webinar.ErrCapacityFull
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO webinar_registrations (
			webinar_id, user_id, user_name, user_email, status, registered_at, updated_at
		) VALUES (
			$1, $2, $3, $4, 'registered', NOW(), NOW()
		)
		ON CONFLICT (webinar_id, user_id)
		DO UPDATE SET status = 'registered', user_name = $3, user_email = $4, updated_at = NOW()
	`, id, identity.Subject, userName, userEmail)
	if err != nil {
		return webinar.Session{}, err
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE webinars
		SET registered_count = (
			SELECT COUNT(*) FROM webinar_registrations
			WHERE webinar_id = $1 AND status = 'registered'
		),
		updated_at = NOW()
		WHERE id = $1
	`, id)
	if err != nil {
		return webinar.Session{}, err
	}

	if err := tx.Commit(); err != nil {
		return webinar.Session{}, err
	}

	return r.GetByID(ctx, id, identity.Subject)
}

func (r *WebinarRepository) Cancel(ctx context.Context, id int, identity webinar.Identity, key string) (webinar.Session, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return webinar.Session{}, err
	}
	defer tx.Rollback()

	var startsAt time.Time
	err = tx.QueryRowContext(ctx, `
		SELECT starts_at FROM webinars WHERE id = $1 FOR UPDATE
	`, id).Scan(&startsAt)
	if errors.Is(err, sql.ErrNoRows) {
		return webinar.Session{}, webinar.ErrNotFound
	}
	if err != nil {
		return webinar.Session{}, err
	}

	now := time.Now().UTC()
	if !startsAt.After(now) {
		return webinar.Session{}, webinar.ErrRegistrationClosed
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE webinar_registrations
		SET status = 'cancelled', updated_at = NOW()
		WHERE webinar_id = $1 AND user_id = $2
	`, id, identity.Subject)
	if err != nil {
		return webinar.Session{}, err
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE webinars
		SET registered_count = (
			SELECT COUNT(*) FROM webinar_registrations
			WHERE webinar_id = $1 AND status = 'registered'
		),
		updated_at = NOW()
		WHERE id = $1
	`, id)
	if err != nil {
		return webinar.Session{}, err
	}

	if err := tx.Commit(); err != nil {
		return webinar.Session{}, err
	}

	return r.GetByID(ctx, id, identity.Subject)
}

func (r *WebinarRepository) ListAttendees(ctx context.Context, id int) ([]webinar.Attendee, error) {
	query := `
		SELECT id, webinar_id, user_id, user_name, user_email, status, registered_at
		FROM webinar_registrations
		WHERE webinar_id = $1
		ORDER BY registered_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attendees []webinar.Attendee
	for rows.Next() {
		var a webinar.Attendee
		if err := rows.Scan(&a.ID, &a.WebinarID, &a.UserID, &a.UserName, &a.UserEmail, &a.Status, &a.RegisteredAt); err != nil {
			return nil, err
		}
		attendees = append(attendees, a)
	}

	if attendees == nil {
		attendees = []webinar.Attendee{}
	}
	return attendees, nil
}

func (r *WebinarRepository) UpdateAttendance(ctx context.Context, id int, attendeeID string, status string) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE webinar_registrations
		SET status = $1, updated_at = NOW()
		WHERE webinar_id = $2 AND (id::text = $3 OR user_id = $3)
	`, status, id, attendeeID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return webinar.ErrNotFound
	}
	return nil
}
