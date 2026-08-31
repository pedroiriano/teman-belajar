# TASK-019 Handoff — Audit Center

## State

`DONE`. Implementation and required local QA are complete. Git delivery
evidence is recorded below when the protected PR completes.

## Delivered locally

- Additive migration 021 for module, masked IP, allowlisted JSON metadata, and
  deterministic query indexes.
- Server-side query/detail/export service with cursor pagination, strict
  filters, redaction, 31-day/10,000-row CSV guard, and 365-day retention.
- Portal Administrator-only audited API and server-rendered Cuba Admin UI.
- Bounded Prometheus operation metric, OpenAPI, ERD, decision record, threat
  model, and operations runbook.

## Verification

PASS: Go policy/service/repository/handler tests and vet; fresh migration chain
through 021; disposable PostgreSQL repository integration and cleanup; OpenAPI;
Admin lint, typecheck, production build, Audit Center contract, no-orange, and
vendor-foundation. Browser QA covered Portal Administrator list/detail/export,
masked IP, sanitized fields, access audit, controlled CSV download, desktop and
390px mobile layouts, no document overflow, accessible controls, no console
errors, and non-admin denial. Cursor/export limits, retention, redaction, and
negative authorization are also covered by passing focused tests.

The persistent local migration runner remains stopped by a pre-existing,
non-canonical checksum drift in migration 020. It was not adopted or rewritten.
Migration 021 and browser QA ran against a clean disposable database; CI is the
fresh-chain authority for delivery.

## Data and rollback

Migration 021 is additive and performs no historical-row backfill. Existing
rows derive module from target type. Runtime retention deletes only audit rows
older than 365 days in 5,000-row batches. The disposable database and all audit
fixtures were removed after verification.
Rollback removes route/menu/runtime wiring but preserves schema and data.
