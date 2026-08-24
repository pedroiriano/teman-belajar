package postgres

import (
	"context"
	"database/sql"
	"errors"

	"teman-belajar-api/internal/domain/draft"
)

type DraftRepository struct{ db *sql.DB }

func NewDraftRepository(db *sql.DB) *DraftRepository { return &DraftRepository{db: db} }

var _ draft.Repository = (*DraftRepository)(nil)

const draftColumns = `id, actor_subject, draft_key, form_key, entity_type, entity_id, schema_version, payload, base_entity_version, revision, client_updated_at, expires_at, created_at, updated_at`

func (r *DraftRepository) Create(ctx context.Context, value *draft.FormDraft) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO form_drafts (`+draftColumns+`) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
		value.ID, value.ActorSubject, value.DraftKey, value.FormKey, value.EntityType, value.EntityID, value.SchemaVersion, value.Payload,
		value.BaseEntityVersion, value.Revision, value.ClientUpdatedAt, value.ExpiresAt, value.CreatedAt, value.UpdatedAt)
	return err
}

func (r *DraftRepository) Update(ctx context.Context, value *draft.FormDraft, expectedRevision int64) error {
	result, err := r.db.ExecContext(ctx, `UPDATE form_drafts SET payload=$1, base_entity_version=$2, schema_version=$3, revision=$4, client_updated_at=$5, expires_at=$6, updated_at=$7 WHERE actor_subject=$8 AND draft_key=$9 AND revision=$10`,
		value.Payload, value.BaseEntityVersion, value.SchemaVersion, value.Revision, value.ClientUpdatedAt, value.ExpiresAt, value.UpdatedAt, value.ActorSubject, value.DraftKey, expectedRevision)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows != 1 {
		return draft.ErrConflict
	}
	return nil
}

func (r *DraftRepository) Get(ctx context.Context, actorSubject, draftKey string) (*draft.FormDraft, error) {
	row := r.db.QueryRowContext(ctx, `SELECT `+draftColumns+` FROM form_drafts WHERE actor_subject=$1 AND draft_key=$2 AND expires_at > NOW()`, actorSubject, draftKey)
	return scanDraft(row)
}

func (r *DraftRepository) GetByEntity(ctx context.Context, actorSubject, entityType, entityID string) (*draft.FormDraft, error) {
	row := r.db.QueryRowContext(ctx, `SELECT `+draftColumns+` FROM form_drafts WHERE actor_subject=$1 AND entity_type=$2 AND entity_id=$3 AND expires_at > NOW()`, actorSubject, entityType, entityID)
	return scanDraft(row)
}

func (r *DraftRepository) List(ctx context.Context, actorSubject string, filter draft.ListFilter) ([]draft.FormDraft, error) {
	var entityID any
	if filter.EntityID != nil {
		entityID = *filter.EntityID
	}
	rows, err := r.db.QueryContext(ctx, `SELECT `+draftColumns+` FROM form_drafts
		WHERE actor_subject=$1 AND form_key=$2 AND expires_at > NOW()
		AND ($3 = '' OR entity_type=$3)
		AND ($4::uuid IS NULL OR entity_id=$4::uuid)
		ORDER BY updated_at DESC, id DESC LIMIT 20`, actorSubject, filter.FormKey, filter.EntityType, entityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]draft.FormDraft, 0)
	for rows.Next() {
		value, err := scanDraft(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *value)
	}
	return items, rows.Err()
}

func (r *DraftRepository) Delete(ctx context.Context, actorSubject, draftKey string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM form_drafts WHERE actor_subject=$1 AND draft_key=$2`, actorSubject, draftKey)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows != 1 {
		return draft.ErrNotFound
	}
	return nil
}

func (r *DraftRepository) CleanupExpired(ctx context.Context, limit int) (int64, error) {
	if limit < 1 || limit > 1000 {
		limit = 100
	}
	result, err := r.db.ExecContext(ctx, `WITH expired AS (SELECT id FROM form_drafts WHERE expires_at <= NOW() ORDER BY expires_at ASC LIMIT $1) DELETE FROM form_drafts WHERE id IN (SELECT id FROM expired)`, limit)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

type draftScanner interface{ Scan(dest ...any) error }

func scanDraft(scanner draftScanner) (*draft.FormDraft, error) {
	var value draft.FormDraft
	if err := scanner.Scan(&value.ID, &value.ActorSubject, &value.DraftKey, &value.FormKey, &value.EntityType, &value.EntityID, &value.SchemaVersion, &value.Payload, &value.BaseEntityVersion, &value.Revision, &value.ClientUpdatedAt, &value.ExpiresAt, &value.CreatedAt, &value.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, draft.ErrNotFound
		}
		return nil, err
	}
	return &value, nil
}
