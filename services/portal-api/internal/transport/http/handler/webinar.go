package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/domain/webinar"
	"teman-belajar-api/internal/observability"
	"teman-belajar-api/internal/transport/http/middleware"
)

type WebinarHandler struct {
	service   *webinar.Service
	limiter   *notificationActionLimiter
	auditRepo audit.Repository
}

func NewWebinarHandler(service *webinar.Service, auditRepo ...audit.Repository) *WebinarHandler {
	var repo audit.Repository
	if len(auditRepo) > 0 {
		repo = auditRepo[0]
	}
	return &WebinarHandler{
		service:   service,
		limiter:   newNotificationActionLimiter(20, time.Minute),
		auditRepo: repo,
	}
}

func (h *WebinarHandler) SetAuditRepo(repo audit.Repository) {
	h.auditRepo = repo
}

func webinarIdentity(w http.ResponseWriter, r *http.Request) (webinar.Identity, bool) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing validated identity")
		return webinar.Identity{}, false
	}
	return webinar.Identity{Subject: claims.Subject}, true
}

func parseWebinarID(r *http.Request) (int, error) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id < 1 {
		return 0, webinar.ErrInvalidInput
	}
	return id, nil
}

func (h *WebinarHandler) List(w http.ResponseWriter, r *http.Request) {
	identity, _ := webinarIdentity(w, r)
	for key := range r.URL.Query() {
		if key != "page" && key != "page_size" && key != "status" && key != "q" {
			h.error(w, "list", webinar.ErrInvalidInput)
			return
		}
	}
	page, pageSize := 1, 12
	var err error
	if raw := r.URL.Query().Get("page"); raw != "" {
		page, err = strconv.Atoi(raw)
	}
	if err == nil {
		if raw := r.URL.Query().Get("page_size"); raw != "" {
			pageSize, err = strconv.Atoi(raw)
		}
	}
	if err != nil {
		h.error(w, "list", webinar.ErrInvalidInput)
		return
	}

	filter := webinar.Filter{
		Page:     page,
		PageSize: pageSize,
		Status:   strings.TrimSpace(r.URL.Query().Get("status")),
		Query:    strings.TrimSpace(r.URL.Query().Get("q")),
	}
	result, err := h.service.ListWithFilter(r.Context(), identity, filter)
	if err != nil {
		h.error(w, "list", err)
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	observability.RecordWebinarAction("list", "success")
	respondJSON(w, http.StatusOK, result)
}

func (h *WebinarHandler) Get(w http.ResponseWriter, r *http.Request) {
	identity, _ := webinarIdentity(w, r)
	id, err := parseWebinarID(r)
	if err != nil {
		h.error(w, "get", err)
		return
	}
	result, err := h.service.Get(r.Context(), identity, id)
	if err != nil {
		h.error(w, "get", err)
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	observability.RecordWebinarAction("get", "success")
	respondJSON(w, http.StatusOK, result)
}

func (h *WebinarHandler) Register(w http.ResponseWriter, r *http.Request) {
	h.mutate(w, r, "register")
}

func (h *WebinarHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	h.mutate(w, r, "cancel")
}

func (h *WebinarHandler) mutate(w http.ResponseWriter, r *http.Request, operation string) {
	identity, ok := webinarIdentity(w, r)
	if !ok {
		return
	}
	claims, _ := middleware.ClaimsFromContext(r.Context())
	userName := claims.Name
	if userName == "" {
		userName = claims.PreferredUsername
	}
	userEmail := claims.Email

	if allowed, retry := h.limiter.allow(identity.Subject); !allowed {
		observability.RecordWebinarAction(operation, "rate_limited")
		w.Header().Set("Retry-After", strconv.Itoa(retry))
		respondProblem(w, http.StatusTooManyRequests, "Rate Limited", "Too many webinar registration changes")
		return
	}
	id, err := parseWebinarID(r)
	if err != nil {
		h.error(w, operation, err)
		return
	}
	key := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	var result webinar.Session
	if operation == "register" {
		result, err = h.service.Register(r.Context(), identity, id, userName, userEmail, key)
	} else {
		result, err = h.service.Cancel(r.Context(), identity, id, key)
	}
	if err != nil {
		h.error(w, operation, err)
		return
	}

	if h.auditRepo != nil {
		action := "WEBINAR_REGISTERED"
		if operation == "cancel" {
			action = "WEBINAR_CANCELLED"
		}
		_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: identity.Subject,
			Action:      action,
			Module:      "webinars",
			TargetType:  "webinar_session",
			TargetID:    strconv.Itoa(id),
			Result:      "SUCCESS",
			Metadata: map[string]string{
				"session_title": result.Title,
			},
			OccurredAt: time.Now().UTC(),
		})
	}

	w.Header().Set("Cache-Control", "private, no-store")
	observability.RecordWebinarAction(operation, "success")
	respondJSON(w, http.StatusOK, result)
}

func (h *WebinarHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	page, pageSize := 1, 50
	if raw := r.URL.Query().Get("page"); raw != "" {
		if p, err := strconv.Atoi(raw); err == nil && p >= 1 {
			page = p
		}
	}
	if raw := r.URL.Query().Get("page_size"); raw != "" {
		if ps, err := strconv.Atoi(raw); err == nil && ps >= 1 && ps <= 100 {
			pageSize = ps
		}
	}

	filter := webinar.Filter{
		Page:     page,
		PageSize: pageSize,
		Status:   strings.TrimSpace(r.URL.Query().Get("status")),
		Speaker:  strings.TrimSpace(r.URL.Query().Get("speaker")),
		Query:    strings.TrimSpace(r.URL.Query().Get("q")),
	}

	payload, err := h.service.AdminList(r.Context(), filter)
	if err != nil {
		h.error(w, "admin_list", err)
		return
	}
	respondJSON(w, http.StatusOK, payload)
}

func (h *WebinarHandler) AdminCreate(w http.ResponseWriter, r *http.Request) {
	identity, ok := webinarIdentity(w, r)
	if !ok {
		return
	}

	var input webinar.CreateWebinarInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondProblem(w, http.StatusBadRequest, "Invalid JSON", "Could not parse request body")
		return
	}

	session, err := h.service.Create(r.Context(), input, identity.Subject)
	if err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", err.Error())
		return
	}

	if h.auditRepo != nil {
		_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: identity.Subject,
			Action:      "WEBINAR_CREATED",
			Module:      "webinars",
			TargetType:  "webinar_session",
			TargetID:    strconv.Itoa(session.ID),
			Result:      "SUCCESS",
			Metadata: map[string]string{
				"session_title": session.Title,
			},
			OccurredAt: time.Now().UTC(),
		})
	}

	respondJSON(w, http.StatusCreated, session)
}

func (h *WebinarHandler) AdminGet(w http.ResponseWriter, r *http.Request) {
	id, err := parseWebinarID(r)
	if err != nil {
		h.error(w, "admin_get", err)
		return
	}
	session, err := h.service.AdminGet(r.Context(), id)
	if err != nil {
		h.error(w, "admin_get", err)
		return
	}

	attendees, err := h.service.ListAttendees(r.Context(), id)
	if err != nil {
		attendees = []webinar.Attendee{}
	}

	resp := struct {
		webinar.Session
		Attendees []webinar.Attendee `json:"attendees"`
	}{
		Session:   session,
		Attendees: attendees,
	}

	respondJSON(w, http.StatusOK, resp)
}

func (h *WebinarHandler) AdminUpdate(w http.ResponseWriter, r *http.Request) {
	identity, ok := webinarIdentity(w, r)
	if !ok {
		return
	}
	id, err := parseWebinarID(r)
	if err != nil {
		h.error(w, "admin_update", err)
		return
	}

	var input webinar.UpdateWebinarInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondProblem(w, http.StatusBadRequest, "Invalid JSON", "Could not parse request body")
		return
	}

	session, err := h.service.Update(r.Context(), id, input, identity.Subject)
	if err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", err.Error())
		return
	}

	if h.auditRepo != nil {
		_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: identity.Subject,
			Action:      "WEBINAR_UPDATED",
			Module:      "webinars",
			TargetType:  "webinar_session",
			TargetID:    strconv.Itoa(session.ID),
			Result:      "SUCCESS",
			Metadata: map[string]string{
				"session_title": session.Title,
			},
			OccurredAt: time.Now().UTC(),
		})
	}

	respondJSON(w, http.StatusOK, session)
}

func (h *WebinarHandler) AdminDelete(w http.ResponseWriter, r *http.Request) {
	identity, ok := webinarIdentity(w, r)
	if !ok {
		return
	}
	id, err := parseWebinarID(r)
	if err != nil {
		h.error(w, "admin_delete", err)
		return
	}

	if err := h.service.Delete(r.Context(), id, identity.Subject); err != nil {
		h.error(w, "admin_delete", err)
		return
	}

	if h.auditRepo != nil {
		_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: identity.Subject,
			Action:      "WEBINAR_DELETED",
			Module:      "webinars",
			TargetType:  "webinar_session",
			TargetID:    strconv.Itoa(id),
			Result:      "SUCCESS",
			Metadata: map[string]string{
				"session_id": strconv.Itoa(id),
			},
			OccurredAt: time.Now().UTC(),
		})
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *WebinarHandler) AdminUpdateAttendance(w http.ResponseWriter, r *http.Request) {
	identity, ok := webinarIdentity(w, r)
	if !ok {
		return
	}
	id, err := parseWebinarID(r)
	if err != nil {
		h.error(w, "admin_attendance", err)
		return
	}

	var body struct {
		AttendeeID string `json:"attendee_id"`
		Status     string `json:"status"` // "attended", "registered", "cancelled"
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondProblem(w, http.StatusBadRequest, "Invalid JSON", "Could not parse request body")
		return
	}

	if err := h.service.UpdateAttendance(r.Context(), id, body.AttendeeID, body.Status); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Update Failed", err.Error())
		return
	}

	if h.auditRepo != nil {
		_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: identity.Subject,
			Action:      "WEBINAR_ATTENDANCE_UPDATED",
			Module:      "webinars",
			TargetType:  "webinar_session",
			TargetID:    strconv.Itoa(id),
			Result:      "SUCCESS",
			Metadata: map[string]string{
				"attendee_id": body.AttendeeID,
				"status":      body.Status,
			},
			OccurredAt: time.Now().UTC(),
		})
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *WebinarHandler) error(w http.ResponseWriter, operation string, err error) {
	result := "unavailable"
	defer func() { observability.RecordWebinarAction(operation, result) }()
	switch {
	case errors.Is(err, webinar.ErrInvalidInput):
		result = "validation_error"
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid webinar request")
	case errors.Is(err, webinar.ErrForbidden):
		result = "forbidden"
		respondProblem(w, http.StatusForbidden, "Forbidden", "Webinar is not available to this learner")
	case errors.Is(err, webinar.ErrNotFound):
		result = "not_found"
		respondProblem(w, http.StatusNotFound, "Not Found", "Webinar not found")
	case errors.Is(err, webinar.ErrConfigurationNeeded):
		result = "configuration_required"
		respondProblem(w, http.StatusServiceUnavailable, "Configuration Required", "Webinar provider configuration required")
	case errors.Is(err, webinar.ErrCapacityFull):
		result = "capacity_full"
		respondProblem(w, http.StatusConflict, "Capacity Full", "Webinar capacity is full")
	case errors.Is(err, webinar.ErrRegistrationClosed):
		result = "registration_closed"
		respondProblem(w, http.StatusConflict, "Registration Closed", "Registration or cancellation window is closed")
	default:
		respondProblem(w, http.StatusServiceUnavailable, "Service Unavailable", "Webinar service is temporarily unavailable")
	}
}
