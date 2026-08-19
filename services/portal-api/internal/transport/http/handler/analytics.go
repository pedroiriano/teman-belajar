package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"teman-belajar-api/internal/domain/analytics"
	"teman-belajar-api/internal/observability"

	"github.com/google/uuid"
)

type AnalyticsHandler struct {
	repo analytics.Repository
}

func NewAnalyticsHandler(repo analytics.Repository) *AnalyticsHandler {
	return &AnalyticsHandler{repo: repo}
}

type IngestEventRequest struct {
	EventType string          `json:"event_type"`
	URL       string          `json:"url"`
	Referrer  string          `json:"referrer"`
	Metadata  json.RawMessage `json:"metadata"`
}

func (h *AnalyticsHandler) HandleIngest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req IngestEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	if strings.Contains(req.URL, "<") || strings.Contains(req.URL, "%3C") || strings.Contains(req.URL, ">") || strings.Contains(req.URL, "%3E") {
		http.Error(w, "Invalid URL payload", http.StatusBadRequest)
		return
	}

	visitorCookie, err := r.Cookie("analytics_visitor_id")
	var visitorID uuid.UUID
	if err != nil || visitorCookie.Value == "" {
		visitorID = uuid.New()
		http.SetCookie(w, &http.Cookie{
			Name:     "analytics_visitor_id",
			Value:    visitorID.String(),
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   31536000,
		})
	} else {
		visitorID, err = uuid.Parse(visitorCookie.Value)
		if err != nil {
			visitorID = uuid.New()
		}
	}

	event := &analytics.Event{
		ID:        uuid.New(),
		VisitorID: visitorID,
		EventType: req.EventType,
		URL:       req.URL,
		Referrer:  req.Referrer,
		UserAgent: r.UserAgent(),
		Metadata:  req.Metadata,
		CreatedAt: time.Now(),
	}

	if err := h.repo.InsertEvent(r.Context(), event); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if len(req.EventType) > 4 && req.EventType[:4] == "sso." {
		observability.RecordSSOEvent(req.EventType, "success")
	}

	w.WriteHeader(http.StatusAccepted)
}

func (h *AnalyticsHandler) HandleGetStatistics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Assuming authorization is handled by middleware
	daysStr := r.URL.Query().Get("days")
	days := 30
	if daysStr != "" {
		if parsedDays, err := strconv.Atoi(daysStr); err == nil && parsedDays > 0 {
			days = parsedDays
		}
	}
	since := time.Now().AddDate(0, 0, -days)
	
	pageStats, err := h.repo.GetPageAnalytics(r.Context(), since)
	if err != nil {
		http.Error(w, "Error fetching page stats", http.StatusInternalServerError)
		return
	}

	learningStats, err := h.repo.GetLearningAnalytics(r.Context(), since)
	if err != nil {
		http.Error(w, "Error fetching learning stats", http.StatusInternalServerError)
		return
	}

	ssoStats, err := h.repo.GetSSOAnalytics(r.Context(), since)
	if err != nil {
		http.Error(w, "Error fetching SSO stats", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"page_views": pageStats,
		"learning":   learningStats,
		"sso":        ssoStats,
	})
}


