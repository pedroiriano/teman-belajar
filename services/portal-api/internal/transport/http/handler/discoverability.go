package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"teman-belajar-api/internal/domain/discoverability"
	"teman-belajar-api/internal/transport/http/middleware"
)

type DiscoverabilityHandler struct{ svc *discoverability.Service }

func respondInternalPermanentRedirect(w http.ResponseWriter, redirect *discoverability.Redirect, prefix string) bool {
	if redirect == nil || (redirect.Status != http.StatusMovedPermanently && redirect.Status != http.StatusPermanentRedirect) {
		return false
	}
	slug, ok := strings.CutPrefix(redirect.Location, prefix)
	if !ok || discoverability.ValidateSlug(slug) != nil {
		return false
	}
	w.Header().Set("Location", prefix+slug)
	w.WriteHeader(redirect.Status)
	return true
}

func NewDiscoverabilityHandler(svc *discoverability.Service) *DiscoverabilityHandler {
	return &DiscoverabilityHandler{svc: svc}
}

func taxonomyKind(value string) discoverability.TermKind {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "category", "categories":
		return discoverability.KindCategory
	case "tag", "tags":
		return discoverability.KindTag
	default:
		return discoverability.TermKind(value)
	}
}

func (h *DiscoverabilityHandler) AdminTerms(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}
	kind := taxonomyKind(r.PathValue("kind"))
	if !discoverability.ValidTermKind(kind) {
		respondProblem(w, http.StatusNotFound, "Not Found", "Unknown taxonomy kind")
		return
	}
	if r.Method == http.MethodGet {
		items, err := h.svc.ListTerms(r.Context(), kind, r.URL.Query().Get("include_archived") == "true")
		if err != nil {
			respondDiscoverabilityError(w, err)
			return
		}
		respondJSON(w, http.StatusOK, map[string]any{"data": items})
		return
	}
	if !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor") {
		respondProblem(w, http.StatusForbidden, "Forbidden", "Content Editor role required")
		return
	}
	var input discoverability.CreateTermInput
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid JSON body")
		return
	}
	input.Kind = kind
	term, err := h.svc.CreateTerm(r.Context(), input, claims.Subject)
	if err != nil {
		respondDiscoverabilityError(w, err)
		return
	}
	respondJSON(w, http.StatusCreated, term)
}

func (h *DiscoverabilityHandler) ArchiveTerm(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}
	if !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor") {
		respondProblem(w, http.StatusForbidden, "Forbidden", "Content Editor role required")
		return
	}
	if err := h.svc.ArchiveTerm(r.Context(), taxonomyKind(r.PathValue("kind")), r.PathValue("id"), claims.Subject); err != nil {
		respondDiscoverabilityError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *DiscoverabilityHandler) AdminProfile(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}
	contentType := discoverability.ContentType(r.PathValue("contentType"))
	contentID := r.PathValue("contentId")
	if r.Method == http.MethodGet {
		profile, err := h.svc.GetProfile(r.Context(), contentType, contentID)
		if err != nil {
			respondDiscoverabilityError(w, err)
			return
		}
		respondJSON(w, http.StatusOK, profile)
		return
	}
	if !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor") {
		respondProblem(w, http.StatusForbidden, "Forbidden", "Content Editor role required")
		return
	}
	var input discoverability.ProfileInput
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid JSON body")
		return
	}
	profile, err := h.svc.SaveProfile(r.Context(), contentType, contentID, input, claims.Subject)
	if err != nil {
		respondDiscoverabilityError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, profile)
}

func (h *DiscoverabilityHandler) Sitemap(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.Sitemap(r.Context())
	if err != nil {
		respondDiscoverabilityError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *DiscoverabilityHandler) PublicTerms(w http.ResponseWriter, r *http.Request) {
	kind := taxonomyKind(r.PathValue("kind"))
	if !discoverability.ValidTermKind(kind) {
		respondProblem(w, http.StatusNotFound, "Not Found", "Unknown taxonomy kind")
		return
	}
	items, err := h.svc.ListTerms(r.Context(), kind, false)
	if err != nil {
		respondDiscoverabilityError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *DiscoverabilityHandler) Landing(w http.ResponseWriter, r *http.Request) {
	landing, err := h.svc.Landing(r.Context(), taxonomyKind(r.PathValue("kind")), r.PathValue("slug"))
	if err != nil {
		respondDiscoverabilityError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, landing)
}

func respondDiscoverabilityError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, discoverability.ErrInvalid):
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid SEO or taxonomy input")
	case errors.Is(err, discoverability.ErrInvalidMedia):
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", err.Error())
	case errors.Is(err, discoverability.ErrConflict), errors.Is(err, discoverability.ErrRedirectCycle):
		respondProblem(w, http.StatusConflict, "Conflict", err.Error())
	case errors.Is(err, discoverability.ErrNotFound):
		respondProblem(w, http.StatusNotFound, "Not Found", "Discoverability resource not found")
	case errors.Is(err, discoverability.ErrForbidden):
		respondProblem(w, http.StatusForbidden, "Forbidden", err.Error())
	default:
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Discoverability operation failed")
	}
}
