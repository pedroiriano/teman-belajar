package postgres

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	domain "teman-belajar-api/internal/domain/mediagallery"
)

type MediaGalleryRepository struct{ db *sql.DB }

func NewMediaGalleryRepository(db *sql.DB) *MediaGalleryRepository {
	return &MediaGalleryRepository{db: db}
}

var _ domain.Repository = (*MediaGalleryRepository)(nil)

const collectionColumns = `id, slug, title, summary, kind, status, featured, seo_title, seo_description, indexable, version, published_at, updated_at`

func (repository *MediaGalleryRepository) Create(ctx context.Context, input domain.Input, actor string) (*domain.Collection, error) {
	tx, err := repository.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	id := uuid.NewString()
	_, err = tx.ExecContext(ctx, `INSERT INTO media_collections (id,slug,title,summary,kind,status,featured,seo_title,seo_description,indexable,version,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,'draft',$6,$7,$8,$9,1,$10,$10)`, id, input.Slug, input.Title, input.Summary, input.Kind, input.Featured, input.SEOTitle, input.SEODescription, input.Indexable, actor)
	if err != nil {
		return nil, err
	}
	if err = replaceCollectionItems(ctx, tx, id, input.Items, actor); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return repository.GetAdmin(ctx, id)
}

func (repository *MediaGalleryRepository) Update(ctx context.Context, id string, expectedVersion int64, input domain.Input, actor string) (*domain.Collection, error) {
	tx, err := repository.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(ctx, `UPDATE media_collections SET slug=$1,title=$2,summary=$3,kind=$4,featured=$5,seo_title=$6,seo_description=$7,indexable=$8,version=version+1,updated_at=NOW(),updated_by=$9 WHERE id=$10 AND version=$11 AND status='draft'`, input.Slug, input.Title, input.Summary, input.Kind, input.Featured, input.SEOTitle, input.SEODescription, input.Indexable, actor, id, expectedVersion)
	if err != nil {
		return nil, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rows == 0 {
		return nil, domain.ErrVersionConflict
	}
	if err = replaceCollectionItems(ctx, tx, id, input.Items, actor); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return repository.GetAdmin(ctx, id)
}

func (repository *MediaGalleryRepository) Transition(ctx context.Context, id string, expectedVersion int64, next, actor string) (*domain.Collection, error) {
	result, err := repository.db.ExecContext(ctx, `UPDATE media_collections SET status=$1::varchar,version=version+1,published_at=CASE WHEN $1::varchar='published' THEN NOW() ELSE published_at END,updated_at=NOW(),updated_by=$2 WHERE id=$3 AND version=$4`, next, actor, id, expectedVersion)
	if err != nil {
		return nil, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rows == 0 {
		return nil, domain.ErrVersionConflict
	}
	return repository.GetAdmin(ctx, id)
}

func (repository *MediaGalleryRepository) GetAdmin(ctx context.Context, id string) (*domain.Collection, error) {
	row := repository.db.QueryRowContext(ctx, `SELECT `+collectionColumns+` FROM media_collections WHERE id=$1`, id)
	collection, err := scanCollection(row)
	if err != nil {
		return nil, err
	}
	collection.Items, err = repository.loadItems(ctx, id, false)
	return collection, err
}

func (repository *MediaGalleryRepository) GetPublic(ctx context.Context, slug string) (*domain.Collection, error) {
	row := repository.db.QueryRowContext(ctx, `SELECT `+collectionColumns+` FROM media_collections WHERE slug=$1 AND status='published' AND published_at<=NOW()`, slug)
	collection, err := scanCollection(row)
	if err != nil {
		return nil, err
	}
	collection.Items, err = repository.loadItems(ctx, collection.ID, true)
	return collection, err
}

func (repository *MediaGalleryRepository) ListAdmin(ctx context.Context, filter domain.Filter) (domain.Page, error) {
	const predicate = `($1='' OR strpos(lower(title),lower($1))>0 OR strpos(lower(summary),lower($1))>0) AND ($2='' OR kind=$2) AND ($3='' OR status=$3)`
	var total int
	if err := repository.db.QueryRowContext(ctx, `SELECT count(*) FROM media_collections WHERE `+predicate, filter.Query, filter.Kind, filter.Status).Scan(&total); err != nil {
		return domain.Page{}, err
	}
	rows, err := repository.db.QueryContext(ctx, `SELECT `+collectionColumns+` FROM media_collections WHERE `+predicate+` ORDER BY updated_at DESC,id DESC LIMIT $4 OFFSET $5`, filter.Query, filter.Kind, filter.Status, filter.PageSize, (filter.Page-1)*filter.PageSize)
	if err != nil {
		return domain.Page{}, err
	}
	defer rows.Close()
	return repository.scanPage(ctx, rows, filter, total, false)
}

func (repository *MediaGalleryRepository) ListPublic(ctx context.Context, filter domain.Filter) (domain.Page, error) {
	const predicate = `status='published' AND published_at<=NOW() AND ($1='' OR strpos(lower(title),lower($1))>0 OR strpos(lower(summary),lower($1))>0) AND ($2='' OR kind=$2)`
	var total int
	if err := repository.db.QueryRowContext(ctx, `SELECT count(*) FROM media_collections WHERE `+predicate, filter.Query, filter.Kind).Scan(&total); err != nil {
		return domain.Page{}, err
	}
	rows, err := repository.db.QueryContext(ctx, `SELECT `+collectionColumns+` FROM media_collections WHERE `+predicate+` ORDER BY featured DESC,published_at DESC,id DESC LIMIT $3 OFFSET $4`, filter.Query, filter.Kind, filter.PageSize, (filter.Page-1)*filter.PageSize)
	if err != nil {
		return domain.Page{}, err
	}
	defer rows.Close()
	return repository.scanPage(ctx, rows, filter, total, true)
}

func (repository *MediaGalleryRepository) scanPage(ctx context.Context, rows *sql.Rows, filter domain.Filter, total int, public bool) (domain.Page, error) {
	items := []domain.Collection{}
	for rows.Next() {
		collection, err := scanCollection(rows)
		if err != nil {
			return domain.Page{}, err
		}
		collection.Items, err = repository.loadItems(ctx, collection.ID, public)
		if err != nil {
			return domain.Page{}, err
		}
		items = append(items, *collection)
	}
	if err := rows.Err(); err != nil {
		return domain.Page{}, err
	}
	pages := total / filter.PageSize
	if total%filter.PageSize != 0 {
		pages++
	}
	return domain.Page{Data: items, Page: filter.Page, PageSize: filter.PageSize, Total: total, TotalPages: pages}, nil
}

func (repository *MediaGalleryRepository) loadItems(ctx context.Context, collectionID string, public bool) ([]domain.Item, error) {
	query := `SELECT item.id,item.media_id,item.sort_order,item.featured,item.caption,item.alt_text,item.decorative,item.transcript,asset.detected_mime_type,COALESCE(asset.display_filename,asset.original_filename,asset.id::text) FROM media_collection_items item JOIN media_assets asset ON asset.id=item.media_id WHERE item.collection_id=$1`
	if public {
		query += ` AND asset.status='active'`
	}
	query += ` ORDER BY item.sort_order,item.id`
	rows, err := repository.db.QueryContext(ctx, query, collectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []domain.Item{}
	for rows.Next() {
		var item domain.Item
		var caption, alt, transcript sql.NullString
		if err := rows.Scan(&item.ID, &item.MediaID, &item.SortOrder, &item.Featured, &caption, &alt, &item.Decorative, &transcript, &item.MimeType, &item.DisplayFilename); err != nil {
			return nil, err
		}
		if caption.Valid {
			item.Caption = &caption.String
		}
		if alt.Valid {
			item.AltText = &alt.String
		}
		if transcript.Valid {
			item.Transcript = &transcript.String
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func replaceCollectionItems(ctx context.Context, tx *sql.Tx, collectionID string, items []domain.ItemInput, actor string) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM media_collection_items WHERE collection_id=$1`, collectionID); err != nil {
		return err
	}
	for _, item := range items {
		_, err := tx.ExecContext(ctx, `INSERT INTO media_collection_items (id,collection_id,media_id,sort_order,featured,caption,alt_text,decorative,transcript,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, uuid.NewString(), collectionID, item.MediaID, item.SortOrder, item.Featured, item.Caption, item.AltText, item.Decorative, item.Transcript, actor)
		if err != nil {
			return err
		}
	}
	return nil
}

type collectionScanner interface{ Scan(...any) error }

func scanCollection(scanner collectionScanner) (*domain.Collection, error) {
	var collection domain.Collection
	var seoTitle, seoDescription sql.NullString
	var published sql.NullTime
	err := scanner.Scan(&collection.ID, &collection.Slug, &collection.Title, &collection.Summary, &collection.Kind, &collection.Status, &collection.Featured, &seoTitle, &seoDescription, &collection.Indexable, &collection.Version, &published, &collection.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if seoTitle.Valid {
		collection.SEOTitle = &seoTitle.String
	}
	if seoDescription.Valid {
		collection.SEODescription = &seoDescription.String
	}
	if published.Valid {
		collection.PublishedAt = &published.Time
	}
	collection.Items = []domain.Item{}
	return &collection, nil
}
