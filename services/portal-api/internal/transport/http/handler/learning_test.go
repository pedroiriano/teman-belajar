package handler_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"teman-belajar-api/internal/domain/learning"
	"teman-belajar-api/internal/transport/http/handler"
	"teman-belajar-api/internal/transport/http/middleware"
)

type MockProvider struct{}

func (m *MockProvider) ListCourses(ctx context.Context, filter learning.CourseFilter) ([]learning.LearningCourse, error) {
	return nil, nil
}
func (m *MockProvider) ResolveCurrentUser(ctx context.Context, identity learning.FederatedIdentity) (*learning.LearningUser, error) {
	if identity.Subject == "mapped" {
		return &learning.LearningUser{ID: 1, Username: "mapped", Email: "mapped@test.com"}, nil
	}
	return nil, learning.ErrLearningUserNotMapped
}
func (m *MockProvider) ListUserCourses(ctx context.Context, user *learning.LearningUser) ([]learning.EnrolledCourse, error) {
	return []learning.EnrolledCourse{
		{ID: 1, ShortName: "E1"},
	}, nil
}
func (m *MockProvider) GetCourseCompletion(ctx context.Context, user *learning.LearningUser, courseID int) (*learning.CourseCompletion, error) {
	return &learning.CourseCompletion{CourseID: courseID, Completed: true, Status: "completed"}, nil
}
func (m *MockProvider) GetCourseGrades(ctx context.Context, user *learning.LearningUser, courseID int) ([]learning.GradeItem, error) {
	return []learning.GradeItem{}, nil
}

func TestIDORGetMyCourseCompletion(t *testing.T) {
	svc := learning.NewService(&MockProvider{})
	h := handler.NewLearningHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/learning/me/courses/2/completion", nil)
	req.SetPathValue("courseId", "2") // User is enrolled in course 1, not 2

	claims := middleware.CustomClaims{Subject: "mapped"}
	ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	h.GetMyCourseCompletion(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for unenrolled course, got %d", w.Code)
	}
}

func TestIDORGetMyCourseGrades(t *testing.T) {
	svc := learning.NewService(&MockProvider{})
	h := handler.NewLearningHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/learning/me/courses/2/grades", nil)
	req.SetPathValue("courseId", "2") // User is enrolled in course 1, not 2

	claims := middleware.CustomClaims{Subject: "mapped"}
	ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	h.GetMyCourseGrades(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for unenrolled course, got %d", w.Code)
	}
}

func TestGetMyCourseCompletion_Allowed(t *testing.T) {
	svc := learning.NewService(&MockProvider{})
	h := handler.NewLearningHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/learning/me/courses/1/completion", nil)
	req.SetPathValue("courseId", "1") // User is enrolled in course 1

	claims := middleware.CustomClaims{Subject: "mapped"}
	ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	h.GetMyCourseCompletion(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for enrolled course, got %d", w.Code)
	}
}
