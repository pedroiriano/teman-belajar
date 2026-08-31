# TASK-018 Handoff — Integration Health Center

## State

`DONE`. Implementation and authorized browser QA are complete. The Portal
Administrator-only navigation is active. No migration or persistent data
mutation is part of this delivery.

## Delivered

- Server-side fixed allowlist aggregator with timeout, freshness, last success,
  sanitized error classes, and circuit/degraded behavior.
- Portal Administrator-only audited API and responsive Cuba Admin dashboard.
- Internal GET-only worker health state for search and analytics workers.
- OpenAPI, bounded Prometheus metric, OTel health extension, runbook, and threat
  model.

## Verification

PASS: full Go tests and vet; OpenAPI; integration-health contract; Admin lint,
typecheck, production build, theme, no-orange and vendor-foundation; Docker
config; API unauthenticated denial; internal API/worker/OTel health. Authorized
browser QA verified 14 dependency cards, live healthy/down and aggregate
degraded states, freshness, sanitized error/correlation fields, desktop and
390px layouts without overflow, accessible controls, and no console errors.
The final smoke after canonical-redirect handling showed Moodle and the overall
snapshot healthy while still refusing to follow redirect targets.
`unknown`, circuit, timeout, unauthorized, data-leak, and SSRF states are
covered by the previously passing automated negative tests.

## Data and rollback

No migration or persistent data change. Rollback is removal of the scoped
source/config/docs changes and a rebuild of API, Admin, both workers, and OTel
Collector. Existing volumes and identity/Moodle configuration remain untouched.
