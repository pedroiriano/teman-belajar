package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"teman-belajar-api/internal/domain/faq"
	"teman-belajar-api/internal/transport/http/middleware"
)

const maxFAQRequestBytes = 24 * 1024

type FAQHandler struct{ svc *faq.Service }

func NewFAQHandler(svc *faq.Service) *FAQHandler { return &FAQHandler{svc: svc} }

func faqClaims(w http.ResponseWriter, r *http.Request) (middleware.CustomClaims, bool) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing validated identity")
		return claims, false
	}
	return claims, true
}

func decodeFAQBody(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxFAQRequestBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid or unsupported FAQ request body")
		return false
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "FAQ request body contains trailing data")
		return false
	}
	return true
}

func allowFAQQuery(w http.ResponseWriter, r *http.Request, allowed ...string) bool {
	set := make(map[string]struct{}, len(allowed))
	for _, key := range allowed {
		set[key] = struct{}{}
	}
	for key := range r.URL.Query() {
		if _, ok := set[key]; !ok {
			respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Unsupported FAQ query parameter")
			return false
		}
	}
	return true
}

func (h *FAQHandler) PublicList(w http.ResponseWriter, r *http.Request) {
	if !allowFAQQuery(w, r, "q") {
		return
	}
	result, err := h.svc.ListPublic(r.Context(), r.URL.Query().Get("q"))
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusOK, result)
}

func (h *FAQHandler) Categories(w http.ResponseWriter, r *http.Request) {
	claims, ok := faqClaims(w, r)
	if !ok {
		return
	}
	if r.Method == http.MethodGet {
		if !allowFAQQuery(w, r, "include_archived") {
			return
		}
		items, err := h.svc.ListCategories(r.Context(), r.URL.Query().Get("include_archived") == "true")
		if err != nil {
			h.error(w, err)
			return
		}
		respondJSON(w, http.StatusOK, map[string]any{"data": items})
		return
	}
	var input faq.CategoryInput
	if !decodeFAQBody(w, r, &input) {
		return
	}
	item, err := h.svc.CreateCategory(r.Context(), input, claims.RealmAccess.Roles, claims.Subject)
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusCreated, item)
}

func (h *FAQHandler) ArchiveCategory(w http.ResponseWriter, r *http.Request) {
	claims, ok := faqClaims(w, r)
	if !ok {
		return
	}
	if err := h.svc.ArchiveCategory(r.Context(), r.PathValue("id"), claims.RealmAccess.Roles, claims.Subject); err != nil {
		h.error(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func faqListFilter(r *http.Request) (faq.ListFilter, error) {
	page, pageSize := 1, 20
	var err error
	if raw := r.URL.Query().Get("page"); raw != "" {
		page, err = strconv.Atoi(raw)
		if err != nil {
			return faq.ListFilter{}, faq.ErrValidation
		}
	}
	if raw := r.URL.Query().Get("page_size"); raw != "" {
		pageSize, err = strconv.Atoi(raw)
		if err != nil {
			return faq.ListFilter{}, faq.ErrValidation
		}
	}
	return faq.ListFilter{Query: r.URL.Query().Get("q"), Status: r.URL.Query().Get("status"), CategoryID: r.URL.Query().Get("category_id"), Page: page, PageSize: pageSize}, nil
}

func (h *FAQHandler) Items(w http.ResponseWriter, r *http.Request) {
	claims, ok := faqClaims(w, r)
	if !ok {
		return
	}
	if r.Method == http.MethodGet {
		if !allowFAQQuery(w, r, "q", "status", "category_id", "page", "page_size") {
			return
		}
		filter, err := faqListFilter(r)
		if err != nil {
			h.error(w, err)
			return
		}
		items, err := h.svc.ListAdmin(r.Context(), filter)
		if err != nil {
			h.error(w, err)
			return
		}
		respondJSON(w, http.StatusOK, items)
		return
	}
	var input faq.ItemInput
	if !decodeFAQBody(w, r, &input) {
		return
	}
	item, err := h.svc.CreateItem(r.Context(), input, claims.RealmAccess.Roles, claims.Subject)
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusCreated, item)
}

func (h *FAQHandler) GetItem(w http.ResponseWriter, r *http.Request) {
	if _, ok := faqClaims(w, r); !ok {
		return
	}
	item, err := h.svc.GetItem(r.Context(), r.PathValue("id"))
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusOK, item)
}

func (h *FAQHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	claims, ok := faqClaims(w, r)
	if !ok {
		return
	}
	var input faq.ItemInput
	if !decodeFAQBody(w, r, &input) {
		return
	}
	item, err := h.svc.UpdateItem(r.Context(), r.PathValue("id"), input, claims.RealmAccess.Roles, claims.Subject)
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusOK, item)
}

func (h *FAQHandler) Transition(w http.ResponseWriter, r *http.Request) {
	claims, ok := faqClaims(w, r)
	if !ok {
		return
	}
	var input struct {
		Status faq.Status `json:"status"`
	}
	if !decodeFAQBody(w, r, &input) {
		return
	}
	item, err := h.svc.Transition(r.Context(), r.PathValue("id"), input.Status, claims.RealmAccess.Roles, claims.Subject)
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusOK, item)
}

func (h *FAQHandler) error(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, faq.ErrValidation):
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "FAQ input is invalid")
	case errors.Is(err, faq.ErrForbidden), errors.Is(err, faq.ErrInvalidTransition):
		respondProblem(w, http.StatusForbidden, "Forbidden", "FAQ operation is not allowed")
	case errors.Is(err, faq.ErrNotFound):
		respondProblem(w, http.StatusNotFound, "Not Found", "FAQ resource not found")
	case errors.Is(err, faq.ErrConflict), errors.Is(err, faq.ErrCategoryInUse):
		respondProblem(w, http.StatusConflict, "Conflict", "FAQ state changed or category is still in use")
	default:
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "FAQ service is unavailable")
	}
}
