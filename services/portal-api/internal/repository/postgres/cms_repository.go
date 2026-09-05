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
	query := `INSERT INTO news (id, slug, title, excerpt, body, status, category_id, published_at, created_at, created_by, updated_at, updated_by, version)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`
	_, err := r.db.ExecContext(ctx, query,
		n.ID, n.Slug, n.Title, n.Excerpt, n.Body, n.Status, n.CategoryID,
		n.PublishedAt, n.CreatedAt, n.CreatedBy, n.UpdatedAt, n.UpdatedBy, n.Version,
	)
	return err
}

func (r *CMSRepository) GetNewsByID(ctx context.Context, id string) (*cms.News, error) {
	query := `SELECT id, slug, title, excerpt, body, status, category_id, published_at, created_at, created_by, updated_at, updated_by, version
			  FROM news WHERE id = $1`
	row := r.db.QueryRowContext(ctx, query, id)
	return scanNews(row)
}

func (r *CMSRepository) GetNewsBySlug(ctx context.Context, slug string) (*cms.News, error) {
	query := `SELECT id, slug, title, excerpt, body, status, category_id, published_at, created_at, created_by, updated_at, updated_by, version
			  FROM news WHERE slug = $1`
	row := r.db.QueryRowContext(ctx, query, slug)
	return scanNews(row)
}

func (r *CMSRepository) UpdateNews(ctx context.Context, n *cms.News, expectedVersion int64) error {
	query := `UPDATE news SET slug=$1, title=$2, excerpt=$3, body=$4, status=$5, category_id=$6, published_at=$7, updated_at=$8, updated_by=$9, version=$10
			  WHERE id = $11 AND version = $12`
	result, err := r.db.ExecContext(ctx, query,
		n.Slug, n.Title, n.Excerpt, n.Body, n.Status, n.CategoryID, n.PublishedAt, n.UpdatedAt, n.UpdatedBy, n.Version, n.ID, expectedVersion,
	)
	return contentUpdateResult(result, err)
}

func (r *CMSRepository) ListPublicNews(ctx context.Context, page, pageSize int) ([]cms.News, int, error) {
	offset := (page - 1) * pageSize

	var total int
	err := r.db.QueryRowContext(ctx, `SELECT count(*) FROM news WHERE status = 'published'`).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `SELECT id, slug, title, excerpt, body, status, category_id, published_at, created_at, created_by, updated_at, updated_by, version
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

	query := `SELECT id, slug, title, excerpt, body, status, category_id, published_at, created_at, created_by, updated_at, updated_by, version
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
	query := `INSERT INTO announcements (id, slug, title, body, status, start_at, end_at, published_at, created_at, created_by, updated_at, updated_by, version)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`
	_, err := r.db.ExecContext(ctx, query,
		a.ID, a.Slug, a.Title, a.Body, a.Status, a.StartAt, a.EndAt, a.PublishedAt,
		a.CreatedAt, a.CreatedBy, a.UpdatedAt, a.UpdatedBy, a.Version,
	)
	return err
}

func (r *CMSRepository) GetAnnouncementByID(ctx context.Context, id string) (*cms.Announcement, error) {
	query := `SELECT id, slug, title, body, status, start_at, end_at, published_at, created_at, created_by, updated_at, updated_by, version
			  FROM announcements WHERE id = $1`
	row := r.db.QueryRowContext(ctx, query, id)
	return scanAnnouncement(row)
}

func (r *CMSRepository) GetAnnouncementBySlug(ctx context.Context, slug string) (*cms.Announcement, error) {
	query := `SELECT id, slug, title, body, status, start_at, end_at, published_at, created_at, created_by, updated_at, updated_by, version
			  FROM announcements WHERE slug = $1`
	row := r.db.QueryRowContext(ctx, query, slug)
	return scanAnnouncement(row)
}

func (r *CMSRepository) UpdateAnnouncement(ctx context.Context, a *cms.Announcement, expectedVersion int64) error {
	query := `UPDATE announcements SET slug=$1, title=$2, body=$3, status=$4, start_at=$5, end_at=$6, published_at=$7, updated_at=$8, updated_by=$9, version=$10
			  WHERE id = $11 AND version = $12`
	result, err := r.db.ExecContext(ctx, query,
		a.Slug, a.Title, a.Body, a.Status, a.StartAt, a.EndAt, a.PublishedAt, a.UpdatedAt, a.UpdatedBy, a.Version, a.ID, expectedVersion,
	)
	return contentUpdateResult(result, err)
}

func (r *CMSRepository) ListActiveAnnouncements(ctx context.Context) ([]cms.Announcement, error) {
	query := `SELECT id, slug, title, body, status, start_at, end_at, published_at, created_at, created_by, updated_at, updated_by, version
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

	query := `SELECT id, slug, title, body, status, start_at, end_at, published_at, created_at, created_by, updated_at, updated_by, version
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
		&n.PublishedAt, &n.CreatedAt, &n.CreatedBy, &n.UpdatedAt, &n.UpdatedBy, &n.Version)

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
		&a.CreatedAt, &a.CreatedBy, &a.UpdatedAt, &a.UpdatedBy, &a.Version)

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

func contentUpdateResult(result sql.Result, err error) error {
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows != 1 {
		return cms.ErrConflict
	}
	return nil
}

func (r *CMSRepository) CreateNewsRevision(ctx context.Context, rev *cms.NewsRevision) error {
	query := `INSERT INTO news_revisions (id, news_id, revision_no, title, excerpt, body, author_id, created_at)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			  ON CONFLICT (news_id, revision_no) DO UPDATE SET title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, body = EXCLUDED.body`
	_, err := r.db.ExecContext(ctx, query,
		rev.ID, rev.NewsID, rev.RevisionNo, rev.Title, rev.Excerpt, rev.Body, rev.AuthorID, rev.CreatedAt,
	)
	return err
}

func (r *CMSRepository) ListNewsRevisions(ctx context.Context, newsID string) ([]cms.NewsRevision, error) {
	query := `SELECT id, news_id, revision_no, title, excerpt, body, author_id, created_at
			  FROM news_revisions WHERE news_id = $1 ORDER BY revision_no DESC`
	rows, err := r.db.QueryContext(ctx, query, newsID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var revisions []cms.NewsRevision
	for rows.Next() {
		var rev cms.NewsRevision
		var authorID sql.NullString
		var excerpt sql.NullString
		if err := rows.Scan(&rev.ID, &rev.NewsID, &rev.RevisionNo, &rev.Title, &excerpt, &rev.Body, &authorID, &rev.CreatedAt); err != nil {
			return nil, err
		}
		if authorID.Valid {
			rev.AuthorID = &authorID.String
		}
		if excerpt.Valid {
			rev.Excerpt = excerpt.String
		}
		revisions = append(revisions, rev)
	}
	return revisions, nil
}

func (r *CMSRepository) CreateAnnouncementRevision(ctx context.Context, rev *cms.AnnouncementRevision) error {
	query := `INSERT INTO announcement_revisions (id, announcement_id, revision_no, title, body, author_id, created_at)
			  VALUES ($1, $2, $3, $4, $5, $6, $7)
			  ON CONFLICT (announcement_id, revision_no) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body`
	_, err := r.db.ExecContext(ctx, query,
		rev.ID, rev.AnnouncementID, rev.RevisionNo, rev.Title, rev.Body, rev.AuthorID, rev.CreatedAt,
	)
	return err
}

func (r *CMSRepository) ListAnnouncementRevisions(ctx context.Context, announcementID string) ([]cms.AnnouncementRevision, error) {
	query := `SELECT id, announcement_id, revision_no, title, body, author_id, created_at
			  FROM announcement_revisions WHERE announcement_id = $1 ORDER BY revision_no DESC`
	rows, err := r.db.QueryContext(ctx, query, announcementID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var revisions []cms.AnnouncementRevision
	for rows.Next() {
		var rev cms.AnnouncementRevision
		var authorID sql.NullString
		if err := rows.Scan(&rev.ID, &rev.AnnouncementID, &rev.RevisionNo, &rev.Title, &rev.Body, &authorID, &rev.CreatedAt); err != nil {
			return nil, err
		}
		if authorID.Valid {
			rev.AuthorID = &authorID.String
		}
		revisions = append(revisions, rev)
	}
	return revisions, nil
}
