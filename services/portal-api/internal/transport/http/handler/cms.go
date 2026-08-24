package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"teman-belajar-api/internal/domain/cms"
	"teman-belajar-api/internal/transport/http/middleware"
)

type CMSHandler struct {
	svc *cms.Service
}

func NewCMSHandler(svc *cms.Service) *CMSHandler {
	return &CMSHandler{svc: svc}
}

// Problem response helpers
func respondProblem(w http.ResponseWriter, status int, title, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
		"type":   "about:blank",
		"title":  title,
		"status": status,
		"detail": detail,
	})
}

// Public API
func (h *CMSHandler) ListPublicNews(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))

	res, err := h.svc.GetPublicNews(r.Context(), page, pageSize)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

func (h *CMSHandler) GetPublicNews(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Path[len("/api/v1/news/"):]

	res, err := h.svc.GetPublicNewsBySlug(r.Context(), slug)
	if err != nil {
		if err == cms.ErrNotFound {
			respondProblem(w, http.StatusNotFound, "Not Found", "News not found or not published")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

func (h *CMSHandler) ListActiveAnnouncements(w http.ResponseWriter, r *http.Request) {
	res, err := h.svc.GetActiveAnnouncements(r.Context())
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

// Admin API
func (h *CMSHandler) ListAdminNews(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))

	res, err := h.svc.GetAdminNews(r.Context(), page, pageSize)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

func (h *CMSHandler) ListAdminAnnouncements(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))

	res, err := h.svc.GetAdminAnnouncements(r.Context(), page, pageSize)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

func (h *CMSHandler) CreateNews(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}
	if !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor") {
		respondProblem(w, http.StatusForbidden, "Forbidden", "Content Editor role required")
		return
	}

	var req struct {
		Title   string `json:"title"`
		Slug    string `json:"slug"`
		Excerpt string `json:"excerpt"`
		Body    string `json:"body"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid JSON body")
		return
	}

	res, err := h.svc.CreateDraftNews(r.Context(), req.Title, req.Slug, req.Excerpt, req.Body, &claims.Subject)
	if err != nil {
		if err == cms.ErrValidationFailed {
			respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid input data")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

func (h *CMSHandler) TransitionNews(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}

	// Simple path parsing /api/v1/admin/news/{id}/status
	path := r.URL.Path
	idStart := len("/api/v1/admin/news/")
	idEnd := idStart
	for i := idStart; i < len(path); i++ {
		if path[i] == '/' {
			idEnd = i
			break
		}
	}
	if idEnd == idStart {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Missing ID")
		return
	}
	id := path[idStart:idEnd]

	var req struct {
		Status cms.ContentStatus `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid JSON body")
		return
	}

	res, err := h.svc.TransitionNews(r.Context(), id, req.Status, claims.RealmAccess.Roles, &claims.Subject)
	if err != nil {
		if err == cms.ErrInvalidTransition {
			respondProblem(w, http.StatusForbidden, "Forbidden", "Invalid transition or insufficient permissions")
			return
		}
		if err == cms.ErrNotFound {
			respondProblem(w, http.StatusNotFound, "Not Found", "News not found")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

func (h *CMSHandler) CreateAnnouncement(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}
	if !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor") {
		respondProblem(w, http.StatusForbidden, "Forbidden", "Content Editor role required")
		return
	}

	var req struct {
		Title   string     `json:"title"`
		Slug    string     `json:"slug"`
		Body    string     `json:"body"`
		StartAt *time.Time `json:"start_at"`
		EndAt   *time.Time `json:"end_at"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid JSON body")
		return
	}

	res, err := h.svc.CreateDraftAnnouncement(r.Context(), req.Title, req.Slug, req.Body, req.StartAt, req.EndAt, &claims.Subject)
	if err != nil {
		if err == cms.ErrValidationFailed {
			respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid input data")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

func (h *CMSHandler) TransitionAnnouncement(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}

	path := r.URL.Path
	idStart := len("/api/v1/admin/announcements/")
	idEnd := idStart
	for i := idStart; i < len(path); i++ {
		if path[i] == '/' {
			idEnd = i
			break
		}
	}
	if idEnd == idStart {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Missing ID")
		return
	}
	id := path[idStart:idEnd]

	var req struct {
		Status cms.ContentStatus `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid JSON body")
		return
	}

	res, err := h.svc.TransitionAnnouncement(r.Context(), id, req.Status, claims.RealmAccess.Roles, &claims.Subject)
	if err != nil {
		if err == cms.ErrInvalidTransition {
			respondProblem(w, http.StatusForbidden, "Forbidden", "Invalid transition or insufficient permissions")
			return
		}
		if err == cms.ErrNotFound {
			respondProblem(w, http.StatusNotFound, "Not Found", "Announcement not found")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}
