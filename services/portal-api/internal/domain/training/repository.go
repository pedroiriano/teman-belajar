package training

import "context"

type Repository interface {
	Create(context.Context, *Program, string) error
	Update(context.Context, *Program, int64, string) error
	GetByID(context.Context, string) (*Program, error)
	GetPublishedBySlug(context.Context, string) (*Program, error)
	ListPublic(context.Context, ListFilter) ([]Program, int, error)
	ListAdmin(context.Context, ListFilter) ([]Program, int, error)
}
