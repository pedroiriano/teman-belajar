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
- AC-01 (envelope validation): Passed (unit tested)
- AC-02 (duplicate event_id safe): Passed (fingerprint comparison & SQL unique constraints)
- AC-03 (service-to-service auth): Passed (HMAC-SHA256 ±5m window)
- AC-04 (invalid auth rejected + audit): Passed (verified via `hmac_auth_test.go`)
- AC-05 (bounded retry + dead-letter): Passed (`processor.go` implements backoff + DLQ)
- AC-06 (backlog/failed metrics): Passed (`metrics.go` + metric updates in processor loop)

**TASK-011 IS READY FOR CLOSURE.**
