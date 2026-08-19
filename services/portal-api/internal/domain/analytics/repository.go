package analytics

import (
	"context"
	"database/sql"
	"time"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) InsertEvent(ctx context.Context, e *Event) error {
	query := `INSERT INTO analytics.events (id, visitor_id, actor_id, event_type, url, referrer, user_agent, metadata, created_at)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	_, err := r.db.ExecContext(ctx, query, e.ID, e.VisitorID, e.ActorID, e.EventType, e.URL, e.Referrer, e.UserAgent, e.Metadata, e.CreatedAt)
	return err
}

func (r *PostgresRepository) GetPageAnalytics(ctx context.Context, since string) ([]PageDaily, error) {
	query := `SELECT TO_CHAR(date, 'YYYY-MM-DD'), path, views, unique_visitors FROM analytics.page_daily WHERE date >= $1::date ORDER BY date DESC, views DESC`
	rows, err := r.db.QueryContext(ctx, query, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []PageDaily
	for rows.Next() {
		var p PageDaily
		if err := rows.Scan(&p.Date, &p.Path, &p.Views, &p.UniqueVisitors); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, nil
}

func (r *PostgresRepository) GetLearningAnalytics(ctx context.Context, since string) ([]LearningDaily, error) {
	query := `SELECT TO_CHAR(date, 'YYYY-MM-DD'), active_learners, learning_starts, completions, completion_rate, top_courses 
			  FROM analytics.learning_daily WHERE date >= $1::date ORDER BY date DESC`
	rows, err := r.db.QueryContext(ctx, query, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []LearningDaily
	for rows.Next() {
		var p LearningDaily
		if err := rows.Scan(&p.Date, &p.ActiveLearners, &p.LearningStarts, &p.Completions, &p.CompletionRate, &p.TopCourses); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, nil
}

func (r *PostgresRepository) GetSSOAnalytics(ctx context.Context, since string) ([]SSODaily, error) {
	query := `SELECT TO_CHAR(date, 'YYYY-MM-DD'), successful_logins, failed_logins FROM analytics.sso_daily WHERE date >= $1::date ORDER BY date DESC`
	rows, err := r.db.QueryContext(ctx, query, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []SSODaily
	for rows.Next() {
		var p SSODaily
		if err := rows.Scan(&p.Date, &p.SuccessfulLogins, &p.FailedLogins); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, nil
}

func (r *PostgresRepository) GetPeriodUniqueVisitors(ctx context.Context, startUTC time.Time, endUTC time.Time) (int, error) {
	query := `SELECT COUNT(DISTINCT visitor_id) FROM analytics.events WHERE created_at >= $1 AND created_at < $2`
	var count int
	err := r.db.QueryRowContext(ctx, query, startUTC, endUTC).Scan(&count)
	return count, err
}

func (r *PostgresRepository) RollupPageDaily(ctx context.Context, reportingDate string, startUTC time.Time, endUTC time.Time) error {
	query := `
		INSERT INTO analytics.page_daily (date, path, views, unique_visitors)
		SELECT 
			$1::date, 
			url, 
			COUNT(*), 
			COUNT(DISTINCT visitor_id)
		FROM analytics.events
		WHERE created_at >= $2 AND created_at < $3
		  AND event_type IN ('portal.page_view', 'admin.page_view', 'content.knowledge_view', 'content.news_view', 'content.announcement_view')
		GROUP BY url
		ON CONFLICT (date, path) DO UPDATE SET 
			views = EXCLUDED.views, 
			unique_visitors = EXCLUDED.unique_visitors;
	`
	_, err := r.db.ExecContext(ctx, query, reportingDate, startUTC, endUTC)
	return err
}

func (r *PostgresRepository) RollupSSODaily(ctx context.Context, reportingDate string, startUTC time.Time, endUTC time.Time) error {
	query := `
		INSERT INTO analytics.sso_daily (date, successful_logins, failed_logins)
		SELECT 
			$1::date, 
			SUM(CASE WHEN event_type = 'sso.login_success' THEN 1 ELSE 0 END),
			SUM(CASE WHEN event_type = 'sso.login_failed' THEN 1 ELSE 0 END)
		FROM analytics.events
		WHERE created_at >= $2 AND created_at < $3
		  AND event_type IN ('sso.login_success', 'sso.login_failed', 'auth.login')
		ON CONFLICT (date) DO UPDATE SET 
			successful_logins = EXCLUDED.successful_logins, 
			failed_logins = EXCLUDED.failed_logins;
	`
	_, err := r.db.ExecContext(ctx, query, reportingDate, startUTC, endUTC)
	return err
}

func (r *PostgresRepository) UpdateLearningDaily(ctx context.Context, data LearningDaily) error {
	query := `
		INSERT INTO analytics.learning_daily (date, active_learners, learning_starts, completions, completion_rate, top_courses)
		VALUES ($1::date, $2, $3, $4, $5, $6)
		ON CONFLICT (date) DO UPDATE SET 
			active_learners = EXCLUDED.active_learners, 
			learning_starts = EXCLUDED.learning_starts,
			completions = EXCLUDED.completions,
			completion_rate = EXCLUDED.completion_rate,
			top_courses = EXCLUDED.top_courses;
	`
	_, err := r.db.ExecContext(ctx, query, data.Date, data.ActiveLearners, data.LearningStarts, data.Completions, data.CompletionRate, data.TopCourses)
	return err
}

func (r *PostgresRepository) CleanupOldEvents(ctx context.Context, cutoffUTC time.Time) error {
	query := `DELETE FROM analytics.events WHERE created_at < $1`
	_, err := r.db.ExecContext(ctx, query, cutoffUTC)
	return err
}
