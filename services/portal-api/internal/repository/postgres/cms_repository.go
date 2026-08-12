package postgres

import (
	"context"
	"database/sql"
	"errors"

	"teman-belajar-api/internal/domain/cms"
)

type CMSRepository struct {
	db *sql.DB
}

func NewCMSRepository(db *sql.DB) *CMSRepository {
	return &CMSRepository{db: db}
}

// Ensure interface compliance
var _ cms.Repository = (*CMSRepository)(nil)

func (r *CMSRepository) CreateNews(ctx context.Context, n *cms.News) error {
	query := `INSERT INTO news (id, slug, title, excerpt, body, status, category_id, published_at, created_at, created_by, updated_at, updated_by)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
	_, err := r.db.ExecContext(ctx, query,
		n.ID, n.Slug, n.Title, n.Excerpt, n.Body, n.Status, n.CategoryID,
		n.PublishedAt, n.CreatedAt, n.CreatedBy, n.UpdatedAt, n.UpdatedBy,
	)
	return err
}

func (r *CMSRepository) GetNewsByID(ctx context.Context, id string) (*cms.News, error) {
	query := `SELECT id, slug, title, excerpt, body, status, category_id, published_at, created_at, created_by, updated_at, updated_by
			  FROM news WHERE id = $1`
	row := r.db.QueryRowContext(ctx, query, id)
	return scanNews(row)
}

func (r *CMSRepository) GetNewsBySlug(ctx context.Context, slug string) (*cms.News, error) {
	query := `SELECT id, slug, title, excerpt, body, status, category_id, published_at, created_at, created_by, updated_at, updated_by
			  FROM news WHERE slug = $1`
	row := r.db.QueryRowContext(ctx, query, slug)
	return scanNews(row)
}

func (r *CMSRepository) UpdateNews(ctx context.Context, n *cms.News) error {
	query := `UPDATE news SET slug=$1, title=$2, excerpt=$3, body=$4, status=$5, category_id=$6, published_at=$7, updated_at=$8, updated_by=$9
			  WHERE id = $10`
	_, err := r.db.ExecContext(ctx, query,
		n.Slug, n.Title, n.Excerpt, n.Body, n.Status, n.CategoryID, n.PublishedAt, n.UpdatedAt, n.UpdatedBy, n.ID,
	)
	return err
}

func (r *CMSRepository) ListPublicNews(ctx context.Context, page, pageSize int) ([]cms.News, int, error) {
	offset := (page - 1) * pageSize
	
	var total int
	err := r.db.QueryRowContext(ctx, `SELECT count(*) FROM news WHERE status = 'published'`).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `SELECT id, slug, title, excerpt, body, status, category_id, published_at, created_at, created_by, updated_at, updated_by
			  FROM news WHERE status = 'published' ORDER BY published_at DESC LIMIT $1 OFFSET $2`
	
	rows, err := r.db.QueryContext(ctx, query, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []cms.News
	for rows.Next() {
		n, err := scanNewsRow(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *n)
	}

	return items, total, nil
}

func (r *CMSRepository) ListAdminNews(ctx context.Context, page, pageSize int) ([]cms.News, int, error) {
	offset := (page - 1) * pageSize
	
	var total int
	err := r.db.QueryRowContext(ctx, `SELECT count(*) FROM news`).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `SELECT id, slug, title, excerpt, body, status, category_id, published_at, created_at, created_by, updated_at, updated_by
			  FROM news ORDER BY created_at DESC LIMIT $1 OFFSET $2`
	
	rows, err := r.db.QueryContext(ctx, query, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []cms.News
	for rows.Next() {
		n, err := scanNewsRow(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *n)
	}

	return items, total, nil
}

// Announcements

func (r *CMSRepository) CreateAnnouncement(ctx context.Context, a *cms.Announcement) error {
	query := `INSERT INTO announcements (id, slug, title, body, status, start_at, end_at, published_at, created_at, created_by, updated_at, updated_by)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
	_, err := r.db.ExecContext(ctx, query,
		a.ID, a.Slug, a.Title, a.Body, a.Status, a.StartAt, a.EndAt, a.PublishedAt,
		a.CreatedAt, a.CreatedBy, a.UpdatedAt, a.UpdatedBy,
	)
	return err
}

func (r *CMSRepository) GetAnnouncementByID(ctx context.Context, id string) (*cms.Announcement, error) {
	query := `SELECT id, slug, title, body, status, start_at, end_at, published_at, created_at, created_by, updated_at, updated_by
			  FROM announcements WHERE id = $1`
	row := r.db.QueryRowContext(ctx, query, id)
	return scanAnnouncement(row)
}

func (r *CMSRepository) GetAnnouncementBySlug(ctx context.Context, slug string) (*cms.Announcement, error) {
	query := `SELECT id, slug, title, body, status, start_at, end_at, published_at, created_at, created_by, updated_at, updated_by
			  FROM announcements WHERE slug = $1`
	row := r.db.QueryRowContext(ctx, query, slug)
	return scanAnnouncement(row)
}

func (r *CMSRepository) UpdateAnnouncement(ctx context.Context, a *cms.Announcement) error {
	query := `UPDATE announcements SET slug=$1, title=$2, body=$3, status=$4, start_at=$5, end_at=$6, published_at=$7, updated_at=$8, updated_by=$9
			  WHERE id = $10`
	_, err := r.db.ExecContext(ctx, query,
		a.Slug, a.Title, a.Body, a.Status, a.StartAt, a.EndAt, a.PublishedAt, a.UpdatedAt, a.UpdatedBy, a.ID,
	)
	return err
}

func (r *CMSRepository) ListActiveAnnouncements(ctx context.Context) ([]cms.Announcement, error) {
	query := `SELECT id, slug, title, body, status, start_at, end_at, published_at, created_at, created_by, updated_at, updated_by
			  FROM announcements 
			  WHERE status = 'published' 
			  AND (start_at IS NULL OR start_at <= NOW()) 
			  AND (end_at IS NULL OR end_at > NOW())
			  ORDER BY published_at DESC`
	
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []cms.Announcement
	for rows.Next() {
		a, err := scanAnnouncementRow(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *a)
	}

	return items, nil
}

func (r *CMSRepository) ListAdminAnnouncements(ctx context.Context, page, pageSize int) ([]cms.Announcement, int, error) {
	offset := (page - 1) * pageSize
	
	var total int
	err := r.db.QueryRowContext(ctx, `SELECT count(*) FROM announcements`).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `SELECT id, slug, title, body, status, start_at, end_at, published_at, created_at, created_by, updated_at, updated_by
			  FROM announcements ORDER BY created_at DESC LIMIT $1 OFFSET $2`
	
	rows, err := r.db.QueryContext(ctx, query, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []cms.Announcement
	for rows.Next() {
		a, err := scanAnnouncementRow(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *a)
	}

	return items, total, nil
}


// Scanners

type rowScanner interface {
	Scan(dest ...any) error
}

func scanNews(s rowScanner) (*cms.News, error) {
	var n cms.News
	var excerpt sql.NullString
	err := s.Scan(&n.ID, &n.Slug, &n.Title, &excerpt, &n.Body, &n.Status, &n.CategoryID,
		&n.PublishedAt, &n.CreatedAt, &n.CreatedBy, &n.UpdatedAt, &n.UpdatedBy)
	
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, cms.ErrNotFound
		}
		return nil, err
	}
	if excerpt.Valid {
		n.Excerpt = excerpt.String
	}
	return &n, nil
}

func scanNewsRow(rows *sql.Rows) (*cms.News, error) {
	return scanNews(rows)
}

func scanAnnouncement(s rowScanner) (*cms.Announcement, error) {
	var a cms.Announcement
	err := s.Scan(&a.ID, &a.Slug, &a.Title, &a.Body, &a.Status, &a.StartAt, &a.EndAt, &a.PublishedAt,
		&a.CreatedAt, &a.CreatedBy, &a.UpdatedAt, &a.UpdatedBy)
	
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, cms.ErrNotFound
		}
		return nil, err
	}
	return &a, nil
}

func scanAnnouncementRow(rows *sql.Rows) (*cms.Announcement, error) {
	return scanAnnouncement(rows)
}
