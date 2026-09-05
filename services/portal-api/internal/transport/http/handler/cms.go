package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"teman-belajar-api/internal/domain/cms"
	"teman-belajar-api/internal/domain/discoverability"
	"teman-belajar-api/internal/transport/http/middleware"
)

type CMSHandler struct {
	svc       *cms.Service
	discovery *discoverability.Service
}

func NewCMSHandler(svc *cms.Service, discovery *discoverability.Service) *CMSHandler {
	return &CMSHandler{svc: svc, discovery: discovery}
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
			if h.discovery != nil {
				if redirect, redirectErr := h.discovery.ResolveRedirect(r.Context(), discoverability.ContentNews, slug); redirectErr == nil {
					if respondInternalPermanentRedirect(w, redirect, "/news/") {
						return
					}
				}
			}
			respondProblem(w, http.StatusNotFound, "Not Found", "News not found or not published")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}
	if h.discovery != nil {
		res.SEO, _ = h.discovery.Metadata(r.Context(), discoverability.ContentNews, res.ID)
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
	if h.discovery != nil {
		for i := range res.Data {
			res.Data[i].SEO, _ = h.discovery.Metadata(r.Context(), discoverability.ContentAnnouncement, res.Data[i].ID)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

func (h *CMSHandler) GetPublicAnnouncement(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	res, err := h.svc.GetPublicAnnouncementBySlug(r.Context(), slug)
	if err != nil {
		if err == cms.ErrNotFound {
			if h.discovery != nil {
				if redirect, redirectErr := h.discovery.ResolveRedirect(r.Context(), discoverability.ContentAnnouncement, slug); redirectErr == nil {
					if respondInternalPermanentRedirect(w, redirect, "/announcements/") {
						return
					}
				}
			}
			respondProblem(w, http.StatusNotFound, "Not Found", "Announcement not found or inactive")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to load announcement")
		return
	}
	if h.discovery != nil {
		res.SEO, _ = h.discovery.Metadata(r.Context(), discoverability.ContentAnnouncement, res.ID)
	}
	respondJSON(w, http.StatusOK, res)
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

func (h *CMSHandler) GetAdminNews(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Missing ID")
		return
	}

	news, err := h.svc.GetAdminNewsByID(r.Context(), id)
	if err != nil {
		if err == cms.ErrNotFound {
			respondProblem(w, http.StatusNotFound, "Not Found", "News not found")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to get news")
		return
	}

	if h.discovery != nil {
		news.SEO, _ = h.discovery.Metadata(r.Context(), discoverability.ContentNews, news.ID)
	}

	respondJSON(w, http.StatusOK, news)
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

func (h *CMSHandler) GetAdminAnnouncement(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Missing ID")
		return
	}

	ann, err := h.svc.GetAdminAnnouncementByID(r.Context(), id)
	if err != nil {
		if err == cms.ErrNotFound {
			respondProblem(w, http.StatusNotFound, "Not Found", "Announcement not found")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to get announcement")
		return
	}

	if h.discovery != nil {
		ann.SEO, _ = h.discovery.Metadata(r.Context(), discoverability.ContentAnnouncement, ann.ID)
	}

	respondJSON(w, http.StatusOK, ann)
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

func (h *CMSHandler) UpdateNews(w http.ResponseWriter, r *http.Request) {
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
		Title           string `json:"title"`
		Slug            string `json:"slug"`
		Excerpt         string `json:"excerpt"`
		Body            string `json:"body"`
		ExpectedVersion int64  `json:"expected_version"`
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid JSON body")
		return
	}
	res, err := h.svc.UpdateDraftNews(r.Context(), r.PathValue("id"), req.Title, req.Slug, req.Excerpt, req.Body, req.ExpectedVersion, &claims.Subject)
	if err != nil {
		switch {
		case err == cms.ErrValidationFailed:
			respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid input data")
		case err == cms.ErrContentLocked:
			respondProblem(w, http.StatusConflict, "Conflict", err.Error())
		case err == cms.ErrConflict:
			respondProblem(w, http.StatusConflict, "Conflict", "A newer content version exists")
		case err == cms.ErrNotFound:
			respondProblem(w, http.StatusNotFound, "Not Found", "News not found")
		default:
			respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to update news")
		}
		return
	}
	respondJSON(w, http.StatusOK, res)
}

func (h *CMSHandler) TransitionNews(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}

	// Extract ID using PathValue or manual parsing fallback
	id := r.PathValue("id")
	if id == "" {
		path := r.URL.Path
		idStart := len("/api/v1/admin/news/")
		idEnd := len(path)
		for i := idStart; i < len(path); i++ {
			if path[i] == '/' {
				idEnd = i
				break
			}
		}
		if idEnd <= idStart {
			respondProblem(w, http.StatusBadRequest, "Bad Request", "Missing ID")
			return
		}
		id = path[idStart:idEnd]
	}

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

func (h *CMSHandler) UpdateAnnouncement(w http.ResponseWriter, r *http.Request) {
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
		Title           string     `json:"title"`
		Slug            string     `json:"slug"`
		Body            string     `json:"body"`
		StartAt         *time.Time `json:"start_at"`
		EndAt           *time.Time `json:"end_at"`
		ExpectedVersion int64      `json:"expected_version"`
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid JSON body")
		return
	}
	res, err := h.svc.UpdateDraftAnnouncement(r.Context(), r.PathValue("id"), req.Title, req.Slug, req.Body, req.StartAt, req.EndAt, req.ExpectedVersion, &claims.Subject)
	if err != nil {
		switch {
		case err == cms.ErrValidationFailed:
			respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid input data")
		case err == cms.ErrContentLocked:
			respondProblem(w, http.StatusConflict, "Conflict", err.Error())
		case err == cms.ErrConflict:
			respondProblem(w, http.StatusConflict, "Conflict", "A newer content version exists")
		case err == cms.ErrNotFound:
			respondProblem(w, http.StatusNotFound, "Not Found", "Announcement not found")
		default:
			respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to update announcement")
		}
		return
	}
	respondJSON(w, http.StatusOK, res)
}

func (h *CMSHandler) TransitionAnnouncement(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}

	// Extract ID using PathValue or manual parsing fallback
	id := r.PathValue("id")
	if id == "" {
		path := r.URL.Path
		idStart := len("/api/v1/admin/announcements/")
		idEnd := len(path)
		for i := idStart; i < len(path); i++ {
			if path[i] == '/' {
				idEnd = i
				break
			}
		}
		if idEnd <= idStart {
			respondProblem(w, http.StatusBadRequest, "Bad Request", "Missing ID")
			return
		}
		id = path[idStart:idEnd]
	}

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

func (h *CMSHandler) ListNewsRevisions(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Missing ID")
		return
	}

	revisions, err := h.svc.ListNewsRevisions(r.Context(), id)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to list news revisions")
		return
	}
	if revisions == nil {
		revisions = []cms.NewsRevision{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(revisions) // #nosec G104
}

func (h *CMSHandler) ListAnnouncementRevisions(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Missing ID")
		return
	}

	revisions, err := h.svc.ListAnnouncementRevisions(r.Context(), id)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to list announcement revisions")
		return
	}
	if revisions == nil {
		revisions = []cms.AnnouncementRevision{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(revisions) // #nosec G104
}
