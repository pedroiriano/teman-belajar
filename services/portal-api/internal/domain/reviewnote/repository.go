package reviewnote

import (
	"context"
)

type Repository interface {
	ListByEntity(ctx context.Context, entityType string, entityID string, limit int) ([]ReviewNote, error)
	Create(ctx context.Context, note ReviewNote) (*ReviewNote, error)
}
