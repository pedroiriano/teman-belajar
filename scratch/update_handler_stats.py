import re
import os

analytics_file = 'services/portal-api/internal/transport/http/handler/analytics.go'
with open(analytics_file, 'r') as f:
    data = f.read()

# Update StatsResponse struct
new_stats = """
	type StatsResponse struct {
		API        map[string]interface{} `json:"api"`
		PageViews  []analytics.PageDaily  `json:"page_views"`
		Learning   []analytics.LearningDaily `json:"learning"`
		SSO        []analytics.SSODaily   `json:"sso"`
		Search     []analytics.SearchDaily `json:"search"`
		Content    []analytics.ContentDaily `json:"content"`
		Engagement analytics.EngagementStats `json:"engagement"`
		PeriodUniqueVisitors int `json:"period_unique_visitors"`
		Freshness  Freshness `json:"freshness"`
	}
"""
data = re.sub(r'type StatsResponse struct \{[^}]+\}', new_stats, data)

# Fetch stats and put them in JSON response
fetch_block = """
	searchStats, _ := h.repo.GetSearchAnalytics(r.Context(), sinceDate)
	contentStats, _ := h.repo.GetContentAnalytics(r.Context(), sinceDate)
	engagementStats, _ := h.repo.GetEngagementStats(r.Context())

	periodUniqueVisitors := -1 // -1 means unavailable due to retention limit
"""
data = data.replace('periodUniqueVisitors := -1 // -1 means unavailable due to retention limit', fetch_block)

response_block = """
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(StatsResponse{
		API: apiStats,
		PageViews: pageStats,
		Learning: learningStats,
		SSO: ssoStats,
		Search: searchStats,
		Content: contentStats,
		Engagement: engagementStats,
		PeriodUniqueVisitors: periodUniqueVisitors,
"""
data = data.replace('json.NewEncoder(w).Encode(StatsResponse{\n\t\tAPI: apiStats,\n\t\tPageViews: pageStats,\n\t\tLearning: learningStats,\n\t\tSSO: ssoStats,\n\t\tPeriodUniqueVisitors: periodUniqueVisitors,', response_block.strip())

with open(analytics_file, 'w') as f:
    f.write(data)

print("done handler")
