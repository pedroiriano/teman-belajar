# TASK-015 — Webinar & Live Learning

**Status:** PLANNED
**Owner Agent:** Product/Backend/Frontend/Integration/Security/QA
**Feature:** F-LXP-003
**Dependencies:** TASK-021, approved Moodle/provider adapter

## Objective

Menyediakan discovery, registration, reminder, attendance reference, dan
recording untuk sesi live tanpa membangun video-conference engine sendiri.

## Human Decision Before Implementation

Provider, cost/data-processing terms, attendance contract, cancellation policy,
time-zone policy, dan notification channels harus disetujui manusia.

## In Scope

- List/detail, schedule/time zone, speaker, capacity/waitlist bila disetujui,
  registration/cancellation, reminders, attendance provenance, recording link.
- Adapter berinterface, idempotency, audit, rate limit, provider outage states.

## Out of Scope

- Custom conferencing/streaming engine, secret configuration UI, direct Moodle
  DB, atau identity/role changes.

## Acceptance Criteria

- AC-01 Provider boundary dan data owner terdokumentasi serta dapat diganti.
- AC-02 Capacity/registration atomic dan retry idempotent.
- AC-03 Reminder memakai TASK-021; tidak ada PII/secret di log atau URL.
- AC-04 Time zone, cancellation, full/offline/degraded states dapat dipahami.
- AC-05 Menu `Webinar` hanya aktif setelah end-to-end browser acceptance.

## Required Tests

- [ ] domain/concurrency/idempotency/unit
- [ ] provider/Moodle adapter contract and outage integration
- [ ] authorization/rate-limit/negative tests
- [ ] registration/reminder/cancellation E2E and accessibility

## Documentation Impact

- [ ] ADR bila provider/dependency material, OpenAPI/ERD/runbook/handoff

## Definition of Done

Human decisions tercatat dan seluruh AC/test/rollback/observability lulus.
