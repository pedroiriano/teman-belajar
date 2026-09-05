package postgres

import (
	"context"
	"database/sql"

	"teman-belajar-api/internal/domain/recommendationpin"
)

type RecommendationPinRepository struct {
	db *sql.DB
}

func NewRecommendationPinRepository(db *sql.DB) *RecommendationPinRepository {
	return &RecommendationPinRepository{db: db}
}

var _ recommendationpin.Repository = (*RecommendationPinRepository)(nil)

func (r *RecommendationPinRepository) List(ctx context.Context, targetType string, limit int) ([]recommendationpin.RecommendationPin, error) {
	var query string
	var rows *sql.Rows
	var err error

	if targetType != "" {
		query = `SELECT id, target_type, target_id, title, pinned, weight, pinned_by, created_at, updated_at
				 FROM editorial_recommendation_pins
				 WHERE target_type = $1 AND pinned = true
				 ORDER BY weight DESC, created_at DESC
				 LIMIT $2`
		rows, err = r.db.QueryContext(ctx, query, targetType, limit)
	} else {
		query = `SELECT id, target_type, target_id, title, pinned, weight, pinned_by, created_at, updated_at
				 FROM editorial_recommendation_pins
				 WHERE pinned = true
				 ORDER BY weight DESC, created_at DESC
				 LIMIT $1`
		rows, err = r.db.QueryContext(ctx, query, limit)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pins []recommendationpin.RecommendationPin
	for rows.Next() {
		var p recommendationpin.RecommendationPin
		if err := rows.Scan(&p.ID, &p.TargetType, &p.TargetID, &p.Title, &p.Pinned, &p.Weight, &p.PinnedBy, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		pins = append(pins, p)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return pins, nil
}

func (r *RecommendationPinRepository) Create(ctx context.Context, p recommendationpin.RecommendationPin) (*recommendationpin.RecommendationPin, error) {
	query := `INSERT INTO editorial_recommendation_pins (target_type, target_id, title, pinned, weight, pinned_by, created_at, updated_at)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			  RETURNING id, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		p.TargetType, p.TargetID, p.Title, p.Pinned, p.Weight, p.PinnedBy, p.CreatedAt, p.UpdatedAt,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return &p, nil
}

func (r *RecommendationPinRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM editorial_recommendation_pins WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
