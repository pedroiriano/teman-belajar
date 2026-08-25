# TASK-021 — Notification Center

**Status:** PLANNED
**Owner Agent:** Backend/Frontend/Security/QA
**Feature:** F-NOT-001, F-NOT-002
**Dependencies:** Event and audit infrastructure

## Objective

Mengaktifkan notification bell Admin/Portal melalui inbox in-app yang andal;
kanal email hanya ditambahkan melalui adapter dan keputusan manusia.

## In Scope

- Event schema, inbox, unread/read, preferences, deep-link allowlist, pagination,
  idempotent delivery, reminders, retention, Admin/Portal bell states.
- In-app first; email adapter behind interface if separately approved.

## Out of Scope

- Hard-coded SMTP/provider secret, arbitrary external deep-link, spam broadcast,
  SMS/push tanpa keputusan, identity changes, atau notification microservice
  tanpa ADR.

## Acceptance Criteria

- AC-01 Duplicate event tidak membuat duplicate notification.
- AC-02 Inbox user-partitioned; read/preferences server-authorized.
- AC-03 Deep-link internal tervalidasi dan payload tidak memuat secret/unsafe PII.
- AC-04 Bell memiliki unread/loading/empty/error/offline states yang accessible.
- AC-05 Email/provider tetap optional dan outage tidak merusak in-app inbox.

## Required Tests

- [ ] event/idempotency/preference unit and integration
- [ ] cross-user/authz/deep-link/rate-limit negative tests
- [ ] Admin/Portal bell and inbox E2E, keyboard/mobile/light/dark

## Documentation Impact

- [ ] event/OpenAPI/ERD/migration/retention/runbook/handoff

## Definition of Done

In-app acceptance lulus; provider eksternal hanya aktif bila approval tersedia.
