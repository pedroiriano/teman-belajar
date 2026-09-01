package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"teman-belajar-api/internal/domain/learningpath"
	"teman-belajar-api/internal/observability"
	"teman-belajar-api/internal/transport/http/middleware"
)

const maxLearningPathBody = 192 * 1024

type LearningPathHandler struct{ service *learningpath.Service }

func NewLearningPathHandler(service *learningpath.Service) *LearningPathHandler {
	return &LearningPathHandler{service: service}
}

func learningPathClaims(w http.ResponseWriter, r *http.Request) (middleware.CustomClaims, bool) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing validated identity")
		return claims, false
	}
	return claims, true
}
func decodeLearningPath(w http.ResponseWriter, r *http.Request, target any) bool {
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxLearningPathBody))
	d.DisallowUnknownFields()
	if e := d.Decode(target); e != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid or unsupported learning path request body")
		return false
	}
	var trailing any
	if e := d.Decode(&trailing); !errors.Is(e, io.EOF) {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Learning path request body contains trailing data")
		return false
	}
	return true
}
func allowLearningPathQuery(w http.ResponseWriter, r *http.Request, allowed ...string) bool {
	set := map[string]bool{}
	for _, x := range allowed {
		set[x] = true
	}
	for x := range r.URL.Query() {
		if !set[x] {
			respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Unsupported learning path query parameter")
			return false
		}
	}
	return true
}
func learningPathFilter(r *http.Request) (learningpath.Filter, error) {
	page, size := 1, 12
	var e error
	if raw := r.URL.Query().Get("page"); raw != "" {
		page, e = strconv.Atoi(raw)
		if e != nil || page < 1 {
			return learningpath.Filter{}, learningpath.ErrValidation
		}
	}
	if raw := r.URL.Query().Get("page_size"); raw != "" {
		size, e = strconv.Atoi(raw)
		if e != nil || size < 1 || size > 100 {
			return learningpath.Filter{}, learningpath.ErrValidation
		}
	}
	return learningpath.Filter{Query: r.URL.Query().Get("q"), Status: r.URL.Query().Get("status"), Page: page, PageSize: size}, nil
}

func (h *LearningPathHandler) PublicList(w http.ResponseWriter, r *http.Request) {
	if !allowLearningPathQuery(w, r, "q", "page", "page_size") {
		return
	}
	f, e := learningPathFilter(r)
	if e != nil {
		h.problem(w, e)
		return
	}
	out, e := h.service.List(r.Context(), f, false)
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusOK, out)
}
func (h *LearningPathHandler) PublicDetail(w http.ResponseWriter, r *http.Request) {
	out, e := h.service.GetPublic(r.Context(), r.PathValue("slug"))
	if e != nil {
		h.problem(w, e)
		return
	}
	observability.RecordLearningPath("detail", "success")
	respondJSON(w, http.StatusOK, out)
}
func (h *LearningPathHandler) Progress(w http.ResponseWriter, r *http.Request) {
	claims, ok := learningPathClaims(w, r)
	if !ok {
		return
	}
	out, e := h.service.Progress(r.Context(), r.PathValue("slug"), claims.Subject)
	if e != nil {
		h.problem(w, e)
		return
	}
	observability.RecordLearningPath("progress", "success")
	respondJSON(w, http.StatusOK, out)
}
func (h *LearningPathHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	if _, ok := learningPathClaims(w, r); !ok {
		return
	}
	if !allowLearningPathQuery(w, r, "q", "status", "page", "page_size") {
		return
	}
	f, e := learningPathFilter(r)
	if e != nil {
		h.problem(w, e)
		return
	}
	out, e := h.service.List(r.Context(), f, true)
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusOK, out)
}
func (h *LearningPathHandler) AdminGet(w http.ResponseWriter, r *http.Request) {
	if _, ok := learningPathClaims(w, r); !ok {
		return
	}
	out, e := h.service.GetAdmin(r.Context(), r.PathValue("id"))
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusOK, out)
}
func (h *LearningPathHandler) AdminOptions(w http.ResponseWriter, r *http.Request) {
	claims, ok := learningPathClaims(w, r)
	if !ok {
		return
	}
	out, e := h.service.Options(r.Context(), claims.Subject)
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusOK, out)
}
func (h *LearningPathHandler) AdminCreate(w http.ResponseWriter, r *http.Request) {
	claims, ok := learningPathClaims(w, r)
	if !ok {
		return
	}
	var in learningpath.Input
	if !decodeLearningPath(w, r, &in) {
		return
	}
	out, e := h.service.Create(r.Context(), in, claims.RealmAccess.Roles, claims.Subject)
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusCreated, out)
}
func (h *LearningPathHandler) AdminUpdate(w http.ResponseWriter, r *http.Request) {
	claims, ok := learningPathClaims(w, r)
	if !ok {
		return
	}
	var in learningpath.Input
	if !decodeLearningPath(w, r, &in) {
		return
	}
	out, e := h.service.Update(r.Context(), r.PathValue("id"), in, claims.RealmAccess.Roles, claims.Subject)
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusOK, out)
}
func (h *LearningPathHandler) AdminTransition(w http.ResponseWriter, r *http.Request) {
	claims, ok := learningPathClaims(w, r)
	if !ok {
		return
	}
	var in struct {
		Status learningpath.Status `json:"status"`
	}
	if !decodeLearningPath(w, r, &in) {
		return
	}
	out, e := h.service.Transition(r.Context(), r.PathValue("id"), in.Status, claims.RealmAccess.Roles, claims.Subject)
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusOK, out)
}
func (h *LearningPathHandler) AdminRevision(w http.ResponseWriter, r *http.Request) {
	claims, ok := learningPathClaims(w, r)
	if !ok {
		return
	}
	var in struct {
		ExpectedRowVersion int64 `json:"expected_row_version"`
	}
	if !decodeLearningPath(w, r, &in) {
		return
	}
	out, e := h.service.CreateRevision(r.Context(), r.PathValue("id"), in.ExpectedRowVersion, claims.RealmAccess.Roles, claims.Subject)
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusCreated, out)
}

func (h *LearningPathHandler) problem(w http.ResponseWriter, e error) {
	observability.RecordLearningPath("request", "error")
	switch {
	case errors.Is(e, learningpath.ErrValidation):
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Learning path input is invalid")
	case errors.Is(e, learningpath.ErrForbidden), errors.Is(e, learningpath.ErrInvalidTransition), errors.Is(e, learningpath.ErrUnauthorizedSource):
		respondProblem(w, http.StatusForbidden, "Forbidden", "Learning path operation is not allowed")
	case errors.Is(e, learningpath.ErrNotFound), errors.Is(e, learningpath.ErrOrphanSource):
		respondProblem(w, http.StatusNotFound, "Not Found", "Learning path or referenced source was not found")
	case errors.Is(e, learningpath.ErrConflict):
		respondProblem(w, http.StatusConflict, "Conflict", "Learning path state changed")
	case errors.Is(e, learningpath.ErrRequiredSourceUnavailable):
		respondProblem(w, http.StatusServiceUnavailable, "Source Unavailable", "A required learning path source is unavailable")
	default:
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Learning path service is unavailable")
	}
}
