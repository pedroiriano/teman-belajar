package handler

import (
	"encoding/json"
	"net/http"
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
	ID        string    `json:"id"`
	Slug      string    `json:"slug"`
	Title     string    `json:"title"`
	Summary   *string   `json:"summary,omitempty"`
	Body      string    `json:"body"`
	Published time.Time `json:"published_at"`
}

type ArticleAdminResponse struct {
	ID                  string    `json:"id"`
	Slug                string    `json:"slug"`
	Title               string    `json:"title"`
	Summary             *string   `json:"summary,omitempty"`
	Status              string    `json:"status"`
	CurrentRevisionNo   int       `json:"current_revision_no"`
	PublishedRevisionNo *int      `json:"published_revision_no,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
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
		Article ArticlePublicResponse   `json:"article"`
		Related []ArticlePublicResponse `json:"related"`
	}{
		Article: ArticlePublicResponse{
			ID:        article.ID,
			Slug:      article.Slug,
			Title:     article.Title,
			Summary:   article.Summary,
			Body:      rev.Body,
			Published: rev.CreatedAt, // Or article.LastReviewedAt
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

// Admin / Internal API

func (h *KnowledgeHandler) CreateArticle(w http.ResponseWriter, r *http.Request) {
	var req CreateArticleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Invalid JSON payload")
		return
	}

	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	var userID string
	if ok {
		userID = claims.Subject
	}

	article, err := h.svc.CreateArticleWithRevision(r.Context(), req.Title, req.Slug, req.Body, req.Summary, req.CategoryID, &userID)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
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

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res)
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
	var userID string
	if ok {
		userID = claims.Subject
	}

	_, err := h.svc.CreateRevision(r.Context(), id, req.Body, &userID)
	if err != nil {
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *KnowledgeHandler) TransitionStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	
	var req TransitionStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Invalid JSON payload")
		return
	}

	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	var userID string
	if ok {
		userID = claims.Subject
	}

	err := h.svc.TransitionStatus(r.Context(), id, knowledge.ArticleStatus(req.Status), &userID)
	if err != nil {
		if err == knowledge.ErrInvalidStatusTransition {
			respondProblem(w, http.StatusConflict, "Conflict", "Invalid status transition")
			return
		}
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
}
