package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"teman-belajar-api/internal/domain/reviewnote"
)

type ReviewNoteHandler struct {
	svc *reviewnote.Service
}

func NewReviewNoteHandler(svc *reviewnote.Service) *ReviewNoteHandler {
	return &ReviewNoteHandler{svc: svc}
}

// List handles GET /api/v1/admin/review-notes/{entityType}/{entityId}
func (h *ReviewNoteHandler) List(w http.ResponseWriter, r *http.Request) {
	entityType := r.PathValue("entityType")
	entityID := r.PathValue("entityId")

	if entityType == "" || entityID == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 5 {
			entityType = parts[3]
			entityID = parts[4]
		}
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	notes, err := h.svc.ListByEntity(r.Context(), entityType, entityID, limit)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Failed to list review notes")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"data": notes,
	})
}

// Create handles POST /api/v1/admin/review-notes
func (h *ReviewNoteHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input reviewnote.CreateReviewNoteInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Invalid JSON payload")
		return
	}

	note, err := h.svc.Create(r.Context(), input)
	if err != nil {
		if errors.Is(err, reviewnote.ErrInvalidInput) {
			respondProblem(w, http.StatusBadRequest, "Bad Request", err.Error())
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Failed to create review note")
		return
	}

	respondJSON(w, http.StatusCreated, note)
}
