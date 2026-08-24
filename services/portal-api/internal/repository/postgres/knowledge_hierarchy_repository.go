package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
	"teman-belajar-api/internal/domain/knowledge"
)

func (r *KnowledgeRepository) ListNodes(ctx context.Context, includeArchived, publishedArticlesOnly bool) ([]knowledge.Node, error) {
	const query = `
		WITH RECURSIVE hierarchy AS (
			SELECT n.id, n.parent_id, n.node_type, n.slug, n.title, n.description,
			       n.sort_order, n.status, n.version, n.created_at, n.created_by,
			       n.updated_at, n.updated_by, 1 AS depth
			FROM knowledge_nodes n
			WHERE n.parent_id IS NULL AND ($1 OR n.status = 'active')
			UNION ALL
			SELECT n.id, n.parent_id, n.node_type, n.slug, n.title, n.description,
			       n.sort_order, n.status, n.version, n.created_at, n.created_by,
			       n.updated_at, n.updated_by, h.depth + 1
			FROM knowledge_nodes n
			JOIN hierarchy h ON n.parent_id = h.id
			WHERE ($1 OR n.status = 'active') AND h.depth < 8
		)
		SELECT h.id::text, h.parent_id::text, h.node_type, h.slug, h.title,
		       h.description, h.sort_order, h.status, h.version, h.depth,
		       COUNT(a.id)::int, h.created_at, h.created_by::text,
		       h.updated_at, h.updated_by::text
		FROM hierarchy h
		LEFT JOIN knowledge_article_nodes an ON an.node_id = h.id
		LEFT JOIN knowledge_articles a ON a.id = an.article_id
			AND (NOT $2 OR a.published_revision_no IS NOT NULL)
		GROUP BY h.id, h.parent_id, h.node_type, h.slug, h.title, h.description,
		         h.sort_order, h.status, h.version, h.depth, h.created_at,
		         h.created_by, h.updated_at, h.updated_by
		ORDER BY h.depth, h.parent_id NULLS FIRST, h.sort_order, h.id`
	rows, err := r.db.QueryContext(ctx, query, includeArchived, publishedArticlesOnly)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	nodes := make([]knowledge.Node, 0)
	for rows.Next() {
		var node knowledge.Node
		if err := rows.Scan(&node.ID, &node.ParentID, &node.Type, &node.Slug, &node.Title,
			&node.Description, &node.SortOrder, &node.Status, &node.Version, &node.Depth,
			&node.ArticleCount, &node.CreatedAt, &node.CreatedBy, &node.UpdatedAt, &node.UpdatedBy); err != nil {
			return nil, err
		}
		nodes = append(nodes, node)
	}
	return nodes, rows.Err()
}

func (r *KnowledgeRepository) GetNode(ctx context.Context, id string) (*knowledge.Node, error) {
	const query = `
		WITH RECURSIVE ancestors AS (
			SELECT id, parent_id, 1 AS depth FROM knowledge_nodes WHERE id = $1
			UNION ALL
			SELECT n.id, n.parent_id, a.depth + 1
			FROM knowledge_nodes n JOIN ancestors a ON n.id = a.parent_id
			WHERE a.depth < 8
		)
		SELECT n.id::text, n.parent_id::text, n.node_type, n.slug, n.title,
		       n.description, n.sort_order, n.status, n.version,
		       (SELECT COUNT(*) FROM ancestors)::int,
		       (SELECT COUNT(*) FROM knowledge_article_nodes an WHERE an.node_id = n.id)::int,
		       n.created_at, n.created_by::text, n.updated_at, n.updated_by::text
		FROM knowledge_nodes n WHERE n.id = $1`
	var node knowledge.Node
	err := r.db.QueryRowContext(ctx, query, id).Scan(&node.ID, &node.ParentID, &node.Type,
		&node.Slug, &node.Title, &node.Description, &node.SortOrder, &node.Status,
		&node.Version, &node.Depth, &node.ArticleCount, &node.CreatedAt, &node.CreatedBy,
		&node.UpdatedAt, &node.UpdatedBy)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, knowledge.ErrNodeNotFound
	}
	return &node, err
}

func (r *KnowledgeRepository) CreateNode(ctx context.Context, node *knowledge.Node) error {
	const query = `INSERT INTO knowledge_nodes
		(id, parent_id, node_type, slug, title, description, sort_order, status,
		 version, created_at, created_by, updated_at, updated_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`
	_, err := r.db.ExecContext(ctx, query, node.ID, node.ParentID, node.Type, node.Slug,
		node.Title, node.Description, node.SortOrder, node.Status, node.Version,
		node.CreatedAt, node.CreatedBy, node.UpdatedAt, node.UpdatedBy)
	return mapHierarchyError(err)
}

func (r *KnowledgeRepository) UpdateNode(ctx context.Context, node *knowledge.Node, expectedVersion int) error {
	const query = `UPDATE knowledge_nodes SET node_type=$1, slug=$2, title=$3,
		description=$4, version=version+1, updated_at=$5, updated_by=$6
		WHERE id=$7 AND version=$8`
	result, err := r.db.ExecContext(ctx, query, node.Type, node.Slug, node.Title,
		node.Description, node.UpdatedAt, node.UpdatedBy, node.ID, expectedVersion)
	if err != nil {
		return mapHierarchyError(err)
	}
	return requireHierarchyMutation(result)
}

func (r *KnowledgeRepository) MoveNode(ctx context.Context, nodeID string, parentID *string, sortOrder, expectedVersion int, actorID *string, updatedAt time.Time) error {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer tx.Rollback() // #nosec G104 -- rollback after commit is harmless
	if _, err := tx.ExecContext(ctx, `SET CONSTRAINTS knowledge_nodes_sibling_order_unique DEFERRED`); err != nil {
		return err
	}
	var oldParent *string
	var oldOrder, currentVersion int
	if err := tx.QueryRowContext(ctx, `SELECT parent_id::text, sort_order, version FROM knowledge_nodes WHERE id=$1 FOR UPDATE`, nodeID).Scan(&oldParent, &oldOrder, &currentVersion); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return knowledge.ErrNodeNotFound
		}
		return err
	}
	if currentVersion != expectedVersion {
		return knowledge.ErrHierarchyConflict
	}
	if parentID != nil {
		var parentStatus knowledge.NodeStatus
		if err := tx.QueryRowContext(ctx, `SELECT status FROM knowledge_nodes WHERE id=$1 FOR UPDATE`, *parentID).Scan(&parentStatus); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return knowledge.ErrNodeNotFound
			}
			return err
		}
		if parentStatus != knowledge.NodeActive {
			return knowledge.ErrNodeArchived
		}
	}
	var siblingCount int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM knowledge_nodes WHERE parent_id IS NOT DISTINCT FROM $1::uuid AND id <> $2`, parentID, nodeID).Scan(&siblingCount); err != nil {
		return err
	}
	if sortOrder < 1 || sortOrder > siblingCount+1 {
		return knowledge.ErrInvalidNodeOrder
	}
	var parentDepth, subtreeHeight int
	if parentID != nil {
		if err := tx.QueryRowContext(ctx, `WITH RECURSIVE a AS (
			SELECT id,parent_id,1 depth FROM knowledge_nodes WHERE id=$1
			UNION ALL SELECT n.id,n.parent_id,a.depth+1 FROM knowledge_nodes n JOIN a ON n.id=a.parent_id WHERE a.depth<9
		) SELECT COALESCE(MAX(depth),0) FROM a`, *parentID).Scan(&parentDepth); err != nil {
			return err
		}
	}
	if err := tx.QueryRowContext(ctx, `WITH RECURSIVE d AS (
		SELECT id,1 depth FROM knowledge_nodes WHERE id=$1
		UNION ALL SELECT n.id,d.depth+1 FROM knowledge_nodes n JOIN d ON n.parent_id=d.id WHERE d.depth<9
	) SELECT COALESCE(MAX(depth),1) FROM d`, nodeID).Scan(&subtreeHeight); err != nil {
		return err
	}
	if parentID != nil {
		var cycle bool
		if err := tx.QueryRowContext(ctx, `WITH RECURSIVE d AS (
			SELECT id FROM knowledge_nodes WHERE id=$1
			UNION ALL SELECT n.id FROM knowledge_nodes n JOIN d ON n.parent_id=d.id
		) SELECT EXISTS(SELECT 1 FROM d WHERE id=$2)`, nodeID, *parentID).Scan(&cycle); err != nil {
			return err
		}
		if cycle {
			return knowledge.ErrHierarchyCycle
		}
	}
	if parentDepth+subtreeHeight > knowledge.MaxHierarchyDepth {
		return knowledge.ErrHierarchyDepth
	}
	if _, err := tx.ExecContext(ctx, `UPDATE knowledge_nodes SET sort_order=sort_order-1 WHERE parent_id IS NOT DISTINCT FROM $1::uuid AND sort_order>$2 AND id<>$3`, oldParent, oldOrder, nodeID); err != nil {
		return mapHierarchyError(err)
	}
	if _, err := tx.ExecContext(ctx, `UPDATE knowledge_nodes SET sort_order=sort_order+1 WHERE parent_id IS NOT DISTINCT FROM $1::uuid AND sort_order>=$2 AND id<>$3`, parentID, sortOrder, nodeID); err != nil {
		return mapHierarchyError(err)
	}
	result, err := tx.ExecContext(ctx, `UPDATE knowledge_nodes SET parent_id=$1, sort_order=$2,
		version=version+1, updated_at=$3, updated_by=$4 WHERE id=$5 AND version=$6`, parentID, sortOrder, updatedAt, actorID, nodeID, expectedVersion)
	if err != nil {
		return mapHierarchyError(err)
	}
	if err := requireHierarchyMutation(result); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return mapHierarchyError(err)
	}
	return nil
}

func (r *KnowledgeRepository) ReorderNodes(ctx context.Context, parentID *string, orderedIDs []string, actorID *string, updatedAt time.Time) error {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer tx.Rollback() // #nosec G104 -- rollback after commit is harmless
	if _, err := tx.ExecContext(ctx, `SET CONSTRAINTS knowledge_nodes_sibling_order_unique DEFERRED`); err != nil {
		return err
	}
	rows, err := tx.QueryContext(ctx, `SELECT id::text FROM knowledge_nodes WHERE parent_id IS NOT DISTINCT FROM $1::uuid ORDER BY sort_order FOR UPDATE`, parentID)
	if err != nil {
		return err
	}
	actual := make(map[string]struct{})
	var scanErr error
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			scanErr = err
			break
		}
		actual[id] = struct{}{}
	}
	iterationErr := rows.Err()
	closeErr := rows.Close()
	if scanErr != nil || iterationErr != nil || closeErr != nil {
		return errors.Join(scanErr, iterationErr, closeErr)
	}
	if len(actual) != len(orderedIDs) {
		return knowledge.ErrInvalidNodeOrder
	}
	for _, id := range orderedIDs {
		if _, ok := actual[id]; !ok {
			return knowledge.ErrInvalidNodeOrder
		}
	}
	for index, id := range orderedIDs {
		if _, err := tx.ExecContext(ctx, `UPDATE knowledge_nodes SET sort_order=$1,
			version=version+1, updated_at=$2, updated_by=$3 WHERE id=$4`, index+1, updatedAt, actorID, id); err != nil {
			return mapHierarchyError(err)
		}
	}
	return mapHierarchyError(tx.Commit())
}

func (r *KnowledgeRepository) ArchiveNode(ctx context.Context, nodeID string, expectedVersion int, actorID *string, updatedAt time.Time) error {
	result, err := r.db.ExecContext(ctx, `UPDATE knowledge_nodes SET status='archived',
		version=version+1, updated_at=$1, updated_by=$2 WHERE id=$3 AND version=$4 AND status='active'`, updatedAt, actorID, nodeID, expectedVersion)
	if err != nil {
		return mapHierarchyError(err)
	}
	return requireHierarchyMutation(result)
}

func (r *KnowledgeRepository) AssignArticleNode(ctx context.Context, articleID, nodeID string, actorID *string, updatedAt time.Time) error {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	defer tx.Rollback() // #nosec G104 -- rollback after commit is harmless
	var articleExists, nodeExists, activeBranch bool
	if err := tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM knowledge_articles WHERE id=$1)`, articleID).Scan(&articleExists); err != nil {
		return err
	}
	if !articleExists {
		return knowledge.ErrArticleNotFound
	}
	if err := tx.QueryRowContext(ctx, `WITH RECURSIVE ancestors AS (
		SELECT id,parent_id,status FROM knowledge_nodes WHERE id=$1
		UNION ALL SELECT n.id,n.parent_id,n.status FROM knowledge_nodes n
		JOIN ancestors a ON n.id=a.parent_id
	)
	SELECT COUNT(*)>0,COALESCE(BOOL_AND(status='active'),false) FROM ancestors`, nodeID).Scan(&nodeExists, &activeBranch); err != nil {
		return err
	}
	if !nodeExists {
		return knowledge.ErrNodeNotFound
	}
	if !activeBranch {
		return knowledge.ErrNodeArchived
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO knowledge_article_nodes
		(article_id,node_id,created_at,created_by,updated_at,updated_by)
		VALUES ($1,$2,$3,$4,$3,$4)
		ON CONFLICT (article_id) DO UPDATE SET node_id=EXCLUDED.node_id,
		updated_at=EXCLUDED.updated_at, updated_by=EXCLUDED.updated_by`, articleID, nodeID, updatedAt, actorID)
	if err != nil {
		return mapHierarchyError(err)
	}
	return tx.Commit()
}

func (r *KnowledgeRepository) GetArticleHierarchy(ctx context.Context, articleID string, publicOnly bool) (*knowledge.ArticleHierarchy, error) {
	const query = `
		WITH RECURSIVE ancestors AS (
			SELECT n.id,n.parent_id,n.slug,n.title,n.node_type,n.status,1 depth
			FROM knowledge_article_nodes an JOIN knowledge_nodes n ON n.id=an.node_id
			WHERE an.article_id=$1
			UNION ALL
			SELECT n.id,n.parent_id,n.slug,n.title,n.node_type,n.status,a.depth+1
			FROM knowledge_nodes n JOIN ancestors a ON n.id=a.parent_id WHERE a.depth<8
		)
		SELECT id::text,slug,title,node_type,status,depth FROM ancestors ORDER BY depth DESC`
	rows, err := r.db.QueryContext(ctx, query, articleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := &knowledge.ArticleHierarchy{Breadcrumbs: []knowledge.Breadcrumb{}}
	active := true
	for rows.Next() {
		var crumb knowledge.Breadcrumb
		var status knowledge.NodeStatus
		var depth int
		if err := rows.Scan(&crumb.ID, &crumb.Slug, &crumb.Title, &crumb.Type, &status, &depth); err != nil {
			return nil, err
		}
		if status != knowledge.NodeActive {
			active = false
		}
		result.Breadcrumbs = append(result.Breadcrumbs, crumb)
		result.NodeID = crumb.ID
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(result.Breadcrumbs) == 0 || (publicOnly && !active) {
		return nil, nil
	}
	result.NodeID = result.Breadcrumbs[len(result.Breadcrumbs)-1].ID
	return result, nil
}

func requireHierarchyMutation(result sql.Result) error {
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows != 1 {
		return knowledge.ErrHierarchyConflict
	}
	return nil
}

func mapHierarchyError(err error) error {
	if err == nil {
		return nil
	}
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		switch string(pqErr.Code) {
		case "23505", "40001":
			return knowledge.ErrHierarchyConflict
		case "23503":
			return knowledge.ErrNodeNotFound
		case "23514":
			message := strings.ToLower(pqErr.Message)
			if strings.Contains(message, "cycle") {
				return knowledge.ErrHierarchyCycle
			}
			if strings.Contains(message, "depth") {
				return knowledge.ErrHierarchyDepth
			}
			return knowledge.ErrInvalidNode
		}
	}
	return fmt.Errorf("knowledge hierarchy repository: %w", err)
}
