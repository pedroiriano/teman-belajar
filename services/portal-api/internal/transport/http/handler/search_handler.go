package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"teman-belajar-api/internal/domain/search"
)

type SearchHandler struct {
	provider search.SearchProvider
}

func NewSearchHandler(provider search.SearchProvider) *SearchHandler {
	return &SearchHandler{
		provider: provider,
	}
}

func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		w.Header().Set("Content-Type", "application/problem+json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"type":   "https://temanbelajar.com/errors/bad-request",
			"title":  "Bad Request",
			"status": 400,
			"detail": "Missing required query parameter: q",
		})
		return
	}

	query := search.SearchQuery{
		Query:  q,
		Type:   r.URL.Query().Get("type"),
		Limit:  10,
		Offset: 0,
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			query.Limit = limit
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			query.Offset = offset
		}
	}

	result, err := h.provider.Search(r.Context(), query)
	if err != nil {
		w.Header().Set("Content-Type", "application/problem+json")
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"type":   "https://temanbelajar.com/errors/service-unavailable",
			"title":  "Service Unavailable",
			"status": 503,
			"detail": "Search service is currently unavailable",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": result,
	})
}
