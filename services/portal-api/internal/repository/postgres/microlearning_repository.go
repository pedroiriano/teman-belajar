package postgres

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/lib/pq"
	"teman-belajar-api/internal/domain/microlearning"
)

type MicrolearningRepository struct{ db *sql.DB }

func NewMicrolearningRepository(db *sql.DB) *MicrolearningRepository {
	return &MicrolearningRepository{db: db}
}

var _ microlearning.Repository = (*MicrolearningRepository)(nil)

func mapMicrolearningError(err error) error {
	var postgresError *pq.Error
	if errors.As(err, &postgresError) && (postgresError.Code == "23505" || postgresError.Code == "23503" || postgresError.Code == "23514") {
		return microlearning.ErrConflict
	}
	return err
}

func (r *MicrolearningRepository) Create(ctx context.Context, item *microlearning.Item, related []string, actor string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	_, err = tx.ExecContext(ctx, `INSERT INTO microlearning_items (id,slug,title,summary,body,format,duration_minutes,video_url,featured_media_id,status,version,seo_title,seo_description,indexable,published_at,created_at,created_by,updated_at,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,NULLIF($8,''),NULLIF($9,'')::uuid,$10,$11,$12,$13,$14,$15,$16,$17,$18,$17)`, item.ID, item.Slug, item.Title, item.Summary, item.Body, item.Format, item.DurationMinutes, item.VideoURL, item.FeaturedMediaID, item.Status, item.Version, item.SEOTitle, item.SEODescription, item.Indexable, item.PublishedAt, item.CreatedAt, nullableActor(actor), item.UpdatedAt)
	if err != nil {
		return mapMicrolearningError(err)
	}
	if err = replaceMicrolearningRelations(ctx, tx, item, related, actor); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *MicrolearningRepository) Update(ctx context.Context, item *microlearning.Item, related []string, expected int64, actor string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(ctx, `UPDATE microlearning_items SET slug=$1,title=$2,summary=$3,body=$4,format=$5,duration_minutes=$6,video_url=NULLIF($7,''),featured_media_id=NULLIF($8,'')::uuid,status=$9,version=$10,seo_title=$11,seo_description=$12,indexable=$13,published_at=$14,updated_at=$15,updated_by=$16 WHERE id=$17 AND version=$18`, item.Slug, item.Title, item.Summary, item.Body, item.Format, item.DurationMinutes, item.VideoURL, item.FeaturedMediaID, item.Status, item.Version, item.SEOTitle, item.SEODescription, item.Indexable, item.PublishedAt, item.UpdatedAt, nullableActor(actor), item.ID, expected)
	if err != nil {
		return mapMicrolearningError(err)
	}
	count, err := result.RowsAffected()
	if err != nil || count != 1 {
		return microlearning.ErrConflict
	}
	if err = replaceMicrolearningRelations(ctx, tx, item, related, actor); err != nil {
		return err
	}
	return tx.Commit()
}

func replaceMicrolearningRelations(ctx context.Context, tx *sql.Tx, item *microlearning.Item, related []string, actor string) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM microlearning_related WHERE item_id=$1`, item.ID); err != nil {
		return err
	}
	for i, id := range related {
		if _, err := tx.ExecContext(ctx, `INSERT INTO microlearning_related (item_id,related_item_id,sort_order) VALUES ($1,$2,$3)`, item.ID, id, i+1); err != nil {
			return mapMicrolearningError(err)
		}
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM media_usages WHERE entity_type='microlearning' AND entity_id=$1 AND usage_role='featured'`, item.ID); err != nil {
		return err
	}
	if item.FeaturedMediaID != "" {
		if _, err := tx.ExecContext(ctx, `INSERT INTO media_usages (id,media_id,entity_type,entity_id,usage_role,sort_order,created_at,created_by) VALUES (gen_random_uuid(),$1,'microlearning',$2,'featured',0,NOW(),$3) ON CONFLICT (media_id,entity_type,entity_id,usage_role) DO NOTHING`, item.FeaturedMediaID, item.ID, nullableActor(actor)); err != nil {
			return mapMicrolearningError(err)
		}
	}
	return nil
}

type microlearningScanner interface{ Scan(...any) error }

const microlearningColumns = `id,slug,title,summary,body,format,duration_minutes,COALESCE(video_url,''),COALESCE(featured_media_id::text,''),status,version,seo_title,seo_description,indexable,published_at,created_at,updated_at`

func scanMicrolearning(s microlearningScanner) (*microlearning.Item, error) {
	var x microlearning.Item
	err := s.Scan(&x.ID, &x.Slug, &x.Title, &x.Summary, &x.Body, &x.Format, &x.DurationMinutes, &x.VideoURL, &x.FeaturedMediaID, &x.Status, &x.Version, &x.SEOTitle, &x.SEODescription, &x.Indexable, &x.PublishedAt, &x.CreatedAt, &x.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, microlearning.ErrNotFound
	}
	if x.FeaturedMediaID != "" {
		x.FeaturedMediaURL = "/media/" + x.FeaturedMediaID
	}
	x.Related = []microlearning.RelatedItem{}
	return &x, err
}

func (r *MicrolearningRepository) loadRelated(ctx context.Context, item *microlearning.Item, public bool) error {
	query := `SELECT m.id,m.slug,m.title,m.summary,m.format,m.duration_minutes FROM microlearning_related rel JOIN microlearning_items m ON m.id=rel.related_item_id WHERE rel.item_id=$1`
	if public {
		query += ` AND m.status='published' AND m.published_at IS NOT NULL AND m.published_at<=NOW()`
	}
	query += ` ORDER BY rel.sort_order,m.id`
	rows, err := r.db.QueryContext(ctx, query, item.ID)
	if err != nil {
		return err
	}
	defer rows.Close()
	item.Related = []microlearning.RelatedItem{}
	for rows.Next() {
		var x microlearning.RelatedItem
		if err := rows.Scan(&x.ID, &x.Slug, &x.Title, &x.Summary, &x.Format, &x.DurationMinutes); err != nil {
			return err
		}
		item.Related = append(item.Related, x)
	}
	return rows.Err()
}
func (r *MicrolearningRepository) GetByID(ctx context.Context, id string) (*microlearning.Item, error) {
	x, e := scanMicrolearning(r.db.QueryRowContext(ctx, `SELECT `+microlearningColumns+` FROM microlearning_items WHERE id=$1`, id))
	if e != nil {
		return nil, e
	}
	return x, r.loadRelated(ctx, x, false)
}
func (r *MicrolearningRepository) GetPublishedByID(ctx context.Context, id string) (*microlearning.Item, error) {
	x, e := scanMicrolearning(r.db.QueryRowContext(ctx, `SELECT `+microlearningColumns+` FROM microlearning_items WHERE id=$1 AND status='published' AND published_at IS NOT NULL AND published_at<=NOW()`, id))
	if e != nil {
		return nil, e
	}
	return x, r.loadRelated(ctx, x, true)
}
func (r *MicrolearningRepository) GetPublishedBySlug(ctx context.Context, slug string) (*microlearning.Item, error) {
	x, e := scanMicrolearning(r.db.QueryRowContext(ctx, `SELECT `+microlearningColumns+` FROM microlearning_items WHERE slug=$1 AND status='published' AND published_at IS NOT NULL AND published_at<=NOW()`, slug))
	if e != nil {
		return nil, e
	}
	return x, r.loadRelated(ctx, x, true)
}

func (r *MicrolearningRepository) list(ctx context.Context, f microlearning.ListFilter, public bool) ([]microlearning.Item, int, error) {
	status := f.Status
	if status == "all" {
		status = ""
	}
	like := "%" + f.Query + "%"
	var total int
	base := ` FROM microlearning_items WHERE ($1='' OR title ILIKE $2 OR summary ILIKE $2) AND ($3='' OR format=$3)`
	args := []any{f.Query, like, f.Format}
	if public {
		base += ` AND status='published' AND published_at IS NOT NULL AND published_at<=NOW()`
	} else {
		base += ` AND ($4='' OR status=$4)`
		args = append(args, status)
	}
	if err := r.db.QueryRowContext(ctx, `SELECT count(*)`+base, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	query := `SELECT ` + microlearningColumns + base + ` ORDER BY `
	if public {
		query += `published_at DESC,title LIMIT $4 OFFSET $5`
	} else {
		query += `updated_at DESC LIMIT $5 OFFSET $6`
	}
	args = append(args, f.PageSize, (f.Page-1)*f.PageSize)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []microlearning.Item{}
	for rows.Next() {
		x, e := scanMicrolearning(rows)
		if e != nil {
			return nil, 0, e
		}
		items = append(items, *x)
	}
	if err = rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}
func (r *MicrolearningRepository) ListPublic(ctx context.Context, f microlearning.ListFilter) ([]microlearning.Item, int, error) {
	return r.list(ctx, f, true)
}
func (r *MicrolearningRepository) ListAdmin(ctx context.Context, f microlearning.ListFilter) ([]microlearning.Item, int, error) {
	return r.list(ctx, f, false)
}

func (r *MicrolearningRepository) ValidateFeaturedMedia(ctx context.Context, id string) error {
	var ok bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM media_assets WHERE id=$1 AND status='active' AND detected_mime_type LIKE 'image/%')`, id).Scan(&ok)
	if err != nil {
		return err
	}
	if !ok {
		return microlearning.ErrValidation
	}
	return nil
}
func (r *MicrolearningRepository) ValidateRelated(ctx context.Context, self string, ids []string) error {
	for _, id := range ids {
		var ok bool
		err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM microlearning_items WHERE id=$1 AND id<>$2)`, id, self).Scan(&ok)
		if err != nil {
			return err
		}
		if !ok {
			return microlearning.ErrValidation
		}
	}
	return nil
}

func (r *MicrolearningRepository) UpsertProgress(ctx context.Context, user, id string, in microlearning.ProgressInput) (*microlearning.Progress, error) {
	x := &microlearning.Progress{ItemID: id, ProgressPercent: in.ProgressPercent, PositionSeconds: in.PositionSeconds, Source: "portal", State: "editorial_activity", FormalCompletion: false}
	err := r.db.QueryRowContext(ctx, `INSERT INTO microlearning_progress (user_subject,item_id,progress_percent,position_seconds) VALUES ($1,$2,$3,$4) ON CONFLICT (user_subject,item_id) DO UPDATE SET progress_percent=EXCLUDED.progress_percent,position_seconds=EXCLUDED.position_seconds,updated_at=CASE WHEN microlearning_progress.progress_percent=EXCLUDED.progress_percent AND microlearning_progress.position_seconds=EXCLUDED.position_seconds THEN microlearning_progress.updated_at ELSE NOW() END RETURNING updated_at`, user, id, in.ProgressPercent, in.PositionSeconds).Scan(&x.UpdatedAt)
	return x, err
}
func (r *MicrolearningRepository) GetProgress(ctx context.Context, user, id string) (*microlearning.Progress, error) {
	x := &microlearning.Progress{ItemID: id, Source: "portal", State: "editorial_activity", FormalCompletion: false}
	err := r.db.QueryRowContext(ctx, `SELECT progress_percent,position_seconds,updated_at FROM microlearning_progress WHERE user_subject=$1 AND item_id=$2`, user, id).Scan(&x.ProgressPercent, &x.PositionSeconds, &x.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		x.UpdatedAt = timeNowUTC()
		return x, nil
	}
	return x, err
}

var timeNowUTC = func() time.Time { return time.Now().UTC() }
