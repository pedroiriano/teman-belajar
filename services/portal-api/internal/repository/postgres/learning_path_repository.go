package postgres

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"teman-belajar-api/internal/domain/learningpath"
)

type LearningPathRepository struct{ db *sql.DB }

func NewLearningPathRepository(db *sql.DB) *LearningPathRepository {
	return &LearningPathRepository{db: db}
}

var _ learningpath.Repository = (*LearningPathRepository)(nil)

func mapLearningPathError(err error) error {
	var p *pq.Error
	if errors.As(err, &p) && (p.Code == "23505" || p.Code == "23503" || p.Code == "23514") {
		return learningpath.ErrConflict
	}
	return err
}

func (r *LearningPathRepository) Create(ctx context.Context, p *learningpath.Path, actor string) error {
	tx, e := r.db.BeginTx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	_, e = tx.ExecContext(ctx, `INSERT INTO learning_paths(id,slug,row_version,latest_version_number,published_version_number,archived_at,created_at,created_by,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$8)`, p.ID, p.Slug, p.RowVersion, p.Version.Number, p.PublishedVersionNumber, p.ArchivedAt, p.CreatedAt, nullableActor(actor), p.UpdatedAt)
	if e != nil {
		return mapLearningPathError(e)
	}
	if e = insertPathVersion(ctx, tx, p, actor); e != nil {
		return e
	}
	return tx.Commit()
}

func insertPathVersion(ctx context.Context, tx *sql.Tx, p *learningpath.Path, actor string) error {
	v := p.Version
	_, e := tx.ExecContext(ctx, `INSERT INTO learning_path_versions(id,path_id,version_number,title,summary,description,status,published_at,created_at,created_by,updated_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$10)`, v.ID, p.ID, v.Number, v.Title, v.Summary, v.Description, v.Status, v.PublishedAt, v.CreatedAt, nullableActor(actor), v.UpdatedAt)
	if e != nil {
		return mapLearningPathError(e)
	}
	return insertPathItems(ctx, tx, v, actor)
}

func insertPathItems(ctx context.Context, tx *sql.Tx, v learningpath.Version, actor string) error {
	byKey := map[string]string{}
	for _, x := range v.Items {
		byKey[x.Key] = x.ID
		_, e := tx.ExecContext(ctx, `INSERT INTO learning_path_items(id,path_version_id,item_key,item_kind,source_ref,label,summary,source_url,source_state,source_checked_at,sort_order,required,milestone) VALUES($1,$2,$3,$4,$5,$6,NULLIF($7,''),NULLIF($8,''),$9,$10,$11,$12,$13)`, x.ID, v.ID, x.Key, x.Kind, x.SourceRef, x.Label, x.Summary, x.URL, x.SourceState, x.SourceCheckedAt, x.SortOrder, x.Required, x.Milestone)
		if e != nil {
			return mapLearningPathError(e)
		}
	}
	for _, x := range v.Items {
		for _, key := range x.PrerequisiteKeys {
			_, e := tx.ExecContext(ctx, `INSERT INTO learning_path_prerequisites(item_id,prerequisite_item_id) VALUES($1,$2)`, x.ID, byKey[key])
			if e != nil {
				return mapLearningPathError(e)
			}
		}
	}
	return nil
}

func replacePathItems(ctx context.Context, tx *sql.Tx, v learningpath.Version, actor string) error {
	if _, e := tx.ExecContext(ctx, `DELETE FROM learning_path_prerequisites WHERE item_id IN (SELECT id FROM learning_path_items WHERE path_version_id=$1)`, v.ID); e != nil {
		return e
	}
	if _, e := tx.ExecContext(ctx, `DELETE FROM learning_path_items WHERE path_version_id=$1`, v.ID); e != nil {
		return e
	}
	return insertPathItems(ctx, tx, v, actor)
}

func (r *LearningPathRepository) SaveDraft(ctx context.Context, p *learningpath.Path, expected int64, actor string) error {
	tx, e := r.db.BeginTx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	result, e := tx.ExecContext(ctx, `UPDATE learning_paths SET slug=$1,row_version=$2,updated_at=$3,updated_by=$4 WHERE id=$5 AND row_version=$6`, p.Slug, p.RowVersion, p.UpdatedAt, nullableActor(actor), p.ID, expected)
	if e != nil {
		return mapLearningPathError(e)
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return learningpath.ErrConflict
	}
	_, e = tx.ExecContext(ctx, `UPDATE learning_path_versions SET title=$1,summary=$2,description=$3,updated_at=$4,updated_by=$5 WHERE id=$6 AND status='draft'`, p.Version.Title, p.Version.Summary, p.Version.Description, p.Version.UpdatedAt, nullableActor(actor), p.Version.ID)
	if e != nil {
		return mapLearningPathError(e)
	}
	if e = replacePathItems(ctx, tx, p.Version, actor); e != nil {
		return e
	}
	return tx.Commit()
}

func (r *LearningPathRepository) SaveStatus(ctx context.Context, p *learningpath.Path, expected int64, actor string) error {
	tx, e := r.db.BeginTx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	result, e := tx.ExecContext(ctx, `UPDATE learning_paths SET row_version=$1,published_version_number=$2,archived_at=$3,updated_at=$4,updated_by=$5 WHERE id=$6 AND row_version=$7`, p.RowVersion, p.PublishedVersionNumber, p.ArchivedAt, p.UpdatedAt, nullableActor(actor), p.ID, expected)
	if e != nil {
		return mapLearningPathError(e)
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return learningpath.ErrConflict
	}
	_, e = tx.ExecContext(ctx, `UPDATE learning_path_versions SET status=$1,published_at=$2,updated_at=$3,updated_by=$4 WHERE id=$5`, p.Version.Status, p.Version.PublishedAt, p.Version.UpdatedAt, nullableActor(actor), p.Version.ID)
	if e != nil {
		return mapLearningPathError(e)
	}
	if p.Version.Status == learningpath.StatusPublished {
		if e = replacePathItems(ctx, tx, p.Version, actor); e != nil {
			return e
		}
	}
	return tx.Commit()
}

func (r *LearningPathRepository) CreateRevision(ctx context.Context, p *learningpath.Path, expected int64, actor string) error {
	tx, e := r.db.BeginTx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	result, e := tx.ExecContext(ctx, `UPDATE learning_paths SET row_version=$1,latest_version_number=$2,updated_at=$3,updated_by=$4 WHERE id=$5 AND row_version=$6`, p.RowVersion, p.Version.Number, p.Version.UpdatedAt, nullableActor(actor), p.ID, expected)
	if e != nil {
		return mapLearningPathError(e)
	}
	if n, _ := result.RowsAffected(); n != 1 {
		return learningpath.ErrConflict
	}
	if e = insertPathVersion(ctx, tx, p, actor); e != nil {
		return e
	}
	return tx.Commit()
}

type lpScanner interface{ Scan(...any) error }

const pathVersionCols = `p.id,p.slug,p.row_version,p.published_version_number,p.archived_at,p.created_at,p.updated_at,v.id,v.version_number,v.title,v.summary,v.description,v.status,v.published_at,v.created_at,v.updated_at`

func scanPath(s lpScanner) (*learningpath.Path, error) {
	var p learningpath.Path
	e := s.Scan(&p.ID, &p.Slug, &p.RowVersion, &p.PublishedVersionNumber, &p.ArchivedAt, &p.CreatedAt, &p.UpdatedAt, &p.Version.ID, &p.Version.Number, &p.Version.Title, &p.Version.Summary, &p.Version.Description, &p.Version.Status, &p.Version.PublishedAt, &p.Version.CreatedAt, &p.Version.UpdatedAt)
	if errors.Is(e, sql.ErrNoRows) {
		return nil, learningpath.ErrNotFound
	}
	return &p, e
}

func (r *LearningPathRepository) loadItems(ctx context.Context, p *learningpath.Path) error {
	rows, e := r.db.QueryContext(ctx, `SELECT id,item_key,item_kind,source_ref,label,COALESCE(summary,''),COALESCE(source_url,''),source_state,source_checked_at,sort_order,required,milestone FROM learning_path_items WHERE path_version_id=$1 ORDER BY sort_order,id`, p.Version.ID)
	if e != nil {
		return e
	}
	defer rows.Close()
	p.Version.Items = []learningpath.Item{}
	for rows.Next() {
		var x learningpath.Item
		if e = rows.Scan(&x.ID, &x.Key, &x.Kind, &x.SourceRef, &x.Label, &x.Summary, &x.URL, &x.SourceState, &x.SourceCheckedAt, &x.SortOrder, &x.Required, &x.Milestone); e != nil {
			return e
		}
		x.PrerequisiteKeys = []string{}
		p.Version.Items = append(p.Version.Items, x)
	}
	if e = rows.Err(); e != nil {
		return e
	}
	for i := range p.Version.Items {
		pre, e := r.db.QueryContext(ctx, `SELECT prerequisite.item_key FROM learning_path_prerequisites rel JOIN learning_path_items prerequisite ON prerequisite.id=rel.prerequisite_item_id WHERE rel.item_id=$1 ORDER BY prerequisite.sort_order`, p.Version.Items[i].ID)
		if e != nil {
			return e
		}
		for pre.Next() {
			var key string
			if e = pre.Scan(&key); e != nil {
				pre.Close()
				return e
			}
			p.Version.Items[i].PrerequisiteKeys = append(p.Version.Items[i].PrerequisiteKeys, key)
		}
		e = pre.Close()
		if e != nil {
			return e
		}
	}
	return nil
}

func (r *LearningPathRepository) get(ctx context.Context, where string, arg any) (*learningpath.Path, error) {
	p, e := scanPath(r.db.QueryRowContext(ctx, `SELECT `+pathVersionCols+` FROM learning_paths p JOIN learning_path_versions v ON v.path_id=p.id WHERE `+where, arg))
	if e != nil {
		return nil, e
	}
	return p, r.loadItems(ctx, p)
}
func (r *LearningPathRepository) GetAdminByID(ctx context.Context, id string) (*learningpath.Path, error) {
	return r.get(ctx, `p.id=$1 AND v.version_number=p.latest_version_number`, id)
}
func (r *LearningPathRepository) GetPublicBySlug(ctx context.Context, slug string) (*learningpath.Path, error) {
	return r.get(ctx, `p.slug=$1 AND p.archived_at IS NULL AND p.published_version_number IS NOT NULL AND v.version_number=p.published_version_number AND v.status='published'`, slug)
}
func (r *LearningPathRepository) getByVersionID(ctx context.Context, id string) (*learningpath.Path, error) {
	return r.get(ctx, `v.id=$1`, id)
}

func (r *LearningPathRepository) List(ctx context.Context, f learningpath.Filter, admin bool) ([]learningpath.Path, int, error) {
	status := f.Status
	if status == "all" {
		status = ""
	}
	q := "%" + f.Query + "%"
	base := ` FROM learning_paths p JOIN learning_path_versions v ON v.path_id=p.id `
	where := ` WHERE ($1='' OR v.title ILIKE $2 OR v.summary ILIKE $2) `
	if admin {
		where += `AND v.version_number=p.latest_version_number AND ($3='' OR v.status=$3)`
	} else {
		where += `AND p.archived_at IS NULL AND p.published_version_number IS NOT NULL AND v.version_number=p.published_version_number AND v.status='published'`
	}
	var total int
	var e error
	if admin {
		e = r.db.QueryRowContext(ctx, `SELECT count(*)`+base+where, f.Query, q, status).Scan(&total)
	} else {
		e = r.db.QueryRowContext(ctx, `SELECT count(*)`+base+where, f.Query, q).Scan(&total)
	}
	if e != nil {
		return nil, 0, e
	}
	query := `SELECT ` + pathVersionCols + base + where + ` ORDER BY v.updated_at DESC,p.id LIMIT `
	var rows *sql.Rows
	if admin {
		rows, e = r.db.QueryContext(ctx, query+`$4 OFFSET $5`, f.Query, q, status, f.PageSize, (f.Page-1)*f.PageSize)
	} else {
		rows, e = r.db.QueryContext(ctx, query+`$3 OFFSET $4`, f.Query, q, f.PageSize, (f.Page-1)*f.PageSize)
	}
	if e != nil {
		return nil, 0, e
	}
	defer rows.Close()
	out := []learningpath.Path{}
	for rows.Next() {
		p, e := scanPath(rows)
		if e != nil {
			return nil, 0, e
		}
		out = append(out, *p)
	}
	if e = rows.Err(); e != nil {
		return nil, 0, e
	}
	for i := range out {
		if e = r.loadItems(ctx, &out[i]); e != nil {
			return nil, 0, e
		}
	}
	return out, total, nil
}

func (r *LearningPathRepository) BindLearnerVersion(ctx context.Context, slug, subject string) (*learningpath.Path, error) {
	tx, e := r.db.BeginTx(ctx, nil)
	if e != nil {
		return nil, e
	}
	defer tx.Rollback()
	var versionID string
	e = tx.QueryRowContext(ctx, `SELECT e.path_version_id FROM learning_path_enrollments e JOIN learning_paths p ON p.id=e.path_id WHERE p.slug=$1 AND e.user_subject=$2`, slug, subject).Scan(&versionID)
	if errors.Is(e, sql.ErrNoRows) {
		var pathID string
		e = tx.QueryRowContext(ctx, `SELECT p.id,v.id FROM learning_paths p JOIN learning_path_versions v ON v.path_id=p.id AND v.version_number=p.published_version_number WHERE p.slug=$1 AND p.archived_at IS NULL AND v.status='published'`, slug).Scan(&pathID, &versionID)
		if errors.Is(e, sql.ErrNoRows) {
			return nil, learningpath.ErrNotFound
		}
		if e != nil {
			return nil, e
		}
		_, e = tx.ExecContext(ctx, `INSERT INTO learning_path_enrollments(id,path_id,path_version_id,user_subject,first_viewed_at,last_viewed_at) VALUES($1,$2,$3,$4,NOW(),NOW()) ON CONFLICT(path_id,user_subject) DO UPDATE SET last_viewed_at=NOW()`, uuid.NewString(), pathID, versionID, subject)
		if e != nil {
			return nil, mapLearningPathError(e)
		}
	} else if e != nil {
		return nil, e
	} else {
		_, e = tx.ExecContext(ctx, `UPDATE learning_path_enrollments SET last_viewed_at=NOW() WHERE path_version_id=$1 AND user_subject=$2`, versionID, subject)
		if e != nil {
			return nil, e
		}
	}
	if e = tx.Commit(); e != nil {
		return nil, e
	}
	return r.getByVersionID(ctx, versionID)
}

var _ = time.Time{}
