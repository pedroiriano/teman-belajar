package handler

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"teman-belajar-api/internal/application/auditcenter"
	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/transport/http/middleware"
)

type auditHandlerRepository struct{ written []audit.AuditEvent }

func (repository *auditHandlerRepository) CreateEvent(_ context.Context, event *audit.AuditEvent) error {
	repository.written = append(repository.written, *event)
	return nil
}
func (repository *auditHandlerRepository) ListEvents(context.Context, audit.Query) ([]audit.AuditEvent, error) {
	return nil, nil
}
func (repository *auditHandlerRepository) GetEvent(context.Context, string) (audit.AuditEvent, error) {
	return audit.AuditEvent{}, nil
}
func (repository *auditHandlerRepository) DeleteBefore(context.Context, time.Time, int) (int64, error) {
	return 0, nil
}

func TestAuditCenterDenyByDefaultAndRejectsUnboundedExport(t *testing.T) {
	repository := &auditHandlerRepository{}
	handler := NewAuditCenterHandler(auditcenter.NewService(repository), repository)
	request := httptest.NewRequest("GET", "/api/v1/admin/audit-events", nil)
	request.RemoteAddr = "192.0.2.77:1234"
	response := httptest.NewRecorder()
	handler.List(response, request)
	if response.Code != 403 || len(repository.written) != 1 || repository.written[0].IPMasked != "192.0.2.0/24" {
		t.Fatalf("code=%d audit=%#v", response.Code, repository.written)
	}

	claims := middleware.CustomClaims{Subject: "00000000-0000-4000-8000-000000000001", RealmAccess: middleware.RealmAccess{Roles: []string{"Portal Administrator"}}}
	request = httptest.NewRequest("GET", "/api/v1/admin/audit-events/export", nil)
	request = request.WithContext(context.WithValue(request.Context(), middleware.ClaimsContextKey, claims))
	response = httptest.NewRecorder()
	handler.Export(response, request)
	if response.Code != 422 {
		t.Fatalf("unbounded export code=%d body=%s", response.Code, response.Body.String())
	}
	if got := csvCell("=HYPERLINK(\"bad\")"); !strings.HasPrefix(got, "'") {
		t.Fatalf("CSV formula not neutralized: %q", got)
	}
}
