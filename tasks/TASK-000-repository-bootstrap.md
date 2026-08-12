# TASK-000 — Repository Bootstrap
**Owner Agent:** DevOps/Platform Agent  
**Dependencies:** TASK-000A (preferred when vendor sources are already available), ADR-002, ADR-003, ADR-009, ADR-013

## Objective
Membuat skeleton monorepo yang buildable untuk Next.js portal, Go API, docs, contracts dan local infrastructure.

## In Scope
- folder sesuai `REPOSITORY-STRUCTURE.md`;
- Go API `GET /health`;
- Next.js minimal home shell;
- Docker Compose local untuk portal DB, Redis, Keycloak placeholder/config, object storage;
- lint/test commands;
- CI baseline.

## Out of Scope
- business feature;
- production Kubernetes;
- Moodle plugin logic.

## Acceptance Criteria
- AC-00 Canonical product/service naming mengikuti `docs/governance/PRODUCT-IDENTITY-NAMING.md`.
- AC-01 `portal-api` build berhasil dari clean checkout.
- AC-02 `GET /health` mengembalikan 200 `{"status":"ok"}` sesuai OpenAPI.
- AC-03 portal web build berhasil.
- AC-04 local compose dapat menyalakan dependency baseline tanpa secret committed.
- AC-05 CI menjalankan lint, unit test, secret scan dan build.
- AC-06 README menjelaskan one-command local bootstrap.

- AC-07 Portal/Admin bootstrap menjaga theme boundary Techwind vs Cuba dan tidak meng-copy seluruh vendor demo.

## Required Tests
- Go health handler test.
- CI validation.
- Docker config validation.

## Definition of Done
Semua AC lulus, CI hijau, no secret, dokumentasi startup aktual.
