package analytics

import (
	"context"
	"database/sql"
	"errors"
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
	query := `SELECT TO_CHAR(date, 'YYYY-MM-DD'), active_learners, learning_starts, eligible_enrolments, completions, completion_rate, top_courses
			  FROM analytics.learning_daily WHERE date >= $1::date ORDER BY date DESC`
	rows, err := r.db.QueryContext(ctx, query, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []LearningDaily
	for rows.Next() {
		var p LearningDaily
		if err := rows.Scan(&p.Date, &p.ActiveLearners, &p.LearningStarts, &p.EligibleEnrolments, &p.Completions, &p.CompletionRate, &p.TopCourses); err != nil {
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
	query := `SELECT COUNT(DISTINCT visitor_id)
		FROM analytics.events
		WHERE event_type = 'portal.page_view'
		  AND created_at >= $1 AND created_at < $2`
	var count int
	err := r.db.QueryRowContext(ctx, query, startUTC, endUTC).Scan(&count)
	return count, err
}

func (r *PostgresRepository) RollupPageDaily(ctx context.Context, reportingDate string, startUTC time.Time, endUTC time.Time) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() // #nosec G104 -- defer rollback error is safe to ignore as transaction is already committed or context is canceled
	if _, err := tx.ExecContext(ctx, `DELETE FROM analytics.page_daily WHERE date = $1::date`, reportingDate); err != nil {
		return err
	}
	query := `
		INSERT INTO analytics.page_daily (date, path, views, unique_visitors)
		SELECT 
			$1::date, 
			url, 
			COUNT(*), 
			COUNT(DISTINCT visitor_id)
		FROM analytics.events
		WHERE created_at >= $2 AND created_at < $3
		  AND event_type = 'portal.page_view'
		GROUP BY url
		ON CONFLICT (date, path) DO UPDATE SET 
			views = EXCLUDED.views, 
			unique_visitors = EXCLUDED.unique_visitors;
	`
	if _, err := tx.ExecContext(ctx, query, reportingDate, startUTC, endUTC); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *PostgresRepository) RollupSSODaily(ctx context.Context, reportingDate string, startUTC time.Time, endUTC time.Time) error {
	query := `
		INSERT INTO analytics.sso_daily (date, successful_logins, failed_logins)
		SELECT 
			$1::date, 
			COALESCE(SUM(CASE WHEN event_type = 'sso.login_success' OR (event_type = 'auth.login' AND metadata->>'result' = 'success') THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN event_type = 'sso.login_failed' OR (event_type = 'auth.login' AND metadata->>'result' = 'failure') THEN 1 ELSE 0 END), 0)
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
		INSERT INTO analytics.learning_daily (date, active_learners, learning_starts, eligible_enrolments, completions, completion_rate, top_courses)
		VALUES ($1::date, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (date) DO UPDATE SET 
			active_learners = EXCLUDED.active_learners, 
			learning_starts = EXCLUDED.learning_starts,
			eligible_enrolments = EXCLUDED.eligible_enrolments,
			completions = EXCLUDED.completions,
			completion_rate = EXCLUDED.completion_rate,
			top_courses = EXCLUDED.top_courses;
	`
	_, err := r.db.ExecContext(ctx, query, data.Date, data.ActiveLearners, data.LearningStarts, data.EligibleEnrolments, data.Completions, data.CompletionRate, data.TopCourses)
	return err
}

func (r *PostgresRepository) CleanupOldEvents(ctx context.Context, cutoffUTC time.Time) error {
	query := `DELETE FROM analytics.events WHERE created_at < $1`
	_, err := r.db.ExecContext(ctx, query, cutoffUTC)
	return err
}

func (r *PostgresRepository) GetWorkerState(ctx context.Context) (WorkerState, error) {
	var state WorkerState
	var rollupAt, moodleAt, cleanupAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
		SELECT last_rollup_success_at, last_moodle_sync_success_at, last_cleanup_success_at
		FROM analytics.worker_state
		WHERE singleton_id = 1
	`).Scan(&rollupAt, &moodleAt, &cleanupAt)
	if err != nil {
		return state, err
	}
	if rollupAt.Valid {
		state.LastRollupSuccessAt = &rollupAt.Time
	}
	if moodleAt.Valid {
		state.LastMoodleSyncSuccessAt = &moodleAt.Time
	}
	if cleanupAt.Valid {
		state.LastCleanupSuccessAt = &cleanupAt.Time
	}
	return state, nil
}

func (r *PostgresRepository) MarkWorkerSuccess(ctx context.Context, key WorkerStateKey, observedAt time.Time) error {
	var query string
	switch key {
	case WorkerStateRollup:
		query = `UPDATE analytics.worker_state SET last_rollup_success_at = $1 WHERE singleton_id = 1`
	case WorkerStateMoodleSync:
		query = `UPDATE analytics.worker_state SET last_moodle_sync_success_at = $1 WHERE singleton_id = 1`
	case WorkerStateCleanup:
		query = `UPDATE analytics.worker_state SET last_cleanup_success_at = $1 WHERE singleton_id = 1`
	default:
		return errors.New("unknown analytics worker state key")
	}

	result, err := r.db.ExecContext(ctx, query, observedAt.UTC())
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows != 1 {
		return errors.New("analytics worker state row is missing")
	}
	return nil
}

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
			COALESCE(SUM(CASE WHEN event_type = 'search.executed' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN event_type = 'search.zero_result' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN event_type = 'search.result_clicked' THEN 1 ELSE 0 END), 0)
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
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() // #nosec G104 -- defer rollback error is safe to ignore as transaction is already committed or context is canceled
	if _, err := tx.ExecContext(ctx, `DELETE FROM analytics.content_daily WHERE date = $1::date`, reportingDate); err != nil {
		return err
	}
	query := `
		INSERT INTO analytics.content_daily (date, content_type, target_id, views, unique_visitors)
		SELECT 
			$1::date, 
			metadata->>'content_type',
			metadata->>'target_id',
			COUNT(*), 
			COUNT(DISTINCT visitor_id)
		FROM analytics.events
		WHERE created_at >= $2 AND created_at < $3
		  AND event_type = 'content.viewed'
		  AND metadata->>'content_type' IN ('knowledge', 'news', 'announcement')
		  AND COALESCE(metadata->>'target_id', '') <> ''
		GROUP BY 1, 2, 3
		ON CONFLICT (date, content_type, target_id) DO UPDATE SET 
			views = EXCLUDED.views, 
			unique_visitors = EXCLUDED.unique_visitors
	`
	if _, err := tx.ExecContext(ctx, query, reportingDate, startUTC, endUTC); err != nil {
		return err
	}
	return tx.Commit()
}
