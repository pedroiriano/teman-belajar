package searchindex

import (
	"context"
	"database/sql"
	"fmt"
	"time"

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
		       COALESCE(n.category_id::text, ''), COALESCE(c.name, ''), n.published_at, n.updated_at
		FROM news n
		LEFT JOIN categories c ON c.id = n.category_id
		WHERE n.status = 'published'
		  AND n.published_at IS NOT NULL
		  AND n.published_at <= NOW()
		ORDER BY n.id`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("fetch published news: %w", err)
	}
	defer rows.Close()

	documents := make([]domainsearch.IndexDocument, 0)
	for rows.Next() {
		var id, title, summary, body, slug, categoryID, categoryName string
		var publishedAt time.Time
		var updatedAt time.Time
		if err := rows.Scan(&id, &title, &summary, &body, &slug, &categoryID, &categoryName, &publishedAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan published news: %w", err)
		}
		documents = append(documents, domainsearch.IndexDocument{
			DocumentID: "news_" + id, SourceType: s.Type(), SourceID: id,
			Title: plainText(title), Summary: plainText(summary), BodyText: plainText(body),
			CategoryID: categoryID, CategoryName: categoryName, Tags: []string{}, URL: "/news/" + slug,
			PublishedAt: &publishedAt, UpdatedAt: updatedAt,
		})
	}
	return documents, rows.Err()
}

func (s *KnowledgeSource) Fetch(ctx context.Context) ([]domainsearch.IndexDocument, error) {
	const query = `
		SELECT a.id::text, a.title, COALESCE(a.summary, ''), r.body, a.slug,
		       COALESCE(a.category_id::text, ''), COALESCE(c.name, ''), r.created_at, a.updated_at
		FROM knowledge_articles a
		JOIN knowledge_revisions r
		  ON r.article_id = a.id AND r.revision_no = a.published_revision_no
		LEFT JOIN categories c ON c.id = a.category_id
		WHERE a.published_revision_no IS NOT NULL
		ORDER BY a.id`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("fetch published knowledge revisions: %w", err)
	}
	defer rows.Close()

	documents := make([]domainsearch.IndexDocument, 0)
	for rows.Next() {
		var id, title, summary, body, slug, categoryID, categoryName string
		var publishedAt time.Time
		var updatedAt time.Time
		if err := rows.Scan(&id, &title, &summary, &body, &slug, &categoryID, &categoryName, &publishedAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan published knowledge revision: %w", err)
		}
		documents = append(documents, domainsearch.IndexDocument{
			DocumentID: "knowledge_" + id, SourceType: s.Type(), SourceID: id,
			Title: plainText(title), Summary: plainText(summary), BodyText: plainText(body),
			CategoryID: categoryID, CategoryName: categoryName, Tags: []string{}, URL: "/knowledge/" + slug,
			PublishedAt: &publishedAt, UpdatedAt: updatedAt,
		})
	}
	return documents, rows.Err()
}

func (s *AnnouncementSource) Fetch(ctx context.Context) ([]domainsearch.IndexDocument, error) {
	const query = `
		SELECT id::text, title, body, published_at, updated_at
		FROM announcements
		WHERE status = 'published'
		  AND published_at IS NOT NULL
		  AND published_at <= NOW()
		  AND (start_at IS NULL OR start_at <= NOW())
		  AND (end_at IS NULL OR end_at > NOW())
		ORDER BY id`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("fetch active announcements: %w", err)
	}
	defer rows.Close()

	documents := make([]domainsearch.IndexDocument, 0)
	for rows.Next() {
		var id, title, body string
		var publishedAt time.Time
		var updatedAt time.Time
		if err := rows.Scan(&id, &title, &body, &publishedAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan active announcement: %w", err)
		}
		summary := plainText(body)
		if len([]rune(summary)) > 300 {
			summary = string([]rune(summary)[:300])
		}
		documents = append(documents, domainsearch.IndexDocument{
			DocumentID: "announcement_" + id, SourceType: s.Type(), SourceID: id,
			Title: plainText(title), Summary: summary, BodyText: plainText(body), Tags: []string{},
			URL: "/announcements", PublishedAt: &publishedAt, UpdatedAt: updatedAt,
		})
	}
	return documents, rows.Err()
}
