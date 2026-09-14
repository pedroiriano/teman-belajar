package coursereview

import (
	"context"
)

type Repository interface {
	GetSummaryBySlug(ctx context.Context, programSlug string) (*RatingSummary, error)
	ListPublicBySlug(ctx context.Context, programSlug string, filter ListFilter) ([]Review, int, error)
	GetByUserAndSlug(ctx context.Context, userSubject, programSlug string) (*Review, error)
	Upsert(ctx context.Context, review *Review) error
	DeleteByUserAndSlug(ctx context.Context, userSubject, programSlug string) error
	ListAdmin(ctx context.Context, filter AdminFilter) ([]Review, int, error)
	UpdateStatus(ctx context.Context, id string, status Status) error
	GetByID(ctx context.Context, id string) (*Review, error)
	GetProgramIDBySlug(ctx context.Context, slug string) (string, error)
}
