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
	query := `INSERT INTO media_assets (id, storage_key, bucket, original_filename, display_filename, detected_mime_type, size_bytes, checksum_sha256, title, alt_text, caption, status, created_at, created_by, updated_at, updated_by)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`
	_, err := r.db.ExecContext(ctx, query,
		m.ID, m.StorageKey, m.Bucket, m.OriginalFilename, m.DisplayFilename, m.DetectedMimeType, m.SizeBytes, m.ChecksumSHA256,
		m.Title, m.AltText, m.Caption, m.Status, m.CreatedAt, m.CreatedBy, m.UpdatedAt, m.UpdatedBy,
	)
	return err
}

func (r *MediaRepository) GetAssetByID(ctx context.Context, id string) (*media.MediaAsset, error) {
	query := `SELECT id, storage_key, bucket, original_filename, display_filename, detected_mime_type, size_bytes, checksum_sha256, title, alt_text, caption, status, created_at, created_by, updated_at, updated_by, archived_at
			  FROM media_assets WHERE id = $1`
	row := r.db.QueryRowContext(ctx, query, id)
	return scanMediaAsset(row)
}

func (r *MediaRepository) UpdateMetadata(ctx context.Context, id string, update media.MetadataUpdate, updatedBy string) (*media.MediaAsset, error) {
	query := `UPDATE media_assets 
			  SET display_filename = COALESCE($1, display_filename),
			      title = COALESCE($2, title),
			      alt_text = COALESCE($3, alt_text),
			      caption = COALESCE($4, caption),
			      updated_at = NOW(),
			      updated_by = $5
			  WHERE id = $6
			  RETURNING id, storage_key, bucket, original_filename, display_filename, detected_mime_type, size_bytes, checksum_sha256, title, alt_text, caption, status, created_at, created_by, updated_at, updated_by, archived_at`

	row := r.db.QueryRowContext(ctx, query, update.DisplayFilename, update.Title, update.AltText, update.Caption, updatedBy, id)
	return scanMediaAsset(row)
}

func (r *MediaRepository) ArchiveAsset(ctx context.Context, id string, archivedBy string) error {
	query := `UPDATE media_assets SET status = $1, archived_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $3`
	result, err := r.db.ExecContext(ctx, query, media.StatusArchived, archivedBy, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return media.ErrAssetNotFound
	}
	return nil
}

func (r *MediaRepository) ListAdminAssets(ctx context.Context, filter media.ListFilter) ([]media.MediaAsset, int, error) {
	offset := (filter.Page - 1) * filter.PageSize
	const countQuery = `SELECT count(*) FROM media_assets
		WHERE ($1 = '' OR strpos(lower(COALESCE(display_filename, '')), lower($1)) > 0 OR strpos(lower(COALESCE(original_filename, '')), lower($1)) > 0 OR strpos(lower(COALESCE(title, '')), lower($1)) > 0)
		AND ($2 = 'all' OR ($2 = 'image' AND detected_mime_type LIKE 'image/%') OR ($2 = 'document' AND detected_mime_type = 'application/pdf'))`

	var total int
	err := r.db.QueryRowContext(ctx, countQuery, filter.Query, filter.Kind).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	const query = `SELECT id, storage_key, bucket, original_filename, display_filename, detected_mime_type, size_bytes, checksum_sha256, title, alt_text, caption, status, created_at, created_by, updated_at, updated_by, archived_at
		FROM media_assets
		WHERE ($1 = '' OR strpos(lower(COALESCE(display_filename, '')), lower($1)) > 0 OR strpos(lower(COALESCE(original_filename, '')), lower($1)) > 0 OR strpos(lower(COALESCE(title, '')), lower($1)) > 0)
		AND ($2 = 'all' OR ($2 = 'image' AND detected_mime_type LIKE 'image/%') OR ($2 = 'document' AND detected_mime_type = 'application/pdf'))
		ORDER BY created_at DESC, id DESC LIMIT $3 OFFSET $4`

	rows, err := r.db.QueryContext(ctx, query, filter.Query, filter.Kind, filter.PageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]media.MediaAsset, 0)
	for rows.Next() {
		a, err := scanMediaAssetRow(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *a)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *MediaRepository) CheckIsPubliclyEligible(ctx context.Context, assetID string) (bool, error) {
	// A media is publicly eligible if it is attached to:
	// 1. A News that is 'published'
	// 2. An Announcement that is 'published'
	// 3. A Knowledge Revision that is the published_revision of its parent Knowledge Article.
	// 4. A published FAQ item.
	// 5. An active image selected by a published, indexable SEO profile.
	query := `
		SELECT EXISTS (
			SELECT 1 FROM media_usages mu
			LEFT JOIN news n ON mu.entity_type = 'news' AND mu.entity_id = n.id::text
			LEFT JOIN announcements a ON mu.entity_type = 'announcement' AND mu.entity_id = a.id::text
			LEFT JOIN knowledge_revisions kr ON mu.entity_type = 'knowledge_revision' AND mu.entity_id = kr.id::text
			LEFT JOIN knowledge_articles ka ON kr.article_id = ka.id
			LEFT JOIN faq_items fi ON mu.entity_type = 'faq_item' AND mu.entity_id = fi.id::text
			LEFT JOIN microlearning_items mi ON mu.entity_type = 'microlearning' AND mu.entity_id = mi.id::text
			WHERE mu.media_id = $1
			AND (
				(mu.entity_type = 'news' AND n.status = 'published')
				OR
				(mu.entity_type = 'announcement' AND a.status = 'published')
				OR
				(mu.entity_type = 'knowledge_revision' AND ka.status = 'published' AND ka.published_revision_no = kr.revision_no)
				OR
				(mu.entity_type = 'faq_item' AND fi.status = 'published' AND fi.published_at <= NOW())
				OR
				(mu.entity_type = 'microlearning' AND mi.status = 'published' AND mi.published_at <= NOW())
			)
		) OR EXISTS (
			SELECT 1 FROM seo_profiles seo
			LEFT JOIN news sn ON seo.content_type='news' AND seo.content_id=sn.id
			LEFT JOIN announcements sa ON seo.content_type='announcement' AND seo.content_id=sa.id
			LEFT JOIN knowledge_articles sk ON seo.content_type='knowledge' AND seo.content_id=sk.id
			WHERE seo.social_media_id=$1 AND seo.indexable
			AND (
				(seo.content_type='news' AND sn.status='published' AND sn.published_at<=NOW()) OR
				(seo.content_type='announcement' AND sa.status='published' AND sa.published_at<=NOW() AND (sa.start_at IS NULL OR sa.start_at<=NOW()) AND (sa.end_at IS NULL OR sa.end_at>NOW())) OR
				(seo.content_type='knowledge' AND sk.status='published' AND sk.published_revision_no IS NOT NULL)
			)
		) OR EXISTS (
			SELECT 1 FROM platform_config_versions configuration
			WHERE configuration.status='published' AND $1 IN (
				configuration.config->'identity'->>'logo_media_id',
				configuration.config->'banner'->>'media_id',
				configuration.config->'seo'->>'social_media_id'
			)
		)
	`
	var isEligible bool
	err := r.db.QueryRowContext(ctx, query, assetID).Scan(&isEligible)
	return isEligible, err
}

func (r *MediaRepository) HasActiveUsages(ctx context.Context, assetID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM media_usages WHERE media_id = $1)
		OR EXISTS(SELECT 1 FROM platform_config_versions configuration WHERE configuration.status IN ('draft','published') AND $1 IN (
			configuration.config->'identity'->>'logo_media_id', configuration.config->'banner'->>'media_id', configuration.config->'seo'->>'social_media_id'))`
	var exists bool
	err := r.db.QueryRowContext(ctx, query, assetID).Scan(&exists)
	return exists, err
}

func (r *MediaRepository) UsageEntityExists(ctx context.Context, entityType, entityID string) (bool, error) {
	query := `SELECT CASE $1
		WHEN 'news' THEN EXISTS(SELECT 1 FROM news WHERE id::text = $2)
		WHEN 'announcement' THEN EXISTS(SELECT 1 FROM announcements WHERE id::text = $2)
		WHEN 'knowledge_revision' THEN EXISTS(SELECT 1 FROM knowledge_revisions WHERE id::text = $2)
		WHEN 'faq_item' THEN EXISTS(SELECT 1 FROM faq_items WHERE id::text = $2)
		WHEN 'microlearning' THEN EXISTS(SELECT 1 FROM microlearning_items WHERE id::text = $2)
		ELSE FALSE END`
	var exists bool
	err := r.db.QueryRowContext(ctx, query, entityType, entityID).Scan(&exists)
	return exists, err
}

func (r *MediaRepository) AttachUsage(ctx context.Context, usage media.MediaUsage) error {
	query := `INSERT INTO media_usages (id, media_id, entity_type, entity_id, usage_role, sort_order, created_at, created_by)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			  ON CONFLICT (media_id, entity_type, entity_id, usage_role) DO UPDATE SET sort_order = EXCLUDED.sort_order`
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
	var origFilename, displayFilename, title, altText, caption sql.NullString
	var archivedAt sql.NullTime

	err := s.Scan(
		&m.ID, &m.StorageKey, &m.Bucket, &origFilename, &displayFilename, &m.DetectedMimeType, &m.SizeBytes, &m.ChecksumSHA256,
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
	if displayFilename.Valid {
		m.DisplayFilename = &displayFilename.String
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
