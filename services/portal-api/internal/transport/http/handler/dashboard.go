package handler

import (
	"net/http"
	"strconv"
	"strings"

	"teman-belajar-api/internal/domain/dashboard"
)

// DashboardHandler serves the admin dashboard summary and workflow endpoints.
type DashboardHandler struct {
	svc *dashboard.Service
}

// NewDashboardHandler creates a new DashboardHandler.
func NewDashboardHandler(svc *dashboard.Service) *DashboardHandler {
	return &DashboardHandler{svc: svc}
}

// GetSummary handles GET /api/v1/admin/dashboard/summary.
// It returns aggregated KPI metrics, content breakdown, and review queue.
func (h *DashboardHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	summary, err := h.svc.GetSummary(r.Context())
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Failed to load dashboard summary")
		return
	}
	respondJSON(w, http.StatusOK, summary)
}

// GetWorkflow handles GET /api/v1/admin/workflow.
// It returns editorial workflow items matching optional module, status, and limit query filters.
func (h *DashboardHandler) GetWorkflow(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := dashboard.WorkflowFilter{
		Module: strings.TrimSpace(q.Get("module")),
		Status: strings.TrimSpace(q.Get("status")),
	}
	if limitStr := q.Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			filter.Limit = limit
		}
	}

	items, err := h.svc.GetWorkflowItems(r.Context(), filter)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Failed to load workflow items")
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"data": items,
	})
}

