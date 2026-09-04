package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"teman-belajar-api/internal/domain/rbac"
)

type RBACHandler struct {
	svc *rbac.Service
}

func NewRBACHandler(svc *rbac.Service) *RBACHandler {
	return &RBACHandler{svc: svc}
}

// List handles GET /api/v1/admin/rbac/roles
func (h *RBACHandler) List(w http.ResponseWriter, r *http.Request) {
	policies, err := h.svc.List(r.Context())
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Failed to list role policies")
		return
	}
	respondJSON(w, http.StatusOK, policies)
}

// Get handles GET /api/v1/admin/rbac/roles/{id}
func (h *RBACHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 5 {
			id = parts[4]
		}
	}

	policy, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, rbac.ErrNotFound) {
			respondProblem(w, http.StatusNotFound, "Not Found", "Role policy not found")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Failed to get role policy")
		return
	}

	respondJSON(w, http.StatusOK, policy)
}

// Update handles PUT /api/v1/admin/rbac/roles/{id}
func (h *RBACHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 5 {
			id = parts[4]
		}
	}

	var input rbac.UpdateRolePolicyInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Invalid JSON payload")
		return
	}

	policy, err := h.svc.Update(r.Context(), id, input)
	if err != nil {
		if errors.Is(err, rbac.ErrNotFound) {
			respondProblem(w, http.StatusNotFound, "Not Found", "Role policy not found")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Failed to update role policy")
		return
	}

	respondJSON(w, http.StatusOK, policy)
}

// Create handles POST /api/v1/admin/rbac/roles
func (h *RBACHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input rbac.CreateRolePolicyInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Invalid JSON payload")
		return
	}

	policy, err := h.svc.Create(r.Context(), input)
	if err != nil {
		if errors.Is(err, rbac.ErrInvalidInput) {
			respondProblem(w, http.StatusBadRequest, "Bad Request", err.Error())
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Failed to create role policy")
		return
	}

	respondJSON(w, http.StatusCreated, policy)
}

// Delete handles DELETE /api/v1/admin/rbac/roles/{id}
func (h *RBACHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 5 {
			id = parts[4]
		}
	}

	err := h.svc.Delete(r.Context(), id)
	if err != nil {
		if errors.Is(err, rbac.ErrSystemRole) {
			respondProblem(w, http.StatusForbidden, "Forbidden", "Cannot delete system roles")
			return
		}
		if errors.Is(err, rbac.ErrNotFound) {
			respondProblem(w, http.StatusNotFound, "Not Found", "Role policy not found")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Failed to delete role policy")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Role policy deleted successfully"})
}
