# TASK-009 — Observability Baseline
**Owner Agent:** DevOps/Observability Agent  
**Dependencies:** TASK-000

## Objective
Structured logging, metrics dan tracing baseline.

## Acceptance Criteria
- AC-01 Incoming request memiliki request/trace correlation.
- AC-02 API metrics mencakup request count, latency dan error.
- AC-03 Moodle adapter memiliki dependency metrics.
- AC-04 Logs tidak memuat access token/secret.
- AC-05 Dashboard/queries baseline tersedia.
- AC-06 Alert rules untuk sustained availability/error dibuat untuk staging.

## Tests
Log redaction test where feasible, trace propagation integration test.

## Definition of Done
Runbook observability dan field convention documented.
