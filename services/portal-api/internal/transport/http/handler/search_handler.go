package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	applicationsearch "teman-belajar-api/internal/application/search"
	domainsearch "teman-belajar-api/internal/domain/search"
)

// SearchHandler intentionally holds the concrete application service so the
// transport cannot bypass validation and call the engine adapter directly.
type SearchHandler struct {
	service *applicationsearch.Service
}

func NewSearchHandler(service *applicationsearch.Service) *SearchHandler {
	return &SearchHandler{service: service}
}

func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	allowed := map[string]bool{"q": true, "content_type": true, "category_id": true, "tag": true, "page": true, "page_size": true, "sort": true}
	for key := range r.URL.Query() {
		if !allowed[key] {
			searchProblem(w, http.StatusUnprocessableEntity, "Parameter pencarian tidak valid", "Parameter yang tidak dikenal tidak diizinkan.", key)
			return
		}
	}

	page, ok := parseSearchInt(r, "page", 1)
	if !ok {
		searchProblem(w, http.StatusUnprocessableEntity, "Parameter pencarian tidak valid", "page harus berupa bilangan bulat.", "page")
		return
	}
	pageSize, ok := parseSearchInt(r, "page_size", 20)
	if !ok {
		searchProblem(w, http.StatusUnprocessableEntity, "Parameter pencarian tidak valid", "page_size harus berupa bilangan bulat.", "page_size")
		return
	}

	result, err := h.service.Search(r.Context(), domainsearch.Query{
		Text: r.URL.Query().Get("q"), ContentType: domainsearch.ContentType(r.URL.Query().Get("content_type")),
		CategoryID: r.URL.Query().Get("category_id"), Tag: r.URL.Query().Get("tag"),
		Page: page, PageSize: pageSize, Sort: domainsearch.Sort(r.URL.Query().Get("sort")),
	})
	if err != nil {
		if errors.Is(err, applicationsearch.ErrInvalidQuery) {
			field := "query"
			var validation *applicationsearch.ValidationError
			if errors.As(err, &validation) {
				field = validation.Field
			}
			searchProblem(w, http.StatusUnprocessableEntity, "Parameter pencarian tidak valid", err.Error(), field)
			return
		}
		searchProblem(w, http.StatusServiceUnavailable, "Pencarian tidak tersedia", "Layanan pencarian sedang tidak tersedia. Coba kembali beberapa saat lagi.", "")
		return
	}

	totalPages := 0
	if result.Total > 0 {
		totalPages = (result.Total + pageSize - 1) / pageSize
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"data":       result.Hits,
		"pagination": map[string]int{"page": page, "page_size": pageSize, "total": result.Total, "total_pages": totalPages},
	})
}

func parseSearchInt(r *http.Request, name string, fallback int) (int, bool) {
	value := r.URL.Query().Get(name)
	if value == "" {
		return fallback, true
	}
	parsed, err := strconv.Atoi(value)
	return parsed, err == nil
}

func searchProblem(w http.ResponseWriter, status int, title, detail, field string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	payload := map[string]any{
		"type": "https://teman-belajar.invalid/problems/search", "title": title, "status": status, "detail": detail,
	}
	if field != "" {
		payload["errors"] = []map[string]string{{"field": field, "message": detail}}
	}
	_ = json.NewEncoder(w).Encode(payload)
}
