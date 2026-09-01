package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"

	domain "teman-belajar-api/internal/domain/platformconfig"
)

type PlatformConfigRepository struct{ db *sql.DB }

func NewPlatformConfigRepository(db *sql.DB) *PlatformConfigRepository {
	return &PlatformConfigRepository{db: db}
}

func (repository *PlatformConfigRepository) GetState(ctx context.Context, includeHistory bool) (domain.State, error) {
	state := domain.State{}
	if err := repository.db.QueryRowContext(ctx, `SELECT COALESCE(MAX(version),0) FROM platform_config_versions`).Scan(&state.HeadVersion); err != nil {
		return state, err
	}
	if revision, err := getConfigRevision(ctx, repository.db, `SELECT id::text,version,status,config,based_on_version,created_by,created_at,published_at FROM platform_config_versions WHERE status='draft' LIMIT 1`); err == nil {
		state.Draft = revision
	} else if !errors.Is(err, sql.ErrNoRows) {
		return state, err
	}
	if revision, err := getConfigRevision(ctx, repository.db, `SELECT id::text,version,status,config,based_on_version,created_by,created_at,published_at FROM platform_config_versions WHERE status='published' LIMIT 1`); err == nil {
		state.Published = revision
	} else if !errors.Is(err, sql.ErrNoRows) {
		return state, err
	}
	if !includeHistory {
		return state, nil
	}
	rows, err := repository.db.QueryContext(ctx, `SELECT id::text,version,status,config,based_on_version,created_by,created_at,published_at FROM platform_config_versions ORDER BY version DESC LIMIT 50`)
	if err != nil {
		return state, err
	}
	defer rows.Close()
	for rows.Next() {
		revision, err := scanConfigRevision(rows)
		if err != nil {
			return state, err
		}
		state.Versions = append(state.Versions, *revision)
	}
	return state, rows.Err()
}

func (repository *PlatformConfigRepository) GetPublished(ctx context.Context) (*domain.Revision, error) {
	return getConfigRevision(ctx, repository.db, `SELECT id::text,version,status,config,based_on_version,created_by,created_at,published_at FROM platform_config_versions WHERE status='published' LIMIT 1`)
}

func (repository *PlatformConfigRepository) SaveDraft(ctx context.Context, expectedVersion int64, config domain.Config, actor string) (*domain.Revision, error) {
	payload, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}
	tx, err := repository.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() // #nosec G104 -- rollback after commit is a safe no-op
	if err := lockPlatformConfig(ctx, tx, expectedVersion); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE platform_config_versions SET status='superseded' WHERE status='draft'`); err != nil {
		return nil, err
	}
	revision, err := getConfigRevision(ctx, tx, `INSERT INTO platform_config_versions(id,status,config,created_by) VALUES($1,'draft',$2::jsonb,$3) RETURNING id::text,version,status,config,based_on_version,created_by,created_at,published_at`, uuid.NewString(), payload, actor)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return revision, nil
}

func (repository *PlatformConfigRepository) Publish(ctx context.Context, version int64, actor string) (*domain.Revision, error) {
	tx, err := repository.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() // #nosec G104 -- rollback after commit is a safe no-op
	if err := lockPlatformConfig(ctx, tx, version); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE platform_config_versions SET status='superseded' WHERE status='published'`); err != nil {
		return nil, err
	}
	revision, err := getConfigRevision(ctx, tx, `UPDATE platform_config_versions SET status='published',published_at=NOW(),published_by=$2 WHERE version=$1 AND status='draft' RETURNING id::text,version,status,config,based_on_version,created_by,created_at,published_at`, version, actor)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNoDraft
	}
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return revision, nil
}

func (repository *PlatformConfigRepository) Rollback(ctx context.Context, sourceVersion, expectedVersion int64, actor string) (*domain.Revision, error) {
	tx, err := repository.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() // #nosec G104 -- rollback after commit is a safe no-op
	if err := lockPlatformConfig(ctx, tx, expectedVersion); err != nil {
		return nil, err
	}
	var payload []byte
	if err := tx.QueryRowContext(ctx, `SELECT config FROM platform_config_versions WHERE version=$1`, sourceVersion).Scan(&payload); errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrVersionNotFound
	} else if err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE platform_config_versions SET status='superseded' WHERE status IN ('draft','published')`); err != nil {
		return nil, err
	}
	revision, err := getConfigRevision(ctx, tx, `INSERT INTO platform_config_versions(id,status,config,based_on_version,created_by,published_by,published_at) VALUES($1,'published',$2::jsonb,$3,$4,$4,NOW()) RETURNING id::text,version,status,config,based_on_version,created_by,created_at,published_at`, uuid.NewString(), payload, sourceVersion, actor)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return revision, nil
}

func lockPlatformConfig(ctx context.Context, tx *sql.Tx, expected int64) error {
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(20020)`); err != nil {
		return err
	}
	var head int64
	if err := tx.QueryRowContext(ctx, `SELECT COALESCE(MAX(version),0) FROM platform_config_versions`).Scan(&head); err != nil {
		return err
	}
	if head != expected {
		return domain.ErrVersionConflict
	}
	return nil
}

type configRow interface{ Scan(...any) error }
type configQuerier interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func getConfigRevision(ctx context.Context, queryer configQuerier, query string, arguments ...any) (*domain.Revision, error) {
	return scanConfigRevision(queryer.QueryRowContext(ctx, query, arguments...))
}

func scanConfigRevision(row configRow) (*domain.Revision, error) {
	var revision domain.Revision
	var payload []byte
	if err := row.Scan(&revision.ID, &revision.Version, &revision.Status, &payload, &revision.BasedOnVersion, &revision.CreatedBy, &revision.CreatedAt, &revision.PublishedAt); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(payload, &revision.Config); err != nil {
		return nil, fmt.Errorf("decode platform configuration: %w", err)
	}
	return &revision, nil
}
