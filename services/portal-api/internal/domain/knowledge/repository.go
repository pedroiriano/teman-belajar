package knowledge

import (
	"context"
)

type Repository interface {
	CreateArticle(ctx context.Context, a *Article) error
	GetArticleByID(ctx context.Context, id string) (*Article, error)
	GetArticleBySlug(ctx context.Context, slug string) (*Article, error)
	UpdateArticle(ctx context.Context, a *Article) error

	CreateRevision(ctx context.Context, r *Revision) error
	CreateRevisionAtomically(ctx context.Context, article *Article, revision *Revision, expectedRevisionNo int) error
	GetRevision(ctx context.Context, articleID string, revisionNo int) (*Revision, error)
	ListRevisions(ctx context.Context, articleID string) ([]Revision, error)

	ListPublicArticles(ctx context.Context, page, pageSize int, categoryID, nodeID *string) ([]Article, int, error)
	ListAdminArticles(ctx context.Context, page, pageSize int) ([]Article, int, error)

	AddRelatedArticle(ctx context.Context, articleID1, articleID2 string) error
	RemoveRelatedArticle(ctx context.Context, articleID1, articleID2 string) error
	ListRelatedArticles(ctx context.Context, articleID string) ([]Article, error)
}
