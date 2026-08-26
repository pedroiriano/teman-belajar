package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"teman-belajar-api/internal/domain/learning"
	"teman-belajar-api/internal/domain/training"
	"teman-belajar-api/internal/observability"
	"teman-belajar-api/internal/transport/http/middleware"
)

const maxTrainingRequestBytes = 128 * 1024

type TrainingHandler struct{ svc *training.Service }

func NewTrainingHandler(svc *training.Service) *TrainingHandler { return &TrainingHandler{svc: svc} }

func trainingClaims(w http.ResponseWriter, r *http.Request) (middleware.CustomClaims, bool) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing validated identity")
		return claims, false
	}
	return claims, true
}

func decodeTrainingBody(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxTrainingRequestBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid or unsupported training program request body")
		return false
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Training program request body contains trailing data")
		return false
	}
	return true
}

func allowTrainingQuery(w http.ResponseWriter, r *http.Request, allowed ...string) bool {
	set := make(map[string]struct{}, len(allowed))
	for _, key := range allowed {
		set[key] = struct{}{}
	}
	for key := range r.URL.Query() {
		if _, ok := set[key]; !ok {
			respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Unsupported training program query parameter")
			return false
		}
	}
	return true
}

func trainingListFilter(r *http.Request) (training.ListFilter, error) {
	page, pageSize := 1, 12
	var err error
	if raw := r.URL.Query().Get("page"); raw != "" {
		page, err = strconv.Atoi(raw)
		if err != nil || page < 1 {
			return training.ListFilter{}, training.ErrValidation
		}
	}
	if raw := r.URL.Query().Get("page_size"); raw != "" {
		pageSize, err = strconv.Atoi(raw)
		if err != nil || pageSize < 1 || pageSize > 100 {
			return training.ListFilter{}, training.ErrValidation
		}
	}
	return training.ListFilter{Query: r.URL.Query().Get("q"), Status: r.URL.Query().Get("status"), Page: page, PageSize: pageSize}, nil
}

func (h *TrainingHandler) PublicList(w http.ResponseWriter, r *http.Request) {
	if !allowTrainingQuery(w, r, "q", "page", "page_size") {
		return
	}
	filter, err := trainingListFilter(r)
	if err != nil {
		h.error(w, err)
		return
	}
	result, err := h.svc.ListPublic(r.Context(), filter)
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusOK, result)
}

func (h *TrainingHandler) PublicDetail(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.GetPublic(r.Context(), r.PathValue("slug"))
	if err != nil {
		h.error(w, err)
		return
	}
	observability.RecordTrainingAggregation("catalogue", result.Provenance.State)
	respondJSON(w, http.StatusOK, result)
}

func (h *TrainingHandler) MyProgress(w http.ResponseWriter, r *http.Request) {
	claims, ok := trainingClaims(w, r)
	if !ok {
		return
	}
	result, err := h.svc.GetProgress(r.Context(), r.PathValue("slug"), learning.FederatedIdentity{Subject: claims.Subject, Email: claims.Email})
	if err != nil {
		h.error(w, err)
		return
	}
	observability.RecordTrainingAggregation("progress", result.Provenance.State)
	respondJSON(w, http.StatusOK, result)
}

func (h *TrainingHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	if _, ok := trainingClaims(w, r); !ok {
		return
	}
	if !allowTrainingQuery(w, r, "q", "status", "page", "page_size") {
		return
	}
	filter, err := trainingListFilter(r)
	if err != nil {
		h.error(w, err)
		return
	}
	result, err := h.svc.ListAdmin(r.Context(), filter)
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusOK, result)
}

func (h *TrainingHandler) AdminCreate(w http.ResponseWriter, r *http.Request) {
	claims, ok := trainingClaims(w, r)
	if !ok {
		return
	}
	var input training.ProgramInput
	if !decodeTrainingBody(w, r, &input) {
		return
	}
	item, err := h.svc.Create(r.Context(), input, claims.RealmAccess.Roles, claims.Subject)
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusCreated, item)
}

func (h *TrainingHandler) AdminGet(w http.ResponseWriter, r *http.Request) {
	if _, ok := trainingClaims(w, r); !ok {
		return
	}
	item, err := h.svc.GetAdmin(r.Context(), r.PathValue("id"))
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusOK, item)
}

func (h *TrainingHandler) AdminUpdate(w http.ResponseWriter, r *http.Request) {
	claims, ok := trainingClaims(w, r)
	if !ok {
		return
	}
	var input training.ProgramInput
	if !decodeTrainingBody(w, r, &input) {
		return
	}
	item, err := h.svc.Update(r.Context(), r.PathValue("id"), input, claims.RealmAccess.Roles, claims.Subject)
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusOK, item)
}

func (h *TrainingHandler) AdminTransition(w http.ResponseWriter, r *http.Request) {
	claims, ok := trainingClaims(w, r)
	if !ok {
		return
	}
	var input struct {
		Status training.Status `json:"status"`
	}
	if !decodeTrainingBody(w, r, &input) {
		return
	}
	item, err := h.svc.Transition(r.Context(), r.PathValue("id"), input.Status, claims.RealmAccess.Roles, claims.Subject)
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusOK, item)
}

func (h *TrainingHandler) CourseOptions(w http.ResponseWriter, r *http.Request) {
	if _, ok := trainingClaims(w, r); !ok {
		return
	}
	items, err := h.svc.CourseOptions(r.Context())
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"data": items, "provenance": map[string]any{"source": "moodle", "state": "fresh", "checked_at": time.Now().UTC()}})
}

func (h *TrainingHandler) error(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, training.ErrValidation):
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Training program input is invalid")
	case errors.Is(err, training.ErrForbidden), errors.Is(err, training.ErrInvalidTransition):
		respondProblem(w, http.StatusForbidden, "Forbidden", "Training program operation is not allowed")
	case errors.Is(err, training.ErrNotFound):
		respondProblem(w, http.StatusNotFound, "Not Found", "Training program not found")
	case errors.Is(err, training.ErrConflict):
		respondProblem(w, http.StatusConflict, "Conflict", "Training program state changed")
	case training.IsUpstreamError(err):
		respondProblem(w, http.StatusServiceUnavailable, "Service Unavailable", "Moodle course catalogue is currently unavailable")
	default:
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Training program service is unavailable")
	}
}
