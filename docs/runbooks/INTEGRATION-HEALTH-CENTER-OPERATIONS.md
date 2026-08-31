# Integration Health Center Operations

## Purpose and boundary

`/dashboard/integration-health` gives Portal Administrators a read-only,
sanitized snapshot of Portal API, Portal database, Moodle, Keycloak,
Meilisearch, Redis, MinIO, search/analytics workers, Prometheus, Grafana,
OpenTelemetry Collector, Loki, and Tempo. Moodle database health is represented
through the Moodle service boundary; it is never queried directly.

Probe targets are startup configuration with fixed paths. The API rejects query
parameters and exposes no restart, shell, arbitrary URL, secret, token, raw
dependency response, stack trace, or credential state.
HTTP 2xx/3xx proves reachability, but redirect targets are never followed.

## Status semantics

- `healthy`: current probe succeeded.
- `degraded`: partial failure or a previous success exists while the current
  dependency is unavailable.
- `down`: probe failed without usable recent success.
- `unknown`: no trustworthy observation exists or startup configuration is
  invalid.

Each probe has a two-second aggregation timeout. Three consecutive `down`
results open a 30-second circuit. A circuit state is visible only as
`circuit_open`; the last successful timestamp/freshness remains available.

## Safe triage

1. Capture the page correlation ID and affected dependency/error class.
2. Follow only the product-controlled correlation link to the API statistics
   section. Do not paste credentials or raw dependency URLs into tickets.
3. Check `integration_health_dependency_status` and standard service logs using
   the correlation ID where available.
4. Resolve configuration or dependency incidents through the owning runbook.
   This dashboard cannot perform recovery.
5. Confirm a later snapshot returns `healthy`; do not bypass timeout, RBAC, or
   probe validation to clear a status.

Access attempts are audit events with action `INTEGRATION_HEALTH_VIEWED` and a
bounded result (`SUCCESS`, `DENIED`, or `REJECTED`). Audit rows contain no probe
target or dependency response.

## Local verification

Run the integration-health contract, focused Go tests, Admin lint/typecheck,
theme/no-orange/vendor guards, and one desktop plus one representative mobile
browser check. No schema migration or data fixture is required.
