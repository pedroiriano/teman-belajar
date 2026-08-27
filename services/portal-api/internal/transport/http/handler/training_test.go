package handler_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"teman-belajar-api/internal/domain/learning"
	"teman-belajar-api/internal/domain/training"
	"teman-belajar-api/internal/transport/http/handler"
	"teman-belajar-api/internal/transport/http/middleware"
)

type trainingRepoStub struct{}

func (*trainingRepoStub) Create(context.Context, *training.Program, string) error        { return nil }
func (*trainingRepoStub) Update(context.Context, *training.Program, int64, string) error { return nil }
func (*trainingRepoStub) GetByID(context.Context, string) (*training.Program, error) {
	return nil, training.ErrNotFound
}
func (*trainingRepoStub) GetPublishedBySlug(context.Context, string) (*training.Program, error) {
	return nil, training.ErrNotFound
}
func (*trainingRepoStub) ListPublic(context.Context, training.ListFilter) ([]training.Program, int, error) {
	return nil, 0, nil
}
func (*trainingRepoStub) ListAdmin(context.Context, training.ListFilter) ([]training.Program, int, error) {
	return nil, 0, nil
}

type trainingProviderStub struct{}

func (*trainingProviderStub) ListCourses(context.Context, learning.CourseFilter) ([]learning.LearningCourse, error) {
	return []learning.LearningCourse{{ID: 10, Visible: true}}, nil
}
func (*trainingProviderStub) ResolveCurrentUser(context.Context, learning.FederatedIdentity) (*learning.LearningUser, error) {
	return &learning.LearningUser{ID: 1}, nil
}
func (*trainingProviderStub) ListUserCourses(context.Context, *learning.LearningUser) ([]learning.EnrolledCourse, error) {
	return nil, nil
}

func TestTrainingCreateDeniesReviewerMutation(t *testing.T) {
	h := handler.NewTrainingHandler(training.NewService(&trainingRepoStub{}, &trainingProviderStub{}, nil, "https://moodle.test"))
	body := `{"slug":"program-aman","title":"Program Aman","summary":"Ringkasan program yang cukup panjang.","description":"Deskripsi program yang cukup panjang untuk validasi.","courses":[{"moodle_course_id":10,"required":true}],"cohorts":[]}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/training-programs", strings.NewReader(body))
	claims := middleware.CustomClaims{Subject: "subject", RealmAccess: struct {
		Roles []string `json:"roles"`
	}{Roles: []string{"Reviewer"}}}
	req = req.WithContext(context.WithValue(req.Context(), middleware.ClaimsContextKey, claims))
	w := httptest.NewRecorder()
	h.AdminCreate(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTrainingCreateRejectsUnknownFields(t *testing.T) {
	h := handler.NewTrainingHandler(training.NewService(&trainingRepoStub{}, &trainingProviderStub{}, nil, "https://moodle.test"))
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/training-programs", strings.NewReader(`{"unexpected":true}`))
	claims := middleware.CustomClaims{Subject: "subject", RealmAccess: struct {
		Roles []string `json:"roles"`
	}{Roles: []string{"Content Editor"}}}
	req = req.WithContext(context.WithValue(req.Context(), middleware.ClaimsContextKey, claims))
	w := httptest.NewRecorder()
	h.AdminCreate(w, req)
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d", w.Code)
	}
}

func TestTrainingAdminListRequiresIdentity(t *testing.T) {
	h := handler.NewTrainingHandler(training.NewService(&trainingRepoStub{}, &trainingProviderStub{}, nil, "https://moodle.test"))
	w := httptest.NewRecorder()
	h.AdminList(w, httptest.NewRequest(http.MethodGet, "/api/v1/admin/training-programs", nil))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestTrainingPublicListRejectsInvalidPagination(t *testing.T) {
	h := handler.NewTrainingHandler(training.NewService(&trainingRepoStub{}, &trainingProviderStub{}, nil, "https://moodle.test"))
	w := httptest.NewRecorder()
	h.PublicList(w, httptest.NewRequest(http.MethodGet, "/api/v1/training-programs?page=0&page_size=20", nil))
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %s", w.Code, w.Body.String())
	}
}

func TestTrainingPublicListRejectsUnsupportedQuery(t *testing.T) {
	h := handler.NewTrainingHandler(training.NewService(&trainingRepoStub{}, &trainingProviderStub{}, nil, "https://moodle.test"))
	w := httptest.NewRecorder()
	h.PublicList(w, httptest.NewRequest(http.MethodGet, "/api/v1/training-programs?search=program", nil))
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %s", w.Code, w.Body.String())
	}
}
