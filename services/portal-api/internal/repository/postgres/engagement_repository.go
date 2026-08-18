package postgres

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"

	"teman-belajar-api/internal/domain/engagement"
)

type EngagementRepository struct{ db *sql.DB }

func NewEngagementRepository(db *sql.DB) *EngagementRepository { return &EngagementRepository{db: db} }

func (r *EngagementRepository) UpsertBookmark(ctx context.Context, userKey string, target engagement.Target) (engagement.Bookmark, error) {
	row := engagement.Bookmark{ID: uuid.NewString(), UserKey: userKey, Target: target}
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO engagement_bookmarks (id, user_subject, target_type, target_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_subject, target_type, target_id)
		DO UPDATE SET user_subject = EXCLUDED.user_subject
		RETURNING id, created_at`, row.ID, userKey, target.Type, target.ID,
	).Scan(&row.ID, &row.CreatedAt)
	return row, err
}

func (r *EngagementRepository) DeleteBookmark(ctx context.Context, userKey string, target engagement.Target) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM engagement_bookmarks WHERE user_subject = $1 AND target_type = $2 AND target_id = $3`, userKey, target.Type, target.ID)
	return err
}

func (r *EngagementRepository) ListBookmarks(ctx context.Context, userKey string, limit int) ([]engagement.Bookmark, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, target_type, target_id, created_at FROM engagement_bookmarks WHERE user_subject = $1 ORDER BY created_at DESC, id ASC LIMIT $2`, userKey, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]engagement.Bookmark, 0)
	for rows.Next() {
		item := engagement.Bookmark{UserKey: userKey}
		if err := rows.Scan(&item.ID, &item.Target.Type, &item.Target.ID, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *EngagementRepository) UpsertRating(ctx context.Context, userKey string, target engagement.Target, value int) (engagement.Rating, error) {
	row := engagement.Rating{ID: uuid.NewString(), UserKey: userKey, Target: target, Value: value}
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO engagement_ratings (id, user_subject, target_type, target_id, rating)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_subject, target_type, target_id)
		DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()
		RETURNING id, rating, created_at, updated_at`, row.ID, userKey, target.Type, target.ID, value,
	).Scan(&row.ID, &row.Value, &row.CreatedAt, &row.UpdatedAt)
	return row, err
}

func (r *EngagementRepository) DeleteRating(ctx context.Context, userKey string, target engagement.Target) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM engagement_ratings WHERE user_subject = $1 AND target_type = $2 AND target_id = $3`, userKey, target.Type, target.ID)
	return err
}

func (r *EngagementRepository) GetRating(ctx context.Context, userKey string, target engagement.Target) (*engagement.Rating, error) {
	row := engagement.Rating{UserKey: userKey, Target: target}
	err := r.db.QueryRowContext(ctx, `SELECT id, rating, created_at, updated_at FROM engagement_ratings WHERE user_subject = $1 AND target_type = $2 AND target_id = $3`, userKey, target.Type, target.ID).Scan(&row.ID, &row.Value, &row.CreatedAt, &row.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *EngagementRepository) ListRatings(ctx context.Context, userKey string, limit int) ([]engagement.Rating, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, target_type, target_id, rating, created_at, updated_at FROM engagement_ratings WHERE user_subject = $1 ORDER BY updated_at DESC, id ASC LIMIT $2`, userKey, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]engagement.Rating, 0)
	for rows.Next() {
		item := engagement.Rating{UserKey: userKey}
		if err := rows.Scan(&item.ID, &item.Target.Type, &item.Target.ID, &item.Value, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *EngagementRepository) GetRatingSummary(ctx context.Context, target engagement.Target) (engagement.RatingSummary, error) {
	var summary engagement.RatingSummary
	err := r.db.QueryRowContext(ctx, `SELECT COALESCE(AVG(rating)::FLOAT8, 0), COUNT(*) FROM engagement_ratings WHERE target_type = $1 AND target_id = $2`, target.Type, target.ID).Scan(&summary.Average, &summary.Count)
	return summary, err
}

func (r *EngagementRepository) UpsertRecentView(ctx context.Context, userKey string, target engagement.Target, retentionLimit int) (engagement.RecentView, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return engagement.RecentView{}, err
	}
	defer func() { _ = tx.Rollback() }()
	row := engagement.RecentView{ID: uuid.NewString(), UserKey: userKey, Target: target}
	err = tx.QueryRowContext(ctx, `
		INSERT INTO engagement_recent_views (id, user_subject, target_type, target_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_subject, target_type, target_id)
		DO UPDATE SET last_viewed_at = NOW(), view_count = engagement_recent_views.view_count + 1
		RETURNING id, first_viewed_at, last_viewed_at, view_count`, row.ID, userKey, target.Type, target.ID,
	).Scan(&row.ID, &row.FirstViewedAt, &row.LastViewedAt, &row.ViewCount)
	if err != nil {
		return engagement.RecentView{}, err
	}
	_, err = tx.ExecContext(ctx, `
		DELETE FROM engagement_recent_views
		WHERE user_subject = $1 AND id IN (
			SELECT id FROM engagement_recent_views
			WHERE user_subject = $1
			ORDER BY last_viewed_at DESC, id ASC
			OFFSET $2
		)`, userKey, retentionLimit)
	if err != nil {
		return engagement.RecentView{}, err
	}
	if err := tx.Commit(); err != nil {
		return engagement.RecentView{}, err
	}
	return row, nil
}

func (r *EngagementRepository) ListRecentViews(ctx context.Context, userKey string, limit int) ([]engagement.RecentView, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, target_type, target_id, first_viewed_at, last_viewed_at, view_count FROM engagement_recent_views WHERE user_subject = $1 ORDER BY last_viewed_at DESC, id ASC LIMIT $2`, userKey, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]engagement.RecentView, 0)
	for rows.Next() {
		item := engagement.RecentView{UserKey: userKey}
		if err := rows.Scan(&item.ID, &item.Target.Type, &item.Target.ID, &item.FirstViewedAt, &item.LastViewedAt, &item.ViewCount); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

var _ engagement.Repository = (*EngagementRepository)(nil)
