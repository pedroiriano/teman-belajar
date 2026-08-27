package handler_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"teman-belajar-api/internal/domain/microlearning"
	"teman-belajar-api/internal/transport/http/handler"
	"teman-belajar-api/internal/transport/http/middleware"
)

type microlearningRepoStub struct{}

func (*microlearningRepoStub) Create(context.Context, *microlearning.Item, []string, string) error {
	return nil
}
func (*microlearningRepoStub) Update(context.Context, *microlearning.Item, []string, int64, string) error {
	return nil
}
func (*microlearningRepoStub) GetByID(context.Context, string) (*microlearning.Item, error) {
	return nil, microlearning.ErrNotFound
}
func (*microlearningRepoStub) GetPublishedByID(context.Context, string) (*microlearning.Item, error) {
	return nil, microlearning.ErrNotFound
}
func (*microlearningRepoStub) GetPublishedBySlug(context.Context, string) (*microlearning.Item, error) {
	return nil, microlearning.ErrNotFound
}
func (*microlearningRepoStub) ListPublic(context.Context, microlearning.ListFilter) ([]microlearning.Item, int, error) {
	return nil, 0, nil
}
func (*microlearningRepoStub) ListAdmin(context.Context, microlearning.ListFilter) ([]microlearning.Item, int, error) {
	return nil, 0, nil
}
func (*microlearningRepoStub) ValidateFeaturedMedia(context.Context, string) error     { return nil }
func (*microlearningRepoStub) ValidateRelated(context.Context, string, []string) error { return nil }
func (*microlearningRepoStub) UpsertProgress(context.Context, string, string, microlearning.ProgressInput) (*microlearning.Progress, error) {
	return nil, microlearning.ErrNotFound
}
func (*microlearningRepoStub) GetProgress(context.Context, string, string) (*microlearning.Progress, error) {
	return nil, microlearning.ErrNotFound
}
func microlearningHandler() *handler.MicrolearningHandler {
	return handler.NewMicrolearningHandler(microlearning.NewService(&microlearningRepoStub{}, nil))
}
func microlearningRequest(method, path, body string, roles []string) *http.Request {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	claims := middleware.CustomClaims{Subject: "subject", RealmAccess: struct {
		Roles []string `json:"roles"`
	}{Roles: roles}}
	return req.WithContext(context.WithValue(req.Context(), middleware.ClaimsContextKey, claims))
}

func TestMicrolearningCreateDeniesReviewer(t *testing.T) {
	w := httptest.NewRecorder()
	microlearningHandler().AdminCreate(w, microlearningRequest(http.MethodPost, "/api/v1/admin/microlearning", `{"slug":"materi-aman"}`, []string{"Reviewer"}))
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}
func TestMicrolearningCreateRejectsUnknownField(t *testing.T) {
	w := httptest.NewRecorder()
	microlearningHandler().AdminCreate(w, microlearningRequest(http.MethodPost, "/api/v1/admin/microlearning", `{"unexpected":true}`, []string{"Content Editor"}))
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d", w.Code)
	}
}
func TestMicrolearningAdminRequiresIdentity(t *testing.T) {
	w := httptest.NewRecorder()
	microlearningHandler().AdminList(w, httptest.NewRequest(http.MethodGet, "/api/v1/admin/microlearning", nil))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}
func TestMicrolearningAdminReadDeniesLearnerRole(t *testing.T) {
	for _, invoke := range []func(http.ResponseWriter, *http.Request){
		microlearningHandler().AdminList,
		microlearningHandler().AdminGet,
	} {
		w := httptest.NewRecorder()
		invoke(w, microlearningRequest(http.MethodGet, "/api/v1/admin/microlearning", "", []string{"Learner"}))
		if w.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
		}
	}
}
func TestMicrolearningPublicRejectsUnsupportedQuery(t *testing.T) {
	w := httptest.NewRecorder()
	microlearningHandler().PublicList(w, httptest.NewRequest(http.MethodGet, "/api/v1/microlearning?unknown=true", nil))
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d", w.Code)
	}
}
