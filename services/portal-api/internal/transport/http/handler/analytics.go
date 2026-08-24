package handler

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
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
	repo           analytics.Repository
	learningSource analytics.LearningAnalyticsSource
}

func NewAnalyticsHandler(repo analytics.Repository, learningSource analytics.LearningAnalyticsSource) *AnalyticsHandler {
	return &AnalyticsHandler{repo: repo, learningSource: learningSource}
}

type SourceState struct {
	Status     string     `json:"status"`
	ObservedAt *time.Time `json:"observed_at"`
	Reason     string     `json:"reason,omitempty"`
}

type SourceStates struct {
	Analytics  SourceState `json:"analytics"`
	Moodle     SourceState `json:"moodle"`
	Prometheus SourceState `json:"prometheus"`
}

type PromValue struct {
	Value      *float64   `json:"value"`
	Available  bool       `json:"available"`
	Reason     string     `json:"reason,omitempty"`
	ObservedAt *time.Time `json:"observed_at"`
}

type APIStats struct {
	RequestRate  PromValue   `json:"request_rate"`
	Status2xx    PromValue   `json:"status_2xx"`
	Status3xx    PromValue   `json:"status_3xx"`
	Status4xx    PromValue   `json:"status_4xx"`
	Status5xx    PromValue   `json:"status_5xx"`
	ErrorRate    PromValue   `json:"error_rate"`
	P50Latency   PromValue   `json:"p50_latency"`
	P95Latency   PromValue   `json:"p95_latency"`
	P99Latency   PromValue   `json:"p99_latency"`
	Availability PromValue   `json:"availability"`
	Source       SourceState `json:"source"`
}

type PeriodUniqueVisitors struct {
	Value     *int   `json:"value"`
	Available bool   `json:"available"`
	Reason    string `json:"reason,omitempty"`
}

// Problem Details helper
func respondAnalyticsProblem(w http.ResponseWriter, status int, title, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
		"type":   "about:blank",
		"title":  title,
		"status": status,
		"detail": detail,
	})
}

// Allowed Events
var allowedEvents = map[string]bool{
	"portal.page_view":       true,
	"admin.page_view":        true,
	"search.executed":        true,
	"search.zero_result":     true,
	"search.result_clicked":  true,
	"content.viewed":         true,
	"engagement.bookmark":    true,
	"engagement.rating":      true,
	"engagement.recent_view": true,
	"learning.course_access": true,
}

var ssoEvents = map[string]bool{
	"auth.login":         true,
	"auth.logout":        true,
	"auth.silent_sso":    true,
	"auth.authorization": true,
	"auth.oidc_callback": true,
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

	if len(metadataRaw) == 0 || string(metadataRaw) == "{}" || string(metadataRaw) == "null" {
		if eventType == "auth.login" || eventType == "auth.logout" {
			return nil, fmt.Errorf("auth result is required")
		}
		if eventType == "content.viewed" {
			return nil, fmt.Errorf("content metadata is required")
		}
		return []byte("{}"), nil
	}

	switch {
	case eventType == "search.executed" || eventType == "search.zero_result" || eventType == "search.result_clicked":
		type SearchMetadata struct {
			Filters map[string]string `json:"filters,omitempty"`
			Count   int               `json:"count,omitempty"`
		}
		var m SearchMetadata
		dec := json.NewDecoder(strings.NewReader(rawStr))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&m); err != nil {
			return nil, fmt.Errorf("invalid search metadata: %v", err)
		}
		return json.Marshal(m)

	case eventType == "content.viewed":
		type ContentMetadata struct {
			ContentType string `json:"content_type"`
			TargetID    string `json:"target_id"`
		}
		var m ContentMetadata
		dec := json.NewDecoder(strings.NewReader(rawStr))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&m); err != nil {
			return nil, fmt.Errorf("invalid content metadata: %v", err)
		}
		if m.ContentType != "knowledge" && m.ContentType != "news" && m.ContentType != "announcement" {
			return nil, fmt.Errorf("content_type must be knowledge, news, or announcement")
		}
		m.TargetID = strings.TrimSpace(m.TargetID)
		if m.TargetID == "" || len(m.TargetID) > 255 {
			return nil, fmt.Errorf("target_id must contain 1 to 255 characters")
		}
		return json.Marshal(m)

	case strings.HasPrefix(eventType, "auth."):
		type AuthMetadata struct {
			Result string `json:"result,omitempty"`
		}
		var m AuthMetadata
		dec := json.NewDecoder(strings.NewReader(rawStr))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&m); err != nil {
			return nil, fmt.Errorf("invalid auth metadata: %v", err)
		}
		if eventType == "auth.login" || eventType == "auth.logout" {
			if m.Result != "success" && m.Result != "failure" {
				return nil, fmt.Errorf("auth result must be success or failure")
			}
		} else if m.Result != "" && m.Result != "success" && m.Result != "failure" {
			return nil, fmt.Errorf("auth result must be success or failure when supplied")
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
			// #nosec G124 -- Secure is mandatory in production; governed local
			// development intentionally runs on loopback HTTP. HttpOnly and
			// SameSite=Lax remain enforced in both environments.
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
		if eventType == "auth.login" || eventType == "auth.logout" {
			var metadata struct {
				Result string `json:"result"`
			}
			if err := json.Unmarshal(cleanMetadata, &metadata); err != nil {
				respondAnalyticsProblem(w, http.StatusInternalServerError, "Internal Server Error", "Validated auth metadata could not be recorded")
				return
			}
			status = metadata.Result
		} else if eventType == "sso.login_failed" {
			status = "failure"
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

	now := time.Now().UTC()
	endDate := now.Format("2006-01-02")
	startDate := now.AddDate(0, 0, -(days - 1)).Format("2006-01-02")

	workerState, workerStateErr := h.repo.GetWorkerState(r.Context())
	sources := SourceStates{
		Analytics: sourceState(workerState.LastRollupSuccessAt, now),
		Moodle:    sourceState(workerState.LastMoodleSyncSuccessAt, now),
	}
	if workerStateErr != nil {
		sources.Analytics = unavailableSource("worker_state_query_failed")
		sources.Moodle = unavailableSource("worker_state_query_failed")
	}

	pageStats, pageErr := h.repo.GetPageAnalytics(r.Context(), startDate)
	learningStats, learningErr := h.repo.GetLearningAnalytics(r.Context(), startDate)
	ssoStats, ssoErr := h.repo.GetSSOAnalytics(r.Context(), startDate)
	searchStats, searchErr := h.repo.GetSearchAnalytics(r.Context(), startDate)
	contentStats, contentErr := h.repo.GetContentAnalytics(r.Context(), startDate)
	engagementStats, engagementErr := h.repo.GetEngagementStats(r.Context())
	var engagement *analytics.EngagementStats
	if engagementErr == nil {
		engagement = &engagementStats
	}

	if pageErr != nil || ssoErr != nil || searchErr != nil || contentErr != nil || engagementErr != nil {
		sources.Analytics = unavailableSource("analytics_query_failed")
	}
	if learningErr != nil {
		sources.Moodle = unavailableSource("learning_snapshot_query_failed")
	}

	periodVisitors := PeriodUniqueVisitors{Available: false, Reason: "retention_limit"}
	if days <= 30 {
		endUTC := now
		startUTC := now.AddDate(0, 0, -days)
		value, err := h.repo.GetPeriodUniqueVisitors(r.Context(), startUTC, endUTC)
		if err != nil {
			periodVisitors.Reason = "analytics_query_failed"
			sources.Analytics = unavailableSource("analytics_query_failed")
		} else {
			periodVisitors.Value = &value
			periodVisitors.Available = true
			periodVisitors.Reason = ""
		}
	}

	var periodLearning *analytics.PeriodLearningStats
	if h.learningSource == nil {
		sources.Moodle = unavailableSource("learning_source_not_configured")
	} else {
		var learningSourceErr error
		periodLearning, learningSourceErr = h.learningSource.GetLearningAnalytics(r.Context(), startDate, endDate)
		if learningSourceErr != nil {
			sources.Moodle = unavailableSource("moodle_query_failed")
		}
	}

	apiStats := fetchAPIStats(r.Context())
	sources.Prometheus = apiStats.Source

	type StatsResponse struct {
		API                  APIStats                       `json:"api"`
		PageViews            []analytics.PageDaily          `json:"page_views"`
		Learning             []analytics.LearningDaily      `json:"learning"`
		LearningPeriod       *analytics.PeriodLearningStats `json:"learning_period"`
		SSO                  []analytics.SSODaily           `json:"sso"`
		Search               []analytics.SearchDaily        `json:"search"`
		Content              []analytics.ContentDaily       `json:"content"`
		Engagement           *analytics.EngagementStats     `json:"engagement"`
		EngagementScope      string                         `json:"engagement_scope"`
		PeriodUniqueVisitors PeriodUniqueVisitors           `json:"period_unique_visitors"`
		Sources              SourceStates                   `json:"sources"`
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(StatsResponse{
		API:                  apiStats,
		PageViews:            pageStats,
		Learning:             learningStats,
		LearningPeriod:       periodLearning,
		SSO:                  ssoStats,
		Search:               searchStats,
		Content:              contentStats,
		Engagement:           engagement,
		EngagementScope:      "all_time_current_state",
		PeriodUniqueVisitors: periodVisitors,
		Sources:              sources,
	}); err != nil {
		return
	}
}

func sourceState(observedAt *time.Time, now time.Time) SourceState {
	if observedAt == nil {
		return SourceState{Status: "empty", ObservedAt: nil, Reason: "no_success_recorded"}
	}
	observedUTC := observedAt.UTC()
	status := "fresh"
	if now.Sub(observedUTC) > 15*time.Minute {
		status = "stale"
	}
	return SourceState{Status: status, ObservedAt: &observedUTC}
}

func unavailableSource(reason string) SourceState {
	return SourceState{Status: "unavailable", ObservedAt: nil, Reason: reason}
}

func validatePrometheusURL(rawURL string) (*url.URL, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Scheme != "http" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return nil, errors.New("invalid Prometheus URL")
	}
	host := parsed.Hostname()
	if host != "prometheus" && host != "localhost" && host != "127.0.0.1" && host != "::1" {
		return nil, errors.New("Prometheus host is not an approved internal endpoint")
	}
	parsed.Path = strings.TrimRight(parsed.Path, "/")
	return parsed, nil
}

func getPrometheusMetric(ctx context.Context, client *http.Client, promURL *url.URL, query string) PromValue {
	queryURL := *promURL
	queryURL.Path = strings.TrimRight(queryURL.Path, "/") + "/api/v1/query"
	// #nosec G704 -- promURL is restricted to the internal Prometheus or
	// loopback allowlist by validatePrometheusURL before URL construction.
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, queryURL.String(), nil)
	if err != nil {
		return PromValue{Available: false, Reason: "invalid_request"}
	}
	q := req.URL.Query()
	q.Add("query", query)
	req.URL.RawQuery = q.Encode()

	// #nosec G704 -- promURL is restricted to the internal Prometheus or
	// loopback allowlist by validatePrometheusURL before this request.
	resp, err := client.Do(req)
	if err != nil {
		return PromValue{Available: false, Reason: "unavailable"}
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return PromValue{Available: false, Reason: "unavailable"}
	}

	var result struct {
		Status string `json:"status"`
		Data   struct {
			Result []struct {
				Value []json.RawMessage `json:"value"`
			} `json:"result"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return PromValue{Available: false, Reason: "invalid_response"}
	}
	if result.Status != "success" {
		return PromValue{Available: false, Reason: "unavailable"}
	}
	if len(result.Data.Result) == 0 {
		return PromValue{Available: false, Reason: "no_data"}
	}
	if len(result.Data.Result[0].Value) != 2 {
		return PromValue{Available: false, Reason: "invalid_response"}
	}

	var sampleTimestamp float64
	var valueText string
	if err := json.Unmarshal(result.Data.Result[0].Value[0], &sampleTimestamp); err != nil {
		return PromValue{Available: false, Reason: "invalid_response"}
	}
	if err := json.Unmarshal(result.Data.Result[0].Value[1], &valueText); err != nil {
		return PromValue{Available: false, Reason: "invalid_response"}
	}
	value, err := strconv.ParseFloat(valueText, 64)
	if err != nil || math.IsNaN(value) || math.IsInf(value, 0) {
		return PromValue{Available: false, Reason: "invalid_value"}
	}
	observedAt := time.Unix(0, int64(sampleTimestamp*float64(time.Second))).UTC()
	return PromValue{Available: true, Value: &value, ObservedAt: &observedAt}
}

func fetchAPIStats(ctx context.Context) APIStats {
	promURL := os.Getenv("PROMETHEUS_INTERNAL_URL")
	if promURL == "" {
		promURL = "http://prometheus:9090"
	}
	validatedURL, err := validatePrometheusURL(promURL)
	if err != nil {
		return unavailableAPIStats("invalid_request")
	}
	client := &http.Client{Timeout: 2 * time.Second}
	stats := APIStats{
		RequestRate:  getPrometheusMetric(ctx, client, validatedURL, `sum(rate(http_requests_total[5m]))`),
		Status2xx:    getPrometheusMetric(ctx, client, validatedURL, `sum(rate(http_requests_total{status=~"2.."}[5m]))`),
		Status3xx:    getPrometheusMetric(ctx, client, validatedURL, `sum(rate(http_requests_total{status=~"3.."}[5m]))`),
		Status4xx:    getPrometheusMetric(ctx, client, validatedURL, `sum(rate(http_requests_total{status=~"4.."}[5m]))`),
		Status5xx:    getPrometheusMetric(ctx, client, validatedURL, `sum(rate(http_requests_total{status=~"5.."}[5m]))`),
		ErrorRate:    getPrometheusMetric(ctx, client, validatedURL, `100 * sum(rate(http_requests_total{status=~"5.."}[5m])) / clamp_min(sum(rate(http_requests_total[5m])), 0.000000001)`),
		P50Latency:   getPrometheusMetric(ctx, client, validatedURL, `histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`),
		P95Latency:   getPrometheusMetric(ctx, client, validatedURL, `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`),
		P99Latency:   getPrometheusMetric(ctx, client, validatedURL, `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`),
		Availability: getPrometheusMetric(ctx, client, validatedURL, `100 * avg_over_time(up{job="teman-belajar-api"}[5m])`),
	}

	values := []PromValue{
		stats.RequestRate, stats.Status2xx, stats.Status3xx, stats.Status4xx, stats.Status5xx,
		stats.ErrorRate, stats.P50Latency, stats.P95Latency, stats.P99Latency, stats.Availability,
	}
	available := 0
	noData := 0
	var latest *time.Time
	for _, value := range values {
		if value.Available {
			available++
			if value.ObservedAt != nil && (latest == nil || value.ObservedAt.After(*latest)) {
				observed := *value.ObservedAt
				latest = &observed
			}
		} else if value.Reason == "no_data" {
			noData++
		}
	}
	switch {
	case available == len(values):
		stats.Source = SourceState{Status: "fresh", ObservedAt: latest}
	case noData == len(values):
		stats.Source = SourceState{Status: "empty", ObservedAt: nil, Reason: "no_data"}
	default:
		stats.Source = SourceState{Status: "unavailable", ObservedAt: latest, Reason: "partial_or_failed_queries"}
	}
	return stats
}

func unavailableAPIStats(reason string) APIStats {
	value := PromValue{Available: false, Reason: reason}
	return APIStats{
		RequestRate: value, Status2xx: value, Status3xx: value, Status4xx: value, Status5xx: value,
		ErrorRate: value, P50Latency: value, P95Latency: value, P99Latency: value, Availability: value,
		Source: unavailableSource(reason),
	}
}
