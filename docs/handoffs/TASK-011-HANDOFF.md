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
- **Security Audit**: Middleware generates audit events (`target_type="integration_endpoint"`) on validation failures (e.g., tampered signature, expired request) and structural collisions without leaking payload PII.

## Definition of Done (DoD)
- AC-01 (envelope validation): Passed (unit tested, string lengths bounded)
- AC-02 (duplicate event_id safe): Passed (fingerprint comparison & SQL unique constraints)
- AC-03 (service-to-service auth): Passed (HMAC-SHA256 ±5m window)
- AC-04 (invalid auth rejected + audit): Passed (verified via `hmac_auth_test.go`)
- AC-05 (bounded retry + dead-letter): Passed (`processor.go` implements backoff + DLQ)
- AC-06 (backlog/failed metrics): Passed (`metrics.go` + metric updates in processor loop)

## FINAL RELEASE-GATE RECOVERY & CANONICAL CLOSURE — 2026-08-24T07:58:30Z
A comprehensive corrective audit and repair was performed (resolving K-01 through K-12) to rectify post-merge issues without amending history or altering released migrations. Following a premature merge of PR #7 which circumvented failing CI checks, a final release gate recovery branch was created and successfully merged under strict governance (no bypass). Key repairs include:
- **Testing (K-03, K-04)**: Real database integration tests replaced mocked `t.Skip` placeholders for repository and processor logic. Enforcement of test execution in CI was implemented via `TASK011_REQUIRE_INTEGRATION_DB`. Added concurrency tests for stale worker overwrite prevention and dead letter queues.
- **Security & SAST**: Fixed Gosec G104 unhandled error in JSON encoder, and ensured Govulncheck and Gitleaks passed without warnings.
- **Data Integrity (K-07, K-12)**: Hardened input contracts (max lengths, no trailing JSON) and bounded metric cardinalities for rejected payloads.
- **Concurrency (K-08)**: Resolved stale-worker ownership races using exact `updated_at` optimistic lock matching instead of adding new columns.
- **API Contracts (K-05, K-06)**: Upgraded handler and HMAC middleware to return strictly formatted `application/problem+json` error responses. Fixed OpenAPI schema unresolved reference and matched runtime HMAC header names (`X-TB-Signature`, `X-TB-Timestamp`).
- **Operations (K-10, K-02)**: Injected `TB_MOODLE_EVENT_INGEST_SECRET` to the `api` container and removed exposed `--db` credentials flag from `portal-cli`.
- **Documentation**: explicitly documented in the Threat Model and Runbook that Moodle Publisher is NOT IMPLEMENTED in this task.

**TASK-011 IS FINALLY READY FOR CLOSURE AND HANDOFF TO TASK-012.**
