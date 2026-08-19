import re
import os

# Update model.go
model_file = 'services/portal-api/internal/domain/analytics/model.go'
with open(model_file, 'r') as f:
    model_data = f.read()

new_structs = """
type SearchDaily struct {
	Date          string `json:"date"`
	TotalSearches int    `json:"total_searches"`
	ZeroResults   int    `json:"zero_results"`
	ResultClicks  int    `json:"result_clicks"`
}

type ContentDaily struct {
	Date           string `json:"date"`
	ContentType    string `json:"content_type"`
	TargetID       string `json:"target_id"`
	Views          int    `json:"views"`
	UniqueVisitors int    `json:"unique_visitors"`
}

type EngagementStats struct {
	Bookmarks int `json:"bookmarks"`
	Ratings   int `json:"ratings"`
	AvgRating float64 `json:"avg_rating"`
}
"""

if "SearchDaily" not in model_data:
    model_data = model_data.replace('type PeriodUniqueVisitors', new_structs + '\ntype PeriodUniqueVisitors')
    
repo_funcs = """
	GetSearchAnalytics(ctx context.Context, since string) ([]SearchDaily, error)
	GetContentAnalytics(ctx context.Context, since string) ([]ContentDaily, error)
	GetEngagementStats(ctx context.Context) (EngagementStats, error)
	
	RollupSearchDaily(ctx context.Context, reportingDate string, startUTC time.Time, endUTC time.Time) error
	RollupContentDaily(ctx context.Context, reportingDate string, startUTC time.Time, endUTC time.Time) error
"""
if "GetSearchAnalytics" not in model_data:
    model_data = model_data.replace('GetPeriodUniqueVisitors(ctx context.Context, startUTC time.Time, endUTC time.Time) (int, error)', 'GetPeriodUniqueVisitors(ctx context.Context, startUTC time.Time, endUTC time.Time) (int, error)' + repo_funcs)

with open(model_file, 'w') as f:
    f.write(model_data)

# Update repository.go
repo_file = 'services/portal-api/internal/domain/analytics/repository.go'
with open(repo_file, 'r') as f:
    repo_data = f.read()

new_repo_impl = """
func (r *PostgresRepository) GetSearchAnalytics(ctx context.Context, since string) ([]SearchDaily, error) {
	query := `SELECT TO_CHAR(date, 'YYYY-MM-DD'), total_searches, zero_results, result_clicks FROM analytics.search_daily WHERE date >= $1::date ORDER BY date DESC`
	rows, err := r.db.QueryContext(ctx, query, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []SearchDaily
	for rows.Next() {
		var d SearchDaily
		if err := rows.Scan(&d.Date, &d.TotalSearches, &d.ZeroResults, &d.ResultClicks); err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	return result, nil
}

func (r *PostgresRepository) GetContentAnalytics(ctx context.Context, since string) ([]ContentDaily, error) {
	query := `SELECT TO_CHAR(date, 'YYYY-MM-DD'), content_type, target_id, views, unique_visitors FROM analytics.content_daily WHERE date >= $1::date ORDER BY date DESC, views DESC`
	rows, err := r.db.QueryContext(ctx, query, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ContentDaily
	for rows.Next() {
		var d ContentDaily
		if err := rows.Scan(&d.Date, &d.ContentType, &d.TargetID, &d.Views, &d.UniqueVisitors); err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	return result, nil
}

func (r *PostgresRepository) GetEngagementStats(ctx context.Context) (EngagementStats, error) {
	var stats EngagementStats
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM public.engagement_bookmarks`).Scan(&stats.Bookmarks)
	if err != nil {
		return stats, err
	}
	
	err = r.db.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(AVG(rating), 0) FROM public.engagement_ratings`).Scan(&stats.Ratings, &stats.AvgRating)
	if err != nil {
		return stats, err
	}
	
	return stats, nil
}

func (r *PostgresRepository) RollupSearchDaily(ctx context.Context, reportingDate string, startUTC time.Time, endUTC time.Time) error {
	query := `
		INSERT INTO analytics.search_daily (date, total_searches, zero_results, result_clicks)
		SELECT 
			$1::date, 
			SUM(CASE WHEN event_type = 'search.executed' THEN 1 ELSE 0 END),
			SUM(CASE WHEN event_type = 'search.zero_result' THEN 1 ELSE 0 END),
			SUM(CASE WHEN event_type = 'search.result_clicked' THEN 1 ELSE 0 END)
		FROM analytics.events
		WHERE created_at >= $2 AND created_at < $3
		ON CONFLICT (date) DO UPDATE SET 
			total_searches = EXCLUDED.total_searches,
			zero_results = EXCLUDED.zero_results,
			result_clicks = EXCLUDED.result_clicks
	`
	_, err := r.db.ExecContext(ctx, query, reportingDate, startUTC, endUTC)
	return err
}

func (r *PostgresRepository) RollupContentDaily(ctx context.Context, reportingDate string, startUTC time.Time, endUTC time.Time) error {
	query := `
		INSERT INTO analytics.content_daily (date, content_type, target_id, views, unique_visitors)
		SELECT 
			$1::date, 
			metadata->>'content_type',
			metadata->>'target_id',
			COUNT(*), 
			COUNT(DISTINCT visitor_id)
		FROM analytics.events
		WHERE created_at >= $2 AND created_at < $3 AND event_type = 'content.viewed'
		GROUP BY 1, 2, 3
		ON CONFLICT (date, content_type, target_id) DO UPDATE SET 
			views = EXCLUDED.views, 
			unique_visitors = EXCLUDED.unique_visitors
	`
	_, err := r.db.ExecContext(ctx, query, reportingDate, startUTC, endUTC)
	return err
}
"""

if "GetSearchAnalytics" not in repo_data:
    repo_data = repo_data + "\n" + new_repo_impl
    with open(repo_file, 'w') as f:
        f.write(repo_data)


# Update worker
worker_file = 'services/portal-api/cmd/analytics-worker/main.go'
with open(worker_file, 'r') as f:
    worker_data = f.read()

worker_inject = """
	if err := repo.RollupSearchDaily(ctx, reportingDate, startUTC, endUTC); err != nil {
		log.Printf("Error rolling up search daily for %v: %v", reportingDate, err)
	}
	if err := repo.RollupContentDaily(ctx, reportingDate, startUTC, endUTC); err != nil {
		log.Printf("Error rolling up content daily for %v: %v", reportingDate, err)
	}
"""

if "RollupSearchDaily" not in worker_data:
    worker_data = worker_data.replace('RollupSSODaily(ctx, reportingDate, startUTC, endUTC); err != nil {\n\t\tlog.Printf("Error rolling up sso daily for %v: %v", reportingDate, err)\n\t}', 'RollupSSODaily(ctx, reportingDate, startUTC, endUTC); err != nil {\n\t\tlog.Printf("Error rolling up sso daily for %v: %v", reportingDate, err)\n\t}\n' + worker_inject)
    with open(worker_file, 'w') as f:
        f.write(worker_data)
        
print("Python modifications completed.")
