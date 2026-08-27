package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"teman-belajar-api/internal/domain/webinar"
	"teman-belajar-api/internal/observability"
	"teman-belajar-api/internal/transport/http/middleware"
)

type WebinarHandler struct {
	service *webinar.Service
	limiter *notificationActionLimiter
}

func NewWebinarHandler(service *webinar.Service) *WebinarHandler {
	return &WebinarHandler{service: service, limiter: newNotificationActionLimiter(20, time.Minute)}
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
	identity, ok := webinarIdentity(w, r)
	if !ok {
		return
	}
	for key := range r.URL.Query() {
		if key != "page" && key != "page_size" {
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
	result, err := h.service.List(r.Context(), identity, page, pageSize)
	if err != nil {
		h.error(w, "list", err)
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	observability.RecordWebinarAction("list", "success")
	respondJSON(w, http.StatusOK, result)
}

func (h *WebinarHandler) Get(w http.ResponseWriter, r *http.Request) {
	identity, ok := webinarIdentity(w, r)
	if !ok {
		return
	}
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
		result, err = h.service.Register(r.Context(), identity, id, key)
	} else {
		result, err = h.service.Cancel(r.Context(), identity, id, key)
	}
	if err != nil {
		h.error(w, operation, err)
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	observability.RecordWebinarAction(operation, "success")
	respondJSON(w, http.StatusOK, result)
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
		respondProblem(w, http.StatusServiceUnavailable, "Configuration Required", "Zoom tenant capacity or credentials are not configured")
	case errors.Is(err, webinar.ErrCapacityFull):
		result = "capacity_full"
		respondProblem(w, http.StatusConflict, "Capacity Full", "Webinar capacity is full and waitlist is disabled")
	case errors.Is(err, webinar.ErrRegistrationClosed):
		result = "registration_closed"
		respondProblem(w, http.StatusConflict, "Registration Closed", "Registration or cancellation window is closed")
	default:
		respondProblem(w, http.StatusServiceUnavailable, "Service Unavailable", "Webinar provider is temporarily unavailable")
	}
}
