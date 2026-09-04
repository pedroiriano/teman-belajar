package rbac

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
)

var (
	ErrNotFound      = errors.New("role policy not found")
	ErrSystemRole    = errors.New("system roles cannot be deleted")
	ErrInvalidInput  = errors.New("invalid role input")
	ErrAlreadyExists = errors.New("role policy already exists")
)

var slugRegex = regexp.MustCompile(`[^a-z0-9-]+`)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context) ([]RolePolicy, error) {
	return s.repo.List(ctx)
}

func (s *Service) GetByID(ctx context.Context, id string) (*RolePolicy, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Update(ctx context.Context, id string, input UpdateRolePolicyInput) (*RolePolicy, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrNotFound
	}

	if input.Permissions == nil {
		input.Permissions = existing.Permissions
	}

	return s.repo.Update(ctx, id, input.Permissions, input.Description)
}

func (s *Service) Create(ctx context.Context, input CreateRolePolicyInput) (*RolePolicy, error) {
	name := strings.TrimSpace(input.Name)
	if len(name) < 3 {
		return nil, fmt.Errorf("%w: name must be at least 3 characters", ErrInvalidInput)
	}

	// Generate slug ID
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = slugRegex.ReplaceAllString(slug, "")
	if slug == "" {
		slug = fmt.Sprintf("custom-role-%d", time.Now().Unix())
	}

	existing, _ := s.repo.GetByID(ctx, slug)
	if existing != nil {
		slug = fmt.Sprintf("%s-%d", slug, time.Now().Unix()%1000)
	}

	perms := input.Permissions
	if len(perms) == 0 && input.TemplateID != "" {
		template, _ := s.repo.GetByID(ctx, input.TemplateID)
		if template != nil {
			perms = make(map[string][]string)
			for k, v := range template.Permissions {
				perms[k] = append([]string(nil), v...)
			}
		}
	}
	if perms == nil {
		perms = map[string][]string{
			"dashboard": {"read"},
			"knowledge": {"read"},
			"news":      {"read"},
		}
	}

	policy := RolePolicy{
		ID:          slug,
		Name:        name,
		Description: input.Description,
		IsSystem:    false,
		UserCount:   0,
		Permissions: perms,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	return s.repo.Create(ctx, policy)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if existing.IsSystem {
		return ErrSystemRole
	}
	return s.repo.Delete(ctx, id)
}
