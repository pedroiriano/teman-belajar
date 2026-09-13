package banner

import "context"

type Repository interface {
	ListActive(ctx context.Context) ([]Banner, error)
	ListAll(ctx context.Context, page, pageSize int, search string, statusFilter string) ([]Banner, int, error)
	GetByID(ctx context.Context, id string) (*Banner, error)
	Create(ctx context.Context, b *Banner) error
	Update(ctx context.Context, b *Banner) error
	Delete(ctx context.Context, id string) error
	CountActive(ctx context.Context) (int, error)
}
