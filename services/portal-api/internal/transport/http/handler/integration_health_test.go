package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/domain/integrationhealth"
	"teman-belajar-api/internal/transport/http/middleware"
)

type healthProbeStub struct{ calls *atomic.Int32 }

func (p healthProbeStub) Definition() integrationhealth.Definition {
	return integrationhealth.Definition{Key: "portal-api", Name: "Portal API", Group: "platform"}
}
func (p healthProbeStub) Check(context.Context) integrationhealth.Observation {
	p.calls.Add(1)
	return integrationhealth.Observation{Status: integrationhealth.StatusHealthy}
}

type healthAuditStub struct{ events []*audit.AuditEvent }

func (r *healthAuditStub) CreateEvent(_ context.Context, event *audit.AuditEvent) error {
	r.events = append(r.events, event)
	return nil
}

func healthRequest(t *testing.T, rawURL string, roles []string) *http.Request {
	t.Helper()
	request := httptest.NewRequest(http.MethodGet, rawURL, nil)
	claims := middleware.CustomClaims{Subject: "admin-subject", RealmAccess: middleware.RealmAccess{Roles: roles}}
	return request.WithContext(context.WithValue(request.Context(), middleware.ClaimsContextKey, claims))
}

func TestIntegrationHealthSummaryIsAuthorizedAuditedAndSanitized(t *testing.T) {
	var calls atomic.Int32
	audits := &healthAuditStub{}
	service := integrationhealth.NewService([]integrationhealth.Probe{healthProbeStub{calls: &calls}}, time.Second)
	handler := NewIntegrationHealthHandler(service, audits)
	request := healthRequest(t, "/api/v1/admin/integration-health", []string{"Portal Administrator"})
	request.Header.Set("X-Request-ID", "task018-safe-id")
	response := httptest.NewRecorder()
	handler.Summary(response, request)
	if response.Code != http.StatusOK || calls.Load() != 1 || response.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("response=%d calls=%d", response.Code, calls.Load())
	}
	var snapshot integrationhealth.Snapshot
	if err := json.Unmarshal(response.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot.CorrelationID != "task018-safe-id" || len(audits.events) != 1 || audits.events[0].Result != "SUCCESS" {
		t.Fatalf("snapshot=%#v audits=%#v", snapshot, audits.events)
	}
	if strings.Contains(response.Body.String(), "http://") || strings.Contains(response.Body.String(), "secret") {
		t.Fatal("health response leaked a URL or secret")
	}
}

func TestIntegrationHealthReplacesUnsafeCorrelationID(t *testing.T) {
	var calls atomic.Int32
	service := integrationhealth.NewService([]integrationhealth.Probe{healthProbeStub{calls: &calls}}, time.Second)
	handler := NewIntegrationHealthHandler(service, &healthAuditStub{})
	request := healthRequest(t, "/api/v1/admin/integration-health", []string{"Portal Administrator"})
	request.Header.Set("X-Request-ID", "https://secret.example/?token=leak")
	response := httptest.NewRecorder()
	handler.Summary(response, request)
	if response.Code != http.StatusOK || strings.Contains(response.Header().Get("X-Request-ID"), "secret") || strings.Contains(response.Body.String(), "secret") {
		t.Fatalf("unsafe correlation value was not sanitized: header=%q", response.Header().Get("X-Request-ID"))
	}
}

func TestIntegrationHealthDeniesNonAdministratorAndArbitraryProbe(t *testing.T) {
	var calls atomic.Int32
	audits := &healthAuditStub{}
	service := integrationhealth.NewService([]integrationhealth.Probe{healthProbeStub{calls: &calls}}, time.Second)
	handler := NewIntegrationHealthHandler(service, audits)

	denied := httptest.NewRecorder()
	handler.Summary(denied, healthRequest(t, "/api/v1/admin/integration-health", []string{"Reviewer"}))
	if denied.Code != http.StatusForbidden || calls.Load() != 0 || audits.events[0].Result != "DENIED" {
		t.Fatalf("denied=%d calls=%d audits=%#v", denied.Code, calls.Load(), audits.events)
	}

	parameterized := httptest.NewRecorder()
	handler.Summary(parameterized, healthRequest(t, "/api/v1/admin/integration-health?target=http://attacker.invalid", []string{"Portal Administrator"}))
	if parameterized.Code != http.StatusUnprocessableEntity || calls.Load() != 0 || audits.events[1].Result != "REJECTED" {
		t.Fatalf("parameterized=%d calls=%d audits=%#v", parameterized.Code, calls.Load(), audits.events)
	}
}
