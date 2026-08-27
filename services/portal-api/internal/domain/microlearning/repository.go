package microlearning

import "context"

type Repository interface {
	Create(context.Context, *Item, []string, string) error
	Update(context.Context, *Item, []string, int64, string) error
	GetByID(context.Context, string) (*Item, error)
	GetPublishedByID(context.Context, string) (*Item, error)
	GetPublishedBySlug(context.Context, string) (*Item, error)
	ListPublic(context.Context, ListFilter) ([]Item, int, error)
	ListAdmin(context.Context, ListFilter) ([]Item, int, error)
	ValidateFeaturedMedia(context.Context, string) error
	ValidateRelated(context.Context, string, []string) error
	UpsertProgress(context.Context, string, string, ProgressInput) (*Progress, error)
	GetProgress(context.Context, string, string) (*Progress, error)
}
