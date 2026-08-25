package searchindex

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/lib/pq"

	domainsearch "teman-belajar-api/internal/domain/search"
)

type queryer interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}

type NewsSource struct{ db queryer }
type KnowledgeSource struct{ db queryer }
type AnnouncementSource struct{ db queryer }

func NewNewsSource(db queryer) *NewsSource                 { return &NewsSource{db: db} }
func NewKnowledgeSource(db queryer) *KnowledgeSource       { return &KnowledgeSource{db: db} }
func NewAnnouncementSource(db queryer) *AnnouncementSource { return &AnnouncementSource{db: db} }

func (*NewsSource) Type() string         { return string(domainsearch.ContentTypeNews) }
func (*KnowledgeSource) Type() string    { return string(domainsearch.ContentTypeKnowledge) }
func (*AnnouncementSource) Type() string { return string(domainsearch.ContentTypeAnnouncement) }

func (s *NewsSource) Fetch(ctx context.Context) ([]domainsearch.IndexDocument, error) {
	const query = `
		SELECT n.id::text, n.title, COALESCE(n.excerpt, ''), n.body, n.slug,
		       COALESCE(c.id::text, ''), COALESCE(c.name, ''),
		       COALESCE(tag_data.tags, ARRAY[]::text[]), n.published_at, n.updated_at
		FROM news n
		LEFT JOIN categories c ON c.id = n.category_id AND c.status='active'
		LEFT JOIN seo_profiles seo ON seo.content_type='news' AND seo.content_id=n.id
		LEFT JOIN LATERAL (
			SELECT ARRAY_AGG(t.name ORDER BY t.name) tags FROM content_tags ct JOIN tags t ON t.id=ct.tag_id
			WHERE ct.content_type='news' AND ct.content_id=n.id AND t.status='active'
		) tag_data ON true
		WHERE n.status = 'published'
		  AND n.published_at IS NOT NULL
		  AND n.published_at <= NOW()
		  AND COALESCE(seo.indexable, true)
		ORDER BY n.id`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("fetch published news: %w", err)
	}
	defer rows.Close()

	documents := make([]domainsearch.IndexDocument, 0)
	for rows.Next() {
		var id, title, summary, body, slug, categoryID, categoryName string
		var tags pq.StringArray
		var publishedAt time.Time
		var updatedAt time.Time
		if err := rows.Scan(&id, &title, &summary, &body, &slug, &categoryID, &categoryName, &tags, &publishedAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan published news: %w", err)
		}
		documents = append(documents, domainsearch.IndexDocument{
			DocumentID: "news_" + id, SourceType: s.Type(), SourceID: id,
			Title: plainText(title), Summary: plainText(summary), BodyText: plainText(body),
			CategoryID: categoryID, CategoryName: categoryName, Tags: []string(tags), URL: "/news/" + slug,
			PublishedAt: &publishedAt, UpdatedAt: updatedAt,
		})
	}
	return documents, rows.Err()
}

func (s *KnowledgeSource) Fetch(ctx context.Context) ([]domainsearch.IndexDocument, error) {
	const query = `
		SELECT a.id::text, a.title, COALESCE(a.summary, ''), r.body, a.slug,
		       COALESCE(c.id::text, ''), COALESCE(c.name, ''),
		       COALESCE(h.path, ARRAY[]::text[]), COALESCE(tag_data.tags, ARRAY[]::text[]), r.created_at, a.updated_at
		FROM knowledge_articles a
		JOIN knowledge_revisions r
		  ON r.article_id = a.id AND r.revision_no = a.published_revision_no
		LEFT JOIN categories c ON c.id = a.category_id AND c.status='active'
		LEFT JOIN seo_profiles seo ON seo.content_type='knowledge' AND seo.content_id=a.id
		LEFT JOIN LATERAL (
			SELECT ARRAY_AGG(t.name ORDER BY t.name) tags FROM content_tags ct JOIN tags t ON t.id=ct.tag_id
			WHERE ct.content_type='knowledge' AND ct.content_id=a.id AND t.status='active'
		) tag_data ON true
		LEFT JOIN LATERAL (
			WITH RECURSIVE ancestors AS (
				SELECT n.id,n.parent_id,n.title,n.status,1 depth
				FROM knowledge_article_nodes an JOIN knowledge_nodes n ON n.id=an.node_id
				WHERE an.article_id=a.id
				UNION ALL
				SELECT n.id,n.parent_id,n.title,n.status,x.depth+1
				FROM knowledge_nodes n JOIN ancestors x ON n.id=x.parent_id WHERE x.depth<8
			)
			SELECT ARRAY_AGG(title ORDER BY depth DESC) path,
			       BOOL_AND(status='active') all_active FROM ancestors
		) h ON true
		WHERE a.published_revision_no IS NOT NULL AND COALESCE(h.all_active, true) AND COALESCE(seo.indexable, true)
		ORDER BY a.id`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("fetch published knowledge revisions: %w", err)
	}
	defer rows.Close()

	documents := make([]domainsearch.IndexDocument, 0)
	for rows.Next() {
		var id, title, summary, body, slug, categoryID, categoryName string
		var hierarchyPath, tags pq.StringArray
		var publishedAt time.Time
		var updatedAt time.Time
		if err := rows.Scan(&id, &title, &summary, &body, &slug, &categoryID, &categoryName, &hierarchyPath, &tags, &publishedAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan published knowledge revision: %w", err)
		}
		documents = append(documents, domainsearch.IndexDocument{
			DocumentID: "knowledge_" + id, SourceType: s.Type(), SourceID: id,
			Title: plainText(title), Summary: plainText(summary), BodyText: plainText(body),
			CategoryID: categoryID, CategoryName: categoryName, HierarchyPath: []string(hierarchyPath), Tags: []string(tags), URL: "/knowledge/" + slug,
			PublishedAt: &publishedAt, UpdatedAt: updatedAt,
		})
	}
	return documents, rows.Err()
}

func (s *AnnouncementSource) Fetch(ctx context.Context) ([]domainsearch.IndexDocument, error) {
	const query = `
		SELECT a.id::text,a.title,a.body,a.slug,COALESCE(c.id::text,''),COALESCE(c.name,''),
		       COALESCE(tag_data.tags,ARRAY[]::text[]),a.published_at,a.updated_at
		FROM announcements a
		LEFT JOIN categories c ON c.id=a.category_id AND c.status='active'
		LEFT JOIN seo_profiles seo ON seo.content_type='announcement' AND seo.content_id=a.id
		LEFT JOIN LATERAL (
			SELECT ARRAY_AGG(t.name ORDER BY t.name) tags FROM content_tags ct JOIN tags t ON t.id=ct.tag_id
			WHERE ct.content_type='announcement' AND ct.content_id=a.id AND t.status='active'
		) tag_data ON true
		WHERE a.status = 'published'
		  AND a.published_at IS NOT NULL
		  AND a.published_at <= NOW()
		  AND (a.start_at IS NULL OR a.start_at <= NOW())
		  AND (a.end_at IS NULL OR a.end_at > NOW())
		  AND COALESCE(seo.indexable,true)
		ORDER BY a.id`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("fetch active announcements: %w", err)
	}
	defer rows.Close()

	documents := make([]domainsearch.IndexDocument, 0)
	for rows.Next() {
		var id, title, body, slug, categoryID, categoryName string
		var tags pq.StringArray
		var publishedAt time.Time
		var updatedAt time.Time
		if err := rows.Scan(&id, &title, &body, &slug, &categoryID, &categoryName, &tags, &publishedAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan active announcement: %w", err)
		}
		summary := plainText(body)
		if len([]rune(summary)) > 300 {
			summary = string([]rune(summary)[:300])
		}
		documents = append(documents, domainsearch.IndexDocument{
			DocumentID: "announcement_" + id, SourceType: s.Type(), SourceID: id,
			Title: plainText(title), Summary: summary, BodyText: plainText(body), CategoryID: categoryID, CategoryName: categoryName, Tags: []string(tags),
			URL: "/announcements/" + slug, PublishedAt: &publishedAt, UpdatedAt: updatedAt,
		})
	}
	return documents, rows.Err()
}
