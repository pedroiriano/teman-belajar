package rbac

import (
	"time"
)

// RolePolicy represents fine-grained internal application permissions per module.
type RolePolicy struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Description string              `json:"description"`
	IsSystem    bool                `json:"is_system"`
	UserCount   int                 `json:"user_count"`
	Permissions map[string][]string `json:"permissions"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
}

// UpdateRolePolicyInput holds data to update permissions or description of a role.
type UpdateRolePolicyInput struct {
	Permissions map[string][]string `json:"permissions"`
	Description *string             `json:"description,omitempty"`
}

// CreateRolePolicyInput holds data to create a custom role.
type CreateRolePolicyInput struct {
	Name        string              `json:"name"`
	Description string              `json:"description"`
	TemplateID  string              `json:"template_id,omitempty"`
	Permissions map[string][]string `json:"permissions,omitempty"`
}
