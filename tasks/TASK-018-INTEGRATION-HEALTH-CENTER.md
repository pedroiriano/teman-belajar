# TASK-018 — Integration Health Center

**Status:** PLANNED
**Owner Agent:** Backend/Frontend/DevOps/Security/QA
**Feature:** F-ADM-004
**Dependencies:** TASK-009, TASK-011, TASK-012

## Objective

Menyediakan dashboard Admin tersanitasi untuk menilai health dan freshness
integrasi tanpa membocorkan secret atau memberi kontrol operasional berbahaya.

## In Scope

- Portal API, Moodle, Keycloak, Meilisearch, Redis, MinIO, workers, databases,
  dan observability status; last success/freshness/error class/correlation link.
- Read-only summary, RBAC, audit access, timeout/circuit behavior.

## Out of Scope

- Credential/config value, token, stack trace sensitif, arbitrary probe, restart,
  shell, secret rotation, production action, atau identity flow modification.

## Acceptance Criteria

- AC-01 Status dihitung server-side dengan timeout dan sanitization allowlist.
- AC-02 Detail sensitif denied by default dan akses diaudit.
- AC-03 Dependency failure tidak mengubah health page menjadi outage cascade.
- AC-04 Freshness dan `unknown/degraded/down` dapat dibedakan.
- AC-05 Cuba UI no-orange, accessible, responsive, dan placeholder baru aktif
  setelah semua evidence lulus.

## Required Tests

- [ ] health aggregation/timeouts unit and integration
- [ ] authorization/data-leak/SSRF-like negative tests
- [ ] stale/degraded/outage E2E and accessibility

## Documentation Impact

- [ ] OpenAPI/runbook/observability/security/handoff

## Definition of Done

Seluruh AC lulus tanpa secret disclosure atau mutating operations.
