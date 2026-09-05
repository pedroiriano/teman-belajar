package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/cms"
	"teman-belajar-api/internal/transport/http/middleware"
)

type mockCMSRepo struct {
	news         map[string]*cms.News
	announcement map[string]*cms.Announcement
	newsRevs     map[string][]cms.NewsRevision
	annRevs      map[string][]cms.AnnouncementRevision
}

func newMockCMSRepo() *mockCMSRepo {
	return &mockCMSRepo{
		news:         make(map[string]*cms.News),
		announcement: make(map[string]*cms.Announcement),
		newsRevs:     make(map[string][]cms.NewsRevision),
		annRevs:      make(map[string][]cms.AnnouncementRevision),
	}
}

func (m *mockCMSRepo) CreateNews(ctx context.Context, n *cms.News) error {
	m.news[n.ID] = n
	return nil
}
func (m *mockCMSRepo) GetNewsByID(ctx context.Context, id string) (*cms.News, error) {
	if n, ok := m.news[id]; ok {
		return n, nil
	}
	return nil, cms.ErrNotFound
}
func (m *mockCMSRepo) GetNewsBySlug(ctx context.Context, slug string) (*cms.News, error) {
	for _, n := range m.news {
		if n.Slug == slug {
			return n, nil
		}
	}
	return nil, cms.ErrNotFound
}
func (m *mockCMSRepo) UpdateNews(ctx context.Context, n *cms.News, expectedVersion int64) error {
	m.news[n.ID] = n
	return nil
}
func (m *mockCMSRepo) ListPublicNews(ctx context.Context, page, pageSize int) ([]cms.News, int, error) {
	return nil, 0, nil
}
func (m *mockCMSRepo) ListAdminNews(ctx context.Context, page, pageSize int) ([]cms.News, int, error) {
	return nil, 0, nil
}
func (m *mockCMSRepo) CreateAnnouncement(ctx context.Context, a *cms.Announcement) error {
	m.announcement[a.ID] = a
	return nil
}
func (m *mockCMSRepo) GetAnnouncementByID(ctx context.Context, id string) (*cms.Announcement, error) {
	if a, ok := m.announcement[id]; ok {
		return a, nil
	}
	return nil, cms.ErrNotFound
}
func (m *mockCMSRepo) GetAnnouncementBySlug(ctx context.Context, slug string) (*cms.Announcement, error) {
	for _, a := range m.announcement {
		if a.Slug == slug {
			return a, nil
		}
	}
	return nil, cms.ErrNotFound
}
func (m *mockCMSRepo) UpdateAnnouncement(ctx context.Context, a *cms.Announcement, expectedVersion int64) error {
	m.announcement[a.ID] = a
	return nil
}
func (m *mockCMSRepo) ListActiveAnnouncements(ctx context.Context) ([]cms.Announcement, error) {
	return nil, nil
}
func (m *mockCMSRepo) ListAdminAnnouncements(ctx context.Context, p, ps int) ([]cms.Announcement, int, error) {
	return nil, 0, nil
}
func (m *mockCMSRepo) CreateNewsRevision(ctx context.Context, rev *cms.NewsRevision) error {
	m.newsRevs[rev.NewsID] = append(m.newsRevs[rev.NewsID], *rev)
	return nil
}
func (m *mockCMSRepo) ListNewsRevisions(ctx context.Context, newsID string) ([]cms.NewsRevision, error) {
	return m.newsRevs[newsID], nil
}
func (m *mockCMSRepo) CreateAnnouncementRevision(ctx context.Context, rev *cms.AnnouncementRevision) error {
	m.annRevs[rev.AnnouncementID] = append(m.annRevs[rev.AnnouncementID], *rev)
	return nil
}
func (m *mockCMSRepo) ListAnnouncementRevisions(ctx context.Context, announcementID string) ([]cms.AnnouncementRevision, error) {
	return m.annRevs[announcementID], nil
}

func TestCMSHandler_GetAdminNews(t *testing.T) {
	repo := newMockCMSRepo()
	repo.news["news-123"] = &cms.News{
		ID:        "news-123",
		Slug:      "test-news",
		Title:     "Test News Title",
		Excerpt:   "Test Excerpt",
		Body:      "Test Body",
		Status:    cms.StatusDraft,
		CreatedAt: time.Now(),
		Version:   1,
	}
	svc := cms.NewService(repo, nil)
	h := NewCMSHandler(svc, nil)

	// 1. Unauthorized
	reqUnauth := httptest.NewRequest("GET", "/api/v1/admin/news/news-123", nil)
	wUnauth := httptest.NewRecorder()
	h.GetAdminNews(wUnauth, reqUnauth)
	if wUnauth.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", wUnauth.Code)
	}

	// 2. Success with Auth
	reqAuth := httptest.NewRequest("GET", "/api/v1/admin/news/news-123", nil)
	reqAuth.SetPathValue("id", "news-123")
	claims := middleware.CustomClaims{
		Subject: "editor-1",
		RealmAccess: middleware.RealmAccess{
			Roles: []string{"Content Editor"},
		},
	}
	ctx := context.WithValue(reqAuth.Context(), middleware.ClaimsContextKey, claims)
	reqAuth = reqAuth.WithContext(ctx)

	wAuth := httptest.NewRecorder()
	h.GetAdminNews(wAuth, reqAuth)
	if wAuth.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", wAuth.Code, wAuth.Body.String())
	}

	var res cms.News
	if err := json.Unmarshal(wAuth.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to parse json: %v", err)
	}
	if res.ID != "news-123" || res.Title != "Test News Title" {
		t.Fatalf("unexpected news item: %+v", res)
	}
}

func TestCMSHandler_GetAdminAnnouncement(t *testing.T) {
	repo := newMockCMSRepo()
	repo.announcement["ann-123"] = &cms.Announcement{
		ID:        "ann-123",
		Slug:      "test-announcement",
		Title:     "Test Announcement Title",
		Body:      "Test Body",
		Status:    cms.StatusDraft,
		CreatedAt: time.Now(),
		Version:   1,
	}
	svc := cms.NewService(repo, nil)
	h := NewCMSHandler(svc, nil)

	// 1. Unauthorized
	reqUnauth := httptest.NewRequest("GET", "/api/v1/admin/announcements/ann-123", nil)
	wUnauth := httptest.NewRecorder()
	h.GetAdminAnnouncement(wUnauth, reqUnauth)
	if wUnauth.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", wUnauth.Code)
	}

	// 2. Success with Auth
	reqAuth := httptest.NewRequest("GET", "/api/v1/admin/announcements/ann-123", nil)
	reqAuth.SetPathValue("id", "ann-123")
	claims := middleware.CustomClaims{
		Subject: "admin-1",
		RealmAccess: middleware.RealmAccess{
			Roles: []string{"Portal Administrator"},
		},
	}
	ctx := context.WithValue(reqAuth.Context(), middleware.ClaimsContextKey, claims)
	reqAuth = reqAuth.WithContext(ctx)

	wAuth := httptest.NewRecorder()
	h.GetAdminAnnouncement(wAuth, reqAuth)
	if wAuth.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", wAuth.Code, wAuth.Body.String())
	}

	var res cms.Announcement
	if err := json.Unmarshal(wAuth.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to parse json: %v", err)
	}
	if res.ID != "ann-123" || res.Title != "Test Announcement Title" {
		t.Fatalf("unexpected announcement item: %+v", res)
	}
}

func TestCMSHandler_ListRevisions(t *testing.T) {
	repo := newMockCMSRepo()
	repo.newsRevs["news-123"] = []cms.NewsRevision{
		{ID: "rev-1", NewsID: "news-123", RevisionNo: 1, Title: "Rev 1", Body: "Body 1", CreatedAt: time.Now()},
		{ID: "rev-2", NewsID: "news-123", RevisionNo: 2, Title: "Rev 2", Body: "Body 2", CreatedAt: time.Now()},
	}
	repo.annRevs["ann-123"] = []cms.AnnouncementRevision{
		{ID: "arev-1", AnnouncementID: "ann-123", RevisionNo: 1, Title: "Ann Rev 1", Body: "Body 1", CreatedAt: time.Now()},
	}
	svc := cms.NewService(repo, nil)
	h := NewCMSHandler(svc, nil)

	// News revisions
	reqNews := httptest.NewRequest("GET", "/api/v1/admin/news/news-123/revisions", nil)
	reqNews.SetPathValue("id", "news-123")
	wNews := httptest.NewRecorder()
	h.ListNewsRevisions(wNews, reqNews)
	if wNews.Code != http.StatusOK {
		t.Fatalf("expected 200 for news revs, got %d", wNews.Code)
	}
	var newsRevs []cms.NewsRevision
	_ = json.Unmarshal(wNews.Body.Bytes(), &newsRevs)
	if len(newsRevs) != 2 {
		t.Fatalf("expected 2 news revisions, got %d", len(newsRevs))
	}

	// Announcement revisions
	reqAnn := httptest.NewRequest("GET", "/api/v1/admin/announcements/ann-123/revisions", nil)
	reqAnn.SetPathValue("id", "ann-123")
	wAnn := httptest.NewRecorder()
	h.ListAnnouncementRevisions(wAnn, reqAnn)
	if wAnn.Code != http.StatusOK {
		t.Fatalf("expected 200 for ann revs, got %d", wAnn.Code)
	}
	var annRevs []cms.AnnouncementRevision
	_ = json.Unmarshal(wAnn.Body.Bytes(), &annRevs)
	if len(annRevs) != 1 {
		t.Fatalf("expected 1 announcement revision, got %d", len(annRevs))
	}
}
