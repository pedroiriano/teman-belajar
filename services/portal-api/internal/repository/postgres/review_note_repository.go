package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"teman-belajar-api/internal/domain/reviewnote"
)

type ReviewNoteRepository struct {
	db *sql.DB
}

func NewReviewNoteRepository(db *sql.DB) *ReviewNoteRepository {
	return &ReviewNoteRepository{db: db}
}

var _ reviewnote.Repository = (*ReviewNoteRepository)(nil)

func (r *ReviewNoteRepository) ListByEntity(ctx context.Context, entityType string, entityID string, limit int) ([]reviewnote.ReviewNote, error) {
	query := `
		SELECT id, entity_type, entity_id, action, notes, reviewer_id, reviewer_name, created_at
		FROM editorial_review_notes
		WHERE (entity_type = $1 OR ($1 = 'announcements' AND entity_type = 'announcement') OR ($1 = 'announcement' AND entity_type = 'announcements') OR ($1 = 'faqs' AND entity_type = 'faq') OR ($1 = 'faq' AND entity_type = 'faqs')) AND entity_id = $2
		ORDER BY created_at DESC
		LIMIT $3
	`
	rows, err := r.db.QueryContext(ctx, query, entityType, entityID, limit)
	if err != nil {
		return nil, fmt.Errorf("query review notes: %w", err)
	}
	defer rows.Close()

	var notes []reviewnote.ReviewNote
	for rows.Next() {
		var n reviewnote.ReviewNote
		if err := rows.Scan(
			&n.ID, &n.EntityType, &n.EntityID, &n.Action,
			&n.Notes, &n.ReviewerID, &n.ReviewerName, &n.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan review note: %w", err)
		}
		notes = append(notes, n)
	}

	return notes, nil
}

func (r *ReviewNoteRepository) Create(ctx context.Context, n reviewnote.ReviewNote) (*reviewnote.ReviewNote, error) {
	query := `
		INSERT INTO editorial_review_notes (
			entity_type, entity_id, action, notes, reviewer_id, reviewer_name, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`
	err := r.db.QueryRowContext(
		ctx, query,
		n.EntityType, n.EntityID, n.Action, n.Notes, n.ReviewerID, n.ReviewerName, n.CreatedAt,
	).Scan(&n.ID, &n.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("insert review note: %w", err)
	}

	return &n, nil
}
