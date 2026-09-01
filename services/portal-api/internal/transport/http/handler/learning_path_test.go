package handler_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"teman-belajar-api/internal/domain/learningpath"
	"teman-belajar-api/internal/transport/http/handler"
	"teman-belajar-api/internal/transport/http/middleware"
)

type lpRepoStub struct{}

func (*lpRepoStub) Create(context.Context, *learningpath.Path, string) error            { return nil }
func (*lpRepoStub) SaveDraft(context.Context, *learningpath.Path, int64, string) error  { return nil }
func (*lpRepoStub) SaveStatus(context.Context, *learningpath.Path, int64, string) error { return nil }
func (*lpRepoStub) CreateRevision(context.Context, *learningpath.Path, int64, string) error {
	return nil
}
func (*lpRepoStub) GetAdminByID(context.Context, string) (*learningpath.Path, error) {
	return nil, learningpath.ErrNotFound
}
func (*lpRepoStub) GetPublicBySlug(context.Context, string) (*learningpath.Path, error) {
	return nil, learningpath.ErrNotFound
}
func (*lpRepoStub) List(context.Context, learningpath.Filter, bool) ([]learningpath.Path, int, error) {
	return nil, 0, nil
}
func (*lpRepoStub) BindLearnerVersion(context.Context, string, string) (*learningpath.Path, error) {
	return nil, learningpath.ErrNotFound
}

type lpSourceStub struct{}

func (*lpSourceStub) Resolve(context.Context, learningpath.ItemKind, string, string) (learningpath.ResolvedSource, error) {
	return learningpath.ResolvedSource{State: learningpath.SourceAvailable}, nil
}
func (*lpSourceStub) Progress(context.Context, []learningpath.Item, string) (map[string]learningpath.ItemProgress, map[string]string) {
	return nil, nil
}
func (*lpSourceStub) Options(context.Context, string) (learningpath.Options, error) {
	return learningpath.Options{Data: []learningpath.Option{}, Provenance: map[string]string{}}, nil
}
func lpHandler() *handler.LearningPathHandler {
	return handler.NewLearningPathHandler(learningpath.NewService(&lpRepoStub{}, &lpSourceStub{}, nil))
}
func TestLearningPathAdminRequiresIdentity(t *testing.T) {
	w := httptest.NewRecorder()
	lpHandler().AdminList(w, httptest.NewRequest(http.MethodGet, "/api/v1/admin/learning-paths", nil))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("got %d", w.Code)
	}
}
func TestLearningPathCreateRejectsUnknownField(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/learning-paths", strings.NewReader(`{"unknown":true}`))
	claims := middleware.CustomClaims{Subject: "subject", RealmAccess: struct {
		Roles []string `json:"roles"`
	}{Roles: []string{"Content Editor"}}}
	req = req.WithContext(context.WithValue(req.Context(), middleware.ClaimsContextKey, claims))
	w := httptest.NewRecorder()
	lpHandler().AdminCreate(w, req)
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("got %d", w.Code)
	}
}
func TestLearningPathPublicRejectsArbitraryQuery(t *testing.T) {
	w := httptest.NewRecorder()
	lpHandler().PublicList(w, httptest.NewRequest(http.MethodGet, "/api/v1/learning-paths?raw=true", nil))
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("got %d", w.Code)
	}
}
