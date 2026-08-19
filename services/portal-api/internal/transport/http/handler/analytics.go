package handler

import (
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
	"fmt"
	"io"

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

// Problem Details helper
func respondAnalyticsProblem(w http.ResponseWriter, status int, title, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"type":   "about:blank",
		"title":  title,
		"status": status,
		"detail": detail,
	})
}

// Allowed Events
var allowedEvents = map[string]bool{
	"portal.page_view":          true,
	"admin.page_view":           true,
	"search.executed":           true,
	"search.zero_result":        true,
	"search.result_clicked":     true,
	"content.knowledge_view":    true,
	"content.news_view":         true,
	"content.announcement_view": true,
	"engagement.bookmark":       true,
	"engagement.rating":         true,
	"engagement.recent_view":    true,
	"learning.course_access":    true,
}

var ssoEvents = map[string]bool{
	"sso.login_success": true,
	"sso.login_failed":  true,
	"sso.logout":        true,
	"auth.silent_sso":   true,
}

// Event Metadata Validation
func validateMetadata(eventType string, metadata map[string]interface{}) error {
	// Reject explicitly forbidden keys globally
	forbidden := []string{"query", "q", "raw_query", "email", "username", "sub", "token", "cookie"}
	for _, f := range forbidden {
		if _, exists := metadata[f]; exists {
			return fmt.Errorf("forbidden metadata key: %s", f)
		}
	}

	switch eventType {
	case "portal.page_view", "admin.page_view":
		// optional: route, content_type
	case "search.executed", "search.zero_result":
		// required: has_query, content_type
		if _, ok := metadata["has_query"]; !ok {
			return fmt.Errorf("missing has_query")
		}
	case "sso.login_success", "sso.login_failed", "sso.logout", "auth.silent_sso":
		// allow empty or specific
	}
	return nil
}

func normalizeURL(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "/"
	}
	return u.Path
}

func normalizeReferrer(rawReferrer string) string {
	u, err := url.Parse(rawReferrer)
	if err != nil || u.Host == "" {
		return "direct"
	}
	return u.Host
}

func classifyUserAgent(ua string) string {
	uaLower := strings.ToLower(ua)
	if strings.Contains(uaLower, "bot") || strings.Contains(uaLower, "spider") || strings.Contains(uaLower, "crawler") {
		return "bot"
	}
	if ua == "" {
		return "unknown"
	}
	return "human"
}

func (h *AnalyticsHandler) handleIngestCore(w http.ResponseWriter, r *http.Request, isInternal bool) {
	if r.Method != http.MethodPost {
		respondAnalyticsProblem(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use POST")
		return
	}
	
	if !isInternal {
		// Same-Origin / Origin Validation for public events
		origin := r.Header.Get("Origin")
		if origin != "" {
			allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
			if allowedOrigins != "" {
				valid := false
				for _, ao := range strings.Split(allowedOrigins, ",") {
					if origin == strings.TrimSpace(ao) {
						valid = true
						break
					}
				}
				if !valid {
					respondAnalyticsProblem(w, http.StatusForbidden, "Forbidden", "Origin not allowed")
					return
				}
			}
		}
	} else {
		// Internal token validation for internal events
		internalToken := r.Header.Get("X-Internal-Token")
		expectedToken := os.Getenv("PORTAL_INTERNAL_SECRET")
		if expectedToken == "" {
			expectedToken = "default_internal_secret"
		}
		if internalToken != expectedToken {
			respondAnalyticsProblem(w, http.StatusForbidden, "Forbidden", "Internal events require trusted server origin")
			return
		}
	}

	// Request Body Limit
	r.Body = http.MaxBytesReader(w, r.Body, 1024*64) // 64KB max

	var rawMap map[string]interface{}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&rawMap); err != nil {
		if err == io.EOF {
			respondAnalyticsProblem(w, http.StatusBadRequest, "Bad Request", "Empty body")
			return
		}
		respondAnalyticsProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid JSON or unknown fields")
		return
	}

	eventType, _ := rawMap["event_type"].(string)
	reqURL, _ := rawMap["url"].(string)
	referrer, _ := rawMap["referrer"].(string)
	
	var metaMap map[string]interface{}
	if m, ok := rawMap["metadata"].(map[string]interface{}); ok {
		metaMap = m
	} else {
		metaMap = make(map[string]interface{})
	}

	// Validate Event Type
	isSSO := ssoEvents[eventType]
	isAllowed := allowedEvents[eventType]

	if isInternal {
		if !isSSO {
			respondAnalyticsProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Endpoint only accepts SSO/internal events")
			return
		}
	} else {
		if !isAllowed {
			respondAnalyticsProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Endpoint only accepts public events")
			return
		}
	}

	// Validate Metadata Schema
	if err := validateMetadata(eventType, metaMap); err != nil {
		respondAnalyticsProblem(w, http.StatusUnprocessableEntity, "Validation Error", err.Error())
		return
	}
	cleanMetadata, _ := json.Marshal(metaMap)

	// Visitor ID logic
	var visitorIDPtr *uuid.UUID
	if !isSSO {
		visitorCookie, err := r.Cookie("analytics_visitor_id")
		isSecure := os.Getenv("NODE_ENV") == "production"
		needsNewCookie := false

		var visitorID uuid.UUID
		if err != nil || visitorCookie.Value == "" {
			needsNewCookie = true
		} else {
			visitorID, err = uuid.Parse(visitorCookie.Value)
			if err != nil {
				needsNewCookie = true
			}
		}

		if needsNewCookie {
			visitorID = uuid.New()
			http.SetCookie(w, &http.Cookie{
				Name:     "analytics_visitor_id",
				Value:    visitorID.String(),
				Path:     "/",
				HttpOnly: true,
				Secure:   isSecure,
				SameSite: http.SameSiteLaxMode,
				MaxAge:   30 * 24 * 60 * 60, // 30 days
			})
		}
		visitorIDPtr = &visitorID
	}

	event := &analytics.Event{
		ID:        uuid.New(),
		VisitorID: visitorIDPtr,
		EventType: eventType,
		URL:       normalizeURL(reqURL),
		Referrer:  normalizeReferrer(referrer),
		UserAgent: classifyUserAgent(r.UserAgent()),
		Metadata:  cleanMetadata,
		CreatedAt: time.Now(),
	}

	if err := h.repo.InsertEvent(r.Context(), event); err != nil {
		respondAnalyticsProblem(w, http.StatusInternalServerError, "Internal Server Error", "Database failure")
		return
	}

	if isSSO {
		status := "success"
		if strings.Contains(eventType, "failed") {
			status = "failure"
		} else if strings.Contains(eventType, "logout") {
			status = "logout"
		}
		observability.RecordSSOEvent(eventType, status)
	}

	w.WriteHeader(http.StatusAccepted)
}

func (h *AnalyticsHandler) HandlePublicIngest(w http.ResponseWriter, r *http.Request) {
	h.handleIngestCore(w, r, false)
}

func (h *AnalyticsHandler) HandleInternalIngest(w http.ResponseWriter, r *http.Request) {
	h.handleIngestCore(w, r, true)
}

func (h *AnalyticsHandler) HandleGetStatistics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondAnalyticsProblem(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Use GET")
		return
	}

	daysStr := r.URL.Query().Get("days")
	days := 30
	if daysStr != "" {
		parsedDays, err := strconv.Atoi(daysStr)
		if err != nil {
			respondAnalyticsProblem(w, http.StatusUnprocessableEntity, "Validation Error", "days must be an integer")
			return
		}
		// Bound days
		if parsedDays != 1 && parsedDays != 7 && parsedDays != 30 && parsedDays != 90 && parsedDays != 180 && parsedDays != 365 {
			respondAnalyticsProblem(w, http.StatusUnprocessableEntity, "Validation Error", "days must be 1, 7, 30, 90, 180, or 365")
			return
		}
		days = parsedDays
	}
	since := time.Now().AddDate(0, 0, -days)
	
	pageStats, err := h.repo.GetPageAnalytics(r.Context(), since)
	if err != nil {
		respondAnalyticsProblem(w, http.StatusInternalServerError, "Internal Server Error", "Error fetching page stats")
		return
	}

	learningStats, err := h.repo.GetLearningAnalytics(r.Context(), since)
	if err != nil {
		respondAnalyticsProblem(w, http.StatusInternalServerError, "Internal Server Error", "Error fetching learning stats")
		return
	}

	ssoStats, err := h.repo.GetSSOAnalytics(r.Context(), since)
	if err != nil {
		respondAnalyticsProblem(w, http.StatusInternalServerError, "Internal Server Error", "Error fetching SSO stats")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	apiStats := fetchAPIStats()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"api":        apiStats,
		"page_views": pageStats,
		"learning":   learningStats,
		"sso":        ssoStats,
	})
}

type PromResult struct {
	Status string `json:"status"`
	Data   struct {
		Result []struct {
			Value []interface{} `json:"value"`
		} `json:"result"`
	} `json:"data"`
}

func getPrometheusMetric(query string) string {
	promURL := os.Getenv("PROMETHEUS_INTERNAL_URL")
	if promURL == "" {
		promURL = "http://prometheus:9090"
	}
	req, err := http.NewRequest("GET", promURL+"/api/v1/query", nil)
	if err != nil {
		return "Tidak tersedia"
	}
	q := req.URL.Query()
	q.Add("query", query)
	req.URL.RawQuery = q.Encode()
	
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "Tidak tersedia"
	}
	defer resp.Body.Close()

	var result PromResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "Tidak tersedia"
	}
	if result.Status == "success" && len(result.Data.Result) > 0 {
		if len(result.Data.Result[0].Value) == 2 {
			valStr, _ := result.Data.Result[0].Value[1].(string)
			return valStr
		}
	}
	return "0"
}

func fetchAPIStats() map[string]interface{} {
	requests := getPrometheusMetric(`sum(http_requests_total)`)
	errorRate := getPrometheusMetric(`sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100`)
	latency := getPrometheusMetric(`histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`)
	
	return map[string]interface{}{
		"total_requests": requests,
		"error_rate": errorRate,
		"p95_latency": latency,
	}
}
