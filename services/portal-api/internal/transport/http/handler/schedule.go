package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"teman-belajar-api/internal/domain/schedule"
)

type ScheduleHandler struct {
	svc *schedule.Service
}

func NewScheduleHandler(svc *schedule.Service) *ScheduleHandler {
	return &ScheduleHandler{svc: svc}
}

// List handles GET /api/v1/admin/schedules
func (h *ScheduleHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	month := strings.TrimSpace(q.Get("month"))
	module := strings.TrimSpace(q.Get("module"))

	result, err := h.svc.List(r.Context(), month, module)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Failed to list schedules")
		return
	}

	respondJSON(w, http.StatusOK, result)
}

// Create handles POST /api/v1/admin/schedules
func (h *ScheduleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input schedule.CreateScheduleInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Invalid JSON payload")
		return
	}

	event, err := h.svc.Create(r.Context(), input)
	if err != nil {
		if errors.Is(err, schedule.ErrInvalidInput) {
			respondProblem(w, http.StatusBadRequest, "Bad Request", err.Error())
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Failed to create schedule")
		return
	}

	respondJSON(w, http.StatusCreated, event)
}

// Cancel handles POST /api/v1/admin/schedules/{id}/cancel
func (h *ScheduleHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			id = parts[3]
		}
	}

	if id == "" {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Missing schedule ID")
		return
	}

	err := h.svc.Cancel(r.Context(), id)
	if err != nil {
		if errors.Is(err, schedule.ErrNotFound) {
			respondProblem(w, http.StatusNotFound, "Not Found", "Schedule not found or already processed")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Failed to cancel schedule")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Schedule cancelled successfully"})
}
