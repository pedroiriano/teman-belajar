# TASK-015 — Webinar & Live Learning Handoff

**Status:** IMPLEMENTED_NON_SECRET — BLOCKED_CREDENTIALS_AND_EXTERNAL_GATES
**Date:** 2026-08-27
**Authority:** ADR-020

## Delivered

- Recovered official `mod_zoom` v5.5.0 locally from a checksum-pinned source
  after encrypted, verified database and volume backups.
- Added reproducible Moodle image installation and a narrow
  `local_temanbelajar` Web Service for list/detail/register/cancel.
- Added forward-only Moodle tables for capacity policy, registration state, and
  immutable idempotency operations; registration serializes on the course
  module and waitlist remains off.
- Added daily raw attendance purge at 365 days and Moodle privacy
  metadata/export/delete coverage.
- Added Portal API domain port, Moodle adapter, auth/rate-limited HTTP handlers,
  no-store responses, bounded problem states, metrics, and TASK-021 reminders
  at T-24h/T-1h with cancellation cleanup.
- Added OpenAPI and ERD contracts plus authenticated Techwind-composed list,
  detail, loading, error, and mutation BFF routes.
- Kept navigation `Webinar` as `Segera`. Capacity defaults to zero, so missing
  license/credentials fail closed.

## Local Evidence

- Go targeted domain/adapter/handler/notification/repository tests: PASS.
- Portal webinar contract guard, ESLint, and TypeScript: PASS.
- Moodle plugin PHP lint: PASS.
- Moodle migration `2026082701`: PASS; schema check contains only the two
  pre-existing out-of-scope `enrol_apply` findings.
- Four webinar functions: REGISTERED and IN_SERVICE; restricted integration
  service enabled.
- Attendance retention scheduled task: PASS, zero expired rows on empty local
  fixture.
- Moodle and Moodle cron returned healthy after maintenance.
- Moodle PHPUnit runtime dependency: NOT_INSTALLED; committed test awaits a
  supported test image/CI.

## Security Boundary

No secret, raw Zoom URL/passcode, Moodle core, Keycloak/SSO/RBAC, volume
deletion, direct Portal-to-Moodle database access, or new service is introduced.
`moodle-reconcile` was intentionally not executed.

## BLOCKED_CREDENTIALS_AND_EXTERNAL_GATES

Provide through the approved Moodle secret/operations path—not chat or Git:

1. Zoom Server-to-Server OAuth Account ID, Client ID, and Client Secret;
2. tenant/plan, webinar host license and owner;
3. cost cap and billing period;
4. DPA/data region/subprocessor/deletion approval;
5. licensed peak capacity and `local_temanbelajar/webinarcapacity` value;
6. recording storage quota/retention and approved least OAuth scopes.

Then run connection, disposable live activity, authorization, capacity,
cancellation, report/attendance, recording opt-in, browser E2E, accessibility,
and responsive gates. Only after PASS may a separate approved change activate
the Webinar menu.
