# TASK-015 — Webinar & Live Learning

**Status:** IMPLEMENTED_NON_SECRET — BLOCKED_CREDENTIALS_AND_EXTERNAL_GATES
**Owner Agent:** Product/Backend/Frontend/Integration/Security/QA
**Feature:** F-LXP-003
**Dependencies:** TASK-021, recovered `mod_zoom`, approved Moodle Web Service contract

## Objective

Menyediakan discovery, registration, reminder, attendance reference, dan
recording untuk sesi live tanpa membangun video-conference engine sendiri.

## Human Decision Before Implementation

Zoom melalui Moodle `mod_zoom` telah disetujui sebagai authoritative provider
adapter. Recording opt-in, attendance retention 365 hari, cancellation sampai
sesi dimulai, waitlist off untuk v1, timezone `Asia/Jakarta`, dan reminder
in-app T-24h/T-1h juga telah disetujui.

Recovery/verifikasi schema `mod_zoom` dan seluruh implementasi yang tidak
memerlukan secret telah selesai pada lingkungan lokal. Aktivasi tetap menunggu
Zoom Server-to-Server OAuth, konfirmasi tenant/plan dan biaya, DPA/data region,
granular OAuth scopes, serta peak capacity/storage. Provider boundary tercatat dalam
[`ADR-020`](../docs/adr/ADR-020-moodle-mod-zoom-webinar-authority.md).
Audit read-only dan rencana backup/recovery/rollback tercatat dalam
[`MOD-ZOOM-SCHEMA-RECOVERY.md`](../docs/runbooks/MOD-ZOOM-SCHEMA-RECOVERY.md);
recovery telah dijalankan berdasarkan persetujuan owner dan tercatat sebagai
PASS lokal dengan backup terverifikasi.

Decision brief yang sudah diperbarui tersedia di
[`docs/roadmap/TASK-015-WEBINAR-PROVIDER-DECISION-BRIEF.md`](../docs/roadmap/TASK-015-WEBINAR-PROVIDER-DECISION-BRIEF.md).
Menu `Webinar` tetap `Segera` sampai credential, fixture live, dan browser E2E
lulus. Kode non-secret bersifat fail-closed saat capacity/OAuth belum tersedia.

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

- [x] domain/idempotency/reminder unit
- [ ] Moodle concurrency/idempotency integration (test committed; runtime PHPUnit unavailable locally)
- [x] provider/Moodle adapter contract and outage integration
- [x] authorization/rate-limit/negative tests
- [ ] registration/reminder/cancellation E2E and accessibility

## Documentation Impact

- [x] ADR bila provider/dependency material, OpenAPI/ERD/runbook/handoff

## Definition of Done

Human decisions tercatat dan seluruh AC/test/rollback/observability lulus.
