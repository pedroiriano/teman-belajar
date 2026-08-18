package handler

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	application "teman-belajar-api/internal/application/engagement"
	domain "teman-belajar-api/internal/domain/engagement"
	"teman-belajar-api/internal/transport/http/middleware"
)

type EngagementService interface {
	PutBookmark(context.Context, string, domain.Target) (domain.Item, error)
	DeleteBookmark(context.Context, string, domain.Target) error
	ListBookmarks(context.Context, string) ([]domain.Item, error)
	PutRating(context.Context, string, domain.Target, int) (domain.Item, domain.RatingSummary, error)
	DeleteRating(context.Context, string, domain.Target) error
	GetMyRating(context.Context, string, domain.Target) (*domain.Rating, domain.RatingSummary, error)
	GetRatingSummary(context.Context, domain.Target) (domain.RatingSummary, error)
	RecordView(context.Context, string, domain.Target) (domain.Item, error)
	ListRecentViews(context.Context, string) ([]domain.Item, error)
	Recommendations(context.Context, string, int) (domain.RecommendationResult, error)
}

type EngagementHandler struct{ service EngagementService }

func NewEngagementHandler(service EngagementService) *EngagementHandler {
	return &EngagementHandler{service: service}
}

type engagementTargetResponse struct {
	TargetType  string     `json:"target_type"`
	TargetID    string     `json:"target_id"`
	Title       string     `json:"title"`
	Summary     string     `json:"summary,omitempty"`
	URL         string     `json:"url"`
	CategoryID  string     `json:"category_id,omitempty"`
	Tags        []string   `json:"tags"`
	PublishedAt *time.Time `json:"published_at,omitempty"`
}

type engagementItemResponse struct {
	engagementTargetResponse
	Bookmarked bool       `json:"bookmarked,omitempty"`
	Rating     *int       `json:"rating,omitempty"`
	CreatedAt  *time.Time `json:"created_at,omitempty"`
	LastViewed *time.Time `json:"last_viewed_at,omitempty"`
	ViewCount  int64      `json:"view_count,omitempty"`
}

type ratingSummaryResponse struct {
	Average           float64 `json:"average"`
	Count             int     `json:"count"`
	CurrentUserRating *int    `json:"current_user_rating,omitempty"`
}

type recommendationResponse struct {
	engagementTargetResponse
	Reason string `json:"reason"`
}

func targetResponse(target domain.ResolvedTarget) engagementTargetResponse {
	tags := target.Tags
	if tags == nil {
		tags = []string{}
	}
	return engagementTargetResponse{
		TargetType: string(target.Target.Type), TargetID: target.Target.ID, Title: target.Title,
		Summary: target.Summary, URL: target.URL, CategoryID: target.CategoryID, Tags: tags, PublishedAt: target.PublishedAt,
	}
}

func itemResponse(item domain.Item) engagementItemResponse {
	return engagementItemResponse{
		engagementTargetResponse: targetResponse(item.Target), Bookmarked: item.Bookmarked, Rating: item.Rating,
		CreatedAt: item.CreatedAt, LastViewed: item.LastViewed, ViewCount: item.ViewCount,
	}
}

func actorSubject(r *http.Request) (string, bool) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	return claims.Subject, ok && claims.Subject != ""
}

func engagementTarget(r *http.Request) (domain.Target, error) {
	return application.ParseTarget(r.PathValue("targetType"), r.PathValue("targetId"))
}

func noStore(w http.ResponseWriter) { w.Header().Set("Cache-Control", "no-store") }

func engagementProblem(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrInvalidTarget), errors.Is(err, domain.ErrInvalidRating):
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", err.Error())
	case errors.Is(err, domain.ErrTargetUnavailable):
		respondProblem(w, http.StatusNotFound, "Not Found", "Engagement target is unavailable")
	case errors.Is(err, domain.ErrInvalidActor):
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Authenticated identity is required")
	case errors.Is(err, domain.ErrRecommendationUnavailable):
		respondProblem(w, http.StatusServiceUnavailable, "Service Unavailable", "Recommendations are temporarily unavailable")
	default:
		respondProblem(w, http.StatusInternalServerError, "Internal Server Error", "Unable to process engagement request")
	}
}

func rejectUnexpectedQuery(r *http.Request, allowed ...string) bool {
	allow := make(map[string]struct{}, len(allowed))
	for _, key := range allowed {
		allow[key] = struct{}{}
	}
	for key := range r.URL.Query() {
		if _, ok := allow[key]; !ok {
			return true
		}
	}
	return false
}

func (h *EngagementHandler) ListBookmarks(w http.ResponseWriter, r *http.Request) {
	noStore(w)
	if rejectUnexpectedQuery(r) {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Unknown query parameter")
		return
	}
	userKey, ok := actorSubject(r)
	if !ok {
		engagementProblem(w, domain.ErrInvalidActor)
		return
	}
	items, err := h.service.ListBookmarks(r.Context(), userKey)
	if err != nil {
		engagementProblem(w, err)
		return
	}
	data := make([]engagementItemResponse, 0, len(items))
	for _, item := range items {
		data = append(data, itemResponse(item))
	}
	respondJSON(w, http.StatusOK, struct {
		Data []engagementItemResponse `json:"data"`
	}{Data: data})
}

func (h *EngagementHandler) Bookmark(w http.ResponseWriter, r *http.Request) {
	noStore(w)
	userKey, ok := actorSubject(r)
	if !ok {
		engagementProblem(w, domain.ErrInvalidActor)
		return
	}
	target, err := engagementTarget(r)
	if err != nil {
		engagementProblem(w, err)
		return
	}
	if r.Method == http.MethodDelete {
		if err := h.service.DeleteBookmark(r.Context(), userKey, target); err != nil {
			engagementProblem(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}
	item, err := h.service.PutBookmark(r.Context(), userKey, target)
	if err != nil {
		engagementProblem(w, err)
		return
	}
	respondJSON(w, http.StatusOK, itemResponse(item))
}

func decodeRating(w http.ResponseWriter, r *http.Request) (int, bool) {
	defer r.Body.Close()
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1024))
	decoder.DisallowUnknownFields()
	var body struct {
		Rating int `json:"rating"`
	}
	if err := decoder.Decode(&body); err != nil {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Invalid rating payload")
		return 0, false
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Rating payload must contain one JSON object")
		return 0, false
	}
	return body.Rating, true
}

func (h *EngagementHandler) Rating(w http.ResponseWriter, r *http.Request) {
	noStore(w)
	userKey, ok := actorSubject(r)
	if !ok {
		engagementProblem(w, domain.ErrInvalidActor)
		return
	}
	target, err := engagementTarget(r)
	if err != nil {
		engagementProblem(w, err)
		return
	}
	switch r.Method {
	case http.MethodGet:
		rating, summary, serviceErr := h.service.GetMyRating(r.Context(), userKey, target)
		if serviceErr != nil {
			engagementProblem(w, serviceErr)
			return
		}
		var current *int
		if rating != nil {
			value := rating.Value
			current = &value
		}
		respondJSON(w, http.StatusOK, ratingSummaryResponse{Average: summary.Average, Count: summary.Count, CurrentUserRating: current})
	case http.MethodDelete:
		if err := h.service.DeleteRating(r.Context(), userKey, target); err != nil {
			engagementProblem(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		value, valid := decodeRating(w, r)
		if !valid {
			return
		}
		_, summary, serviceErr := h.service.PutRating(r.Context(), userKey, target, value)
		if serviceErr != nil {
			engagementProblem(w, serviceErr)
			return
		}
		respondJSON(w, http.StatusOK, ratingSummaryResponse{Average: summary.Average, Count: summary.Count, CurrentUserRating: &value})
	}
}

func (h *EngagementHandler) RatingSummary(w http.ResponseWriter, r *http.Request) {
	target, err := engagementTarget(r)
	if err != nil {
		engagementProblem(w, err)
		return
	}
	summary, err := h.service.GetRatingSummary(r.Context(), target)
	if err != nil {
		engagementProblem(w, err)
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=60")
	respondJSON(w, http.StatusOK, ratingSummaryResponse{Average: summary.Average, Count: summary.Count})
}

func (h *EngagementHandler) ListRecentViews(w http.ResponseWriter, r *http.Request) {
	noStore(w)
	if rejectUnexpectedQuery(r) {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Unknown query parameter")
		return
	}
	userKey, ok := actorSubject(r)
	if !ok {
		engagementProblem(w, domain.ErrInvalidActor)
		return
	}
	items, err := h.service.ListRecentViews(r.Context(), userKey)
	if err != nil {
		engagementProblem(w, err)
		return
	}
	data := make([]engagementItemResponse, 0, len(items))
	for _, item := range items {
		data = append(data, itemResponse(item))
	}
	respondJSON(w, http.StatusOK, struct {
		Data []engagementItemResponse `json:"data"`
	}{Data: data})
}

func (h *EngagementHandler) RecentView(w http.ResponseWriter, r *http.Request) {
	noStore(w)
	userKey, ok := actorSubject(r)
	if !ok {
		engagementProblem(w, domain.ErrInvalidActor)
		return
	}
	target, err := engagementTarget(r)
	if err != nil {
		engagementProblem(w, err)
		return
	}
	item, err := h.service.RecordView(r.Context(), userKey, target)
	if err != nil {
		engagementProblem(w, err)
		return
	}
	respondJSON(w, http.StatusOK, itemResponse(item))
}

func (h *EngagementHandler) Recommendations(w http.ResponseWriter, r *http.Request) {
	noStore(w)
	if rejectUnexpectedQuery(r, "limit", "content_type") {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Unknown query parameter")
		return
	}
	if contentType := r.URL.Query().Get("content_type"); contentType != "" && contentType != string(domain.TargetKnowledge) {
		engagementProblem(w, domain.ErrInvalidTarget)
		return
	}
	limit := 0
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			engagementProblem(w, domain.ErrInvalidTarget)
			return
		}
		limit = parsed
	}
	userKey, ok := actorSubject(r)
	if !ok {
		engagementProblem(w, domain.ErrInvalidActor)
		return
	}
	result, err := h.service.Recommendations(r.Context(), userKey, limit)
	if err != nil {
		engagementProblem(w, err)
		return
	}
	data := make([]recommendationResponse, 0, len(result.Items))
	for _, item := range result.Items {
		data = append(data, recommendationResponse{engagementTargetResponse: targetResponse(item.Target), Reason: string(item.Reason)})
	}
	respondJSON(w, http.StatusOK, struct {
		Data         []recommendationResponse `json:"data"`
		Personalized bool                     `json:"personalized"`
	}{Data: data, Personalized: result.Personalized})
}

var _ EngagementService = (*application.Service)(nil)
