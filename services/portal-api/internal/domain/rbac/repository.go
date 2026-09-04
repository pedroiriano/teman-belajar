package rbac

import (
	"context"
)

type Repository interface {
	List(ctx context.Context) ([]RolePolicy, error)
	GetByID(ctx context.Context, id string) (*RolePolicy, error)
	Create(ctx context.Context, policy RolePolicy) (*RolePolicy, error)
	Update(ctx context.Context, id string, permissions map[string][]string, description *string) (*RolePolicy, error)
	Delete(ctx context.Context, id string) error
}
