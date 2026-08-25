package postgres

import (
	"context"
	"database/sql"
	"errors"

	"github.com/lib/pq"

	"teman-belajar-api/internal/domain/faq"
)

type FAQRepository struct{ db *sql.DB }

func NewFAQRepository(db *sql.DB) *FAQRepository { return &FAQRepository{db: db} }

var _ faq.Repository = (*FAQRepository)(nil)

func mapFAQWriteError(err error) error {
	var postgresError *pq.Error
	if errors.As(err, &postgresError) && postgresError.Code == "23505" {
		return faq.ErrConflict
	}
	return err
}

func nullableActor(actor string) any {
	if actor == "" {
		return nil
	}
	return actor
}

func (r *FAQRepository) CreateCategory(ctx context.Context, item *faq.Category, actor string) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO faq_categories (id, slug, name, description, sort_order, status, created_at, created_by, updated_at, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$8)`, item.ID, item.Slug, item.Name, item.Description, item.SortOrder, item.Status, item.CreatedAt, nullableActor(actor), item.UpdatedAt)
	return mapFAQWriteError(err)
}

func (r *FAQRepository) ListCategories(ctx context.Context, includeArchived bool) ([]faq.Category, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, slug, name, COALESCE(description,''), sort_order, status, created_at, updated_at FROM faq_categories WHERE $1 OR status='active' ORDER BY sort_order, name`, includeArchived)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]faq.Category, 0)
	for rows.Next() {
		var item faq.Category
		if err := rows.Scan(&item.ID, &item.Slug, &item.Name, &item.Description, &item.SortOrder, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *FAQRepository) ArchiveCategory(ctx context.Context, id, actor string) error {
	result, err := r.db.ExecContext(ctx, `UPDATE faq_categories SET status='archived', updated_at=NOW(), updated_by=$2 WHERE id=$1 AND status='active'`, id, nullableActor(actor))
	if err != nil {
		return err
	}
	count, _ := result.RowsAffected()
	if count == 0 {
		return faq.ErrNotFound
	}
	return nil
}

func (r *FAQRepository) CategoryActive(ctx context.Context, id string) (bool, error) {
	var active bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM faq_categories WHERE id=$1 AND status='active')`, id).Scan(&active)
	return active, err
}

func (r *FAQRepository) CategoryHasLiveItems(ctx context.Context, id string) (bool, error) {
	var used bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM faq_items WHERE category_id=$1 AND status<>'archived')`, id).Scan(&used)
	return used, err
}

func (r *FAQRepository) CreateItem(ctx context.Context, item *faq.Item, actor string) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO faq_items (id,category_id,slug,question,answer,sort_order,status,media_asset_id,media_alt,seo_title,meta_description,indexable,version,published_at,created_at,created_by,updated_at,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$16)`, item.ID, item.CategoryID, item.Slug, item.Question, item.Answer, item.SortOrder, item.Status, item.MediaAssetID, item.MediaAlt, item.SEOTitle, item.MetaDescription, item.Indexable, item.Version, item.PublishedAt, item.CreatedAt, nullableActor(actor), item.UpdatedAt)
	return mapFAQWriteError(err)
}

func (r *FAQRepository) UpdateItem(ctx context.Context, item *faq.Item, expectedVersion int64, actor string) error {
	result, err := r.db.ExecContext(ctx, `UPDATE faq_items SET category_id=$1,slug=$2,question=$3,answer=$4,sort_order=$5,status=$6,media_asset_id=$7,media_alt=$8,seo_title=$9,meta_description=$10,indexable=$11,version=$12,published_at=$13,updated_at=$14,updated_by=$15 WHERE id=$16 AND version=$17`, item.CategoryID, item.Slug, item.Question, item.Answer, item.SortOrder, item.Status, item.MediaAssetID, item.MediaAlt, item.SEOTitle, item.MetaDescription, item.Indexable, item.Version, item.PublishedAt, item.UpdatedAt, nullableActor(actor), item.ID, expectedVersion)
	if err != nil {
		return mapFAQWriteError(err)
	}
	count, _ := result.RowsAffected()
	if count == 0 {
		return faq.ErrConflict
	}
	return nil
}

type faqScanner interface{ Scan(...any) error }

func scanFAQItem(scanner faqScanner) (*faq.Item, error) {
	var item faq.Item
	err := scanner.Scan(&item.ID, &item.CategoryID, &item.CategoryName, &item.CategorySlug, &item.CategoryDescription, &item.CategorySortOrder, &item.Slug, &item.Question, &item.Answer, &item.SortOrder, &item.Status, &item.MediaAssetID, &item.MediaAlt, &item.SEOTitle, &item.MetaDescription, &item.Indexable, &item.Version, &item.PublishedAt, &item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, faq.ErrNotFound
	}
	return &item, err
}

const faqItemColumns = `i.id,i.category_id,c.name,c.slug,COALESCE(c.description,''),c.sort_order,i.slug,i.question,i.answer,i.sort_order,i.status,i.media_asset_id,i.media_alt,COALESCE(i.seo_title,''),COALESCE(i.meta_description,''),i.indexable,i.version,i.published_at,i.created_at,i.updated_at`

func (r *FAQRepository) GetItem(ctx context.Context, id string) (*faq.Item, error) {
	return scanFAQItem(r.db.QueryRowContext(ctx, `SELECT `+faqItemColumns+` FROM faq_items i JOIN faq_categories c ON c.id=i.category_id WHERE i.id=$1`, id))
}

func (r *FAQRepository) ListAdminItems(ctx context.Context, filter faq.ListFilter) ([]faq.Item, int, error) {
	status := filter.Status
	if status == "all" {
		status = ""
	}
	queryValue := "%" + filter.Query + "%"
	var total int
	err := r.db.QueryRowContext(ctx, `SELECT count(*) FROM faq_items i WHERE ($1='' OR i.status=$1) AND ($2='' OR i.category_id::text=$2) AND ($3='' OR i.question ILIKE $4 OR i.answer ILIKE $4 OR i.slug ILIKE $4)`, status, filter.CategoryID, filter.Query, queryValue).Scan(&total)
	if err != nil {
		return nil, 0, err
	}
	rows, err := r.db.QueryContext(ctx, `SELECT `+faqItemColumns+` FROM faq_items i JOIN faq_categories c ON c.id=i.category_id WHERE ($1='' OR i.status=$1) AND ($2='' OR i.category_id::text=$2) AND ($3='' OR i.question ILIKE $4 OR i.answer ILIKE $4 OR i.slug ILIKE $4) ORDER BY c.sort_order,i.sort_order,i.updated_at DESC LIMIT $5 OFFSET $6`, status, filter.CategoryID, filter.Query, queryValue, filter.PageSize, (filter.Page-1)*filter.PageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]faq.Item, 0)
	for rows.Next() {
		item, err := scanFAQItem(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *item)
	}
	return items, total, rows.Err()
}

func (r *FAQRepository) ListPublic(ctx context.Context, query string) ([]faq.PublicCategory, int, error) {
	queryValue := "%" + query + "%"
	rows, err := r.db.QueryContext(ctx, `SELECT `+faqItemColumns+` FROM faq_items i JOIN faq_categories c ON c.id=i.category_id WHERE c.status='active' AND i.status='published' AND i.published_at IS NOT NULL AND i.published_at<=NOW() AND ($1='' OR i.question ILIKE $2 OR i.answer ILIKE $2 OR c.name ILIKE $2) ORDER BY c.sort_order,c.name,i.sort_order,i.published_at`, query, queryValue)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	groups := make([]faq.PublicCategory, 0)
	indexes := map[string]int{}
	total := 0
	for rows.Next() {
		item, err := scanFAQItem(rows)
		if err != nil {
			return nil, 0, err
		}
		idx, ok := indexes[item.CategoryID]
		if !ok {
			idx = len(groups)
			indexes[item.CategoryID] = idx
			groups = append(groups, faq.PublicCategory{Category: faq.PublicCategoryInfo{ID: item.CategoryID, Name: item.CategoryName, Slug: item.CategorySlug, Description: item.CategoryDescription, SortOrder: item.CategorySortOrder}, Items: []faq.Item{}})
		}
		groups[idx].Items = append(groups[idx].Items, *item)
		total++
	}
	return groups, total, rows.Err()
}
