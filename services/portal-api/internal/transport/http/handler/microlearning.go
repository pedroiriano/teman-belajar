package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"teman-belajar-api/internal/domain/microlearning"
	"teman-belajar-api/internal/observability"
	"teman-belajar-api/internal/transport/http/middleware"
)

const maxMicrolearningRequestBytes = 128 * 1024

type MicrolearningHandler struct{ svc *microlearning.Service }

func NewMicrolearningHandler(svc *microlearning.Service) *MicrolearningHandler {
	return &MicrolearningHandler{svc: svc}
}

func microlearningClaims(w http.ResponseWriter, r *http.Request) (middleware.CustomClaims, bool) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing validated identity")
		return claims, false
	}
	return claims, true
}

func microlearningAdminClaims(w http.ResponseWriter, r *http.Request) (middleware.CustomClaims, bool) {
	claims, ok := microlearningClaims(w, r)
	if !ok {
		return claims, false
	}
	if !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor", "Reviewer") {
		respondProblem(w, http.StatusForbidden, "Forbidden", "Microlearning workspace role required")
		return claims, false
	}
	return claims, true
}
func decodeMicrolearning(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxMicrolearningRequestBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid or unsupported microlearning request body")
		return false
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Microlearning request body contains trailing data")
		return false
	}
	return true
}
func allowMicrolearningQuery(w http.ResponseWriter, r *http.Request, allowed ...string) bool {
	set := map[string]struct{}{}
	for _, key := range allowed {
		set[key] = struct{}{}
	}
	for key := range r.URL.Query() {
		if _, ok := set[key]; !ok {
			respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Unsupported microlearning query parameter")
			return false
		}
	}
	return true
}
func microlearningFilter(r *http.Request) (microlearning.ListFilter, error) {
	page, pageSize := 1, 12
	var err error
	if raw := r.URL.Query().Get("page"); raw != "" {
		page, err = strconv.Atoi(raw)
		if err != nil || page < 1 {
			return microlearning.ListFilter{}, microlearning.ErrValidation
		}
	}
	if raw := r.URL.Query().Get("page_size"); raw != "" {
		pageSize, err = strconv.Atoi(raw)
		if err != nil || pageSize < 1 || pageSize > 100 {
			return microlearning.ListFilter{}, microlearning.ErrValidation
		}
	}
	return microlearning.ListFilter{Query: r.URL.Query().Get("q"), Format: r.URL.Query().Get("format"), Status: r.URL.Query().Get("status"), Page: page, PageSize: pageSize}, nil
}

func (h *MicrolearningHandler) PublicList(w http.ResponseWriter, r *http.Request) {
	if !allowMicrolearningQuery(w, r, "q", "format", "page", "page_size") {
		return
	}
	f, e := microlearningFilter(r)
	if e != nil {
		h.problem(w, e)
		return
	}
	x, e := h.svc.ListPublic(r.Context(), f)
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusOK, x)
}
func (h *MicrolearningHandler) PublicDetail(w http.ResponseWriter, r *http.Request) {
	x, e := h.svc.GetPublic(r.Context(), r.PathValue("slug"))
	if e != nil {
		h.problem(w, e)
		return
	}
	observability.RecordMicrolearningAction("detail", "success")
	respondJSON(w, http.StatusOK, x)
}
func (h *MicrolearningHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	if _, ok := microlearningAdminClaims(w, r); !ok {
		return
	}
	if !allowMicrolearningQuery(w, r, "q", "format", "status", "page", "page_size") {
		return
	}
	f, e := microlearningFilter(r)
	if e != nil {
		h.problem(w, e)
		return
	}
	x, e := h.svc.ListAdmin(r.Context(), f)
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusOK, x)
}
func (h *MicrolearningHandler) AdminGet(w http.ResponseWriter, r *http.Request) {
	if _, ok := microlearningAdminClaims(w, r); !ok {
		return
	}
	x, e := h.svc.GetAdmin(r.Context(), r.PathValue("id"))
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusOK, x)
}
func (h *MicrolearningHandler) AdminCreate(w http.ResponseWriter, r *http.Request) {
	c, ok := microlearningClaims(w, r)
	if !ok {
		return
	}
	var in microlearning.Input
	if !decodeMicrolearning(w, r, &in) {
		return
	}
	x, e := h.svc.Create(r.Context(), in, c.RealmAccess.Roles, c.Subject)
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusCreated, x)
}
func (h *MicrolearningHandler) AdminUpdate(w http.ResponseWriter, r *http.Request) {
	c, ok := microlearningClaims(w, r)
	if !ok {
		return
	}
	var in microlearning.Input
	if !decodeMicrolearning(w, r, &in) {
		return
	}
	x, e := h.svc.Update(r.Context(), r.PathValue("id"), in, c.RealmAccess.Roles, c.Subject)
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusOK, x)
}
func (h *MicrolearningHandler) AdminTransition(w http.ResponseWriter, r *http.Request) {
	c, ok := microlearningClaims(w, r)
	if !ok {
		return
	}
	var in struct {
		Status microlearning.Status `json:"status"`
	}
	if !decodeMicrolearning(w, r, &in) {
		return
	}
	x, e := h.svc.Transition(r.Context(), r.PathValue("id"), in.Status, c.RealmAccess.Roles, c.Subject)
	if e != nil {
		h.problem(w, e)
		return
	}
	respondJSON(w, http.StatusOK, x)
}
func (h *MicrolearningHandler) Progress(w http.ResponseWriter, r *http.Request) {
	c, ok := microlearningClaims(w, r)
	if !ok {
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	var x *microlearning.Progress
	var e error
	if r.Method == http.MethodPut {
		var in microlearning.ProgressInput
		if !decodeMicrolearning(w, r, &in) {
			return
		}
		x, e = h.svc.SaveProgress(r.Context(), r.PathValue("id"), c.Subject, in)
	} else {
		x, e = h.svc.GetProgress(r.Context(), r.PathValue("id"), c.Subject)
	}
	if e != nil {
		h.problem(w, e)
		return
	}
	observability.RecordMicrolearningAction("progress", "success")
	respondJSON(w, http.StatusOK, x)
}

func (h *MicrolearningHandler) problem(w http.ResponseWriter, e error) {
	switch {
	case errors.Is(e, microlearning.ErrValidation):
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Microlearning input is invalid")
	case errors.Is(e, microlearning.ErrForbidden), errors.Is(e, microlearning.ErrInvalidTransition):
		respondProblem(w, http.StatusForbidden, "Forbidden", "Microlearning operation is not allowed")
	case errors.Is(e, microlearning.ErrNotFound):
		respondProblem(w, http.StatusNotFound, "Not Found", "Microlearning item not found")
	case errors.Is(e, microlearning.ErrConflict):
		respondProblem(w, http.StatusConflict, "Conflict", "Microlearning state changed")
	default:
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Microlearning service is unavailable")
	}
}
