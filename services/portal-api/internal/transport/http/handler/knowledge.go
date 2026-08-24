package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"teman-belajar-api/internal/domain/knowledge"
	"teman-belajar-api/internal/transport/http/middleware"
)

type KnowledgeHandler struct {
	svc *knowledge.Service
}

func NewKnowledgeHandler(svc *knowledge.Service) *KnowledgeHandler {
	return &KnowledgeHandler{svc: svc}
}

// Request & Response Types

type ArticlePublicResponse struct {
	ID             string     `json:"id"`
	Slug           string     `json:"slug"`
	Title          string     `json:"title"`
	Summary        *string    `json:"summary,omitempty"`
	Body           string     `json:"body,omitempty"`
	PublishedAt    *time.Time `json:"published_at,omitempty"`
	LastReviewedAt *time.Time `json:"last_reviewed_at,omitempty"`
}

type ArticleAdminResponse struct {
	ID                  string     `json:"id"`
	Slug                string     `json:"slug"`
	Title               string     `json:"title"`
	Summary             *string    `json:"summary,omitempty"`
	Status              string     `json:"status"`
	CurrentRevisionNo   int        `json:"current_revision_no"`
	PublishedRevisionNo *int       `json:"published_revision_no,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
	LastReviewedAt      *time.Time `json:"last_reviewed_at,omitempty"`
	Body                string     `json:"body,omitempty"`
	CurrentRevisionID   string     `json:"current_revision_id,omitempty"`
}

type CreateArticleRequest struct {
	Title      string  `json:"title"`
	Slug       string  `json:"slug"`
	Summary    *string `json:"summary"`
	Body       string  `json:"body"`
	CategoryID *string `json:"category_id"`
}

type CreateRevisionRequest struct {
	Body string `json:"body"`
}

type TransitionStatusRequest struct {
	Status string `json:"status"`
}

// Public API

func parseKnowledgePagination(r *http.Request) (int, int) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
	return page, pageSize
}

func publicArticleResponse(article knowledge.Article) ArticlePublicResponse {
	return ArticlePublicResponse{
		ID:             article.ID,
		Slug:           article.Slug,
		Title:          article.Title,
		Summary:        article.Summary,
		LastReviewedAt: article.LastReviewedAt,
	}
}

func adminArticleResponse(article knowledge.Article) ArticleAdminResponse {
	return ArticleAdminResponse{
		ID: article.ID, Slug: article.Slug, Title: article.Title, Summary: article.Summary,
		Status: string(article.Status), CurrentRevisionNo: article.CurrentRevisionNo,
		PublishedRevisionNo: article.PublishedRevisionNo, CreatedAt: article.CreatedAt,
		UpdatedAt: article.UpdatedAt, LastReviewedAt: article.LastReviewedAt,
	}
}

func (h *KnowledgeHandler) ListPublicArticles(w http.ResponseWriter, r *http.Request) {
	page, pageSize := parseKnowledgePagination(r)
	var categoryID *string
	if category := r.URL.Query().Get("category"); category != "" {
		categoryID = &category
	}

	result, err := h.svc.ListPublicArticles(r.Context(), page, pageSize, categoryID)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to load knowledge articles")
		return
	}

	data := make([]ArticlePublicResponse, len(result.Data))
	for i, article := range result.Data {
		data[i] = publicArticleResponse(article)
	}
	respondJSON(w, http.StatusOK, struct {
		Data       []ArticlePublicResponse `json:"data"`
		Pagination knowledge.Pagination    `json:"pagination"`
	}{Data: data, Pagination: result.Pagination})
}

func (h *KnowledgeHandler) GetPublicArticle(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")

	article, rev, related, err := h.svc.GetPublicArticleWithRevision(r.Context(), slug)
	if err != nil {
		if err == knowledge.ErrArticleNotFound {
			respondProblem(w, http.StatusNotFound, "Not Found", "Article not found or not published")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	res := struct {
		ArticlePublicResponse
		Related []ArticlePublicResponse `json:"related"`
	}{
		ArticlePublicResponse: ArticlePublicResponse{
			ID:             article.ID,
			Slug:           article.Slug,
			Title:          article.Title,
			Summary:        article.Summary,
			Body:           rev.Body,
			PublishedAt:    &rev.CreatedAt,
			LastReviewedAt: article.LastReviewedAt,
		},
		Related: make([]ArticlePublicResponse, len(related)),
	}

	for i, rel := range related {
		// Ideally we need the related revision bodies too, but usually related just shows links
		res.Related[i] = ArticlePublicResponse{
			ID:      rel.ID,
			Slug:    rel.Slug,
			Title:   rel.Title,
			Summary: rel.Summary,
		}
	}

	respondJSON(w, http.StatusOK, res)
}

// Admin / Internal API

func (h *KnowledgeHandler) ListAdminArticles(w http.ResponseWriter, r *http.Request) {
	page, pageSize := parseKnowledgePagination(r)
	result, err := h.svc.ListAdminArticles(r.Context(), page, pageSize)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to load knowledge articles")
		return
	}
	data := make([]ArticleAdminResponse, len(result.Data))
	for i, article := range result.Data {
		data[i] = adminArticleResponse(article)
	}
	respondJSON(w, http.StatusOK, struct {
		Data       []ArticleAdminResponse `json:"data"`
		Pagination knowledge.Pagination   `json:"pagination"`
	}{Data: data, Pagination: result.Pagination})
}

func (h *KnowledgeHandler) GetAdminArticle(w http.ResponseWriter, r *http.Request) {
	article, revision, err := h.svc.GetAdminArticleWithRevision(r.Context(), r.PathValue("id"))
	if err != nil {
		if errors.Is(err, knowledge.ErrArticleNotFound) || errors.Is(err, knowledge.ErrRevisionNotFound) {
			respondProblem(w, http.StatusNotFound, "Not Found", "Knowledge article not found")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to load knowledge article")
		return
	}
	response := adminArticleResponse(*article)
	response.Body = revision.Body
	response.CurrentRevisionID = revision.ID
	respondJSON(w, http.StatusOK, response)
}

func (h *KnowledgeHandler) CreateArticle(w http.ResponseWriter, r *http.Request) {
	var req CreateArticleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Invalid JSON payload")
		return
	}

	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}
	if !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor") {
		respondProblem(w, http.StatusForbidden, "Forbidden", "Content Editor role required")
		return
	}
	userID := claims.Subject

	article, err := h.svc.CreateArticleWithRevision(r.Context(), req.Title, req.Slug, req.Body, req.Summary, req.CategoryID, &userID)
	if err != nil {
		if errors.Is(err, knowledge.ErrTitleRequired) || errors.Is(err, knowledge.ErrSlugRequired) || errors.Is(err, knowledge.ErrBodyRequired) {
			respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", err.Error())
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to create knowledge article")
		return
	}

	res := ArticleAdminResponse{
		ID:                article.ID,
		Slug:              article.Slug,
		Title:             article.Title,
		Summary:           article.Summary,
		Status:            string(article.Status),
		CurrentRevisionNo: article.CurrentRevisionNo,
		CreatedAt:         article.CreatedAt,
		UpdatedAt:         article.UpdatedAt,
	}
	if _, revision, revisionErr := h.svc.GetAdminArticleWithRevision(r.Context(), article.ID); revisionErr == nil {
		res.CurrentRevisionID = revision.ID
	}

	respondJSON(w, http.StatusCreated, res)
}

func (h *KnowledgeHandler) CreateRevision(w http.ResponseWriter, r *http.Request) {
	// e.g. POST /internal/v1/knowledge/{id}/revisions
	id := r.PathValue("id")
	if id == "" {
		// Fallback for custom routing if not using Go 1.22+ new Mux
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Missing ID")
		return
	}

	var req CreateRevisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Invalid JSON payload")
		return
	}

	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}
	if !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor") {
		respondProblem(w, http.StatusForbidden, "Forbidden", "Content Editor role required")
		return
	}
	userID := claims.Subject

	revision, err := h.svc.CreateRevision(r.Context(), id, req.Body, &userID)
	if err != nil {
		if errors.Is(err, knowledge.ErrBodyRequired) {
			respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", err.Error())
			return
		}
		if errors.Is(err, knowledge.ErrRevisionLocked) {
			respondProblem(w, http.StatusConflict, "Conflict", err.Error())
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to create knowledge revision")
		return
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{"id": revision.ID, "article_id": revision.ArticleID, "revision_no": revision.RevisionNo})
}

func (h *KnowledgeHandler) TransitionStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req TransitionStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Invalid JSON payload")
		return
	}

	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}
	userID := claims.Subject

	err := h.svc.TransitionStatusAuthorized(r.Context(), id, knowledge.ArticleStatus(req.Status), claims.RealmAccess.Roles, &userID)
	if err != nil {
		if errors.Is(err, knowledge.ErrForbidden) {
			respondProblem(w, http.StatusForbidden, "Forbidden", "Invalid transition or insufficient permissions")
			return
		}
		if errors.Is(err, knowledge.ErrInvalidStatusTransition) {
			respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid status transition")
			return
		}
		if errors.Is(err, knowledge.ErrArticleNotFound) {
			respondProblem(w, http.StatusNotFound, "Not Found", "Knowledge article not found")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
}

func hasAnyRole(userRoles []string, allowed ...string) bool {
	for _, userRole := range userRoles {
		for _, role := range allowed {
			if userRole == role {
				return true
			}
		}
	}
	return false
}

func respondJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}
