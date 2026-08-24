# TASK-011 Threat Model: Moodle Event Inbox

## Scope
POST /api/v1/internal/moodle/events — service-to-service endpoint for receiving Moodle learning events.

## Threat Matrix

| # | Threat | Mitigation | Status |
|---|--------|-----------|--------|
| T01 | Forged request | HMAC-SHA256 signature validation with dedicated secret | MITIGATED |
| T02 | Invalid signature | Constant-time comparison, reject 401, audit event | MITIGATED |
| T03 | Expired request | ±5 minute timestamp window | MITIGATED |
| T04 | Replay attack | Timestamp + idempotent event_id prevents replay side effects | MITIGATED |
| T05 | Duplicate delivery | Unique event_id constraint, fingerprint comparison | MITIGATED |
| T06 | event_id collision (changed payload) | Fingerprint mismatch → 409 Conflict + audit event | MITIGATED |
| T07 | Oversized body | 512KB MaxBytesReader limit → 413 rejection | MITIGATED |
| T08 | Malformed JSON | Strict decode with DisallowUnknownFields → 422 | MITIGATED |
| T09 | Unsupported schema version | Validation rejects non-allowlisted versions | MITIGATED |
| T10 | Unsupported event type | Validation rejects non-catalogue types | MITIGATED |
| T11 | Poisoned payload | Payload stored as JSONB, not executed; processing is bounded | MITIGATED |
| T12 | Concurrent double processing | FOR UPDATE SKIP LOCKED prevents dual claim | MITIGATED |
| T13 | Retry storm | Exponential backoff (30s base, 2×), max 5 attempts | MITIGATED |
| T14 | Stuck processing | Stale threshold (5 min) reclaims abandoned events | MITIGATED |
| T15 | Dead-letter accumulation | Metrics gauge + reconciliation tooling | MITIGATED |
| T16 | Database contention | SKIP LOCKED avoids row-level blocking | MITIGATED |
| T17 | Event payload/PII leakage | Payload not logged; metrics use bounded labels only | MITIGATED |
| T18 | Metric-label leakage | No event_id/subject_id/email in labels | MITIGATED |
| T19 | Log leakage | No raw signature/secret/payload in logs | MITIGATED |
| T20 | Secret leakage | Secret in env only; fail-closed on placeholder | MITIGATED |

## Authentication Design
- HMAC-SHA256 over `timestamp\nbody` using dedicated `TB_MOODLE_EVENT_INGEST_SECRET`
- Secret isolated from OIDC, Moodle WS, logout bridge, and database credentials
- Constant-time signature comparison via `crypto/subtle.ConstantTimeCompare`
- Security audit events recorded without exposing signature or secret values

## Data Classification
- Event payloads may contain Moodle user IDs (subject_id) — not PII but pseudonymous identifiers
- No email, name, or credential data in canonical event envelope
- Payload stored in plain JSONB (infrastructure disk encryption is required for at-rest security; PostgreSQL TDE is not present).

## System Boundary & Pending Components
- **Moodle Publisher Not Implemented**: The Moodle plugin component responsible for generating the HMAC signature and dispatching the event is NOT implemented in TASK-011. The threat model currently only covers the Portal API ingestion boundary.

## Residual Risks
- Secret rotation requires coordinated API+Moodle restart (no zero-downtime rotation yet)
- Event ordering is not guaranteed (events processed in approximate FIFO, not strict)
