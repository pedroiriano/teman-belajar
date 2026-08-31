# Audit Center Operations

## Boundary

`/dashboard/audit` is a Portal Administrator-only read interface over Portal
audit events. It exposes no edit, manual delete, arbitrary SQL/query, secret,
raw payload, raw URL, stack trace, shell, restart, or identity operation.

## Query and export

- Filters are exact matches with cursor pagination (25 default, 100 maximum).
- Export requires both UTC dates, permits at most 31 days, and refuses results
  above 10,000 rows. CSV cells are neutralized against spreadsheet formulas.
- Every list, detail, and export attempt is audited with a bounded result and a
  masked client network only. Never copy access tokens or raw URLs into filters.

## Retention

The API runs a daily bounded cleanup of events older than 365 days, up to 5,000
rows per pass. This is the only deletion path. A failure logs only a generic
retention failure; successful cleanup logs only the count. Do not delete audit
rows manually or weaken the cutoff.

## Safe triage

1. Capture the displayed correlation ID and timestamp.
2. Narrow the UTC date range and exact module/event filter.
3. Correlate through approved observability tools without copying secrets.
4. If an export exceeds the limit, narrow its range; do not raise the hard cap.
5. For a retention failure, check Portal database health and migration 021.

## Rollback

Disable the Admin route/menu and Audit Center API handlers while preserving
`audit_events` and migration 021. Do not roll back the additive columns or
delete data. Retention scheduling may be disabled only as a reviewed forward
fix with privacy-owner approval.
