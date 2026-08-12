package knowledge_test

import (
	"context"
	"testing"

	"teman-belajar-api/internal/domain/knowledge"
)

type mockKnowledgeRepo struct {
	articles map[string]*knowledge.Article
	revisions map[string]*knowledge.Revision
	related map[string]string
}

func newMockRepo() *mockKnowledgeRepo {
	return &mockKnowledgeRepo{
		articles: make(map[string]*knowledge.Article),
		revisions: make(map[string]*knowledge.Revision),
		related: make(map[string]string),
	}
}

func (m *mockKnowledgeRepo) CreateArticle(ctx context.Context, a *knowledge.Article) error {
	m.articles[a.ID] = a
	return nil
}

func (m *mockKnowledgeRepo) GetArticleByID(ctx context.Context, id string) (*knowledge.Article, error) {
	if a, ok := m.articles[id]; ok {
		return a, nil
	}
	return nil, knowledge.ErrArticleNotFound
}

func (m *mockKnowledgeRepo) GetArticleBySlug(ctx context.Context, slug string) (*knowledge.Article, error) {
	for _, a := range m.articles {
		if a.Slug == slug {
			return a, nil
		}
	}
	return nil, knowledge.ErrArticleNotFound
}

func (m *mockKnowledgeRepo) UpdateArticle(ctx context.Context, a *knowledge.Article) error {
	m.articles[a.ID] = a
	return nil
}

func (m *mockKnowledgeRepo) CreateRevision(ctx context.Context, r *knowledge.Revision) error {
	m.revisions[r.ID] = r
	return nil
}

func (m *mockKnowledgeRepo) GetRevision(ctx context.Context, articleID string, revisionNo int) (*knowledge.Revision, error) {
	for _, r := range m.revisions {
		if r.ArticleID == articleID && r.RevisionNo == revisionNo {
			return r, nil
		}
	}
	return nil, knowledge.ErrRevisionNotFound
}

func (m *mockKnowledgeRepo) ListRevisions(ctx context.Context, articleID string) ([]knowledge.Revision, error) {
	var revs []knowledge.Revision
	for _, r := range m.revisions {
		if r.ArticleID == articleID {
			revs = append(revs, *r)
		}
	}
	return revs, nil
}

func (m *mockKnowledgeRepo) ListPublicArticles(ctx context.Context, page, pageSize int, categoryID *string) ([]knowledge.Article, int, error) {
	return nil, 0, nil
}

func (m *mockKnowledgeRepo) ListAdminArticles(ctx context.Context, page, pageSize int) ([]knowledge.Article, int, error) {
	return nil, 0, nil
}

func (m *mockKnowledgeRepo) AddRelatedArticle(ctx context.Context, articleID1, articleID2 string) error {
	return nil
}

func (m *mockKnowledgeRepo) RemoveRelatedArticle(ctx context.Context, articleID1, articleID2 string) error {
	return nil
}

func (m *mockKnowledgeRepo) ListRelatedArticles(ctx context.Context, articleID string) ([]knowledge.Article, error) {
	return nil, nil
}

func TestKnowledgeRevisionIsolation(t *testing.T) {
	repo := newMockRepo()
	svc := knowledge.NewService(repo, nil)
	ctx := context.Background()

	actorID := "user1"
	
	// Create Draft Article (Revision 1)
	article, err := svc.CreateArticleWithRevision(ctx, "Test Article", "test-article", "Body 1", nil, nil, &actorID)
	if err != nil {
		t.Fatalf("Failed to create article: %v", err)
	}

	// Approve and Publish Revision 1
	err = svc.TransitionStatus(ctx, article.ID, knowledge.StatusInReview, &actorID)
	if err != nil {
		t.Fatalf("Failed to transition to in_review: %v", err)
	}
	err = svc.TransitionStatus(ctx, article.ID, knowledge.StatusApproved, &actorID)
	if err != nil {
		t.Fatalf("Failed to transition to approved: %v", err)
	}
	err = svc.TransitionStatus(ctx, article.ID, knowledge.StatusPublished, &actorID)
	if err != nil {
		t.Fatalf("Failed to transition to published: %v", err)
	}
	
	// Public user gets the article, expects Revision 1 content
	pubArt, pubRev, _, err := svc.GetPublicArticleWithRevision(ctx, "test-article")
	if err != nil {
		t.Fatalf("Public should see published article: %v", err)
	}
	if pubRev.Body != "Body 1" {
		t.Errorf("Expected Body 1, got %s", pubRev.Body)
	}
	if *pubArt.PublishedRevisionNo != 1 {
		t.Errorf("Expected published revision 1, got %d", *pubArt.PublishedRevisionNo)
	}
	
	// Editor creates a new draft (Revision 2)
	_, err = svc.CreateRevision(ctx, article.ID, "Body 2 - edited", &actorID)
	if err != nil {
		t.Fatalf("Failed to create revision 2: %v", err)
	}
	
	// Transition article to draft for the new revision
	err = svc.TransitionStatus(ctx, article.ID, knowledge.StatusDraft, &actorID)
	if err != nil {
		t.Fatalf("Failed to transition to draft: %v", err)
	}

	// CRITICAL TEST: Public should STILL see Revision 1, despite article status being "draft" for the new revision.
	_, pubRev2, _, err := svc.GetPublicArticleWithRevision(ctx, "test-article")
	if err != nil {
		t.Fatalf("Public should still see published article even if current working status is draft: %v", err)
	}
	if pubRev2.Body != "Body 1" {
		t.Errorf("Isolation failed. Expected Body 1 to still be public, got %s", pubRev2.Body)
	}
	
	// Now let's approve and publish the new revision (Revision 2)
	err = svc.TransitionStatus(ctx, article.ID, knowledge.StatusInReview, &actorID)
	if err != nil {
		t.Fatalf("Failed to transition to in_review: %v", err)
	}
	err = svc.TransitionStatus(ctx, article.ID, knowledge.StatusApproved, &actorID)
	if err != nil {
		t.Fatalf("Failed to transition to approved: %v", err)
	}
	err = svc.TransitionStatus(ctx, article.ID, knowledge.StatusPublished, &actorID)
	if err != nil {
		t.Fatalf("Failed to transition to published: %v", err)
	}
	
	// Public user gets the article, expects Revision 2 content
	pubArt3, pubRev3, _, err := svc.GetPublicArticleWithRevision(ctx, "test-article")
	if err != nil {
		t.Fatalf("Public should see published article: %v", err)
	}
	if pubRev3.Body != "Body 2 - edited" {
		t.Errorf("Expected Body 2, got %s", pubRev3.Body)
	}
	if *pubArt3.PublishedRevisionNo != 2 {
		t.Errorf("Expected published revision 2, got %d", *pubArt3.PublishedRevisionNo)
	}
}
