# Moodle Event Inbox — Operations Runbook

## Architecture
The Moodle Event Inbox is an internal service-to-service endpoint hosted within the `portal-api` process. Moodle plugins send signed HTTP requests containing learning events. Events are stored idempotently in `integration.event_inbox` and processed asynchronously by a background goroutine within the same API process.

## Endpoint
`POST /api/v1/internal/moodle/events`

## Authentication
- HMAC-SHA256 signature in `X-TB-Signature` header
- Unix timestamp in `X-TB-Timestamp` header
- Signed payload: `timestamp\nbody`
- Window: ±5 minutes
- Secret: `TB_MOODLE_EVENT_INGEST_SECRET` (must match in API and Moodle plugin)

### Secret Rotation
1. Generate new secret
2. Update `TB_MOODLE_EVENT_INGEST_SECRET` in API environment
3. Update corresponding value in Moodle plugin configuration
4. Restart both services
5. Verify event delivery resumes

## Event Processing States
| Status | Description |
|--------|-------------|
| `pending` | Received, awaiting processing |
| `processing` | Claimed by processor |
| `processed` | Successfully processed, outbox entry created |
| `dead_letter` | Failed after 5 attempts |

## Backlog Monitoring
- **Metric**: `event_inbox_backlog{status="pending"}` — pending events
- **Metric**: `event_inbox_backlog{status="dead_letter"}` — dead-letter events
- **Alert threshold**: pending > 100 for > 10 minutes
- **Alert threshold**: dead_letter > 0

## Retry Policy
- Max attempts: 5
- Backoff: exponential (30s, 60s, 120s, 240s)
- Non-retryable: validation errors, auth failures (never stored)

## Dead-Letter Reconciliation
```sql
-- Inspect dead-letter events
SELECT id, event_id, event_type, attempts, error_category, created_at
FROM integration.event_inbox WHERE status = 'dead_letter' ORDER BY created_at DESC;
```

To requeue a dead-letter event for reprocessing, use the reconciliation repository method or:
```sql
-- Requeue specific event (preserves attempt history)
UPDATE integration.event_inbox
SET status = 'pending', next_attempt_at = NULL, error_category = NULL, updated_at = NOW()
WHERE event_id = '<event_id>' AND status = 'dead_letter';
```

## Stuck Processing Recovery
Events stuck in `processing` status for longer than 5 minutes are automatically reclaimed by the processor's stale threshold mechanism.

## Duplicate Behavior
- Same `event_id` + same content → 202 Accepted (benign duplicate, no side effect)
- Same `event_id` + different content → 409 Conflict (collision, audit event recorded)

## Moodle Unavailable
If Moodle cannot reach the API, events are not delivered. No data loss occurs because events remain in Moodle until successful delivery.

## API Unavailable
The Moodle plugin should retry delivery with bounded attempts and backoff.

## Safe Operator Actions
- Inspect event inbox via SQL SELECT
- Requeue dead-letter events via reconciliation
- Monitor metrics dashboards

## Explicitly Forbidden
- Direct production DML on non-dead-letter events
- Deleting inbox rows
- Modifying event payloads
- Exposing event ingest secret
- Disabling HMAC authentication
