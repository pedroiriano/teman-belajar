package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"teman-belajar-api/internal/domain/banner"
)

type BannerRepository struct {
	db *sql.DB
}

func NewBannerRepository(db *sql.DB) *BannerRepository {
	return &BannerRepository{db: db}
}

var _ banner.Repository = (*BannerRepository)(nil)

func (r *BannerRepository) ListActive(ctx context.Context) ([]banner.Banner, error) {
	query := `
		SELECT id, title, description, image_url, cta_label, cta_href, align, sort_order, is_active,
		       created_at, updated_at, COALESCE(created_by, ''), COALESCE(updated_by, '')
		FROM hero_banners
		WHERE is_active = TRUE
		ORDER BY sort_order ASC, created_at ASC
		LIMIT 3
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []banner.Banner
	for rows.Next() {
		var b banner.Banner
		if err := rows.Scan(
			&b.ID, &b.Title, &b.Description, &b.ImageURL, &b.CTALabel, &b.CTAHref,
			&b.Align, &b.SortOrder, &b.IsActive, &b.CreatedAt, &b.UpdatedAt,
			&b.CreatedBy, &b.UpdatedBy,
		); err != nil {
			return nil, err
		}
		items = append(items, b)
	}
	return items, rows.Err()
}

func (r *BannerRepository) ListAll(ctx context.Context, page, pageSize int, search string, statusFilter string) ([]banner.Banner, int, error) {
	var conditions []string
	var args []any
	argIdx := 1

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(title ILIKE $%d OR description ILIKE $%d OR cta_label ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+search+"%")
		argIdx++
	}

	if statusFilter == "active" {
		conditions = append(conditions, "is_active = TRUE")
	} else if statusFilter == "inactive" {
		conditions = append(conditions, "is_active = FALSE")
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM hero_banners %s", whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	dataQuery := fmt.Sprintf(`
		SELECT id, title, description, image_url, cta_label, cta_href, align, sort_order, is_active,
		       created_at, updated_at, COALESCE(created_by, ''), COALESCE(updated_by, '')
		FROM hero_banners
		%s
		ORDER BY sort_order ASC, created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)
	args = append(args, pageSize, offset)

	rows, err := r.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []banner.Banner
	for rows.Next() {
		var b banner.Banner
		if err := rows.Scan(
			&b.ID, &b.Title, &b.Description, &b.ImageURL, &b.CTALabel, &b.CTAHref,
			&b.Align, &b.SortOrder, &b.IsActive, &b.CreatedAt, &b.UpdatedAt,
			&b.CreatedBy, &b.UpdatedBy,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, b)
	}
	return items, total, rows.Err()
}

func (r *BannerRepository) GetByID(ctx context.Context, id string) (*banner.Banner, error) {
	query := `
		SELECT id, title, description, image_url, cta_label, cta_href, align, sort_order, is_active,
		       created_at, updated_at, COALESCE(created_by, ''), COALESCE(updated_by, '')
		FROM hero_banners
		WHERE id = $1
	`
	var b banner.Banner
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&b.ID, &b.Title, &b.Description, &b.ImageURL, &b.CTALabel, &b.CTAHref,
		&b.Align, &b.SortOrder, &b.IsActive, &b.CreatedAt, &b.UpdatedAt,
		&b.CreatedBy, &b.UpdatedBy,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (r *BannerRepository) Create(ctx context.Context, b *banner.Banner) error {
	query := `
		INSERT INTO hero_banners (id, title, description, image_url, cta_label, cta_href, align, sort_order, is_active, created_at, updated_at, created_by, updated_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`
	_, err := r.db.ExecContext(ctx, query,
		b.ID, b.Title, b.Description, b.ImageURL, b.CTALabel, b.CTAHref,
		b.Align, b.SortOrder, b.IsActive, b.CreatedAt, b.UpdatedAt,
		b.CreatedBy, b.UpdatedBy,
	)
	return err
}

func (r *BannerRepository) Update(ctx context.Context, b *banner.Banner) error {
	query := `
		UPDATE hero_banners
		SET title = $2, description = $3, image_url = $4, cta_label = $5, cta_href = $6,
		    align = $7, sort_order = $8, is_active = $9, updated_at = $10, updated_by = $11
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query,
		b.ID, b.Title, b.Description, b.ImageURL, b.CTALabel, b.CTAHref,
		b.Align, b.SortOrder, b.IsActive, b.UpdatedAt, b.UpdatedBy,
	)
	return err
}

func (r *BannerRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM hero_banners WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *BannerRepository) CountActive(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM hero_banners WHERE is_active = TRUE`
	var count int
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	return count, err
}
