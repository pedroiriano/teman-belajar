import re

analytics_file = 'services/portal-api/internal/transport/http/handler/analytics.go'
with open(analytics_file, 'r') as f:
    data = f.read()

# Replace the StatsResponse struct correctly
struct_match = r'type StatsResponse struct \{[\s\S]*?\}'
new_struct = """type StatsResponse struct {
		API        map[string]interface{} `json:"api"`
		PageViews  []analytics.PageDaily  `json:"page_views"`
		Learning   []analytics.LearningDaily `json:"learning"`
		SSO        []analytics.SSODaily   `json:"sso"`
		Search     []analytics.SearchDaily `json:"search"`
		Content    []analytics.ContentDaily `json:"content"`
		Engagement analytics.EngagementStats `json:"engagement"`
		PeriodUniqueVisitors int `json:"period_unique_visitors"`
		Freshness  Freshness `json:"freshness"`
	}"""
data = re.sub(struct_match, new_struct, data, count=1)

# Replace the fetches correctly
fetch_old = "periodUniqueVisitors := -1 // -1 means unavailable due to retention limit"
fetch_new = """searchStats, _ := h.repo.GetSearchAnalytics(r.Context(), sinceDate)
	contentStats, _ := h.repo.GetContentAnalytics(r.Context(), sinceDate)
	engagementStats, _ := h.repo.GetEngagementStats(r.Context())

	periodUniqueVisitors := -1 // -1 means unavailable due to retention limit"""
data = data.replace(fetch_old, fetch_new)

# Replace the JSON encoding safely
json_old = """json.NewEncoder(w).Encode(StatsResponse{
		API: apiStats,
		PageViews: pageStats,
		Learning: learningStats,
		SSO: ssoStats,
		PeriodUniqueVisitors: periodUniqueVisitors,"""
json_new = """json.NewEncoder(w).Encode(StatsResponse{
		API: apiStats,
		PageViews: pageStats,
		Learning: learningStats,
		SSO: ssoStats,
		Search: searchStats,
		Content: contentStats,
		Engagement: engagementStats,
		PeriodUniqueVisitors: periodUniqueVisitors,"""
data = data.replace(json_old, json_new)

with open(analytics_file, 'w') as f:
    f.write(data)

print("done handler 2")
