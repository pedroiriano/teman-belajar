package cms_test

import (
	"context"
	"testing"

	"teman-belajar-api/internal/domain/cms"
)

type mockRepo struct{}

func (m *mockRepo) CreateNews(ctx context.Context, n *cms.News) error             { return nil }
func (m *mockRepo) GetNewsByID(ctx context.Context, id string) (*cms.News, error) { return nil, nil }
func (m *mockRepo) UpdateNews(ctx context.Context, n *cms.News) error             { return nil }
func (m *mockRepo) ListPublicNews(ctx context.Context, page, pageSize int) ([]cms.News, int, error) {
	return nil, 0, nil
}
func (m *mockRepo) ListAdminNews(ctx context.Context, page, pageSize int) ([]cms.News, int, error) {
	return nil, 0, nil
}
func (m *mockRepo) GetNewsBySlug(ctx context.Context, slug string) (*cms.News, error) {
	return nil, nil
}
func (m *mockRepo) CreateAnnouncement(ctx context.Context, a *cms.Announcement) error { return nil }
func (m *mockRepo) GetAnnouncementByID(ctx context.Context, id string) (*cms.Announcement, error) {
	return nil, nil
}
func (m *mockRepo) GetAnnouncementBySlug(ctx context.Context, slug string) (*cms.Announcement, error) {
	return nil, nil
}
func (m *mockRepo) UpdateAnnouncement(ctx context.Context, a *cms.Announcement) error { return nil }
func (m *mockRepo) ListActiveAnnouncements(ctx context.Context) ([]cms.Announcement, error) {
	return nil, nil
}
func (m *mockRepo) ListAdminAnnouncements(ctx context.Context, p, ps int) ([]cms.Announcement, int, error) {
	return nil, 0, nil
}

func TestCreateDraftNews_XSSPayload(t *testing.T) {
	repo := &mockRepo{}
	svc := cms.NewService(repo, nil)

	xssTitle := "Test <script>alert(1)</script>"
	xssSlug := "test-xss"
	xssExcerpt := "Excerpt with <img src=x onerror=alert(2)>"
	xssBody := "<p>Hello</p><script>fetch('http://evil.com')</script>"

	uid := "user-1"
	n, err := svc.CreateDraftNews(context.Background(), xssTitle, xssSlug, xssExcerpt, xssBody, &uid)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}

	// Currently the backend accepts raw HTML, but it's important to verify it doesn't corrupt or crash
	if n.Title != xssTitle {
		t.Errorf("Expected title %q, got %q", xssTitle, n.Title)
	}
	if n.Body != xssBody {
		t.Errorf("Expected body %q, got %q", xssBody, n.Body)
	}
}
