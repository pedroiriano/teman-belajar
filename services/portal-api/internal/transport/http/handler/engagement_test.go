package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	domain "teman-belajar-api/internal/domain/engagement"
	"teman-belajar-api/internal/transport/http/middleware"
)

type engagementServiceStub struct {
	actor  string
	target domain.Target
	value  int
}

func (s *engagementServiceStub) PutBookmark(_ context.Context, actor string, target domain.Target) (domain.Item, error) {
	s.actor, s.target = actor, target
	return domain.Item{Target: domain.ResolvedTarget{Target: target, Title: "Article", URL: "/knowledge/article"}}, nil
}
func (s *engagementServiceStub) DeleteBookmark(_ context.Context, actor string, target domain.Target) error {
	s.actor, s.target = actor, target
	return nil
}
func (s *engagementServiceStub) ListBookmarks(_ context.Context, actor string) ([]domain.Item, error) {
	s.actor = actor
	return []domain.Item{}, nil
}
func (s *engagementServiceStub) PutRating(_ context.Context, actor string, target domain.Target, value int) (domain.Item, domain.RatingSummary, error) {
	s.actor, s.target, s.value = actor, target, value
	return domain.Item{}, domain.RatingSummary{Average: float64(value), Count: 1}, nil
}
func (s *engagementServiceStub) DeleteRating(_ context.Context, actor string, target domain.Target) error {
	s.actor, s.target = actor, target
	return nil
}
func (s *engagementServiceStub) GetMyRating(_ context.Context, actor string, target domain.Target) (*domain.Rating, domain.RatingSummary, error) {
	s.actor, s.target = actor, target
	return nil, domain.RatingSummary{}, nil
}
func (s *engagementServiceStub) GetRatingSummary(context.Context, domain.Target) (domain.RatingSummary, error) {
	return domain.RatingSummary{}, nil
}
func (s *engagementServiceStub) RecordView(_ context.Context, actor string, target domain.Target) (domain.Item, error) {
	s.actor, s.target = actor, target
	return domain.Item{}, nil
}
func (s *engagementServiceStub) ListRecentViews(_ context.Context, actor string) ([]domain.Item, error) {
	s.actor = actor
	return []domain.Item{}, nil
}
func (s *engagementServiceStub) Recommendations(_ context.Context, actor string, _ int) (domain.RecommendationResult, error) {
	s.actor = actor
	return domain.RecommendationResult{Items: []domain.Recommendation{}}, nil
}
func (s *engagementServiceStub) PublicRecommendations(_ context.Context, _ string, _ int) (domain.RecommendationResult, error) {
	return domain.RecommendationResult{Items: []domain.Recommendation{
		{
			Target: domain.ResolvedTarget{
				Target: domain.Target{Type: domain.TargetKnowledge, ID: "8f542a20-8cff-4c13-bf38-d3b516626fea"},
				Title:  "Test Article",
				URL:    "/knowledge/test-article",
			},
			Reason: domain.ReasonEditorialPin,
			Score:  1100,
		},
	}, Personalized: false}, nil
}


func withActor(request *http.Request, subject string) *http.Request {
	claims := middleware.CustomClaims{Subject: subject}
	return request.WithContext(context.WithValue(request.Context(), middleware.ClaimsContextKey, claims))
}

func TestEngagementActorIsAlwaysDerivedFromClaims(t *testing.T) {
	stub := &engagementServiceStub{}
	handler := NewEngagementHandler(stub)
	id := "8f542a20-8cff-4c13-bf38-d3b516626fea"
	mux := http.NewServeMux()
	mux.HandleFunc("PUT /api/v1/me/bookmarks/{targetType}/{targetId}", handler.Bookmark)
	recorder := httptest.NewRecorder()
	request := withActor(httptest.NewRequest(http.MethodPut, "/api/v1/me/bookmarks/knowledge/"+id, nil), "subject-from-token")
	mux.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if stub.actor != "subject-from-token" {
		t.Fatalf("actor=%q", stub.actor)
	}
	if strings.Contains(recorder.Body.String(), "subject-from-token") {
		t.Fatalf("OIDC subject leaked in response: %s", recorder.Body.String())
	}
	if got := recorder.Header().Get("Cache-Control"); got != "no-store" {
		t.Fatalf("cache control=%q", got)
	}
}

func TestEngagementRejectsIDORSelectorsAndMissingClaims(t *testing.T) {
	stub := &engagementServiceStub{}
	handler := NewEngagementHandler(stub)
	for _, path := range []string{
		"/api/v1/me/bookmarks?user_id=other",
		"/api/v1/me/bookmarks?sub=other",
		"/api/v1/me/bookmarks?email=other@example.test",
	} {
		recorder := httptest.NewRecorder()
		handler.ListBookmarks(recorder, withActor(httptest.NewRequest(http.MethodGet, path, nil), "subject-a"))
		if recorder.Code != http.StatusUnprocessableEntity {
			t.Fatalf("%s status=%d", path, recorder.Code)
		}
	}
	recorder := httptest.NewRecorder()
	handler.ListBookmarks(recorder, httptest.NewRequest(http.MethodGet, "/api/v1/me/bookmarks", nil))
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("missing claims status=%d", recorder.Code)
	}
}

func TestRatingPayloadIsStrictAndBounded(t *testing.T) {
	stub := &engagementServiceStub{}
	handler := NewEngagementHandler(stub)
	id := "8f542a20-8cff-4c13-bf38-d3b516626fea"
	mux := http.NewServeMux()
	mux.HandleFunc("PUT /api/v1/me/ratings/{targetType}/{targetId}", handler.Rating)
	for _, body := range []string{`{"rating":"five"}`, `{"rating":5,"user_id":"other"}`, `{"rating":1.5}`, `{"rating":5}{"rating":4}`} {
		recorder := httptest.NewRecorder()
		request := withActor(httptest.NewRequest(http.MethodPut, "/api/v1/me/ratings/knowledge/"+id, strings.NewReader(body)), "subject-a")
		mux.ServeHTTP(recorder, request)
		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("body=%s status=%d response=%s", body, recorder.Code, recorder.Body.String())
		}
	}
}

func TestPublicRecommendationsHandler(t *testing.T) {
	stub := &engagementServiceStub{}
	handler := NewEngagementHandler(stub)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/recommendations", handler.PublicRecommendations)

	// Valid request without auth
	req := httptest.NewRequest(http.MethodGet, "/api/v1/recommendations?limit=5", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "editorial_pin") {
		t.Fatalf("expected editorial_pin in response, got %s", rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "Test Article") {
		t.Fatalf("expected Test Article in response, got %s", rec.Body.String())
	}
}

