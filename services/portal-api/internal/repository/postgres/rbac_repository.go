package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"teman-belajar-api/internal/domain/rbac"
)

type RBACRepository struct {
	db *sql.DB
}

func NewRBACRepository(db *sql.DB) *RBACRepository {
	return &RBACRepository{db: db}
}

var _ rbac.Repository = (*RBACRepository)(nil)

func (r *RBACRepository) List(ctx context.Context) ([]rbac.RolePolicy, error) {
	query := `
		SELECT id, name, description, is_system, user_count, permissions, created_at, updated_at
		FROM app_role_policies
		ORDER BY is_system DESC, name ASC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query role policies: %w", err)
	}
	defer rows.Close()

	var policies []rbac.RolePolicy
	for rows.Next() {
		var p rbac.RolePolicy
		var permsBytes []byte

		if err := rows.Scan(
			&p.ID, &p.Name, &p.Description, &p.IsSystem, &p.UserCount,
			&permsBytes, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan role policy: %w", err)
		}

		if len(permsBytes) > 0 {
			_ = json.Unmarshal(permsBytes, &p.Permissions)
		}
		if p.Permissions == nil {
			p.Permissions = make(map[string][]string)
		}

		policies = append(policies, p)
	}

	return policies, nil
}

func (r *RBACRepository) GetByID(ctx context.Context, id string) (*rbac.RolePolicy, error) {
	query := `
		SELECT id, name, description, is_system, user_count, permissions, created_at, updated_at
		FROM app_role_policies
		WHERE id = $1
	`
	var p rbac.RolePolicy
	var permsBytes []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID, &p.Name, &p.Description, &p.IsSystem, &p.UserCount,
		&permsBytes, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, rbac.ErrNotFound
		}
		return nil, fmt.Errorf("get role policy: %w", err)
	}

	if len(permsBytes) > 0 {
		_ = json.Unmarshal(permsBytes, &p.Permissions)
	}
	if p.Permissions == nil {
		p.Permissions = make(map[string][]string)
	}

	return &p, nil
}

func (r *RBACRepository) Create(ctx context.Context, p rbac.RolePolicy) (*rbac.RolePolicy, error) {
	permsBytes, err := json.Marshal(p.Permissions)
	if err != nil {
		return nil, fmt.Errorf("marshal permissions: %w", err)
	}

	query := `
		INSERT INTO app_role_policies (
			id, name, description, is_system, user_count, permissions, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at
	`
	err = r.db.QueryRowContext(
		ctx, query,
		p.ID, p.Name, p.Description, p.IsSystem, p.UserCount, permsBytes,
		p.CreatedAt, p.UpdatedAt,
	).Scan(&p.CreatedAt, &p.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("insert role policy: %w", err)
	}

	return &p, nil
}

func (r *RBACRepository) Update(ctx context.Context, id string, permissions map[string][]string, description *string) (*rbac.RolePolicy, error) {
	permsBytes, err := json.Marshal(permissions)
	if err != nil {
		return nil, fmt.Errorf("marshal permissions: %w", err)
	}

	var query string
	var args []interface{}
	if description != nil {
		query = `
			UPDATE app_role_policies
			SET permissions = $1, description = $2, updated_at = NOW()
			WHERE id = $3
			RETURNING id, name, description, is_system, user_count, permissions, created_at, updated_at
		`
		args = []interface{}{permsBytes, *description, id}
	} else {
		query = `
			UPDATE app_role_policies
			SET permissions = $1, updated_at = NOW()
			WHERE id = $2
			RETURNING id, name, description, is_system, user_count, permissions, created_at, updated_at
		`
		args = []interface{}{permsBytes, id}
	}

	var p rbac.RolePolicy
	var outPermsBytes []byte

	err = r.db.QueryRowContext(ctx, query, args...).Scan(
		&p.ID, &p.Name, &p.Description, &p.IsSystem, &p.UserCount,
		&outPermsBytes, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, rbac.ErrNotFound
		}
		return nil, fmt.Errorf("update role policy: %w", err)
	}

	if len(outPermsBytes) > 0 {
		_ = json.Unmarshal(outPermsBytes, &p.Permissions)
	}

	return &p, nil
}

func (r *RBACRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM app_role_policies WHERE id = $1 AND is_system = false`
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return rbac.ErrNotFound
	}
	return nil
}
