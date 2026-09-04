package rbac

import (
	"context"
	"testing"
)

type mockRBACRepo struct {
	policies []RolePolicy
}

func (m *mockRBACRepo) List(ctx context.Context) ([]RolePolicy, error) {
	return m.policies, nil
}
func (m *mockRBACRepo) GetByID(ctx context.Context, id string) (*RolePolicy, error) {
	for _, p := range m.policies {
		if p.ID == id {
			return &p, nil
		}
	}
	return nil, ErrNotFound
}
func (m *mockRBACRepo) Create(ctx context.Context, p RolePolicy) (*RolePolicy, error) {
	m.policies = append(m.policies, p)
	return &p, nil
}
func (m *mockRBACRepo) Update(ctx context.Context, id string, perms map[string][]string, desc *string) (*RolePolicy, error) {
	for i, p := range m.policies {
		if p.ID == id {
			m.policies[i].Permissions = perms
			if desc != nil {
				m.policies[i].Description = *desc
			}
			return &m.policies[i], nil
		}
	}
	return nil, ErrNotFound
}
func (m *mockRBACRepo) Delete(ctx context.Context, id string) error {
	for i, p := range m.policies {
		if p.ID == id {
			m.policies = append(m.policies[:i], m.policies[i+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

func TestRBACService_Lifecycle(t *testing.T) {
	repo := &mockRBACRepo{
		policies: []RolePolicy{
			{
				ID:       "portal-administrator",
				Name:     "Portal Administrator",
				IsSystem: true,
				Permissions: map[string][]string{
					"dashboard": {"read"},
				},
			},
		},
	}
	svc := NewService(repo)
	ctx := context.Background()

	// 1. Cannot delete system role
	err := svc.Delete(ctx, "portal-administrator")
	if err != ErrSystemRole {
		t.Fatalf("expected ErrSystemRole, got %v", err)
	}

	// 2. Create custom role
	created, err := svc.Create(ctx, CreateRolePolicyInput{
		Name:        "Content Specialist",
		Description: "Specialist for news",
		TemplateID:  "portal-administrator",
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	if created.ID != "content-specialist" {
		t.Fatalf("expected slug content-specialist, got %s", created.ID)
	}

	// 3. Update custom role
	desc := "Updated description"
	updated, err := svc.Update(ctx, "content-specialist", UpdateRolePolicyInput{
		Permissions: map[string][]string{
			"news": {"read", "edit"},
		},
		Description: &desc,
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated.Description != desc {
		t.Fatalf("expected updated desc, got %s", updated.Description)
	}

	// 4. Delete custom role
	if err := svc.Delete(ctx, "content-specialist"); err != nil {
		t.Fatalf("delete custom role failed: %v", err)
	}
}
