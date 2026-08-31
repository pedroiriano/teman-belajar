package handler

import (
	"database/sql"
	"encoding/csv"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"teman-belajar-api/internal/application/auditcenter"
	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/observability"
	"teman-belajar-api/internal/transport/http/middleware"
)

type AuditCenterHandler struct {
	service   *auditcenter.Service
	auditRepo audit.Repository
}

func NewAuditCenterHandler(service *auditcenter.Service, auditRepo audit.Repository) *AuditCenterHandler {
	return &AuditCenterHandler{service: service, auditRepo: auditRepo}
}

func (handler *AuditCenterHandler) List(response http.ResponseWriter, request *http.Request) {
	correlationID := auditCorrelationID(response, request)
	claims, allowed := handler.authorize(request)
	if !allowed {
		handler.recordAccess(request, claims.Subject, correlationID, "AUDIT_CENTER_LISTED", "DENIED", nil)
		observability.RecordAuditCenter("list", "denied")
		respondProblem(response, http.StatusForbidden, "Forbidden", "Audit Center requires Portal Administrator access")
		return
	}
	query, cursor, err := parseAuditQuery(request, false)
	if err != nil {
		handler.recordAccess(request, claims.Subject, correlationID, "AUDIT_CENTER_LISTED", "REJECTED", nil)
		observability.RecordAuditCenter("list", "rejected")
		respondProblem(response, http.StatusUnprocessableEntity, "Validation Error", "Invalid or unsupported audit filter")
		return
	}
	page, err := handler.service.List(request.Context(), query, cursor)
	if err != nil {
		handler.recordAccess(request, claims.Subject, correlationID, "AUDIT_CENTER_LISTED", "FAILED", nil)
		observability.RecordAuditCenter("list", "failed")
		if errors.Is(err, auditcenter.ErrInvalidQuery) || errors.Is(err, auditcenter.ErrInvalidCursor) {
			respondProblem(response, http.StatusUnprocessableEntity, "Validation Error", "Invalid audit query")
			return
		}
		respondProblem(response, http.StatusServiceUnavailable, "Service Unavailable", "Audit records are temporarily unavailable")
		return
	}
	metadata := map[string]string{"filter_count": auditcenter.CountFilters(query)}
	handler.recordAccess(request, claims.Subject, correlationID, "AUDIT_CENTER_LISTED", "SUCCESS", metadata)
	observability.RecordAuditCenter("list", "success")
	response.Header().Set("Cache-Control", "no-store")
	respondJSON(response, http.StatusOK, page)
}

func (handler *AuditCenterHandler) Detail(response http.ResponseWriter, request *http.Request) {
	correlationID := auditCorrelationID(response, request)
	claims, allowed := handler.authorize(request)
	if !allowed {
		handler.recordAccess(request, claims.Subject, correlationID, "AUDIT_CENTER_DETAIL_VIEWED", "DENIED", nil)
		observability.RecordAuditCenter("detail", "denied")
		respondProblem(response, http.StatusForbidden, "Forbidden", "Audit Center requires Portal Administrator access")
		return
	}
	event, err := handler.service.Detail(request.Context(), request.PathValue("id"))
	if err != nil {
		result := "FAILED"
		status := http.StatusServiceUnavailable
		title, detail := "Service Unavailable", "Audit record is temporarily unavailable"
		if errors.Is(err, auditcenter.ErrInvalidQuery) {
			result, status, title, detail = "REJECTED", http.StatusUnprocessableEntity, "Validation Error", "Invalid audit identifier"
		} else if errors.Is(err, sql.ErrNoRows) {
			result, status, title, detail = "NOT_FOUND", http.StatusNotFound, "Not Found", "Audit record not found"
		}
		handler.recordAccess(request, claims.Subject, correlationID, "AUDIT_CENTER_DETAIL_VIEWED", result, nil)
		observability.RecordAuditCenter("detail", strings.ToLower(result))
		respondProblem(response, status, title, detail)
		return
	}
	handler.recordAccess(request, claims.Subject, correlationID, "AUDIT_CENTER_DETAIL_VIEWED", "SUCCESS", nil)
	observability.RecordAuditCenter("detail", "success")
	response.Header().Set("Cache-Control", "no-store")
	respondJSON(response, http.StatusOK, event)
}

func (handler *AuditCenterHandler) Export(response http.ResponseWriter, request *http.Request) {
	correlationID := auditCorrelationID(response, request)
	claims, allowed := handler.authorize(request)
	if !allowed {
		handler.recordAccess(request, claims.Subject, correlationID, "AUDIT_CENTER_EXPORTED", "DENIED", nil)
		observability.RecordAuditCenter("export", "denied")
		respondProblem(response, http.StatusForbidden, "Forbidden", "Audit export requires Portal Administrator access")
		return
	}
	query, _, err := parseAuditQuery(request, true)
	if err != nil {
		handler.recordAccess(request, claims.Subject, correlationID, "AUDIT_CENTER_EXPORTED", "REJECTED", nil)
		observability.RecordAuditCenter("export", "rejected")
		respondProblem(response, http.StatusUnprocessableEntity, "Validation Error", "Audit export requires valid from/to dates and supported filters")
		return
	}
	items, err := handler.service.Export(request.Context(), query)
	if err != nil {
		handler.recordAccess(request, claims.Subject, correlationID, "AUDIT_CENTER_EXPORTED", "REJECTED", nil)
		observability.RecordAuditCenter("export", "rejected")
		if errors.Is(err, auditcenter.ErrExportRange) || errors.Is(err, auditcenter.ErrExportTooLarge) || errors.Is(err, auditcenter.ErrInvalidQuery) {
			respondProblem(response, http.StatusUnprocessableEntity, "Validation Error", err.Error())
			return
		}
		respondProblem(response, http.StatusServiceUnavailable, "Service Unavailable", "Audit export is temporarily unavailable")
		return
	}
	metadata := map[string]string{"export_row_count": strconv.Itoa(len(items)), "filter_count": auditcenter.CountFilters(query)}
	handler.recordAccess(request, claims.Subject, correlationID, "AUDIT_CENTER_EXPORTED", "SUCCESS", metadata)
	observability.RecordAuditCenter("export", "success")
	writeAuditCSV(response, items)
}

func (handler *AuditCenterHandler) authorize(request *http.Request) (middleware.CustomClaims, bool) {
	claims, ok := middleware.ClaimsFromContext(request.Context())
	return claims, ok && hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator")
}

func (handler *AuditCenterHandler) recordAccess(request *http.Request, actor, correlationID, action, result string, metadata map[string]string) {
	if handler.auditRepo == nil {
		return
	}
	_ = handler.auditRepo.CreateEvent(request.Context(), &audit.AuditEvent{
		ID: uuid.NewString(), ActorUserID: actor, Action: action, Module: "audit",
		TargetType: "audit_center", TargetID: "read_only", Result: result,
		TraceID: correlationID, IPMasked: audit.MaskIP(request.RemoteAddr), Metadata: metadata,
		OccurredAt: time.Now().UTC(),
	})
}

func parseAuditQuery(request *http.Request, export bool) (audit.Query, string, error) {
	allowed := map[string]bool{"actor": true, "event": true, "module": true, "target_type": true, "target_id": true, "result": true, "correlation_id": true, "from": true, "to": true}
	if !export {
		allowed["cursor"], allowed["limit"] = true, true
	}
	values := request.URL.Query()
	for key, entries := range values {
		if !allowed[key] || len(entries) != 1 {
			return audit.Query{}, "", auditcenter.ErrInvalidQuery
		}
	}
	query := audit.Query{
		ActorUserID: values.Get("actor"), Action: values.Get("event"), Module: values.Get("module"),
		TargetType: values.Get("target_type"), TargetID: values.Get("target_id"), Result: values.Get("result"), TraceID: values.Get("correlation_id"),
	}
	if raw := values.Get("limit"); raw != "" {
		limit, err := strconv.Atoi(raw)
		if err != nil {
			return audit.Query{}, "", err
		}
		query.Limit = limit
	}
	var err error
	if raw := values.Get("from"); raw != "" {
		query.OccurredFrom, err = parseAuditDate(raw, false)
		if err != nil {
			return audit.Query{}, "", err
		}
	}
	if raw := values.Get("to"); raw != "" {
		query.OccurredTo, err = parseAuditDate(raw, true)
		if err != nil {
			return audit.Query{}, "", err
		}
	}
	return query, values.Get("cursor"), nil
}

func parseAuditDate(value string, endExclusive bool) (time.Time, error) {
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Time{}, err
	}
	if endExclusive {
		parsed = parsed.AddDate(0, 0, 1)
	}
	return parsed.UTC(), nil
}

func auditCorrelationID(response http.ResponseWriter, request *http.Request) string {
	correlationID := request.Header.Get("X-Request-ID")
	if !correlationIDPattern.MatchString(correlationID) {
		correlationID = uuid.NewString()
	}
	response.Header().Set("X-Request-ID", correlationID)
	return correlationID
}

func writeAuditCSV(response http.ResponseWriter, items []audit.AuditEvent) {
	response.Header().Set("Content-Type", "text/csv; charset=utf-8")
	response.Header().Set("Content-Disposition", `attachment; filename="teman-belajar-audit.csv"`)
	response.Header().Set("Cache-Control", "no-store")
	response.Header().Set("X-Content-Type-Options", "nosniff")
	writer := csv.NewWriter(response)
	_ = writer.Write([]string{"id", "actor_user_id", "event", "module", "target_type", "target_id", "occurred_at", "ip_masked", "result", "correlation_id"})
	for _, item := range items {
		_ = writer.Write([]string{csvCell(item.ID), csvCell(item.ActorUserID), csvCell(item.Action), csvCell(item.Module), csvCell(item.TargetType), csvCell(item.TargetID), item.OccurredAt.UTC().Format(time.RFC3339Nano), csvCell(item.IPMasked), csvCell(item.Result), csvCell(item.TraceID)})
	}
	writer.Flush()
}

func csvCell(value string) string {
	value = strings.ReplaceAll(strings.ReplaceAll(value, "\r", " "), "\n", " ")
	if value != "" && strings.ContainsRune("=+-@", rune(value[0])) {
		return "'" + value
	}
	return value
}
