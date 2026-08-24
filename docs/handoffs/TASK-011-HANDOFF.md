# TASK-011 HANDOFF

## Canonical Task
TASK-011: Moodle Event Inbox

## Implementation Summary
The Moodle Event Inbox was implemented following the approved ADR-011 design, establishing an idempotent, async, and authenticated endpoint for receiving learning events.

### Key Components
1. **Database**: Migration `012_create_event_inbox_outbox.sql` adds `integration.event_inbox` and `integration.event_outbox` with strict constraints, fingerprinting, and optimized work queues using `FOR UPDATE SKIP LOCKED`.
2. **Domain Model**: Implemented strict validation for canonical Moodle learning event types and schema versions. Deterministic SHA-256 fingerprinting ensures robust payload collision detection.
3. **Application & Processing**: Added an internal event ingestion service and a background `EventProcessor` goroutine. The processor utilizes exponential backoff retry mechanisms, a dead-letter queue (max 5 attempts), and outbox pattern creation.
4. **Authentication**: Developed `HMACAuthMiddleware` employing HMAC-SHA256 signatures, constant-time comparison, a ±5 minute timestamp window, and isolated `TB_MOODLE_EVENT_INGEST_SECRET`.
5. **Observability**: Interspersed Prometheus metrics (`event_inbox_ingest_total`, `event_inbox_process_total`, `event_inbox_backlog`, and `event_inbox_process_duration_seconds`) for thorough visibility.
6. **Integration Handler**: Added HTTP handler conforming to `application/problem+json` for error reporting and adhering to payload size limits.

## Governance & Boundary Compliance
- **Identity Boundary**: Unaltered. Keycloak, SSO, and user management remain untouched.
- **Docker/Infrastructure**: No new services added. The processor runs seamlessly as a background worker inside the existing `portal-api`.
- **Moodle Plugin**: Moodle core remains unmodified. The endpoint exposes capabilities for the plugin to safely push events over HTTP. 

## Documentation
- **Threat Model**: Added `docs/threat-models/TASK-011-MOODLE-EVENT-INBOX.md` to cover 20 threat vectors and their mitigations.
- **Operations Runbook**: Added `docs/runbooks/MOODLE-EVENT-INBOX-OPERATIONS.md` providing runbook guidance on operations, incident triage, and dead-letter queue reconciliation.
- **OpenAPI**: Updated `openapi/openapi.yaml` with the `POST /api/v1/internal/moodle/events` contract.
- **ERD**: Updated `docs/diagrams/erd.mmd` to reflect `EVENT_INBOX` and `EVENT_OUTBOX` models.

## Security Gates
- **Secret Isolation**: New environment variable `TB_MOODLE_EVENT_INGEST_SECRET` introduced and placed securely.
- **Security Audit**: Middleware generates audit events (`target_type="integration_endpoint"`) for authentication failures such as tampered signatures and expired requests; the ingestion service separately audits structural collisions without leaking payload PII.

## Definition of Done (DoD)
- AC-01 (envelope validation): Passed (unit tested, string lengths bounded)
- AC-02 (duplicate event_id safe): Passed (fingerprint comparison & SQL unique constraints)
- AC-03 (service-to-service auth): Passed (HMAC-SHA256 ±5m window)
- AC-04 (invalid auth rejected + audit): Passed (verified via `hmac_auth_test.go`)
- AC-05 (bounded retry + dead-letter): Passed (`processor.go` implements backoff + DLQ)
- AC-06 (backlog/failed metrics): Passed (`metrics.go` + metric updates in processor loop)

## FINAL RELEASE-GATE RECOVERY & CANONICAL CLOSURE — 2026-08-24T07:58:30Z
A comprehensive corrective audit and repair was performed (resolving K-01 through K-12) to rectify post-merge issues without rewriting Git history. PR #7 and PR #8 were merged prematurely; PR #8's final CI Baseline failed. PR #9 is the final technical release and was merged only after CI Baseline and DevSecOps completed successfully. Migration `007_cleanup_analytics_privacy.sql` was changed after it had been applied in the local canonical environment; the final disposition and one-time human exception are recorded in the authoritative reconciliation section below. Key repairs include:
- **Testing (K-03, K-04)**: Real database integration tests replaced mocked `t.Skip` placeholders for repository and processor logic. Enforcement of test execution in CI was implemented via `TASK011_REQUIRE_INTEGRATION_DB`. Added concurrency tests for stale worker overwrite prevention and dead letter queues.
- **Security & SAST**: Fixed Gosec G104 unhandled error in JSON encoder, and ensured Govulncheck and Gitleaks passed without warnings.
- **Data Integrity (K-07, K-12)**: Hardened input contracts (max lengths, no trailing JSON) and bounded metric cardinalities for rejected payloads.
- **Concurrency (K-08)**: Resolved stale-worker ownership races using exact `updated_at` optimistic lock matching instead of adding new columns.
- **API Contracts (K-05, K-06)**: Upgraded handler and HMAC middleware to return strictly formatted `application/problem+json` error responses. Fixed OpenAPI schema unresolved reference and matched runtime HMAC header names (`X-TB-Signature`, `X-TB-Timestamp`).
- **Operations (K-10, K-02)**: Injected `TB_MOODLE_EVENT_INGEST_SECRET` to the `api` container and removed exposed `--db` credentials flag from `portal-cli`.
- **Documentation**: explicitly documented in the Threat Model and Runbook that Moodle Publisher is NOT IMPLEMENTED in this task.

The final task disposition is governed by the authoritative reconciliation below.

## FINAL EVIDENCE INTEGRITY & MIGRATION-HISTORY RECONCILIATION — 2026-08-24T08:27:48Z

This section supersedes any earlier release-governance or migration-immutability wording that conflicts with the evidence below. It does not rewrite historical evidence.

### Final Disposition

- **TASK-011 technical release gate:** PASS.
- **Final technical release PR:** [#9](https://github.com/pedroiriano/teman-belajar/pull/9).
- **Final technical release SHA:** `61d321a26649a9ef0d61f95f1e939863a960be56`.
- **Canonical task status:** **PASS — CANONICAL RELEASED** following the explicitly approved one-time pre-production migration-history exception below.
- **Integrated media follow-up readiness:** **READY**. The historical identifier TASK-004A was already used for Moodle readiness; the integrated-media follow-up therefore uses the next free identifier TASK-004E.
- **TASK-012:** **NOT STARTED**. Migration checksums and administrator branch-protection enforcement are carried only as TASK-012 hardening recommendations; this handoff does not implement them.
- **Identity Boundary:** **UNCHANGED**. No Keycloak, SSO, account-management, user-management, or RBAC logic was modified during this reconciliation.
- **Moodle publisher:** **NOT IMPLEMENTED**. TASK-011 provides the authenticated Portal API inbox and processor; `local_temanbelajar` does not yet publish learning events to this endpoint.

### Git and Release Evidence

| Evidence | Verified result |
|---|---|
| Initial/current `main` before this documentation PR | `da1dedb86aff00dddd0ca0b2f90d5a09077c427f`; equal to `origin/main` at reconciliation start |
| PR #7 | Head `b59f05cd36419b4493f6f699781f7f9132bc37ea`; merge `cafc812cc416ce4d1bc2fa589b1d0632e28565e4`; merged at `2026-08-24T07:29:36Z`, before its failing CI Baseline and DevSecOps workflows completed |
| PR #8 | Head `55f77dc30f16e6f49a76d9acf3a11106e18ca481`; merge `ae8b70f420af44196f0dd8cff48cabf37590049b`; merged at `2026-08-24T07:51:37Z` |
| PR #8 CI Baseline | Run `32703395295`, **FAIL**; completed at `2026-08-24T07:51:46Z`, nine seconds after merge. The API `Run Migrations` step failed. |
| PR #8 DevSecOps | Run `32703395334`, PASS; completed after the merge. This does not override the CI Baseline failure. |
| PR #9 | Head `3619bb09ed05957ad7d33eb4b3603837d0c70dc5`; merge `61d321a26649a9ef0d61f95f1e939863a960be56`; merged at `2026-08-24T07:58:26Z` |
| PR #9 CI Baseline | Run `32703859357`, **PASS**; completed at `2026-08-24T07:57:39Z` |
| PR #9 DevSecOps | Run `32703859246`, **PASS**; completed at `2026-08-24T07:58:14Z` |
| PR #9 merge timing | **PASS**; merged 47 seconds after CI Baseline and 12 seconds after DevSecOps completed successfully |
| Post-release documentation commit | `da1dedb86aff00dddd0ca0b2f90d5a09077c427f`; heading-only change to this handoff, made directly on `main`; classified as **DOCUMENTATION GOVERNANCE DEVIATION**, not an application regression |
| Current-main regression check | CI Baseline run `32704111687` PASS and DevSecOps run `32704111682` PASS for `da1dedb86aff00dddd0ca0b2f90d5a09077c427f` |
| Production evidence | No GitHub deployment, environment, release, or Git tag was present; the human owner explicitly confirmed that no production environment had applied migration 007 |

PR #9, not PR #8, is the final technical release evidence. PR #7 and PR #8 remain preserved as historical governance deviations.

### Migration 007 Integrity Reconciliation

Exact file: `services/portal-api/migrations/007_cleanup_analytics_privacy.sql`.

Git proves three historical contents:

| Stage | Commit | Git blob hash | Semantics |
|---|---|---|---|
| Original introduction | `7aad2e4a2c25dbcdfa33ec5160b3851878d89b97` | `32056dd473b432ab6d95e63b2459f6bdc911afc7` | Removed raw query-like keys from `analytics.events.metadata`, made `analytics.events.visitor_id` nullable, and deleted script-like analytics rows. |
| Intermediate mutation | `995d9023bc98e8b37d96c23c4151a9a318e94e39` | `cee16d0e00c129b29e04a080939b7d5f489d540e` | Unconditionally cleared `search_events.raw_query`; failed on a canonical fresh database because `search_events` did not exist. |
| Current content from PR #9 | `61d321a26649a9ef0d61f95f1e939863a960be56` | `0d42c61f1ffef4be798c4203d709c0431939db88` | Conditionally clears `search_events.raw_query` only when a table named `search_events` exists; otherwise it is a no-op. |

The canonical migration sequence does not create `search_events`, and the inspected local Portal database does not contain it. Git history contains no canonical creation of that table. Migration 010 independently makes `analytics.events.visitor_id` nullable, so current schema nullability converges even though environments may have applied different migration 007 content.

The local canonical database supplied safe applied-version evidence:

- `schema_migrations` exists;
- `007_cleanup_analytics_privacy.sql` is recorded at `2026-08-20T01:49:40.201725Z`, before the intermediate mutation;
- the latest locally recorded version is 011, so this local runtime is stale and is not evidence that migration 012 is currently deployed;
- `search_events` is absent;
- `analytics.events` and `analytics.page_daily` exist;
- `analytics.events.visitor_id` is nullable.

Accordingly, the classification is **APPLIED_MIGRATION_HISTORY_DIVERGENCE**, with **LOW** residual runtime risk for the known pre-production environment. CI success alone was not used to call the mutation harmless. The runner stores only `version` and `applied_at`; it has no migration checksum and therefore cannot detect that an already-recorded migration changed.

PR #9 fresh-install evidence is PASS: CI Baseline run `32703859357` created a fresh PostgreSQL service and successfully applied migrations 001 through 012, including the current 007 and 012, before running non-skippable TASK-011 database integration tests.

### Human Migration Decision

The repository owner provided the following explicit decision on 2026-08-24:

> Saya mengonfirmasi belum ada production environment yang pernah menerapkan migrasi 007 dan menyetujui ACCEPT ONE-TIME PRE-PRODUCTION MIGRATION-HISTORY EXCEPTION. Lanjutkan koreksi handoff, commit, push, dan pembuatan PR dokumentasi ke main.

Disposition: **APPROVED — ACCEPT ONE-TIME PRE-PRODUCTION MIGRATION-HISTORY EXCEPTION**.

This approval:

1. applies only to `007_cleanup_analytics_privacy.sql` and the hashes documented above;
2. does not authorize another mutation of migration 007 or any other applied migration;
3. does not authorize database reset, volume deletion, history rewrite, force-push, or production action;
4. requires all future applied migrations to remain immutable and any correction to use a new forward-only migration;
5. carries version-plus-checksum migration tracking into TASK-012 as a governance hardening recommendation, not as an implementation in this handoff.

### Branch Governance State

- Main branch protection is enabled with strict status checks.
- Exactly 11 required checks were configured at verification time.
- Administrator enforcement is disabled, so administrators retain bypass exposure.
- No branch-protection setting is changed here. Administrator enforcement remains a **TASK-012 GOVERNANCE HARDENING ITEM**.
- The deterministic PostgreSQL password used by the PR #9 ephemeral CI service is a **non-production test credential**, not evidence of a real deployed secret. Gitleaks PASS was not used as the sole basis for this classification.

### Final Evidence Matrix

| Field | Previous handoff claim | Actual evidence | Match | Severity | Required action / disposition |
|---|---|---|---|---|---|
| AC-01 | Envelope validation passed | Unit tests and PR #9 CI validate required fields, supported types/version, lengths, timestamp, and JSON-object payload | Yes | None | PASS |
| AC-02 | Duplicate `event_id` is safe | Unique constraint, deterministic fingerprint, duplicate/collision branching, outbox uniqueness, and database integration test pass | Yes | None | PASS |
| AC-03 | Service authentication is mandatory | HMAC-SHA256 over timestamp and body, constant-time comparison, five-minute window, fail-closed secret startup, and tests pass | Yes | None | PASS |
| AC-04 | Invalid authentication is rejected and audited | Missing/invalid/expired/tampered signatures return 401 and security audit events are tested | Yes | None | PASS |
| AC-05 | Retry is bounded with dead-letter state | Maximum five attempts, exponential backoff, stale-lease protection, dead-letter listing/requeue, and integration tests pass | Yes | None | PASS |
| AC-06 | Backlog/failed metrics exist | Ingest/process counters, status backlog gauge, duration histogram, and processor updates are present | Yes | None | PASS |
| PR #8 | Blanket final recovery wording implied governed success | Merged before completion; CI Baseline later failed | No | High documentation drift | Corrected; retained as historical evidence |
| PR #8 CI | Not recorded factually | Run `32703395295` failed in `Run Migrations` | No | High | Corrected |
| PR #9 | Not identified as final technical release | Merge `61d321a26649a9ef0d61f95f1e939863a960be56` occurred after green workflows | No | High documentation drift | Corrected |
| PR #9 CI | Not recorded | Run `32703859357` PASS, including fresh migrations and required DB tests | No | High documentation drift | Corrected |
| PR #9 DevSecOps | Not recorded | Run `32703859246` PASS | No | Medium documentation drift | Corrected |
| Migration 007 | Claimed released migrations were not altered | Three different Git blob hashes prove mutation | No | High migration-integrity issue | One-time pre-production exception explicitly approved |
| Migration immutability | Blanket claim was false | Local database recorded 007 before later contents; future runner skips by version | No | High | False claim removed; future changes must be forward-only |
| Migration runner checksum | Not documented | Checksum ABSENT; version/name only | No | Medium residual governance risk | TASK-012 hardening recommendation |
| Direct-main docs commit | Not documented | `da1dedb86aff00dddd0ca0b2f90d5a09077c427f` has no associated PR and changes only this handoff heading | No | Medium governance deviation | Recorded; application engineering not reopened |
| Branch protection | Blanket `no bypass` wording | Protection enabled, but administrator enforcement disabled | No | Medium governance exposure | Recorded; TASK-012 hardening recommendation |
| Required checks | Not enumerated | 11 strict required checks | Partial | Low | Recorded factually |
| Moodle publisher | Documented as not implemented in corrective notes | No publisher references exist in `local_temanbelajar` | Yes | None for TASK-011 scope | Remains NOT IMPLEMENTED |
| Integrated media readiness | Earlier wording reused historical TASK-004A | TASK-011 technical gate passed and exception is approved | No | Medium workflow drift | TASK-004E is READY; not implemented here |

### Canonical Closure

- **TASK-011:** PASS — CANONICAL RELEASED.
- **TASK-004E INTEGRATED MEDIA READINESS:** READY.
- **TASK-012:** NOT STARTED.
- **Next safe action:** after this canonical release, TASK-004E Integrated Media Asset Management may start separately; historical TASK-004A through TASK-004D remain immutable Moodle handoffs.
