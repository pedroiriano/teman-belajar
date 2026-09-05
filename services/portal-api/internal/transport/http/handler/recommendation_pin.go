package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"teman-belajar-api/internal/domain/recommendationpin"
	"teman-belajar-api/internal/transport/http/middleware"
)

type RecommendationPinHandler struct {
	svc *recommendationpin.Service
}

func NewRecommendationPinHandler(svc *recommendationpin.Service) *RecommendationPinHandler {
	return &RecommendationPinHandler{svc: svc}
}

func (h *RecommendationPinHandler) List(w http.ResponseWriter, r *http.Request) {
	targetType := r.URL.Query().Get("target_type")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 50
	}

	pins, err := h.svc.List(r.Context(), targetType, limit)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to list recommendation pins")
		return
	}
	if pins == nil {
		pins = []recommendationpin.RecommendationPin{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"data": pins,
	})
}

func (h *RecommendationPinHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}

	var req recommendationpin.CreatePinInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Invalid JSON payload")
		return
	}

	actor := claims.Subject
	pin, err := h.svc.Create(r.Context(), req, actor)
	if err != nil {
		if errors.Is(err, recommendationpin.ErrInvalidInput) {
			respondProblem(w, http.StatusBadRequest, "Bad Request", err.Error())
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to create recommendation pin")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(pin)
}

func (h *RecommendationPinHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Missing ID")
		return
	}

	if err := h.svc.Delete(r.Context(), id); err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to delete recommendation pin")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
