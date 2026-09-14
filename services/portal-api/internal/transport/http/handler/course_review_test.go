package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"teman-belajar-api/internal/domain/coursereview"
	"teman-belajar-api/internal/transport/http/middleware"
)

type mockReviewRepo struct {
	reviews map[string]*coursereview.Review
}

func newMockReviewRepo() *mockReviewRepo {
	return &mockReviewRepo{
		reviews: make(map[string]*coursereview.Review),
	}
}

func (m *mockReviewRepo) GetSummaryBySlug(_ context.Context, _ string) (*coursereview.RatingSummary, error) {
	return &coursereview.RatingSummary{
		AverageRating: 5.0,
		TotalReviews:  1,
		Distribution: map[int]coursereview.StarDistribution{
			5: {Count: 1, Percentage: 100},
			4: {Count: 0, Percentage: 0},
			3: {Count: 0, Percentage: 0},
			2: {Count: 0, Percentage: 0},
			1: {Count: 0, Percentage: 0},
		},
	}, nil
}

func (m *mockReviewRepo) ListPublicBySlug(_ context.Context, _ string, _ coursereview.ListFilter) ([]coursereview.Review, int, error) {
	var list []coursereview.Review
	for _, r := range m.reviews {
		list = append(list, *r)
	}
	return list, len(list), nil
}

func (m *mockReviewRepo) GetByUserAndSlug(_ context.Context, userSubject, _ string) (*coursereview.Review, error) {
	for _, r := range m.reviews {
		if r.UserSubject == userSubject {
			return r, nil
		}
	}
	return nil, coursereview.ErrNotFound
}

func (m *mockReviewRepo) Upsert(_ context.Context, r *coursereview.Review) error {
	m.reviews[r.ID] = r
	return nil
}

func (m *mockReviewRepo) DeleteByUserAndSlug(_ context.Context, userSubject, _ string) error {
	for id, r := range m.reviews {
		if r.UserSubject == userSubject {
			delete(m.reviews, id)
			return nil
		}
	}
	return coursereview.ErrNotFound
}

func (m *mockReviewRepo) ListAdmin(_ context.Context, _ coursereview.AdminFilter) ([]coursereview.Review, int, error) {
	var list []coursereview.Review
	for _, r := range m.reviews {
		list = append(list, *r)
	}
	return list, len(list), nil
}

func (m *mockReviewRepo) UpdateStatus(_ context.Context, id string, status coursereview.Status) error {
	r, ok := m.reviews[id]
	if !ok {
		return coursereview.ErrNotFound
	}
	r.Status = status
	return nil
}

func (m *mockReviewRepo) GetByID(_ context.Context, id string) (*coursereview.Review, error) {
	r, ok := m.reviews[id]
	if !ok {
		return nil, coursereview.ErrNotFound
	}
	return r, nil
}

func (m *mockReviewRepo) GetProgramIDBySlug(_ context.Context, slug string) (string, error) {
	if slug == "pelatihan-test" {
		return "prog-1", nil
	}
	return "", coursereview.ErrProgramNotFound
}

func withUserClaims(ctx context.Context, sub, name string) context.Context {
	return context.WithValue(ctx, middleware.ClaimsContextKey, middleware.CustomClaims{
		Subject: sub,
		Name:    name,
	})
}

func TestCourseReviewHandler_PublicList(t *testing.T) {
	repo := newMockReviewRepo()
	svc := coursereview.NewService(repo)
	auditMock := &mockAuditRepo{}
	h := NewCourseReviewHandler(svc, auditMock)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/training-programs/pelatihan-test/reviews", nil)
	req.SetPathValue("slug", "pelatihan-test")
	rec := httptest.NewRecorder()

	h.PublicList(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
	}

	var res coursereview.ListResult
	if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if res.Summary.AverageRating != 5.0 {
		t.Errorf("expected average 5.0, got %f", res.Summary.AverageRating)
	}

	// Unknown slug should return 404
	req404 := httptest.NewRequest(http.MethodGet, "/api/v1/training-programs/unknown-slug/reviews", nil)
	req404.SetPathValue("slug", "unknown-slug")
	rec404 := httptest.NewRecorder()
	h.PublicList(rec404, req404)
	if rec404.Code != http.StatusNotFound {
		t.Errorf("expected 404 Not Found for unknown slug, got %d", rec404.Code)
	}
}

func TestCourseReviewHandler_SubmitReview(t *testing.T) {
	repo := newMockReviewRepo()
	svc := coursereview.NewService(repo)
	auditMock := &mockAuditRepo{}
	h := NewCourseReviewHandler(svc, auditMock)

	body := []byte(`{"rating":5,"title":"Mantap","content":"Materi komprehensif dan aplikatif"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/training-programs/pelatihan-test/reviews", bytes.NewReader(body))
	req.SetPathValue("slug", "pelatihan-test")
	req = req.WithContext(withUserClaims(req.Context(), "user-123", "Budi Santoso"))
	rec := httptest.NewRecorder()

	h.SubmitReview(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
	}

	var rev coursereview.Review
	if err := json.NewDecoder(rec.Body).Decode(&rev); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if rev.AuthorName != "Budi Santoso" || rev.Rating != 5 {
		t.Errorf("unexpected review data: %+v", rev)
	}

	if len(auditMock.events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(auditMock.events))
	}
	if auditMock.events[0].Action != "COURSE_REVIEW_SUBMITTED" {
		t.Errorf("expected COURSE_REVIEW_SUBMITTED, got %s", auditMock.events[0].Action)
	}
}

func TestCourseReviewHandler_AdminUpdateStatus(t *testing.T) {
	repo := newMockReviewRepo()
	repo.reviews["rev-1"] = &coursereview.Review{
		ID:     "rev-1",
		Status: "published",
	}
	svc := coursereview.NewService(repo)
	auditMock := &mockAuditRepo{}
	h := NewCourseReviewHandler(svc, auditMock)

	body := []byte(`{"status":"hidden"}`)
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/training-programs/reviews/rev-1/status", bytes.NewReader(body))
	req.SetPathValue("id", "rev-1")
	req = req.WithContext(withUserClaims(req.Context(), "admin-1", "Admin User"))
	rec := httptest.NewRecorder()

	h.AdminUpdateStatus(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
	}

	if len(auditMock.events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(auditMock.events))
	}
	if auditMock.events[0].Action != "COURSE_REVIEW_MODERATED" {
		t.Errorf("expected COURSE_REVIEW_MODERATED, got %s", auditMock.events[0].Action)
	}
	if auditMock.events[0].TargetID != "rev-1" {
		t.Errorf("expected target ID rev-1, got %s", auditMock.events[0].TargetID)
	}
}
