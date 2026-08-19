# Analytics Operations

## Worker Management
The Analytics worker synchronizes Moodle learning data and rolls up events daily.
- Retention: Raw events are kept for 30 days.
- Command: `go run cmd/analytics-worker/main.go`
- Environment: Set `ANALYTICS_RAW_RETENTION_DAYS=30`

## Privacy Remediation
If PII leaks into analytics:
1. Identify the UUID or timeframe.
2. Run SQL `DELETE FROM analytics.events WHERE metadata->>'email' IS NOT NULL;`
3. Force worker to re-run rollups for the affected timeframe if needed.
