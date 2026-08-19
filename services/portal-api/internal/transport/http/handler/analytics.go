package handler

import (
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
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
func validateMetadata(eventType string, metadataRaw json.RawMessage) ([]byte, error) {
	// First check forbidden strings directly in raw JSON to prevent any nested leaks
	rawStr := string(metadataRaw)
	if strings.Contains(rawStr, `"query"`) || strings.Contains(rawStr, `"q"`) || strings.Contains(rawStr, `"raw_query"`) ||
		strings.Contains(rawStr, `"email"`) || strings.Contains(rawStr, `"username"`) || strings.Contains(rawStr, `"sub"`) ||
		strings.Contains(rawStr, `"token"`) || strings.Contains(rawStr, `"cookie"`) || strings.Contains(rawStr, `"password"`) ||
		strings.Contains(rawStr, `"access_token"`) || strings.Contains(rawStr, `"id_token"`) || strings.Contains(rawStr, `"refresh_token"`) {
		return nil, fmt.Errorf("forbidden metadata keys detected")
	}

	if len(metadataRaw) == 0 || rawStr == "null" {
		metadataRaw = []byte("{}")
	}

	// Strictly decode based on event
	switch {
	case strings.HasPrefix(eventType, "search."):
		type SearchMetadata struct {
			HasQuery    bool   `json:"has_query"`
			ContentType string `json:"content_type,omitempty"`
			ResultID    string `json:"result_id,omitempty"`
		}
		var m SearchMetadata
		dec := json.NewDecoder(strings.NewReader(rawStr))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&m); err != nil {
			return nil, fmt.Errorf("invalid search metadata: %v", err)
		}
		return json.Marshal(m)

	case strings.HasPrefix(eventType, "auth.") || strings.HasPrefix(eventType, "sso."):
		type AuthMetadata struct {
			Result string `json:"result,omitempty"`
		}
		var m AuthMetadata
		dec := json.NewDecoder(strings.NewReader(rawStr))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&m); err != nil {
			return nil, fmt.Errorf("invalid auth metadata: %v", err)
		}
		return json.Marshal(m)

	case strings.HasPrefix(eventType, "content.") || strings.HasPrefix(eventType, "learning.") || strings.HasPrefix(eventType, "engagement."):
		type ContentMetadata struct {
			ContentID string `json:"content_id,omitempty"`
			CourseID  string `json:"course_id,omitempty"`
		}
		var m ContentMetadata
		dec := json.NewDecoder(strings.NewReader(rawStr))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&m); err != nil {
			return nil, fmt.Errorf("invalid content metadata: %v", err)
		}
		return json.Marshal(m)

	case strings.HasSuffix(eventType, "page_view"):
		type PageViewMetadata struct {
			Route       string `json:"route,omitempty"`
			ContentType string `json:"content_type,omitempty"`
		}
		var m PageViewMetadata
		dec := json.NewDecoder(strings.NewReader(rawStr))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&m); err != nil {
			return nil, fmt.Errorf("invalid page_view metadata: %v", err)
		}
		return json.Marshal(m)

	default:
		// Unknown event type metadata should be rejected
		type EmptyMetadata struct{}
		var m EmptyMetadata
		dec := json.NewDecoder(strings.NewReader(rawStr))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&m); err != nil {
			return nil, fmt.Errorf("invalid metadata for this event type: %v", err)
		}
		return json.Marshal(m)
	}
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
			respondAnalyticsProblem(w, http.StatusForbidden, "Forbidden", "Server misconfigured: missing internal secret")
			return
		}

		if subtle.ConstantTimeCompare([]byte(internalToken), []byte(expectedToken)) != 1 {
			respondAnalyticsProblem(w, http.StatusForbidden, "Forbidden", "Internal events require trusted server origin")
			return
		}
	}

	// Request Body Limit
	r.Body = http.MaxBytesReader(w, r.Body, 1024*64) // 64KB max

	type AnalyticsEventRequest struct {
		EventType string          `json:"event_type"`
		URL       string          `json:"url"`
		Referrer  string          `json:"referrer,omitempty"`
		Metadata  json.RawMessage `json:"metadata,omitempty"`
	}

	var req AnalyticsEventRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		if err == io.EOF {
			respondAnalyticsProblem(w, http.StatusBadRequest, "Bad Request", "Empty body")
			return
		}
		respondAnalyticsProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid JSON or unknown fields")
		return
	}

	eventType := req.EventType
	reqURL := req.URL
	referrer := req.Referrer

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
	cleanMetadata, err := validateMetadata(eventType, req.Metadata)
	if err != nil {
		respondAnalyticsProblem(w, http.StatusUnprocessableEntity, "Validation Error", err.Error())
		return
	}

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
	daysStr := r.URL.Query().Get("days")
	days := 30
	if daysStr != "" {
		parsedDays, err := strconv.Atoi(daysStr)
		if err != nil {
			respondAnalyticsProblem(w, http.StatusUnprocessableEntity, "Validation Error", "days must be an integer")
			return
		}
		if parsedDays != 1 && parsedDays != 7 && parsedDays != 30 && parsedDays != 90 && parsedDays != 180 && parsedDays != 365 {
			respondAnalyticsProblem(w, http.StatusUnprocessableEntity, "Validation Error", "days must be 1, 7, 30, 90, 180, or 365")
			return
		}
		days = parsedDays
	}

	sinceDate := time.Now().UTC().AddDate(0, 0, -days).Format("2006-01-02")

	pageStats, err := h.repo.GetPageAnalytics(r.Context(), sinceDate)
	if err != nil {
		respondAnalyticsProblem(w, http.StatusInternalServerError, "Internal Server Error", "Error fetching page stats")
		return
	}

	learningStats, err := h.repo.GetLearningAnalytics(r.Context(), sinceDate)
	if err != nil {
		respondAnalyticsProblem(w, http.StatusInternalServerError, "Internal Server Error", "Error fetching learning stats")
		return
	}

	ssoStats, err := h.repo.GetSSOAnalytics(r.Context(), sinceDate)
	if err != nil {
		respondAnalyticsProblem(w, http.StatusInternalServerError, "Internal Server Error", "Error fetching SSO stats")
		return
	}

	periodUniqueVisitors := -1 // -1 means unavailable due to retention limit
	if days <= 30 {
		endUTC := time.Now().UTC()
		startUTC := endUTC.AddDate(0, 0, -days)
		uv, err := h.repo.GetPeriodUniqueVisitors(r.Context(), startUTC, endUTC)
		if err == nil {
			periodUniqueVisitors = uv
		}
	}

	searchStats, _ := h.repo.GetSearchAnalytics(r.Context(), sinceDate)
	contentStats, _ := h.repo.GetContentAnalytics(r.Context(), sinceDate)
	engagementStats, _ := h.repo.GetEngagementStats(r.Context())

	apiStats := fetchAPIStats()

	type Freshness struct {
		AnalyticsLastRollup  string `json:"analytics_last_rollup"`
		PrometheusObservedAt string `json:"prometheus_observed_at"`
	}

	type StatsResponse struct {
		API                  map[string]interface{}    `json:"api"`
		PageViews            []analytics.PageDaily     `json:"page_views"`
		Learning             []analytics.LearningDaily `json:"learning"`
		SSO                  []analytics.SSODaily      `json:"sso"`
		Search               []analytics.SearchDaily   `json:"search"`
		Content              []analytics.ContentDaily  `json:"content"`
		Engagement           analytics.EngagementStats `json:"engagement"`
		PeriodUniqueVisitors int                       `json:"period_unique_visitors"`
		Freshness            Freshness                 `json:"freshness"`
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(StatsResponse{
		API:                  apiStats,
		PageViews:            pageStats,
		Learning:             learningStats,
		SSO:                  ssoStats,
		Search:               searchStats,
		Content:              contentStats,
		Engagement:           engagementStats,
		PeriodUniqueVisitors: periodUniqueVisitors,
		Freshness: Freshness{
			AnalyticsLastRollup:  time.Now().UTC().Format(time.RFC3339),
			PrometheusObservedAt: time.Now().UTC().Format(time.RFC3339),
		},
	})
}

type PromValue struct {
	Value     string `json:"value"`
	Available bool   `json:"available"`
}

func getPrometheusMetric(query string) PromValue {
	promURL := os.Getenv("PROMETHEUS_INTERNAL_URL")
	if promURL == "" {
		promURL = "http://prometheus:9090"
	}

	req, err := http.NewRequest("GET", promURL+"/api/v1/query", nil)
	if err != nil {
		return PromValue{Available: false}
	}
	q := req.URL.Query()
	q.Add("query", query)
	req.URL.RawQuery = q.Encode()

	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return PromValue{Available: false}
	}
	defer resp.Body.Close()

	var result struct {
		Status string `json:"status"`
		Data   struct {
			Result []struct {
				Value []interface{} `json:"value"`
			} `json:"result"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return PromValue{Available: false}
	}
	if result.Status == "success" && len(result.Data.Result) > 0 {
		if len(result.Data.Result[0].Value) == 2 {
			valStr, _ := result.Data.Result[0].Value[1].(string)
			if valStr == "NaN" || valStr == "+Inf" || valStr == "-Inf" {
				return PromValue{Available: true, Value: "0"}
			}
			return PromValue{Available: true, Value: valStr}
		}
	}
	return PromValue{Available: true, Value: "0"} // Query success but no series -> assume 0 for rates
}

func fetchAPIStats() map[string]interface{} {
	requestRate := getPrometheusMetric(`sum(rate(http_requests_total[5m]))`)
	errorRate := getPrometheusMetric(`sum(rate(http_requests_total{status=~"5.."}[5m])) / (sum(rate(http_requests_total[5m])) > 0) * 100`)
	p50 := getPrometheusMetric(`histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`)
	p95 := getPrometheusMetric(`histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`)
	p99 := getPrometheusMetric(`histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`)
	status2xx := getPrometheusMetric(`sum(rate(http_requests_total{status=~"2.."}[5m]))`)
	status4xx := getPrometheusMetric(`sum(rate(http_requests_total{status=~"4.."}[5m]))`)
	status5xx := getPrometheusMetric(`sum(rate(http_requests_total{status=~"5.."}[5m]))`)

	return map[string]interface{}{
		"request_rate": requestRate,
		"error_rate":   errorRate,
		"p50_latency":  p50,
		"p95_latency":  p95,
		"p99_latency":  p99,
		"status_2xx":   status2xx,
		"status_4xx":   status4xx,
		"status_5xx":   status5xx,
	}
}
