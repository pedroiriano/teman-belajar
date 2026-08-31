package handler

import (
	"net/http"
	"regexp"
	"time"

	"github.com/google/uuid"

	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/domain/integrationhealth"
	"teman-belajar-api/internal/observability"
	"teman-belajar-api/internal/transport/http/middleware"
)

var correlationIDPattern = regexp.MustCompile(`^[A-Za-z0-9._:-]{1,64}$`)

type IntegrationHealthHandler struct {
	service   *integrationhealth.Service
	auditRepo audit.Repository
}

func NewIntegrationHealthHandler(service *integrationhealth.Service, auditRepo audit.Repository) *IntegrationHealthHandler {
	return &IntegrationHealthHandler{service: service, auditRepo: auditRepo}
}

func (h *IntegrationHealthHandler) Summary(w http.ResponseWriter, request *http.Request) {
	correlationID := request.Header.Get("X-Request-ID")
	if !correlationIDPattern.MatchString(correlationID) {
		correlationID = uuid.NewString()
	}
	w.Header().Set("X-Request-ID", correlationID)
	w.Header().Set("Cache-Control", "no-store")

	claims, ok := middleware.ClaimsFromContext(request.Context())
	if !ok || !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator") {
		h.audit(request, claims.Subject, correlationID, "DENIED")
		respondProblem(w, http.StatusForbidden, "Forbidden", "Integration health requires Portal Administrator access")
		return
	}
	if request.URL.RawQuery != "" {
		h.audit(request, claims.Subject, correlationID, "REJECTED")
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Integration health does not accept probe parameters")
		return
	}

	snapshot := h.service.Snapshot(request.Context(), correlationID)
	observability.RecordIntegrationHealth(snapshot)
	h.audit(request, claims.Subject, correlationID, "SUCCESS")
	respondJSON(w, http.StatusOK, snapshot)
}

func (h *IntegrationHealthHandler) audit(request *http.Request, actor, correlationID, result string) {
	if h.auditRepo == nil {
		return
	}
	_ = h.auditRepo.CreateEvent(request.Context(), &audit.AuditEvent{
		ID: uuid.NewString(), ActorUserID: actor, Action: "INTEGRATION_HEALTH_VIEWED",
		TargetType: "integration_health", TargetID: "summary", Result: result,
		TraceID: correlationID, OccurredAt: time.Now().UTC(),
	})
}
