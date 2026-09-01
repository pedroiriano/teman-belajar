package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"

	application "teman-belajar-api/internal/application/platformconfig"
	"teman-belajar-api/internal/domain/audit"
	domain "teman-belajar-api/internal/domain/platformconfig"
	"teman-belajar-api/internal/observability"
	"teman-belajar-api/internal/transport/http/middleware"
)

type PlatformConfigHandler struct {
	service *application.Service
	audit   audit.Repository
}

func NewPlatformConfigHandler(service *application.Service, auditRepository audit.Repository) *PlatformConfigHandler {
	return &PlatformConfigHandler{service: service, audit: auditRepository}
}

func (handler *PlatformConfigHandler) Public(response http.ResponseWriter, request *http.Request) {
	snapshot := handler.service.Public(request.Context())
	handler.record(request, "", "PLATFORM_CONFIG_PUBLIC_VIEWED", "public", "SUCCESS")
	observability.RecordPlatformConfig("public", snapshot.Source)
	response.Header().Set("Cache-Control", "public, max-age=30, stale-if-error=300")
	respondJSON(response, http.StatusOK, snapshot)
}

func (handler *PlatformConfigHandler) State(response http.ResponseWriter, request *http.Request) {
	claims, ok := handler.authorize(response, request, "PLATFORM_CONFIG_VIEWED")
	if !ok {
		return
	}
	state, err := handler.service.State(request.Context())
	if err != nil {
		handler.failure(response, request, claims.Subject, "PLATFORM_CONFIG_VIEWED", err)
		return
	}
	handler.record(request, claims.Subject, "PLATFORM_CONFIG_VIEWED", "state", "SUCCESS")
	response.Header().Set("Cache-Control", "private, no-store")
	respondJSON(response, http.StatusOK, state)
}

func (handler *PlatformConfigHandler) Preview(response http.ResponseWriter, request *http.Request) {
	claims, ok := handler.authorize(response, request, "PLATFORM_CONFIG_PREVIEWED")
	if !ok {
		return
	}
	snapshot, err := handler.service.Preview(request.Context())
	if err != nil {
		handler.failure(response, request, claims.Subject, "PLATFORM_CONFIG_PREVIEWED", err)
		return
	}
	handler.record(request, claims.Subject, "PLATFORM_CONFIG_PREVIEWED", strconv.FormatInt(snapshot.Version, 10), "SUCCESS")
	response.Header().Set("Cache-Control", "private, no-store")
	response.Header().Set("X-Robots-Tag", "noindex, nofollow, noarchive")
	respondJSON(response, http.StatusOK, snapshot)
}

type draftRequest struct {
	ExpectedVersion int64         `json:"expected_version"`
	Config          domain.Config `json:"config"`
}
type publishRequest struct {
	Version int64 `json:"version"`
}
type rollbackRequest struct {
	SourceVersion   int64 `json:"source_version"`
	ExpectedVersion int64 `json:"expected_version"`
}

func (handler *PlatformConfigHandler) SaveDraft(response http.ResponseWriter, request *http.Request) {
	claims, ok := handler.authorize(response, request, "PLATFORM_CONFIG_DRAFT_SAVED")
	if !ok {
		return
	}
	var input draftRequest
	if !decodeConfigRequest(response, request, &input) {
		handler.record(request, claims.Subject, "PLATFORM_CONFIG_DRAFT_SAVED", "draft", "REJECTED")
		return
	}
	revision, err := handler.service.SaveDraft(request.Context(), input.ExpectedVersion, input.Config, claims.Subject)
	if err != nil {
		handler.failure(response, request, claims.Subject, "PLATFORM_CONFIG_DRAFT_SAVED", err)
		return
	}
	handler.record(request, claims.Subject, "PLATFORM_CONFIG_DRAFT_SAVED", strconv.FormatInt(revision.Version, 10), "SUCCESS")
	observability.RecordPlatformConfig("draft", "success")
	respondJSON(response, http.StatusCreated, revision)
}

func (handler *PlatformConfigHandler) Publish(response http.ResponseWriter, request *http.Request) {
	claims, ok := handler.authorize(response, request, "PLATFORM_CONFIG_PUBLISHED")
	if !ok {
		return
	}
	var input publishRequest
	if !decodeConfigRequest(response, request, &input) {
		handler.record(request, claims.Subject, "PLATFORM_CONFIG_PUBLISHED", "draft", "REJECTED")
		return
	}
	revision, err := handler.service.Publish(request.Context(), input.Version, claims.Subject)
	if err != nil {
		handler.failure(response, request, claims.Subject, "PLATFORM_CONFIG_PUBLISHED", err)
		return
	}
	handler.record(request, claims.Subject, "PLATFORM_CONFIG_PUBLISHED", strconv.FormatInt(revision.Version, 10), "SUCCESS")
	observability.RecordPlatformConfig("publish", "success")
	respondJSON(response, http.StatusOK, revision)
}

func (handler *PlatformConfigHandler) Rollback(response http.ResponseWriter, request *http.Request) {
	claims, ok := handler.authorize(response, request, "PLATFORM_CONFIG_ROLLED_BACK")
	if !ok {
		return
	}
	var input rollbackRequest
	if !decodeConfigRequest(response, request, &input) {
		handler.record(request, claims.Subject, "PLATFORM_CONFIG_ROLLED_BACK", "history", "REJECTED")
		return
	}
	revision, err := handler.service.Rollback(request.Context(), input.SourceVersion, input.ExpectedVersion, claims.Subject)
	if err != nil {
		handler.failure(response, request, claims.Subject, "PLATFORM_CONFIG_ROLLED_BACK", err)
		return
	}
	handler.record(request, claims.Subject, "PLATFORM_CONFIG_ROLLED_BACK", strconv.FormatInt(revision.Version, 10), "SUCCESS")
	observability.RecordPlatformConfig("rollback", "success")
	respondJSON(response, http.StatusOK, revision)
}

func (handler *PlatformConfigHandler) authorize(response http.ResponseWriter, request *http.Request, action string) (middleware.CustomClaims, bool) {
	claims, exists := middleware.ClaimsFromContext(request.Context())
	if !exists || !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator") {
		handler.record(request, claims.Subject, action, "configuration", "DENIED")
		observability.RecordPlatformConfig("authorization", "denied")
		respondProblem(response, http.StatusForbidden, "Forbidden", "Platform Configuration requires Portal Administrator access")
		return claims, false
	}
	return claims, true
}

func (handler *PlatformConfigHandler) failure(response http.ResponseWriter, request *http.Request, actor, action string, err error) {
	status, title, detail, result := http.StatusServiceUnavailable, "Service Unavailable", "Platform configuration is temporarily unavailable", "FAILED"
	switch {
	case errors.Is(err, domain.ErrVersionConflict):
		status, title, detail, result = http.StatusConflict, "Version Conflict", "Configuration changed; reload before saving", "CONFLICT"
	case errors.Is(err, domain.ErrNoDraft), errors.Is(err, domain.ErrVersionNotFound):
		status, title, detail, result = http.StatusNotFound, "Not Found", "Configuration version was not found", "NOT_FOUND"
	case errors.Is(err, domain.ErrInvalidConfig), errors.Is(err, application.ErrInvalidMediaReference):
		status, title, detail, result = http.StatusUnprocessableEntity, "Validation Error", "Configuration contains an unsupported field, value, URL, feature, or media reference", "REJECTED"
	}
	handler.record(request, actor, action, "configuration", result)
	observability.RecordPlatformConfig("mutation", result)
	respondProblem(response, status, title, detail)
}

func (handler *PlatformConfigHandler) record(request *http.Request, actor, action, target, result string) {
	if handler.audit == nil {
		return
	}
	correlationID := request.Header.Get("X-Request-ID")
	if !correlationIDPattern.MatchString(correlationID) {
		correlationID = uuid.NewString()
	}
	_ = handler.audit.CreateEvent(request.Context(), &audit.AuditEvent{ID: uuid.NewString(), ActorUserID: actor, Action: action, Module: "platform_configuration", TargetType: "platform_configuration", TargetID: target, Result: result, TraceID: correlationID, IPMasked: audit.MaskIP(request.RemoteAddr), OccurredAt: time.Now().UTC()})
}

func decodeConfigRequest(response http.ResponseWriter, request *http.Request, destination any) bool {
	request.Body = http.MaxBytesReader(response, request.Body, domain.MaxPayloadBytes+1024)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		respondProblem(response, http.StatusUnprocessableEntity, "Validation Error", "Invalid platform configuration request")
		return false
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		respondProblem(response, http.StatusUnprocessableEntity, "Validation Error", "Invalid platform configuration request")
		return false
	}
	return true
}

func versionTarget(version int64) string { return fmt.Sprintf("version:%d", version) }
