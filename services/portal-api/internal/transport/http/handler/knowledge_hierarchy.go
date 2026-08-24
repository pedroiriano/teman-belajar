package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"teman-belajar-api/internal/domain/knowledge"
	"teman-belajar-api/internal/transport/http/middleware"
)

type KnowledgeHierarchyHandler struct {
	service *knowledge.HierarchyService
}

func NewKnowledgeHierarchyHandler(service *knowledge.HierarchyService) *KnowledgeHierarchyHandler {
	return &KnowledgeHierarchyHandler{service: service}
}

type createKnowledgeNodeRequest struct {
	ParentID    *string            `json:"parent_id"`
	Type        knowledge.NodeType `json:"type"`
	Slug        string             `json:"slug"`
	Title       string             `json:"title"`
	Description *string            `json:"description"`
	SortOrder   int                `json:"sort_order"`
}

type updateKnowledgeNodeRequest struct {
	Type        knowledge.NodeType `json:"type"`
	Slug        string             `json:"slug"`
	Title       string             `json:"title"`
	Description *string            `json:"description"`
	Version     int                `json:"version"`
}

type moveKnowledgeNodeRequest struct {
	ParentID  *string `json:"parent_id"`
	SortOrder int     `json:"sort_order"`
	Version   int     `json:"version"`
}

type reorderKnowledgeNodesRequest struct {
	ParentID  *string  `json:"parent_id"`
	OrderedID []string `json:"ordered_ids"`
}

type archiveKnowledgeNodeRequest struct {
	Version int `json:"version"`
}

type assignKnowledgeArticleNodeRequest struct {
	NodeID string `json:"node_id"`
}

func (h *KnowledgeHierarchyHandler) PublicTree(w http.ResponseWriter, r *http.Request) {
	if len(r.URL.Query()) != 0 {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Unknown query parameters are not allowed")
		return
	}
	tree, err := h.service.Tree(r.Context(), false, true)
	if err != nil {
		respondProblem(w, http.StatusServiceUnavailable, "Service Unavailable", "Knowledge hierarchy is unavailable")
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"data": tree, "max_depth": knowledge.MaxHierarchyDepth})
}

func (h *KnowledgeHierarchyHandler) AdminTree(w http.ResponseWriter, r *http.Request) {
	claims, ok := hierarchyClaims(r)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}
	if !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor", "Reviewer") {
		respondProblem(w, http.StatusForbidden, "Forbidden", "Editorial role required")
		return
	}
	for key := range r.URL.Query() {
		if key != "include_archived" {
			respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Unknown query parameters are not allowed")
			return
		}
	}
	value := r.URL.Query().Get("include_archived")
	if value != "" && value != "true" && value != "false" {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "include_archived must be true or false")
		return
	}
	includeArchived := value == "true"
	tree, err := h.service.Tree(r.Context(), includeArchived, false)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to load knowledge hierarchy")
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"data": tree, "max_depth": knowledge.MaxHierarchyDepth})
}

func (h *KnowledgeHierarchyHandler) CreateNode(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireHierarchyEditor(w, r)
	if !ok {
		return
	}
	var request createKnowledgeNodeRequest
	if !decodeHierarchyJSON(w, r, &request) {
		return
	}
	actor := claims.Subject
	node, err := h.service.CreateNode(r.Context(), knowledge.CreateNodeInput{ParentID: request.ParentID, Type: request.Type, Slug: request.Slug, Title: request.Title, Description: request.Description, SortOrder: request.SortOrder}, &actor)
	if err != nil {
		respondHierarchyError(w, err)
		return
	}
	respondJSON(w, http.StatusCreated, node)
}

func (h *KnowledgeHierarchyHandler) UpdateNode(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireHierarchyEditor(w, r)
	if !ok {
		return
	}
	var request updateKnowledgeNodeRequest
	if !decodeHierarchyJSON(w, r, &request) {
		return
	}
	actor := claims.Subject
	node, err := h.service.UpdateNode(r.Context(), knowledge.UpdateNodeInput{ID: r.PathValue("id"), Type: request.Type, Slug: request.Slug, Title: request.Title, Description: request.Description, Version: request.Version}, &actor)
	if err != nil {
		respondHierarchyError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, node)
}

func (h *KnowledgeHierarchyHandler) MoveNode(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireHierarchyEditor(w, r)
	if !ok {
		return
	}
	var request moveKnowledgeNodeRequest
	if !decodeHierarchyJSON(w, r, &request) {
		return
	}
	actor := claims.Subject
	node, err := h.service.MoveNode(r.Context(), knowledge.MoveNodeInput{ID: r.PathValue("id"), ParentID: request.ParentID, SortOrder: request.SortOrder, Version: request.Version}, &actor)
	if err != nil {
		respondHierarchyError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, node)
}

func (h *KnowledgeHierarchyHandler) ReorderNodes(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireHierarchyEditor(w, r)
	if !ok {
		return
	}
	var request reorderKnowledgeNodesRequest
	if !decodeHierarchyJSON(w, r, &request) {
		return
	}
	actor := claims.Subject
	if err := h.service.ReorderNodes(r.Context(), request.ParentID, request.OrderedID, &actor); err != nil {
		respondHierarchyError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *KnowledgeHierarchyHandler) ArchiveNode(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireHierarchyEditor(w, r)
	if !ok {
		return
	}
	var request archiveKnowledgeNodeRequest
	if !decodeHierarchyJSON(w, r, &request) {
		return
	}
	actor := claims.Subject
	if err := h.service.ArchiveNode(r.Context(), r.PathValue("id"), request.Version, &actor); err != nil {
		respondHierarchyError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *KnowledgeHierarchyHandler) AssignArticle(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireHierarchyEditor(w, r)
	if !ok {
		return
	}
	var request assignKnowledgeArticleNodeRequest
	if !decodeHierarchyJSON(w, r, &request) {
		return
	}
	actor := claims.Subject
	hierarchy, err := h.service.AssignArticle(r.Context(), r.PathValue("id"), request.NodeID, &actor)
	if err != nil {
		respondHierarchyError(w, err)
		return
	}
	respondJSON(w, http.StatusOK, hierarchy)
}

func hierarchyClaims(r *http.Request) (middleware.CustomClaims, bool) {
	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	return claims, ok
}

func requireHierarchyEditor(w http.ResponseWriter, r *http.Request) (middleware.CustomClaims, bool) {
	claims, ok := hierarchyClaims(r)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return middleware.CustomClaims{}, false
	}
	if !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor") {
		respondProblem(w, http.StatusForbidden, "Forbidden", "Content Editor role required")
		return middleware.CustomClaims{}, false
	}
	return claims, true
}

func decodeHierarchyJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Invalid JSON payload")
		return false
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "JSON payload must contain one object")
		return false
	}
	return true
}

func respondHierarchyError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, knowledge.ErrInvalidNode), errors.Is(err, knowledge.ErrInvalidNodeOrder), errors.Is(err, knowledge.ErrArticleAssociation):
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", err.Error())
	case errors.Is(err, knowledge.ErrNodeNotFound), errors.Is(err, knowledge.ErrArticleNotFound):
		respondProblem(w, http.StatusNotFound, "Not Found", err.Error())
	case errors.Is(err, knowledge.ErrHierarchyConflict):
		respondProblem(w, http.StatusConflict, "Conflict", "A newer hierarchy version or sibling value exists")
	case errors.Is(err, knowledge.ErrHierarchyCycle), errors.Is(err, knowledge.ErrHierarchyDepth), errors.Is(err, knowledge.ErrNodeArchived):
		respondProblem(w, http.StatusConflict, "Hierarchy Conflict", err.Error())
	default:
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to update knowledge hierarchy")
	}
}
