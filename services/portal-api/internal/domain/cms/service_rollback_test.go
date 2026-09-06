package cms_test

import (
	"context"
	"testing"

	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/domain/cms"
)

type rollbackMockRepo struct {
	news        map[string]*cms.News
	ann         map[string]*cms.Announcement
	newsRevs    map[string][]cms.NewsRevision
	annRevs     map[string][]cms.AnnouncementRevision
	auditEvents []*audit.AuditEvent
}

func newRollbackMockRepo() *rollbackMockRepo {
	return &rollbackMockRepo{
		news:     make(map[string]*cms.News),
		ann:      make(map[string]*cms.Announcement),
		newsRevs: make(map[string][]cms.NewsRevision),
		annRevs:  make(map[string][]cms.AnnouncementRevision),
	}
}

func (m *rollbackMockRepo) CreateNews(ctx context.Context, n *cms.News) error {
	m.news[n.ID] = n
	return nil
}

func (m *rollbackMockRepo) GetNewsByID(ctx context.Context, id string) (*cms.News, error) {
	n, ok := m.news[id]
	if !ok {
		return nil, cms.ErrNotFound
	}
	cp := *n
	return &cp, nil
}

func (m *rollbackMockRepo) GetNewsBySlug(ctx context.Context, slug string) (*cms.News, error) {
	for _, n := range m.news {
		if n.Slug == slug {
			cp := *n
			return &cp, nil
		}
	}
	return nil, cms.ErrNotFound
}

func (m *rollbackMockRepo) UpdateNews(ctx context.Context, n *cms.News, expectedVersion int64) error {
	current, ok := m.news[n.ID]
	if !ok {
		return cms.ErrNotFound
	}
	if current.Version != expectedVersion {
		return cms.ErrConflict
	}
	cp := *n
	m.news[n.ID] = &cp
	return nil
}

func (m *rollbackMockRepo) ListPublicNews(ctx context.Context, page, pageSize int) ([]cms.News, int, error) {
	return nil, 0, nil
}

func (m *rollbackMockRepo) ListAdminNews(ctx context.Context, page, pageSize int) ([]cms.News, int, error) {
	return nil, 0, nil
}

func (m *rollbackMockRepo) CreateAnnouncement(ctx context.Context, a *cms.Announcement) error {
	m.ann[a.ID] = a
	return nil
}

func (m *rollbackMockRepo) GetAnnouncementByID(ctx context.Context, id string) (*cms.Announcement, error) {
	a, ok := m.ann[id]
	if !ok {
		return nil, cms.ErrNotFound
	}
	cp := *a
	return &cp, nil
}

func (m *rollbackMockRepo) GetAnnouncementBySlug(ctx context.Context, slug string) (*cms.Announcement, error) {
	for _, a := range m.ann {
		if a.Slug == slug {
			cp := *a
			return &cp, nil
		}
	}
	return nil, cms.ErrNotFound
}

func (m *rollbackMockRepo) UpdateAnnouncement(ctx context.Context, a *cms.Announcement, expectedVersion int64) error {
	current, ok := m.ann[a.ID]
	if !ok {
		return cms.ErrNotFound
	}
	if current.Version != expectedVersion {
		return cms.ErrConflict
	}
	cp := *a
	m.ann[a.ID] = &cp
	return nil
}

func (m *rollbackMockRepo) ListActiveAnnouncements(ctx context.Context) ([]cms.Announcement, error) {
	return nil, nil
}

func (m *rollbackMockRepo) ListAdminAnnouncements(ctx context.Context, p, ps int) ([]cms.Announcement, int, error) {
	return nil, 0, nil
}

func (m *rollbackMockRepo) CreateNewsRevision(ctx context.Context, rev *cms.NewsRevision) error {
	m.newsRevs[rev.NewsID] = append(m.newsRevs[rev.NewsID], *rev)
	return nil
}

func (m *rollbackMockRepo) GetNewsRevision(ctx context.Context, newsID string, revNo int) (*cms.NewsRevision, error) {
	for _, r := range m.newsRevs[newsID] {
		if r.RevisionNo == revNo {
			cp := r
			return &cp, nil
		}
	}
	return nil, cms.ErrNotFound
}

func (m *rollbackMockRepo) ListNewsRevisions(ctx context.Context, newsID string) ([]cms.NewsRevision, error) {
	return m.newsRevs[newsID], nil
}

func (m *rollbackMockRepo) CreateAnnouncementRevision(ctx context.Context, rev *cms.AnnouncementRevision) error {
	m.annRevs[rev.AnnouncementID] = append(m.annRevs[rev.AnnouncementID], *rev)
	return nil
}

func (m *rollbackMockRepo) GetAnnouncementRevision(ctx context.Context, announcementID string, revNo int) (*cms.AnnouncementRevision, error) {
	for _, r := range m.annRevs[announcementID] {
		if r.RevisionNo == revNo {
			cp := r
			return &cp, nil
		}
	}
	return nil, cms.ErrNotFound
}

func (m *rollbackMockRepo) ListAnnouncementRevisions(ctx context.Context, announcementID string) ([]cms.AnnouncementRevision, error) {
	return m.annRevs[announcementID], nil
}

// Mock Audit Repo
type mockAuditRepo struct {
	events []*audit.AuditEvent
}

func (a *mockAuditRepo) CreateEvent(ctx context.Context, e *audit.AuditEvent) error {
	a.events = append(a.events, e)
	return nil
}

func TestRollbackNews_Success(t *testing.T) {
	repo := newRollbackMockRepo()
	auditRepo := &mockAuditRepo{}
	svc := cms.NewService(repo, auditRepo)
	ctx := context.Background()
	author := "user-admin-1"

	// Create initial news
	news, err := svc.CreateDraftNews(ctx, "Original Title", "original-title", "Original Excerpt", "Original Body", &author)
	if err != nil {
		t.Fatalf("unexpected error creating news: %v", err)
	}

	// Update to v2
	_, err = svc.UpdateDraftNews(ctx, news.ID, "Edited Title v2", "original-title", "Edited Excerpt v2", "Edited Body v2", 1, &author)
	if err != nil {
		t.Fatalf("unexpected error updating news: %v", err)
	}

	// Update to v3
	_, err = svc.UpdateDraftNews(ctx, news.ID, "Edited Title v3", "original-title", "Edited Excerpt v3", "Edited Body v3", 2, &author)
	if err != nil {
		t.Fatalf("unexpected error updating news: %v", err)
	}

	// Transition to published
	_, err = svc.TransitionNews(ctx, news.ID, cms.StatusInReview, []string{"Content Editor"}, &author)
	if err != nil {
		t.Fatalf("unexpected transition to in_review: %v", err)
	}
	_, err = svc.TransitionNews(ctx, news.ID, cms.StatusApproved, []string{"Reviewer"}, &author)
	if err != nil {
		t.Fatalf("unexpected transition to approved: %v", err)
	}
	publishedNews, err := svc.TransitionNews(ctx, news.ID, cms.StatusPublished, []string{"Reviewer"}, &author)
	if err != nil {
		t.Fatalf("unexpected transition to published: %v", err)
	}
	if publishedNews.Status != cms.StatusPublished {
		t.Fatalf("expected published status, got %s", publishedNews.Status)
	}

	// Perform rollback to Revision 1 (Original Title, Original Excerpt, Original Body)
	rolledBack, err := svc.RollbackNews(ctx, news.ID, 1, &author)
	if err != nil {
		t.Fatalf("unexpected rollback error: %v", err)
	}

	if rolledBack.Title != "Original Title" {
		t.Errorf("expected Title 'Original Title', got '%s'", rolledBack.Title)
	}
	if rolledBack.Excerpt != "Original Excerpt" {
		t.Errorf("expected Excerpt 'Original Excerpt', got '%s'", rolledBack.Excerpt)
	}
	if rolledBack.Body != "Original Body" {
		t.Errorf("expected Body 'Original Body', got '%s'", rolledBack.Body)
	}
	if rolledBack.Status != cms.StatusDraft {
		t.Errorf("expected Status 'draft', got '%s'", rolledBack.Status)
	}
	if rolledBack.Version <= publishedNews.Version {
		t.Errorf("expected Version to bump past %d, got %d", publishedNews.Version, rolledBack.Version)
	}

	// Verify new revision recorded in history
	revs, err := svc.ListNewsRevisions(ctx, news.ID)
	if err != nil {
		t.Fatalf("unexpected error listing revisions: %v", err)
	}
	latestRev := revs[len(revs)-1]
	if latestRev.RevisionNo != int(rolledBack.Version) {
		t.Errorf("expected latest rev no %d, got %d", rolledBack.Version, latestRev.RevisionNo)
	}
	if latestRev.Title != "Original Title" {
		t.Errorf("expected rev title 'Original Title', got '%s'", latestRev.Title)
	}

	// Verify audit log
	foundAudit := false
	for _, ev := range auditRepo.events {
		if ev.Action == "ROLLBACK_NEWS" && ev.TargetID == news.ID {
			foundAudit = true
			break
		}
	}
	if !foundAudit {
		t.Errorf("expected ROLLBACK_NEWS audit event")
	}
}

func TestRollbackNews_NotFound(t *testing.T) {
	repo := newRollbackMockRepo()
	svc := cms.NewService(repo, nil)
	ctx := context.Background()
	author := "user-admin-1"

	// Non-existent news
	_, err := svc.RollbackNews(ctx, "non-existent", 1, &author)
	if err != cms.ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}

	// Existing news, non-existent revision
	news, _ := svc.CreateDraftNews(ctx, "Title", "title", "Excerpt", "Body", &author)
	_, err = svc.RollbackNews(ctx, news.ID, 999, &author)
	if err != cms.ErrNotFound {
		t.Errorf("expected ErrNotFound for missing revision, got %v", err)
	}
}

func TestRollbackAnnouncement_Success(t *testing.T) {
	repo := newRollbackMockRepo()
	auditRepo := &mockAuditRepo{}
	svc := cms.NewService(repo, auditRepo)
	ctx := context.Background()
	author := "user-admin-1"

	// Create initial announcement
	ann, err := svc.CreateDraftAnnouncement(ctx, "Initial Ann", "initial-ann", "Initial Body", nil, nil, &author)
	if err != nil {
		t.Fatalf("unexpected error creating announcement: %v", err)
	}

	// Update to v2
	_, err = svc.UpdateDraftAnnouncement(ctx, ann.ID, "Edited Ann v2", "initial-ann", "Edited Body v2", nil, nil, 1, &author)
	if err != nil {
		t.Fatalf("unexpected error updating announcement: %v", err)
	}

	// Rollback to Revision 1
	rolledBack, err := svc.RollbackAnnouncement(ctx, ann.ID, 1, &author)
	if err != nil {
		t.Fatalf("unexpected rollback error: %v", err)
	}

	if rolledBack.Title != "Initial Ann" {
		t.Errorf("expected Title 'Initial Ann', got '%s'", rolledBack.Title)
	}
	if rolledBack.Body != "Initial Body" {
		t.Errorf("expected Body 'Initial Body', got '%s'", rolledBack.Body)
	}
	if rolledBack.Status != cms.StatusDraft {
		t.Errorf("expected Status 'draft', got '%s'", rolledBack.Status)
	}
	if rolledBack.Version != 3 {
		t.Errorf("expected Version 3, got %d", rolledBack.Version)
	}

	// Check audit
	foundAudit := false
	for _, ev := range auditRepo.events {
		if ev.Action == "ROLLBACK_ANNOUNCEMENT" && ev.TargetID == ann.ID {
			foundAudit = true
			break
		}
	}
	if !foundAudit {
		t.Errorf("expected ROLLBACK_ANNOUNCEMENT audit event")
	}
}

func TestRollbackAnnouncement_NotFound(t *testing.T) {
	repo := newRollbackMockRepo()
	svc := cms.NewService(repo, nil)
	ctx := context.Background()
	author := "user-admin-1"

	_, err := svc.RollbackAnnouncement(ctx, "non-existent-ann", 1, &author)
	if err != cms.ErrNotFound {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}
