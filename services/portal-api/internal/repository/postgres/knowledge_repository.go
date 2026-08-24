package postgres

import (
	"context"
	"database/sql"
	"errors"

	"teman-belajar-api/internal/domain/knowledge"
)

type KnowledgeRepository struct {
	db *sql.DB
}

func NewKnowledgeRepository(db *sql.DB) *KnowledgeRepository {
	return &KnowledgeRepository{db: db}
}

func (r *KnowledgeRepository) CreateArticle(ctx context.Context, a *knowledge.Article) error {
	query := `
		INSERT INTO knowledge_articles 
		(id, slug, title, summary, status, category_id, published_revision_no, current_revision_no, created_at, created_by, updated_at, updated_by, last_reviewed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`
	_, err := r.db.ExecContext(ctx, query,
		a.ID, a.Slug, a.Title, a.Summary, a.Status, a.CategoryID, a.PublishedRevisionNo, a.CurrentRevisionNo, a.CreatedAt, a.CreatedBy, a.UpdatedAt, a.UpdatedBy, a.LastReviewedAt)
	return err
}

func (r *KnowledgeRepository) GetArticleByID(ctx context.Context, id string) (*knowledge.Article, error) {
	query := `
		SELECT id, slug, title, summary, status, category_id, published_revision_no, current_revision_no, created_at, created_by, updated_at, updated_by, last_reviewed_at
		FROM knowledge_articles WHERE id = $1
	`
	var a knowledge.Article
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&a.ID, &a.Slug, &a.Title, &a.Summary, &a.Status, &a.CategoryID, &a.PublishedRevisionNo, &a.CurrentRevisionNo, &a.CreatedAt, &a.CreatedBy, &a.UpdatedAt, &a.UpdatedBy, &a.LastReviewedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, knowledge.ErrArticleNotFound
		}
		return nil, err
	}
	return &a, nil
}

func (r *KnowledgeRepository) GetArticleBySlug(ctx context.Context, slug string) (*knowledge.Article, error) {
	query := `
		SELECT id, slug, title, summary, status, category_id, published_revision_no, current_revision_no, created_at, created_by, updated_at, updated_by, last_reviewed_at
		FROM knowledge_articles WHERE slug = $1
	`
	var a knowledge.Article
	err := r.db.QueryRowContext(ctx, query, slug).Scan(
		&a.ID, &a.Slug, &a.Title, &a.Summary, &a.Status, &a.CategoryID, &a.PublishedRevisionNo, &a.CurrentRevisionNo, &a.CreatedAt, &a.CreatedBy, &a.UpdatedAt, &a.UpdatedBy, &a.LastReviewedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, knowledge.ErrArticleNotFound
		}
		return nil, err
	}
	return &a, nil
}

func (r *KnowledgeRepository) UpdateArticle(ctx context.Context, a *knowledge.Article) error {
	query := `
		UPDATE knowledge_articles 
		SET slug = $1, title = $2, summary = $3, status = $4, category_id = $5, published_revision_no = $6, current_revision_no = $7, updated_at = $8, updated_by = $9, last_reviewed_at = $10
		WHERE id = $11
	`
	_, err := r.db.ExecContext(ctx, query,
		a.Slug, a.Title, a.Summary, a.Status, a.CategoryID, a.PublishedRevisionNo, a.CurrentRevisionNo, a.UpdatedAt, a.UpdatedBy, a.LastReviewedAt, a.ID)
	return err
}

func (r *KnowledgeRepository) CreateRevision(ctx context.Context, rev *knowledge.Revision) error {
	query := `
		INSERT INTO knowledge_revisions (id, article_id, revision_no, body, author_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.ExecContext(ctx, query,
		rev.ID, rev.ArticleID, rev.RevisionNo, rev.Body, rev.AuthorID, rev.CreatedAt)
	return err
}

func (r *KnowledgeRepository) CreateRevisionAtomically(ctx context.Context, article *knowledge.Article, rev *knowledge.Revision, expectedRevisionNo int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() // #nosec G104 -- rollback after commit is harmless
	result, err := tx.ExecContext(ctx, `
		UPDATE knowledge_articles
		SET status=$1, current_revision_no=$2, updated_at=$3, updated_by=$4
		WHERE id=$5 AND current_revision_no=$6 AND status IN ('draft','published')
	`, article.Status, article.CurrentRevisionNo, article.UpdatedAt, article.UpdatedBy, article.ID, expectedRevisionNo)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows != 1 {
		return knowledge.ErrRevisionConflict
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO knowledge_revisions (id, article_id, revision_no, body, author_id, created_at) VALUES ($1,$2,$3,$4,$5,$6)`, rev.ID, rev.ArticleID, rev.RevisionNo, rev.Body, rev.AuthorID, rev.CreatedAt); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *KnowledgeRepository) GetRevision(ctx context.Context, articleID string, revisionNo int) (*knowledge.Revision, error) {
	query := `
		SELECT id, article_id, revision_no, body, author_id, created_at
		FROM knowledge_revisions 
		WHERE article_id = $1 AND revision_no = $2
	`
	var rev knowledge.Revision
	err := r.db.QueryRowContext(ctx, query, articleID, revisionNo).Scan(
		&rev.ID, &rev.ArticleID, &rev.RevisionNo, &rev.Body, &rev.AuthorID, &rev.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, knowledge.ErrRevisionNotFound
		}
		return nil, err
	}
	return &rev, nil
}

func (r *KnowledgeRepository) ListRevisions(ctx context.Context, articleID string) ([]knowledge.Revision, error) {
	query := `
		SELECT id, article_id, revision_no, body, author_id, created_at
		FROM knowledge_revisions 
		WHERE article_id = $1
		ORDER BY revision_no DESC
	`
	rows, err := r.db.QueryContext(ctx, query, articleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var revs []knowledge.Revision
	for rows.Next() {
		var rev knowledge.Revision
		if err := rows.Scan(&rev.ID, &rev.ArticleID, &rev.RevisionNo, &rev.Body, &rev.AuthorID, &rev.CreatedAt); err != nil {
			return nil, err
		}
		revs = append(revs, rev)
	}
	return revs, nil
}

func (r *KnowledgeRepository) ListPublicArticles(ctx context.Context, page, pageSize int, categoryID, nodeID *string) ([]knowledge.Article, int, error) {
	offset := (page - 1) * pageSize
	if nodeID != nil {
		const countByNode = `
			SELECT COUNT(*) FROM knowledge_articles a
			JOIN knowledge_article_nodes an ON an.article_id=a.id
			WHERE a.published_revision_no IS NOT NULL AND an.node_id=$1
			  AND ($2::uuid IS NULL OR a.category_id=$2::uuid)
			  AND NOT EXISTS (
				WITH RECURSIVE ancestors AS (
					SELECT id,parent_id,status FROM knowledge_nodes WHERE id=an.node_id
					UNION ALL SELECT n.id,n.parent_id,n.status FROM knowledge_nodes n JOIN ancestors x ON n.id=x.parent_id
				) SELECT 1 FROM ancestors WHERE status<>'active'
			  )`
		const listByNode = `
			SELECT a.id, a.slug, a.title, a.summary, a.status, a.category_id,
			       a.published_revision_no, a.current_revision_no, a.created_at,
			       a.created_by, a.updated_at, a.updated_by, a.last_reviewed_at
			FROM knowledge_articles a
			JOIN knowledge_article_nodes an ON an.article_id=a.id
			WHERE a.published_revision_no IS NOT NULL AND an.node_id=$1
			  AND ($2::uuid IS NULL OR a.category_id=$2::uuid)
			  AND NOT EXISTS (
				WITH RECURSIVE ancestors AS (
					SELECT id,parent_id,status FROM knowledge_nodes WHERE id=an.node_id
					UNION ALL SELECT n.id,n.parent_id,n.status FROM knowledge_nodes n JOIN ancestors x ON n.id=x.parent_id
				) SELECT 1 FROM ancestors WHERE status<>'active'
			  )
			ORDER BY a.created_at DESC LIMIT $3 OFFSET $4`
		var category any
		if categoryID != nil {
			category = *categoryID
		}
		var total int
		if err := r.db.QueryRowContext(ctx, countByNode, *nodeID, category).Scan(&total); err != nil {
			return nil, 0, err
		}
		rows, err := r.db.QueryContext(ctx, listByNode, *nodeID, category, pageSize, offset)
		if err != nil {
			return nil, 0, err
		}
		defer rows.Close()
		articles, err := scanKnowledgeArticles(rows)
		return articles, total, err
	}

	// Base query
	query := `
		SELECT id, slug, title, summary, status, category_id, published_revision_no, current_revision_no, created_at, created_by, updated_at, updated_by, last_reviewed_at
		FROM knowledge_articles 
		WHERE published_revision_no IS NOT NULL
	`
	countQuery := `SELECT COUNT(*) FROM knowledge_articles WHERE published_revision_no IS NOT NULL`

	args := []interface{}{}
	countArgs := []interface{}{}

	if categoryID != nil && *categoryID != "" {
		query += ` AND category_id = $1`
		countQuery += ` AND category_id = $1`
		args = append(args, *categoryID)
		countArgs = append(countArgs, *categoryID)
	}

	query += ` ORDER BY created_at DESC LIMIT $`

	// Add LIMIT and OFFSET placeholders
	// Go does not support simple query building easily without libs, but this is safe and standard

	// Go does not support simple query building easily without libs, but this is safe and standard
	// we will construct manually
	if categoryID != nil && *categoryID != "" {
		query = `
			SELECT id, slug, title, summary, status, category_id, published_revision_no, current_revision_no, created_at, created_by, updated_at, updated_by, last_reviewed_at
			FROM knowledge_articles 
			WHERE published_revision_no IS NOT NULL AND category_id = $1
			ORDER BY created_at DESC LIMIT $2 OFFSET $3
		`
		args = append(args, pageSize, offset)
	} else {
		query = `
			SELECT id, slug, title, summary, status, category_id, published_revision_no, current_revision_no, created_at, created_by, updated_at, updated_by, last_reviewed_at
			FROM knowledge_articles 
			WHERE published_revision_no IS NOT NULL
			ORDER BY created_at DESC LIMIT $1 OFFSET $2
		`
		args = append(args, pageSize, offset)
	}

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	articles, err := scanKnowledgeArticles(rows)
	return articles, total, err
}

func scanKnowledgeArticles(rows *sql.Rows) ([]knowledge.Article, error) {
	articles := make([]knowledge.Article, 0)
	for rows.Next() {
		var article knowledge.Article
		if err := rows.Scan(&article.ID, &article.Slug, &article.Title, &article.Summary,
			&article.Status, &article.CategoryID, &article.PublishedRevisionNo,
			&article.CurrentRevisionNo, &article.CreatedAt, &article.CreatedBy,
			&article.UpdatedAt, &article.UpdatedBy, &article.LastReviewedAt); err != nil {
			return nil, err
		}
		articles = append(articles, article)
	}
	return articles, rows.Err()
}

func (r *KnowledgeRepository) ListAdminArticles(ctx context.Context, page, pageSize int) ([]knowledge.Article, int, error) {
	offset := (page - 1) * pageSize

	query := `
		SELECT id, slug, title, summary, status, category_id, published_revision_no, current_revision_no, created_at, created_by, updated_at, updated_by, last_reviewed_at
		FROM knowledge_articles 
		ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`
	countQuery := `SELECT COUNT(*) FROM knowledge_articles`

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.QueryContext(ctx, query, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var articles []knowledge.Article
	for rows.Next() {
		var a knowledge.Article
		if err := rows.Scan(&a.ID, &a.Slug, &a.Title, &a.Summary, &a.Status, &a.CategoryID, &a.PublishedRevisionNo, &a.CurrentRevisionNo, &a.CreatedAt, &a.CreatedBy, &a.UpdatedAt, &a.UpdatedBy, &a.LastReviewedAt); err != nil {
			return nil, 0, err
		}
		articles = append(articles, a)
	}
	return articles, total, nil
}

func (r *KnowledgeRepository) AddRelatedArticle(ctx context.Context, articleID1, articleID2 string) error {
	query := `
		INSERT INTO knowledge_related_articles (article_id_1, article_id_2)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`
	_, err := r.db.ExecContext(ctx, query, articleID1, articleID2)
	return err
}

func (r *KnowledgeRepository) RemoveRelatedArticle(ctx context.Context, articleID1, articleID2 string) error {
	query := `
		DELETE FROM knowledge_related_articles
		WHERE article_id_1 = $1 AND article_id_2 = $2
	`
	_, err := r.db.ExecContext(ctx, query, articleID1, articleID2)
	return err
}

func (r *KnowledgeRepository) ListRelatedArticles(ctx context.Context, articleID string) ([]knowledge.Article, error) {
	query := `
		SELECT a.id, a.slug, a.title, a.summary, a.status, a.category_id, a.published_revision_no, a.current_revision_no, a.created_at, a.created_by, a.updated_at, a.updated_by, a.last_reviewed_at
		FROM knowledge_articles a
		INNER JOIN knowledge_related_articles ra ON a.id = ra.article_id_2
		WHERE ra.article_id_1 = $1 AND a.published_revision_no IS NOT NULL
	`
	rows, err := r.db.QueryContext(ctx, query, articleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var articles []knowledge.Article
	for rows.Next() {
		var a knowledge.Article
		if err := rows.Scan(&a.ID, &a.Slug, &a.Title, &a.Summary, &a.Status, &a.CategoryID, &a.PublishedRevisionNo, &a.CurrentRevisionNo, &a.CreatedAt, &a.CreatedBy, &a.UpdatedAt, &a.UpdatedBy, &a.LastReviewedAt); err != nil {
			return nil, err
		}
		articles = append(articles, a)
	}
	return articles, nil
}
