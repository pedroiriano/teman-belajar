package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"teman-belajar-api/internal/domain/rbac"
)

type mockRBACRepo struct {
	policies []rbac.RolePolicy
}

func (m *mockRBACRepo) List(ctx context.Context) ([]rbac.RolePolicy, error) {
	return m.policies, nil
}
func (m *mockRBACRepo) GetByID(ctx context.Context, id string) (*rbac.RolePolicy, error) {
	for _, p := range m.policies {
		if p.ID == id {
			return &p, nil
		}
	}
	return nil, rbac.ErrNotFound
}
func (m *mockRBACRepo) Create(ctx context.Context, p rbac.RolePolicy) (*rbac.RolePolicy, error) {
	m.policies = append(m.policies, p)
	return &p, nil
}
func (m *mockRBACRepo) Update(ctx context.Context, id string, perms map[string][]string, desc *string) (*rbac.RolePolicy, error) {
	for i, p := range m.policies {
		if p.ID == id {
			m.policies[i].Permissions = perms
			if desc != nil {
				m.policies[i].Description = *desc
			}
			return &m.policies[i], nil
		}
	}
	return nil, rbac.ErrNotFound
}
func (m *mockRBACRepo) Delete(ctx context.Context, id string) error {
	for i, p := range m.policies {
		if p.ID == id {
			if p.IsSystem {
				return rbac.ErrSystemRole
			}
			m.policies = append(m.policies[:i], m.policies[i+1:]...)
			return nil
		}
	}
	return rbac.ErrNotFound
}

func TestRBACHandler_List(t *testing.T) {
	repo := &mockRBACRepo{
		policies: []rbac.RolePolicy{
			{
				ID:       "portal-administrator",
				Name:     "Portal Administrator",
				IsSystem: true,
			},
		},
	}
	svc := rbac.NewService(repo)
	h := NewRBACHandler(svc)

	req := httptest.NewRequest("GET", "/api/v1/admin/rbac/roles", nil)
	w := httptest.NewRecorder()
	h.List(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var res []rbac.RolePolicy
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if len(res) != 1 {
		t.Fatalf("expected 1 policy, got %d", len(res))
	}
}

func TestRBACHandler_Create(t *testing.T) {
	repo := &mockRBACRepo{}
	svc := rbac.NewService(repo)
	h := NewRBACHandler(svc)

	body, _ := json.Marshal(rbac.CreateRolePolicyInput{
		Name:        "Curator Role",
		Description: "Custom role for content curators",
	})
	req := httptest.NewRequest("POST", "/api/v1/admin/rbac/roles", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.Create(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}
