# Analytics Operations

## Worker Management
The Analytics worker synchronizes Moodle learning data and rolls up events daily.
- Retention: Raw events are kept for 30 days.
- Command: `go run cmd/analytics-worker/main.go`
- Environment: Set `ANALYTICS_RAW_RETENTION_DAYS=30`

### Durable freshness

`analytics.worker_state` is the operational source of truth:

- `last_rollup_success_at` advances only after page, SSO, search, and content rollups all succeed;
- `last_moodle_sync_success_at` advances only after the Moodle aggregate is fetched and persisted;
- `last_cleanup_success_at` advances only after retention cleanup succeeds.

Do not infer worker success from `MAX(analytics.events.created_at)`. A failed job
may leave partial idempotent rollups, but it must not advance freshness. Retry is
safe because daily rollups use conflict updates.

### Learning cohort

The Moodle Web Service accepts an inclusive `start_date`/`end_date` window up to
365 days. `active_learners` is a period-level distinct count over genuine active
student enrolments. `completion_rate = completed eligible enrolments / eligible
enrolments * 100`; numerator and denominator use the same cohort. The Admin must
use this period aggregate and must never sum daily unique learner counts.

### Degraded source states

Statistics use `fresh`, `stale`, `empty`, or `unavailable` with nullable
`observed_at`. Existing learning snapshots remain readable during a Moodle
outage, while the Moodle source is marked unavailable/stale. Portal business
flows continue if the analytics worker is stopped.

## Privacy Remediation
If PII leaks into analytics:
1. Identify the UUID or timeframe.
2. Run SQL `DELETE FROM analytics.events WHERE metadata->>'email' IS NOT NULL;`
3. Force worker to re-run rollups for the affected timeframe if needed.

Never query or mutate the Moodle database from this runbook. Moodle analytics
remediation uses the versioned Web Service/plugin boundary.
