package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"teman-belajar-api/internal/domain/banner"
	"teman-belajar-api/internal/transport/http/middleware"
)

const maxBannerRequestBytes = 64 * 1024

type BannerHandler struct {
	svc *banner.Service
}

func NewBannerHandler(svc *banner.Service) *BannerHandler {
	return &BannerHandler{svc: svc}
}

func bannerClaims(w http.ResponseWriter, r *http.Request) (middleware.CustomClaims, bool) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing validated identity")
		return claims, false
	}
	return claims, true
}

func decodeBannerBody(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBannerRequestBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid banner request body")
		return false
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Banner request body contains trailing data")
		return false
	}
	return true
}

func (h *BannerHandler) PublicList(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListActive(r.Context())
	if err != nil {
		h.error(w, err)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *BannerHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	page := 1
	pageSize := 10
	if raw := r.URL.Query().Get("page"); raw != "" {
		if p, err := strconv.Atoi(raw); err == nil && p > 0 {
			page = p
		}
	}
	if raw := r.URL.Query().Get("page_size"); raw != "" {
		if ps, err := strconv.Atoi(raw); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
		}
	}

	search := strings.TrimSpace(r.URL.Query().Get("q"))
	statusFilter := strings.TrimSpace(r.URL.Query().Get("status"))

	items, total, err := h.svc.ListAll(r.Context(), page, pageSize, search, statusFilter)
	if err != nil {
		h.error(w, err)
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"data":      items,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *BannerHandler) AdminGet(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	item, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		h.error(w, err)
		return
	}
	if item == nil {
		h.error(w, banner.ErrNotFound)
		return
	}
	respondJSON(w, http.StatusOK, item)
}

func (h *BannerHandler) AdminCreate(w http.ResponseWriter, r *http.Request) {
	claims, ok := bannerClaims(w, r)
	if !ok {
		return
	}

	var input banner.CreateBannerInput
	if !decodeBannerBody(w, r, &input) {
		return
	}

	item, err := h.svc.Create(r.Context(), input, claims.Subject)
	if err != nil {
		h.error(w, err)
		return
	}

	respondJSON(w, http.StatusCreated, item)
}

func (h *BannerHandler) AdminUpdate(w http.ResponseWriter, r *http.Request) {
	claims, ok := bannerClaims(w, r)
	if !ok {
		return
	}

	id := r.PathValue("id")
	var input banner.UpdateBannerInput
	if !decodeBannerBody(w, r, &input) {
		return
	}

	item, err := h.svc.Update(r.Context(), id, input, claims.Subject)
	if err != nil {
		h.error(w, err)
		return
	}

	respondJSON(w, http.StatusOK, item)
}

func (h *BannerHandler) AdminToggleActive(w http.ResponseWriter, r *http.Request) {
	claims, ok := bannerClaims(w, r)
	if !ok {
		return
	}

	id := r.PathValue("id")
	item, err := h.svc.ToggleActive(r.Context(), id, claims.Subject)
	if err != nil {
		h.error(w, err)
		return
	}

	respondJSON(w, http.StatusOK, item)
}

func (h *BannerHandler) AdminDelete(w http.ResponseWriter, r *http.Request) {
	claims, ok := bannerClaims(w, r)
	if !ok {
		return
	}

	id := r.PathValue("id")
	if err := h.svc.Delete(r.Context(), id, claims.Subject); err != nil {
		h.error(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *BannerHandler) error(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, banner.ErrMaxActiveBanners):
		respondProblem(w, http.StatusUnprocessableEntity, "Max Active Banners Exceeded", "Maksimal 3 banner yang dapat aktif secara bersamaan")
	case errors.Is(err, banner.ErrValidation):
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Data banner tidak valid")
	case errors.Is(err, banner.ErrNotFound):
		respondProblem(w, http.StatusNotFound, "Not Found", "Banner tidak ditemukan")
	default:
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Layanan banner sedang tidak dapat diakses")
	}
}
