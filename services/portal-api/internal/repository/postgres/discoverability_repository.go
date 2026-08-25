package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"

	"teman-belajar-api/internal/domain/discoverability"
)

type DiscoverabilityRepository struct{ db *sql.DB }

func NewDiscoverabilityRepository(db *sql.DB) *DiscoverabilityRepository {
	return &DiscoverabilityRepository{db: db}
}

func (r *DiscoverabilityRepository) CreateTerm(ctx context.Context, input discoverability.CreateTermInput, actorID string) (*discoverability.Term, error) {
	now := time.Now().UTC()
	term := &discoverability.Term{ID: uuid.NewString(), Kind: input.Kind, Domain: input.Domain, Slug: input.Slug, Name: input.Name, NormalizedName: discoverability.NormalizeName(input.Name), Description: input.Description, Status: "active", CreatedAt: now, UpdatedAt: now}
	var err error
	if input.Kind == discoverability.KindCategory {
		_, err = r.db.ExecContext(ctx, `INSERT INTO categories (id,domain,slug,name,description,status,normalized_name,created_at,updated_at) VALUES ($1,$2,$3,$4,NULLIF($5,''),'active',$6,$7,$7)`, term.ID, term.Domain, term.Slug, term.Name, term.Description, term.NormalizedName, now)
	} else {
		_, err = r.db.ExecContext(ctx, `INSERT INTO tags (id,slug,name,normalized_name,description,status,created_at,updated_at) VALUES ($1,$2,$3,$4,NULLIF($5,''),'active',$6,$6)`, term.ID, term.Slug, term.Name, term.NormalizedName, term.Description, now)
	}
	if isUniqueViolation(err) {
		return nil, discoverability.ErrConflict
	}
	if err != nil {
		return nil, fmt.Errorf("create taxonomy term: %w", err)
	}
	_ = actorID // audit is emitted by the discoverability domain service.
	return term, nil
}

func (r *DiscoverabilityRepository) ListTerms(ctx context.Context, kind discoverability.TermKind, includeArchived bool) ([]discoverability.Term, error) {
	var query string
	if kind == discoverability.KindCategory {
		query = `SELECT c.id::text,c.domain,c.slug,c.name,c.normalized_name,COALESCE(c.description,''),c.status,c.created_at,c.updated_at,
			(SELECT COUNT(*) FROM news n WHERE n.category_id=c.id) +
			(SELECT COUNT(*) FROM announcements a WHERE a.category_id=c.id) +
			(SELECT COUNT(*) FROM knowledge_articles k WHERE k.category_id=c.id)
			FROM categories c WHERE ($1 OR c.status='active') ORDER BY c.name,c.id`
	} else {
		query = `SELECT t.id::text,'' AS domain,t.slug,t.name,t.normalized_name,COALESCE(t.description,''),t.status,t.created_at,t.updated_at,
			(SELECT COUNT(*) FROM content_tags ct WHERE ct.tag_id=t.id)
			FROM tags t WHERE ($1 OR t.status='active') ORDER BY t.name,t.id`
	}
	rows, err := r.db.QueryContext(ctx, query, includeArchived)
	if err != nil {
		return nil, fmt.Errorf("list taxonomy terms: %w", err)
	}
	defer rows.Close()
	items := make([]discoverability.Term, 0)
	for rows.Next() {
		var item discoverability.Term
		item.Kind = kind
		if err := rows.Scan(&item.ID, &item.Domain, &item.Slug, &item.Name, &item.NormalizedName, &item.Description, &item.Status, &item.CreatedAt, &item.UpdatedAt, &item.UsageCount); err != nil {
			return nil, fmt.Errorf("scan taxonomy term: %w", err)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *DiscoverabilityRepository) ArchiveTerm(ctx context.Context, kind discoverability.TermKind, id, actorID string) error {
	table := "tags"
	if kind == discoverability.KindCategory {
		table = "categories"
	}
	result, err := r.db.ExecContext(ctx, `UPDATE `+table+` SET status='archived',updated_at=NOW() WHERE id=$1 AND status='active'`, id)
	if err != nil {
		return fmt.Errorf("archive taxonomy term: %w", err)
	}
	count, _ := result.RowsAffected()
	if count == 0 {
		return discoverability.ErrNotFound
	}
	_ = actorID
	return nil
}

func contentTable(contentType discoverability.ContentType) (table, summaryExpr string, ok bool) {
	switch contentType {
	case discoverability.ContentNews:
		return "news", "COALESCE(excerpt,'')", true
	case discoverability.ContentAnnouncement:
		return "announcements", "left(COALESCE(body,''),500)", true
	case discoverability.ContentKnowledge:
		return "knowledge_articles", "COALESCE(summary,'')", true
	default:
		return "", "", false
	}
}

type dbQueryer interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
}

func loadContent(ctx context.Context, q dbQueryer, contentType discoverability.ContentType, id string, forUpdate bool) (*discoverability.ContentRecord, *string, error) {
	table, summaryExpr, ok := contentTable(contentType)
	if !ok {
		return nil, nil, discoverability.ErrInvalid
	}
	publishedExpr := "published_at"
	if contentType == discoverability.ContentKnowledge {
		publishedExpr = `(SELECT r.created_at FROM knowledge_revisions r WHERE r.article_id=` + table + `.id AND r.revision_no=` + table + `.published_revision_no)`
	}
	lock := ""
	if forUpdate {
		lock = " FOR UPDATE"
	}
	query := fmt.Sprintf(`SELECT id::text,slug,title,%s,status,%s,updated_at,category_id::text,
		(SELECT mu.media_id::text FROM media_usages mu WHERE mu.entity_type=$2 AND mu.entity_id=%s.id::text AND mu.usage_role='featured' ORDER BY mu.sort_order,mu.created_at LIMIT 1),
		(SELECT COALESCE(ma.alt_text,'') FROM media_usages mu JOIN media_assets ma ON ma.id=mu.media_id WHERE mu.entity_type=$2 AND mu.entity_id=%s.id::text AND mu.usage_role='featured' ORDER BY mu.sort_order,mu.created_at LIMIT 1)
		FROM %s WHERE id=$1%s`, summaryExpr, publishedExpr, table, table, table, lock)
	var record discoverability.ContentRecord
	record.ContentType = contentType
	var categoryID, featuredID, featuredAlt sql.NullString
	if err := q.QueryRowContext(ctx, query, id, string(contentType)).Scan(&record.ID, &record.Slug, &record.Title, &record.Summary, &record.Status, &record.PublishedAt, &record.UpdatedAt, &categoryID, &featuredID, &featuredAlt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil, discoverability.ErrNotFound
		}
		return nil, nil, fmt.Errorf("load discoverability content: %w", err)
	}
	if featuredID.Valid {
		record.FeaturedMediaID = &featuredID.String
	}
	if featuredAlt.Valid {
		record.FeaturedMediaAlt = featuredAlt.String
	}
	if categoryID.Valid {
		return &record, &categoryID.String, nil
	}
	return &record, nil, nil
}

func loadProfile(ctx context.Context, q dbQueryer, contentType discoverability.ContentType, contentID string, record *discoverability.ContentRecord, categoryID *string) (*discoverability.Profile, error) {
	profile := &discoverability.Profile{ContentType: contentType, ContentID: contentID, ProfileInput: discoverability.ProfileInput{Slug: record.Slug, Indexable: true, TagIDs: []string{}}, Tags: []discoverability.Term{}, UpdatedAt: record.UpdatedAt}
	var seoTitle, description, socialTitle, socialDescription, mediaID, canonical sql.NullString
	var updated time.Time
	err := q.QueryRowContext(ctx, `SELECT p.seo_title,p.meta_description,p.social_title,p.social_description,p.social_media_id::text,p.indexable,p.canonical_path,p.updated_at,COALESCE(m.alt_text,'') FROM seo_profiles p LEFT JOIN media_assets m ON m.id=p.social_media_id WHERE p.content_type=$1 AND p.content_id=$2`, contentType, contentID).Scan(&seoTitle, &description, &socialTitle, &socialDescription, &mediaID, &profile.Indexable, &canonical, &updated, &profile.SocialImageAlt)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("load seo profile: %w", err)
	}
	if err == nil {
		profile.SEOTitle = seoTitle.String
		profile.MetaDescription = description.String
		profile.SocialTitle = socialTitle.String
		profile.SocialDescription = socialDescription.String
		profile.UpdatedAt = updated
		if mediaID.Valid {
			profile.SocialMediaID = &mediaID.String
		}
		if canonical.Valid {
			profile.CanonicalPath = &canonical.String
		}
	}
	if categoryID != nil {
		var term discoverability.Term
		term.Kind = discoverability.KindCategory
		err := q.QueryRowContext(ctx, `SELECT id::text,domain,slug,name,normalized_name,COALESCE(description,''),status,created_at,updated_at FROM categories WHERE id=$1`, *categoryID).Scan(&term.ID, &term.Domain, &term.Slug, &term.Name, &term.NormalizedName, &term.Description, &term.Status, &term.CreatedAt, &term.UpdatedAt)
		if err == nil {
			profile.Category = &term
			profile.CategoryID = &term.ID
		} else if !errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("load profile category: %w", err)
		}
	}
	rows, err := q.QueryContext(ctx, `SELECT t.id::text,t.slug,t.name,t.normalized_name,COALESCE(t.description,''),t.status,t.created_at,t.updated_at FROM content_tags ct JOIN tags t ON t.id=ct.tag_id WHERE ct.content_type=$1 AND ct.content_id=$2 ORDER BY t.name,t.id`, contentType, contentID)
	if err != nil {
		return nil, fmt.Errorf("load profile tags: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var term discoverability.Term
		term.Kind = discoverability.KindTag
		if err := rows.Scan(&term.ID, &term.Slug, &term.Name, &term.NormalizedName, &term.Description, &term.Status, &term.CreatedAt, &term.UpdatedAt); err != nil {
			return nil, err
		}
		profile.Tags = append(profile.Tags, term)
		profile.TagIDs = append(profile.TagIDs, term.ID)
	}
	return profile, rows.Err()
}

func (r *DiscoverabilityRepository) GetProfile(ctx context.Context, contentType discoverability.ContentType, contentID string) (*discoverability.ContentRecord, *discoverability.Profile, error) {
	record, categoryID, err := loadContent(ctx, r.db, contentType, contentID, false)
	if err != nil {
		return nil, nil, err
	}
	profile, err := loadProfile(ctx, r.db, contentType, contentID, record, categoryID)
	return record, profile, err
}

func (r *DiscoverabilityRepository) SaveProfile(ctx context.Context, contentType discoverability.ContentType, contentID string, input discoverability.ProfileInput, actorID string) (*discoverability.ContentRecord, *discoverability.Profile, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()
	record, _, err := loadContent(ctx, tx, contentType, contentID, true)
	if err != nil {
		return nil, nil, err
	}
	if input.CategoryID != nil {
		var active bool
		err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM categories WHERE id=$1 AND status='active' AND domain IN ('public',$2))`, *input.CategoryID, contentType).Scan(&active)
		if err != nil || !active {
			return nil, nil, discoverability.ErrInvalid
		}
	}
	if len(input.TagIDs) > 0 {
		var count int
		if err = tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM tags WHERE id=ANY($1::uuid[]) AND status='active'`, pq.Array(input.TagIDs)).Scan(&count); err != nil || count != len(input.TagIDs) {
			return nil, nil, discoverability.ErrInvalid
		}
	}
	if input.SocialMediaID != nil {
		var eligible bool
		if err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM media_assets WHERE id=$1 AND status='active' AND detected_mime_type LIKE 'image/%')`, *input.SocialMediaID).Scan(&eligible); err != nil || !eligible {
			return nil, nil, discoverability.ErrInvalidMedia
		}
	}
	if record.Slug != input.Slug {
		var collision bool
		if err = contentSlugCollision(ctx, tx, contentType, input.Slug, contentID, &collision); err != nil {
			return nil, nil, err
		}
		if collision {
			return nil, nil, discoverability.ErrConflict
		}
		if record.PublishedAt != nil {
			var cycle bool
			if err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM slug_redirects WHERE content_type=$1 AND old_slug=$2)`, contentType, input.Slug).Scan(&cycle); err != nil {
				return nil, nil, err
			}
			if cycle {
				return nil, nil, discoverability.ErrRedirectCycle
			}
			if _, err = tx.ExecContext(ctx, `UPDATE slug_redirects SET new_slug=$1 WHERE content_type=$2 AND content_id=$3`, input.Slug, contentType, contentID); err != nil {
				return nil, nil, err
			}
			if _, err = tx.ExecContext(ctx, `INSERT INTO slug_redirects(id,content_type,content_id,old_slug,new_slug,http_status,created_by) VALUES($1,$2,$3,$4,$5,308,$6)`, uuid.NewString(), contentType, contentID, record.Slug, input.Slug, nullUUID(actorID)); err != nil {
				if isUniqueViolation(err) {
					return nil, nil, discoverability.ErrConflict
				}
				return nil, nil, err
			}
		}
		if err = updateContentSlug(ctx, tx, contentType, input.Slug, actorID, contentID); err != nil {
			if isUniqueViolation(err) {
				return nil, nil, discoverability.ErrConflict
			}
			return nil, nil, err
		}
		record.Slug = input.Slug
	}
	if err = updateContentCategory(ctx, tx, contentType, input.CategoryID, contentID); err != nil {
		return nil, nil, err
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO seo_profiles(content_type,content_id,seo_title,meta_description,social_title,social_description,social_media_id,indexable,canonical_path,created_by,updated_by)
		VALUES($1,$2,NULLIF($3,''),NULLIF($4,''),NULLIF($5,''),NULLIF($6,''),$7,$8,$9,$10,$10)
		ON CONFLICT(content_type,content_id) DO UPDATE SET seo_title=EXCLUDED.seo_title,meta_description=EXCLUDED.meta_description,social_title=EXCLUDED.social_title,social_description=EXCLUDED.social_description,social_media_id=EXCLUDED.social_media_id,indexable=EXCLUDED.indexable,canonical_path=EXCLUDED.canonical_path,updated_at=NOW(),updated_by=EXCLUDED.updated_by`, contentType, contentID, strings.TrimSpace(input.SEOTitle), strings.TrimSpace(input.MetaDescription), strings.TrimSpace(input.SocialTitle), strings.TrimSpace(input.SocialDescription), input.SocialMediaID, input.Indexable, input.CanonicalPath, nullUUID(actorID))
	if err != nil {
		return nil, nil, fmt.Errorf("save seo profile: %w", err)
	}
	if _, err = tx.ExecContext(ctx, `DELETE FROM content_tags WHERE content_type=$1 AND content_id=$2`, contentType, contentID); err != nil {
		return nil, nil, err
	}
	for _, tagID := range input.TagIDs {
		if _, err = tx.ExecContext(ctx, `INSERT INTO content_tags(content_type,content_id,tag_id,created_by) VALUES($1,$2,$3,$4)`, contentType, contentID, tagID, nullUUID(actorID)); err != nil {
			return nil, nil, err
		}
	}
	if err = tx.Commit(); err != nil {
		return nil, nil, err
	}
	return r.GetProfile(ctx, contentType, contentID)
}

func contentSlugCollision(ctx context.Context, tx *sql.Tx, contentType discoverability.ContentType, slug, contentID string, collision *bool) error {
	var query string
	switch contentType {
	case discoverability.ContentNews:
		query = `SELECT EXISTS(SELECT 1 FROM news WHERE slug=$1 AND id<>$2)`
	case discoverability.ContentAnnouncement:
		query = `SELECT EXISTS(SELECT 1 FROM announcements WHERE slug=$1 AND id<>$2)`
	case discoverability.ContentKnowledge:
		query = `SELECT EXISTS(SELECT 1 FROM knowledge_articles WHERE slug=$1 AND id<>$2)`
	default:
		return discoverability.ErrInvalid
	}
	return tx.QueryRowContext(ctx, query, slug, contentID).Scan(collision)
}

func updateContentSlug(ctx context.Context, tx *sql.Tx, contentType discoverability.ContentType, slug, actorID, contentID string) error {
	var query string
	switch contentType {
	case discoverability.ContentNews:
		query = `UPDATE news SET slug=$1,updated_at=NOW(),updated_by=$2 WHERE id=$3`
	case discoverability.ContentAnnouncement:
		query = `UPDATE announcements SET slug=$1,updated_at=NOW(),updated_by=$2 WHERE id=$3`
	case discoverability.ContentKnowledge:
		query = `UPDATE knowledge_articles SET slug=$1,updated_at=NOW(),updated_by=$2 WHERE id=$3`
	default:
		return discoverability.ErrInvalid
	}
	_, err := tx.ExecContext(ctx, query, slug, nullUUID(actorID), contentID)
	return err
}

func updateContentCategory(ctx context.Context, tx *sql.Tx, contentType discoverability.ContentType, categoryID *string, contentID string) error {
	var query string
	switch contentType {
	case discoverability.ContentNews:
		query = `UPDATE news SET category_id=$1 WHERE id=$2`
	case discoverability.ContentAnnouncement:
		query = `UPDATE announcements SET category_id=$1 WHERE id=$2`
	case discoverability.ContentKnowledge:
		query = `UPDATE knowledge_articles SET category_id=$1 WHERE id=$2`
	default:
		return discoverability.ErrInvalid
	}
	_, err := tx.ExecContext(ctx, query, categoryID, contentID)
	return err
}

func nullUUID(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func isUniqueViolation(err error) bool {
	var pqErr *pq.Error
	return errors.As(err, &pqErr) && pqErr.Code == "23505"
}

func (r *DiscoverabilityRepository) ResolveRedirect(ctx context.Context, contentType discoverability.ContentType, oldSlug string) (*discoverability.Redirect, error) {
	var newSlug string
	var status int
	err := r.db.QueryRowContext(ctx, `SELECT new_slug,http_status FROM slug_redirects WHERE content_type=$1 AND old_slug=$2`, contentType, oldSlug).Scan(&newSlug, &status)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, discoverability.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	prefix := map[discoverability.ContentType]string{discoverability.ContentNews: "/news/", discoverability.ContentAnnouncement: "/announcements/", discoverability.ContentKnowledge: "/knowledge/"}[contentType]
	if newSlug == oldSlug {
		return nil, discoverability.ErrRedirectCycle
	}
	return &discoverability.Redirect{Location: prefix + newSlug, Status: status}, nil
}

func (r *DiscoverabilityRepository) ListSitemap(ctx context.Context) ([]discoverability.SitemapEntry, error) {
	const query = `WITH eligible AS (
		SELECT 'news' content_type,n.id,n.category_id,n.slug,n.updated_at FROM news n LEFT JOIN seo_profiles s ON s.content_type='news' AND s.content_id=n.id WHERE n.status='published' AND n.published_at<=NOW() AND COALESCE(s.indexable,true)
		UNION ALL SELECT 'announcement',a.id,a.category_id,a.slug,a.updated_at FROM announcements a LEFT JOIN seo_profiles s ON s.content_type='announcement' AND s.content_id=a.id WHERE a.status='published' AND a.published_at<=NOW() AND (a.start_at IS NULL OR a.start_at<=NOW()) AND (a.end_at IS NULL OR a.end_at>NOW()) AND COALESCE(s.indexable,true)
		UNION ALL SELECT 'knowledge',k.id,k.category_id,k.slug,k.updated_at FROM knowledge_articles k LEFT JOIN seo_profiles s ON s.content_type='knowledge' AND s.content_id=k.id WHERE k.published_revision_no IS NOT NULL AND COALESCE(s.indexable,true)
		AND NOT EXISTS(WITH RECURSIVE ancestors AS (SELECT pn.id,pn.parent_id,pn.status FROM knowledge_article_nodes pan JOIN knowledge_nodes pn ON pn.id=pan.node_id WHERE pan.article_id=k.id UNION ALL SELECT parent.id,parent.parent_id,parent.status FROM knowledge_nodes parent JOIN ancestors child ON parent.id=child.parent_id) SELECT 1 FROM ancestors WHERE status<>'active')
	), published AS (
		SELECT CASE content_type WHEN 'news' THEN '/news/' WHEN 'announcement' THEN '/announcements/' ELSE '/knowledge/' END||slug url,updated_at FROM eligible
	), category_pages AS (
		SELECT '/categories/'||c.slug url,MAX(x.updated_at) updated_at FROM categories c JOIN eligible x ON x.category_id=c.id WHERE c.status='active' GROUP BY c.id HAVING COUNT(*)>=2
	), tag_pages AS (
		SELECT '/tags/'||t.slug url,MAX(x.updated_at) updated_at FROM tags t JOIN content_tags ct ON ct.tag_id=t.id JOIN eligible x ON x.content_type=ct.content_type AND x.id=ct.content_id WHERE t.status='active' GROUP BY t.id HAVING COUNT(*)>=3
	), node_pages AS (
		SELECT '/knowledge/topics/'||n.id::text url,GREATEST(n.updated_at,MAX(k.updated_at)) updated_at
		FROM knowledge_nodes n JOIN knowledge_article_nodes an ON an.node_id=n.id JOIN eligible k ON k.content_type='knowledge' AND k.id=an.article_id
		WHERE n.status='active'
		AND NOT EXISTS(WITH RECURSIVE ancestors AS (SELECT parent.id,parent.parent_id,parent.status FROM knowledge_nodes parent WHERE parent.id=n.parent_id UNION ALL SELECT parent.id,parent.parent_id,parent.status FROM knowledge_nodes parent JOIN ancestors child ON parent.id=child.parent_id) SELECT 1 FROM ancestors WHERE status<>'active')
		GROUP BY n.id HAVING COUNT(*)>=2
	) SELECT url,updated_at FROM published UNION ALL SELECT url,updated_at FROM category_pages UNION ALL SELECT url,updated_at FROM tag_pages UNION ALL SELECT url,updated_at FROM node_pages ORDER BY url`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list sitemap: %w", err)
	}
	defer rows.Close()
	items := []discoverability.SitemapEntry{}
	for rows.Next() {
		var item discoverability.SitemapEntry
		if err := rows.Scan(&item.URL, &item.LastModified); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *DiscoverabilityRepository) GetLanding(ctx context.Context, kind discoverability.TermKind, slug string) (*discoverability.Landing, error) {
	landing := &discoverability.Landing{Items: []discoverability.LandingContent{}}
	if kind == discoverability.KindCategory {
		landing.Term.Kind = kind
		if err := r.db.QueryRowContext(ctx, `SELECT id::text,domain,slug,name,normalized_name,COALESCE(description,''),status,created_at,updated_at FROM categories WHERE slug=$1 AND status='active'`, slug).Scan(&landing.Term.ID, &landing.Term.Domain, &landing.Term.Slug, &landing.Term.Name, &landing.Term.NormalizedName, &landing.Term.Description, &landing.Term.Status, &landing.Term.CreatedAt, &landing.Term.UpdatedAt); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, discoverability.ErrNotFound
			}
			return nil, err
		}
	} else {
		landing.Term.Kind = kind
		if err := r.db.QueryRowContext(ctx, `SELECT id::text,slug,name,normalized_name,COALESCE(description,''),status,created_at,updated_at FROM tags WHERE slug=$1 AND status='active'`, slug).Scan(&landing.Term.ID, &landing.Term.Slug, &landing.Term.Name, &landing.Term.NormalizedName, &landing.Term.Description, &landing.Term.Status, &landing.Term.CreatedAt, &landing.Term.UpdatedAt); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, discoverability.ErrNotFound
			}
			return nil, err
		}
	}
	filterNews := "n.category_id=$1"
	filterAnn := "a.category_id=$1"
	filterKnowledge := "k.category_id=$1"
	if kind == discoverability.KindTag {
		filterNews = "EXISTS(SELECT 1 FROM content_tags ct WHERE ct.content_type='news' AND ct.content_id=n.id AND ct.tag_id=$1)"
		filterAnn = "EXISTS(SELECT 1 FROM content_tags ct WHERE ct.content_type='announcement' AND ct.content_id=a.id AND ct.tag_id=$1)"
		filterKnowledge = "EXISTS(SELECT 1 FROM content_tags ct WHERE ct.content_type='knowledge' AND ct.content_id=k.id AND ct.tag_id=$1)"
	}
	query := fmt.Sprintf(`SELECT content_type,slug,title,summary,url,updated_at FROM (
		SELECT 'news' content_type,n.slug,n.title,COALESCE(n.excerpt,'') summary,'/news/'||n.slug url,n.updated_at FROM news n LEFT JOIN seo_profiles s ON s.content_type='news' AND s.content_id=n.id WHERE n.status='published' AND n.published_at<=NOW() AND COALESCE(s.indexable,true) AND %s
		UNION ALL SELECT 'announcement',a.slug,a.title,left(a.body,500),'/announcements/'||a.slug,a.updated_at FROM announcements a LEFT JOIN seo_profiles s ON s.content_type='announcement' AND s.content_id=a.id WHERE a.status='published' AND a.published_at<=NOW() AND (a.start_at IS NULL OR a.start_at<=NOW()) AND (a.end_at IS NULL OR a.end_at>NOW()) AND COALESCE(s.indexable,true) AND %s
		UNION ALL SELECT 'knowledge',k.slug,k.title,COALESCE(k.summary,''),'/knowledge/'||k.slug,k.updated_at FROM knowledge_articles k LEFT JOIN seo_profiles s ON s.content_type='knowledge' AND s.content_id=k.id WHERE k.published_revision_no IS NOT NULL AND COALESCE(s.indexable,true)
		AND NOT EXISTS(WITH RECURSIVE ancestors AS (SELECT pn.id,pn.parent_id,pn.status FROM knowledge_article_nodes pan JOIN knowledge_nodes pn ON pn.id=pan.node_id WHERE pan.article_id=k.id UNION ALL SELECT parent.id,parent.parent_id,parent.status FROM knowledge_nodes parent JOIN ancestors child ON parent.id=child.parent_id) SELECT 1 FROM ancestors WHERE status<>'active') AND %s
	) x ORDER BY updated_at DESC,title LIMIT 100`, filterNews, filterAnn, filterKnowledge)
	rows, err := r.db.QueryContext(ctx, query, landing.Term.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var item discoverability.LandingContent
		if err := rows.Scan(&item.ContentType, &item.Slug, &item.Title, &item.Summary, &item.URL, &item.UpdatedAt); err != nil {
			return nil, err
		}
		landing.Items = append(landing.Items, item)
	}
	landing.Term.UsageCount = len(landing.Items)
	landing.Indexable = (kind == discoverability.KindCategory && len(landing.Items) >= 2) || (kind == discoverability.KindTag && len(landing.Items) >= 3)
	return landing, rows.Err()
}
