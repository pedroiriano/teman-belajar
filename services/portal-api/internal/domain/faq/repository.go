package faq

import "context"

type Repository interface {
	CreateCategory(context.Context, *Category, string) error
	ListCategories(context.Context, bool) ([]Category, error)
	ArchiveCategory(context.Context, string, string) error
	CategoryActive(context.Context, string) (bool, error)
	CategoryHasLiveItems(context.Context, string) (bool, error)
	CreateItem(context.Context, *Item, string) error
	UpdateItem(context.Context, *Item, int64, string) error
	GetItem(context.Context, string) (*Item, error)
	ListAdminItems(context.Context, ListFilter) ([]Item, int, error)
	ListPublic(context.Context, string) ([]PublicCategory, int, error)
}
