package postgres

import (
	"context"
	"database/sql"
	"errors"

	"teman-belajar-api/internal/domain/media"
)

type MediaRepository struct {
	db *sql.DB
}

func NewMediaRepository(db *sql.DB) *MediaRepository {
	return &MediaRepository{db: db}
}

var _ media.Repository = (*MediaRepository)(nil)

func (r *MediaRepository) CreateAsset(ctx context.Context, m *media.MediaAsset) error {
	query := `INSERT INTO media_assets (id, storage_key, bucket, original_filename, detected_mime_type, size_bytes, checksum_sha256, title, alt_text, caption, status, created_at, created_by, updated_at, updated_by)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`
	_, err := r.db.ExecContext(ctx, query,
		m.ID, m.StorageKey, m.Bucket, m.OriginalFilename, m.DetectedMimeType, m.SizeBytes, m.ChecksumSHA256,
		m.Title, m.AltText, m.Caption, m.Status, m.CreatedAt, m.CreatedBy, m.UpdatedAt, m.UpdatedBy,
	)
	return err
}

func (r *MediaRepository) GetAssetByID(ctx context.Context, id string) (*media.MediaAsset, error) {
	query := `SELECT id, storage_key, bucket, original_filename, detected_mime_type, size_bytes, checksum_sha256, title, alt_text, caption, status, created_at, created_by, updated_at, updated_by, archived_at
			  FROM media_assets WHERE id = $1`
	row := r.db.QueryRowContext(ctx, query, id)
	return scanMediaAsset(row)
}

func (r *MediaRepository) UpdateMetadata(ctx context.Context, id string, update media.MetadataUpdate, updatedBy string) (*media.MediaAsset, error) {
	query := `UPDATE media_assets 
			  SET title = COALESCE($1, title), 
			      alt_text = COALESCE($2, alt_text), 
			      caption = COALESCE($3, caption),
			      updated_at = NOW(),
			      updated_by = $4
			  WHERE id = $5
			  RETURNING id, storage_key, bucket, original_filename, detected_mime_type, size_bytes, checksum_sha256, title, alt_text, caption, status, created_at, created_by, updated_at, updated_by, archived_at`

	row := r.db.QueryRowContext(ctx, query, update.Title, update.AltText, update.Caption, updatedBy, id)
	return scanMediaAsset(row)
}

func (r *MediaRepository) ArchiveAsset(ctx context.Context, id string, archivedBy string) error {
	query := `UPDATE media_assets SET status = $1, archived_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $3`
	_, err := r.db.ExecContext(ctx, query, media.StatusArchived, archivedBy, id)
	return err
}

func (r *MediaRepository) ListAdminAssets(ctx context.Context, page, pageSize int) ([]media.MediaAsset, int, error) {
	offset := (page - 1) * pageSize

	var total int
	err := r.db.QueryRowContext(ctx, `SELECT count(*) FROM media_assets`).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `SELECT id, storage_key, bucket, original_filename, detected_mime_type, size_bytes, checksum_sha256, title, alt_text, caption, status, created_at, created_by, updated_at, updated_by, archived_at
			  FROM media_assets ORDER BY created_at DESC LIMIT $1 OFFSET $2`

	rows, err := r.db.QueryContext(ctx, query, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []media.MediaAsset
	for rows.Next() {
		a, err := scanMediaAssetRow(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *a)
	}

	return items, total, nil
}

func (r *MediaRepository) CheckIsPubliclyEligible(ctx context.Context, assetID string) (bool, error) {
	// A media is publicly eligible if it is attached to:
	// 1. A News that is 'published'
	// 2. An Announcement that is 'published'
	// 3. A Knowledge Revision that is the published_revision of its parent Knowledge Article.
	query := `
		SELECT EXISTS (
			SELECT 1 FROM media_usages mu
			LEFT JOIN news n ON mu.entity_type = 'news' AND mu.entity_id = n.id::text
			LEFT JOIN announcements a ON mu.entity_type = 'announcement' AND mu.entity_id = a.id::text
			LEFT JOIN knowledge_revisions kr ON mu.entity_type = 'knowledge_revision' AND mu.entity_id = kr.id::text
			LEFT JOIN knowledge_articles ka ON kr.article_id = ka.id
			WHERE mu.media_id = $1
			AND (
				(mu.entity_type = 'news' AND n.status = 'published')
				OR
				(mu.entity_type = 'announcement' AND a.status = 'published')
				OR
				(mu.entity_type = 'knowledge_revision' AND ka.status = 'published' AND ka.published_revision_no = kr.revision_no)
			)
		)
	`
	var isEligible bool
	err := r.db.QueryRowContext(ctx, query, assetID).Scan(&isEligible)
	return isEligible, err
}

func (r *MediaRepository) HasActiveUsages(ctx context.Context, assetID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM media_usages WHERE media_id = $1)`
	var exists bool
	err := r.db.QueryRowContext(ctx, query, assetID).Scan(&exists)
	return exists, err
}

func (r *MediaRepository) AttachUsage(ctx context.Context, usage media.MediaUsage) error {
	query := `INSERT INTO media_usages (id, media_id, entity_type, entity_id, usage_role, sort_order, created_at, created_by)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
	_, err := r.db.ExecContext(ctx, query,
		usage.ID, usage.MediaID, usage.EntityType, usage.EntityID, usage.UsageRole, usage.SortOrder, usage.CreatedAt, usage.CreatedBy,
	)
	return err
}

func (r *MediaRepository) DetachUsage(ctx context.Context, mediaID, entityType, entityID, usageRole string) error {
	query := `DELETE FROM media_usages WHERE media_id = $1 AND entity_type = $2 AND entity_id = $3 AND usage_role = $4`
	_, err := r.db.ExecContext(ctx, query, mediaID, entityType, entityID, usageRole)
	return err
}

func scanMediaAsset(s rowScanner) (*media.MediaAsset, error) {
	var m media.MediaAsset
	var origFilename, title, altText, caption sql.NullString
	var archivedAt sql.NullTime

	err := s.Scan(
		&m.ID, &m.StorageKey, &m.Bucket, &origFilename, &m.DetectedMimeType, &m.SizeBytes, &m.ChecksumSHA256,
		&title, &altText, &caption, &m.Status, &m.CreatedAt, &m.CreatedBy, &m.UpdatedAt, &m.UpdatedBy, &archivedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, media.ErrAssetNotFound
		}
		return nil, err
	}

	if origFilename.Valid {
		m.OriginalFilename = &origFilename.String
	}
	if title.Valid {
		m.Title = &title.String
	}
	if altText.Valid {
		m.AltText = &altText.String
	}
	if caption.Valid {
		m.Caption = &caption.String
	}
	if archivedAt.Valid {
		m.ArchivedAt = &archivedAt.Time
	}

	return &m, nil
}

func scanMediaAssetRow(rows *sql.Rows) (*media.MediaAsset, error) {
	return scanMediaAsset(rows)
}
