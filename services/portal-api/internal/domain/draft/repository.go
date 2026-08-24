package draft

import "context"

type Repository interface {
	Create(ctx context.Context, value *FormDraft) error
	Update(ctx context.Context, value *FormDraft, expectedRevision int64) error
	Get(ctx context.Context, actorSubject, draftKey string) (*FormDraft, error)
	GetByEntity(ctx context.Context, actorSubject, entityType, entityID string) (*FormDraft, error)
	List(ctx context.Context, actorSubject string, filter ListFilter) ([]FormDraft, error)
	Delete(ctx context.Context, actorSubject, draftKey string) error
	CleanupExpired(ctx context.Context, limit int) (int64, error)
}
