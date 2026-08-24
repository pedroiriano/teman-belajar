package postgres

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/knowledge"
)

func TestKnowledgeHierarchyRepositoryIntegrity(t *testing.T) {
	db := getTestDB(t)
	t.Cleanup(func() { _ = db.Close() })
	var exists bool
	if err := db.QueryRow(`SELECT to_regclass('public.knowledge_nodes') IS NOT NULL`).Scan(&exists); err != nil || !exists {
		t.Skip("migration 015 is not available in the integration database")
	}
	cleanupKnowledgeHierarchyFixtures(t, db)
	repo := NewKnowledgeRepository(db)
	ctx := context.Background()
	now := time.Now().UTC()
	var nextRootOrder int
	if err := db.QueryRow(`SELECT COALESCE(MAX(sort_order),0)+1 FROM knowledge_nodes WHERE parent_id IS NULL`).Scan(&nextRootOrder); err != nil || nextRootOrder > 9998 {
		t.Skip("root hierarchy order range is unavailable for an isolated test")
	}
	create := func(parent *string, title string, order int) *knowledge.Node {
		node := &knowledge.Node{ID: uuid.NewString(), ParentID: parent, Type: knowledge.NodeTopic, Slug: "test-" + uuid.NewString(), Title: title, SortOrder: order, Status: knowledge.NodeActive, Version: 1, CreatedAt: now, UpdatedAt: now}
		if err := repo.CreateNode(ctx, node); err != nil {
			t.Fatalf("create %s: %v", title, err)
		}
		return node
	}
	root := create(nil, "Hierarchy test root", nextRootOrder)
	otherRoot := create(nil, "Hierarchy test other root", nextRootOrder+1)
	childOne := create(&root.ID, "Child one", 1)
	childTwo := create(&root.ID, "Child two", 2)
	deepest := childOne
	for depth := 3; depth <= 8; depth++ {
		deepest = create(&deepest.ID, "Depth node", 1)
	}
	t.Cleanup(func() {
		cleanupKnowledgeHierarchyFixtures(t, db)
	})

	duplicate := &knowledge.Node{ID: uuid.NewString(), ParentID: &root.ID, Type: knowledge.NodeSection, Slug: childOne.Slug, Title: "Duplicate", SortOrder: 99, Status: knowledge.NodeActive, Version: 1, CreatedAt: now, UpdatedAt: now}
	if err := repo.CreateNode(ctx, duplicate); !errors.Is(err, knowledge.ErrHierarchyConflict) {
		t.Fatalf("expected sibling slug conflict, got %v", err)
	}
	tooDeep := &knowledge.Node{ID: uuid.NewString(), ParentID: &deepest.ID, Type: knowledge.NodeSection, Slug: "test-" + uuid.NewString(), Title: "Depth nine", SortOrder: 1, Status: knowledge.NodeActive, Version: 1, CreatedAt: now, UpdatedAt: now}
	if err := repo.CreateNode(ctx, tooDeep); !errors.Is(err, knowledge.ErrHierarchyDepth) {
		t.Fatalf("expected depth conflict, got %v", err)
	}
	if err := repo.MoveNode(ctx, root.ID, &deepest.ID, 1, 1, nil, now); !errors.Is(err, knowledge.ErrHierarchyCycle) {
		t.Fatalf("expected cycle conflict, got %v", err)
	}
	if err := repo.ReorderNodes(ctx, &root.ID, []string{childTwo.ID, childOne.ID}, nil, now); err != nil {
		t.Fatalf("reorder: %v", err)
	}
	loadedChild, err := repo.GetNode(ctx, childOne.ID)
	if err != nil || loadedChild.SortOrder != 2 || loadedChild.Version != 2 {
		t.Fatalf("reordered child=%+v err=%v", loadedChild, err)
	}
	loadedChild.Title = "Stale update"
	if err := repo.UpdateNode(ctx, loadedChild, 1); !errors.Is(err, knowledge.ErrHierarchyConflict) {
		t.Fatalf("expected optimistic conflict, got %v", err)
	}

	articleID := uuid.NewString()
	articleSlug := "hierarchy-test-article-" + uuid.NewString()
	if _, err := db.Exec(`INSERT INTO knowledge_articles (id,slug,title,status,current_revision_no) VALUES ($1,$2,'Hierarchy test','draft',1)`, articleID, articleSlug); err != nil {
		t.Fatal(err)
	}
	if err := repo.AssignArticleNode(ctx, articleID, childTwo.ID, nil, now); err != nil {
		t.Fatalf("assign article: %v", err)
	}
	publicNodes, err := repo.ListNodes(ctx, false, true)
	if err != nil {
		t.Fatalf("list public nodes: %v", err)
	}
	adminNodes, err := repo.ListNodes(ctx, false, false)
	if err != nil {
		t.Fatalf("list admin nodes: %v", err)
	}
	if nodeArticleCount(publicNodes, childTwo.ID) != 0 || nodeArticleCount(adminNodes, childTwo.ID) != 1 {
		t.Fatalf("draft article count leaked to public tree: public=%d admin=%d", nodeArticleCount(publicNodes, childTwo.ID), nodeArticleCount(adminNodes, childTwo.ID))
	}
	hierarchy, err := repo.GetArticleHierarchy(ctx, articleID, true)
	if err != nil || hierarchy == nil || hierarchy.NodeID != childTwo.ID || len(hierarchy.Breadcrumbs) != 2 {
		t.Fatalf("article hierarchy=%+v err=%v", hierarchy, err)
	}
	if err := repo.ArchiveNode(ctx, root.ID, 1, nil, now); err != nil {
		t.Fatalf("archive root: %v", err)
	}
	publicHierarchy, err := repo.GetArticleHierarchy(ctx, articleID, true)
	if err != nil || publicHierarchy != nil {
		t.Fatalf("archived ancestry must not be public: hierarchy=%+v err=%v", publicHierarchy, err)
	}
	if err := repo.AssignArticleNode(ctx, articleID, childTwo.ID, nil, now); !errors.Is(err, knowledge.ErrNodeArchived) {
		t.Fatalf("expected archived ancestry assignment rejection, got %v", err)
	}
	_ = otherRoot
}

func nodeArticleCount(nodes []knowledge.Node, id string) int {
	for _, node := range nodes {
		if node.ID == id {
			return node.ArticleCount
		}
	}
	return -1
}

func cleanupKnowledgeHierarchyFixtures(t *testing.T, db *sql.DB) {
	t.Helper()
	if _, err := db.Exec(`DELETE FROM knowledge_articles WHERE slug ~ '^hierarchy-test-article-[0-9a-f-]{36}$'`); err != nil {
		t.Errorf("clean hierarchy test articles: %v", err)
		return
	}
	rows, err := db.Query(`WITH RECURSIVE candidates AS (
		SELECT id,parent_id,1 depth FROM knowledge_nodes
		WHERE parent_id IS NULL AND created_by IS NULL
		  AND slug ~ '^test-[0-9a-f-]{36}$'
		  AND title IN ('Hierarchy test root','Hierarchy test other root')
		UNION ALL
		SELECT n.id,n.parent_id,c.depth+1 FROM knowledge_nodes n
		JOIN candidates c ON n.parent_id=c.id
		WHERE n.created_by IS NULL AND n.slug ~ '^test-[0-9a-f-]{36}$'
		  AND n.title IN ('Child one','Child two','Depth node')
	)
	SELECT id::text FROM candidates ORDER BY depth DESC,id`)
	if err != nil {
		t.Errorf("list hierarchy test fixtures: %v", err)
		return
	}
	defer rows.Close()
	var staleIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			t.Errorf("scan hierarchy test fixture: %v", err)
			return
		}
		staleIDs = append(staleIDs, id)
	}
	if err := rows.Err(); err != nil {
		t.Errorf("iterate hierarchy test fixtures: %v", err)
		return
	}
	for _, id := range staleIDs {
		if _, err := db.Exec(`DELETE FROM knowledge_nodes WHERE id=$1`, id); err != nil {
			t.Errorf("clean hierarchy test node %s: %v", id, err)
		}
	}
}
