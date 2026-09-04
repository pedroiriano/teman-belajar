package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"teman-belajar-api/internal/domain/dashboard"
)

// DashboardRepository implements dashboard.Repository using PostgreSQL.
type DashboardRepository struct {
	db *sql.DB
}

// NewDashboardRepository creates a new DashboardRepository.
func NewDashboardRepository(db *sql.DB) *DashboardRepository {
	return &DashboardRepository{db: db}
}

var _ dashboard.Repository = (*DashboardRepository)(nil)

// GetSummary aggregates KPI, content breakdown, and review queue across all
// content tables in a single method.
func (r *DashboardRepository) GetSummary(ctx context.Context, reviewLimit int) (*dashboard.Summary, error) {
	s := &dashboard.Summary{}

	// ── 1. Content Breakdown (single query, 21 subqueries) ──────────────
	err := r.db.QueryRowContext(ctx, `
		SELECT
			-- knowledge_articles
			(SELECT COUNT(*) FROM knowledge_articles WHERE status = 'published'),
			(SELECT COUNT(*) FROM knowledge_articles WHERE status = 'draft'),
			(SELECT COUNT(*) FROM knowledge_articles WHERE status IN ('in_review','approved')),
			-- news
			(SELECT COUNT(*) FROM news WHERE status = 'published'),
			(SELECT COUNT(*) FROM news WHERE status = 'draft'),
			(SELECT COUNT(*) FROM news WHERE status IN ('in_review','approved')),
			-- announcements
			(SELECT COUNT(*) FROM announcements WHERE status = 'published'),
			(SELECT COUNT(*) FROM announcements WHERE status = 'draft'),
			(SELECT COUNT(*) FROM announcements WHERE status IN ('in_review','approved')),
			-- faq_items
			(SELECT COUNT(*) FROM faq_items WHERE status = 'published'),
			(SELECT COUNT(*) FROM faq_items WHERE status = 'draft'),
			(SELECT COUNT(*) FROM faq_items WHERE status IN ('in_review','approved')),
			-- microlearning_items
			(SELECT COUNT(*) FROM microlearning_items WHERE status = 'published'),
			(SELECT COUNT(*) FROM microlearning_items WHERE status = 'draft'),
			(SELECT COUNT(*) FROM microlearning_items WHERE status IN ('in_review','approved')),
			-- training_programs
			(SELECT COUNT(*) FROM training_programs WHERE status = 'published'),
			(SELECT COUNT(*) FROM training_programs WHERE status = 'draft'),
			(SELECT COUNT(*) FROM training_programs WHERE status IN ('in_review','approved')),
			-- learning_path_versions (latest version per path)
			(SELECT COUNT(*) FROM learning_path_versions v
			 INNER JOIN learning_paths p ON p.id = v.path_id
			 WHERE v.version_number = p.latest_version_number AND v.status = 'published'),
			(SELECT COUNT(*) FROM learning_path_versions v
			 INNER JOIN learning_paths p ON p.id = v.path_id
			 WHERE v.version_number = p.latest_version_number AND v.status = 'draft'),
			(SELECT COUNT(*) FROM learning_path_versions v
			 INNER JOIN learning_paths p ON p.id = v.path_id
			 WHERE v.version_number = p.latest_version_number AND v.status IN ('in_review','approved'))
	`).Scan(
		&s.ContentBreakdown.Knowledge.Published, &s.ContentBreakdown.Knowledge.Draft, &s.ContentBreakdown.Knowledge.InReview,
		&s.ContentBreakdown.News.Published, &s.ContentBreakdown.News.Draft, &s.ContentBreakdown.News.InReview,
		&s.ContentBreakdown.Announcements.Published, &s.ContentBreakdown.Announcements.Draft, &s.ContentBreakdown.Announcements.InReview,
		&s.ContentBreakdown.FAQs.Published, &s.ContentBreakdown.FAQs.Draft, &s.ContentBreakdown.FAQs.InReview,
		&s.ContentBreakdown.Microlearning.Published, &s.ContentBreakdown.Microlearning.Draft, &s.ContentBreakdown.Microlearning.InReview,
		&s.ContentBreakdown.Training.Published, &s.ContentBreakdown.Training.Draft, &s.ContentBreakdown.Training.InReview,
		&s.ContentBreakdown.LearningPaths.Published, &s.ContentBreakdown.LearningPaths.Draft, &s.ContentBreakdown.LearningPaths.InReview,
	)
	if err != nil {
		return nil, fmt.Errorf("dashboard content breakdown: %w", err)
	}

	// ── 2. Compute KPI totals from breakdown ────────────────────────────
	modules := []dashboard.StatusCounts{
		s.ContentBreakdown.Knowledge,
		s.ContentBreakdown.News,
		s.ContentBreakdown.Announcements,
		s.ContentBreakdown.FAQs,
		s.ContentBreakdown.Microlearning,
		s.ContentBreakdown.Training,
		s.ContentBreakdown.LearningPaths,
	}
	for _, m := range modules {
		s.KPI.TotalPublished += m.Published
		s.KPI.TotalDraft += m.Draft
		s.KPI.PendingReview += m.InReview
	}

	// ── 3. Active Programs (published programs with scheduled/active cohorts)
	err = r.db.QueryRowContext(ctx, `
		SELECT COUNT(DISTINCT tp.id)
		FROM training_programs tp
		INNER JOIN training_program_cohorts tc ON tc.program_id = tp.id
		WHERE tp.status = 'published'
		  AND tc.status IN ('scheduled', 'active')
	`).Scan(&s.KPI.ActivePrograms)
	if err != nil {
		return nil, fmt.Errorf("dashboard active programs: %w", err)
	}

	// ── 4. Review Queue (UNION ALL across 7 content tables) ─────────────
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, title, module, status, author, updated_at FROM (
			SELECT id, title, 'knowledge' AS module, status::text,
			       COALESCE(updated_by, created_by, '') AS author, updated_at
			FROM knowledge_articles
			WHERE status IN ('in_review','approved')

			UNION ALL

			SELECT id, title, 'news' AS module, status::text,
			       COALESCE(updated_by, created_by, '') AS author, updated_at
			FROM news
			WHERE status IN ('in_review','approved')

			UNION ALL

			SELECT id, title, 'announcements' AS module, status::text,
			       COALESCE(updated_by, created_by, '') AS author, updated_at
			FROM announcements
			WHERE status IN ('in_review','approved')

			UNION ALL

			SELECT id, question AS title, 'faqs' AS module, status::text,
			       COALESCE(updated_by, '') AS author, updated_at
			FROM faq_items
			WHERE status IN ('in_review','approved')

			UNION ALL

			SELECT id, title, 'microlearning' AS module, status::text,
			       COALESCE(updated_by, '') AS author, updated_at
			FROM microlearning_items
			WHERE status IN ('in_review','approved')

			UNION ALL

			SELECT id, title, 'training' AS module, status::text,
			       COALESCE(updated_by, '') AS author, updated_at
			FROM training_programs
			WHERE status IN ('in_review','approved')

			UNION ALL

			SELECT v.id, v.title, 'learning_paths' AS module, v.status::text,
			       COALESCE(v.updated_by, v.created_by, '') AS author, v.updated_at
			FROM learning_path_versions v
			INNER JOIN learning_paths p ON p.id = v.path_id
			WHERE v.version_number = p.latest_version_number
			  AND v.status IN ('in_review','approved')
		) review
		ORDER BY updated_at DESC
		LIMIT $1
	`, reviewLimit)
	if err != nil {
		return nil, fmt.Errorf("dashboard review queue: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var item dashboard.ReviewItem
		var author sql.NullString
		var updatedAt time.Time
		if err := rows.Scan(&item.ID, &item.Title, &item.Module, &item.Status, &author, &updatedAt); err != nil {
			return nil, fmt.Errorf("dashboard review queue scan: %w", err)
		}
		item.Author = author.String
		item.UpdatedAt = updatedAt
		s.ReviewQueue = append(s.ReviewQueue, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("dashboard review queue rows: %w", err)
	}

	// Ensure ReviewQueue is never null in JSON output
	if s.ReviewQueue == nil {
		s.ReviewQueue = []dashboard.ReviewItem{}
	}

	return s, nil
}

// GetWorkflowItems retrieves editorial workflow items across all modules and statuses.
func (r *DashboardRepository) GetWorkflowItems(ctx context.Context, filter dashboard.WorkflowFilter) ([]dashboard.WorkflowItem, error) {
	var query strings.Builder
	query.WriteString(`
		SELECT id, title, module, status, author, updated_at FROM (
			SELECT id, title, 'knowledge' AS module, status::text,
			       COALESCE(updated_by, created_by, '') AS author, updated_at
			FROM knowledge_articles

			UNION ALL

			SELECT id, title, 'news' AS module, status::text,
			       COALESCE(updated_by, created_by, '') AS author, updated_at
			FROM news

			UNION ALL

			SELECT id, title, 'announcements' AS module, status::text,
			       COALESCE(updated_by, created_by, '') AS author, updated_at
			FROM announcements

			UNION ALL

			SELECT id, question AS title, 'faqs' AS module, status::text,
			       COALESCE(updated_by, '') AS author, updated_at
			FROM faq_items

			UNION ALL

			SELECT id, title, 'microlearning' AS module, status::text,
			       COALESCE(updated_by, '') AS author, updated_at
			FROM microlearning_items

			UNION ALL

			SELECT id, title, 'training' AS module, status::text,
			       COALESCE(updated_by, '') AS author, updated_at
			FROM training_programs

			UNION ALL

			SELECT v.id, v.title, 'learning_paths' AS module, v.status::text,
			       COALESCE(v.updated_by, v.created_by, '') AS author, v.updated_at
			FROM learning_path_versions v
			INNER JOIN learning_paths p ON p.id = v.path_id
			WHERE v.version_number = p.latest_version_number
		) wf WHERE 1=1
	`)

	var args []interface{}
	argIdx := 1

	if filter.Module != "" && filter.Module != "all" {
		query.WriteString(fmt.Sprintf(" AND module = $%d", argIdx))
		args = append(args, filter.Module)
		argIdx++
	}

	if filter.Status != "" && filter.Status != "all" {
		query.WriteString(fmt.Sprintf(" AND status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}

	query.WriteString(fmt.Sprintf(" ORDER BY updated_at DESC LIMIT $%d", argIdx))
	args = append(args, filter.Limit)

	rows, err := r.db.QueryContext(ctx, query.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("dashboard workflow items: %w", err)
	}
	defer rows.Close()

	items := make([]dashboard.WorkflowItem, 0, 32)
	for rows.Next() {
		var item dashboard.WorkflowItem
		var author sql.NullString
		var updatedAt time.Time
		if err := rows.Scan(&item.ID, &item.Title, &item.Module, &item.Status, &author, &updatedAt); err != nil {
			return nil, fmt.Errorf("dashboard workflow item scan: %w", err)
		}
		item.Author = author.String
		item.UpdatedAt = updatedAt
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("dashboard workflow item rows: %w", err)
	}

	return items, nil
}

