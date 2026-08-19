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

	apiStats := fetchAPIStats()

	type Freshness struct {
		AnalyticsLastRollup string `json:"analytics_last_rollup"`
		PrometheusObservedAt string `json:"prometheus_observed_at"`
	}

	type StatsResponse struct {
		API        map[string]interface{} `json:"api"`
		PageViews  []analytics.PageDaily  `json:"page_views"`
		Learning   []analytics.LearningDaily `json:"learning"`
		SSO        []analytics.SSODaily   `json:"sso"`
		PeriodUniqueVisitors int `json:"period_unique_visitors"`
		Freshness  Freshness `json:"freshness"`
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(StatsResponse{
		API: apiStats,
		PageViews: pageStats,
		Learning: learningStats,
		SSO: ssoStats,
		PeriodUniqueVisitors: periodUniqueVisitors,
		Freshness: Freshness{
			AnalyticsLastRollup: time.Now().UTC().Format(time.RFC3339),
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
		"error_rate": errorRate,
		"p50_latency": p50,
		"p95_latency": p95,
		"p99_latency": p99,
		"status_2xx": status2xx,
		"status_4xx": status4xx,
		"status_5xx": status5xx,
	}
}
