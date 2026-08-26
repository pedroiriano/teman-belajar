package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	domain "teman-belajar-api/internal/domain/notification"
	"teman-belajar-api/internal/transport/http/middleware"
)

const (
	notificationSubjectA = "11111111-1111-4111-8111-111111111111"
	notificationSubjectB = "22222222-2222-4222-8222-222222222222"
)

type notificationServiceStub struct {
	subject  string
	audience domain.Audience
	id       string
}

func (s *notificationServiceStub) List(_ context.Context, subject string, filter domain.ListFilter) (domain.Page, error) {
	s.subject = subject
	s.audience = filter.Audience
	return domain.Page{Items: []domain.Notification{}, Page: 1, PageSize: 10}, nil
}
func (s *notificationServiceStub) UnreadCount(_ context.Context, subject string, audience domain.Audience) (int, error) {
	s.subject = subject
	s.audience = audience
	return 2, nil
}
func (s *notificationServiceStub) MarkRead(_ context.Context, subject string, audience domain.Audience, id string) (*domain.Notification, error) {
	s.subject = subject
	s.audience = audience
	s.id = id
	return &domain.Notification{ID: id}, nil
}
func (s *notificationServiceStub) MarkAllRead(_ context.Context, subject string, audience domain.Audience) (int, error) {
	s.subject = subject
	s.audience = audience
	return 2, nil
}
func (s *notificationServiceStub) Preferences(context.Context, string, domain.Audience) ([]domain.Preference, error) {
	return []domain.Preference{}, nil
}
func (s *notificationServiceStub) SetPreference(context.Context, string, domain.Audience, domain.EventType, bool) (domain.Preference, error) {
	return domain.Preference{}, nil
}

func notificationRequest(method, path string, roles ...string) *http.Request {
	req := httptest.NewRequest(method, path, nil)
	claims := middleware.CustomClaims{Subject: notificationSubjectA, RealmAccess: middleware.RealmAccess{Roles: roles}}
	return req.WithContext(context.WithValue(req.Context(), middleware.ClaimsContextKey, claims))
}

func TestNotificationHandlerDerivesSubjectAndEnforcesAdminAudience(t *testing.T) {
	service := &notificationServiceStub{}
	handler := NewNotificationHandler(service)
	denied := httptest.NewRecorder()
	handler.List(denied, notificationRequest(http.MethodGet, "/api/v1/me/notifications?audience=admin"))
	if denied.Code != http.StatusForbidden {
		t.Fatalf("without role status=%d", denied.Code)
	}
	allowed := httptest.NewRecorder()
	handler.List(allowed, notificationRequest(http.MethodGet, "/api/v1/me/notifications?audience=admin", "Reviewer"))
	if allowed.Code != http.StatusOK || service.subject != notificationSubjectA || service.audience != domain.AudienceAdmin {
		t.Fatalf("status=%d subject=%q audience=%q", allowed.Code, service.subject, service.audience)
	}
}

func TestNotificationHandlerRejectsUnknownQueryAndMissingClaims(t *testing.T) {
	handler := NewNotificationHandler(&notificationServiceStub{})
	unknown := httptest.NewRecorder()
	handler.List(unknown, notificationRequest(http.MethodGet, "/api/v1/me/notifications?audience=portal&user_id="+notificationSubjectB, "Learner"))
	if unknown.Code != http.StatusUnprocessableEntity {
		t.Fatalf("unknown query status=%d", unknown.Code)
	}
	missing := httptest.NewRecorder()
	handler.Summary(missing, httptest.NewRequest(http.MethodGet, "/api/v1/me/notifications/summary?audience=portal", nil))
	if missing.Code != http.StatusUnauthorized {
		t.Fatalf("missing claims status=%d", missing.Code)
	}
}

func TestNotificationWriteRateLimitIsBounded(t *testing.T) {
	service := &notificationServiceStub{}
	handler := NewNotificationHandler(service)
	handler.limiter = newNotificationActionLimiter(1, time.Minute)
	first := httptest.NewRecorder()
	handler.MarkAllRead(first, notificationRequest(http.MethodPost, "/api/v1/me/notifications/read-all?audience=portal", "Learner"))
	second := httptest.NewRecorder()
	handler.MarkAllRead(second, notificationRequest(http.MethodPost, "/api/v1/me/notifications/read-all?audience=portal", "Learner"))
	if first.Code != http.StatusOK || second.Code != http.StatusTooManyRequests || second.Header().Get("Retry-After") == "" {
		t.Fatalf("statuses=%d,%d retry=%q", first.Code, second.Code, second.Header().Get("Retry-After"))
	}
	if strings.Contains(second.Body.String(), notificationSubjectA) {
		t.Fatalf("subject leaked: %s", second.Body.String())
	}
}
