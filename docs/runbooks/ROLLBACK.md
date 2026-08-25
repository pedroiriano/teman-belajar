# Production Rollback

Rollback requires a named **human release owner** and a separately approved
production change. Database migrations are **forward-only**: never rewrite
released SQL, decrement `schema_migrations`, restore over live data, or run an
unreviewed down migration.

## Preconditions

- Exact current and previous immutable artifact digests.
- Compatibility statement for previous application code against the current
  database schema.
- Fresh verified backup and approved recovery point.
- Named application, database, Moodle, identity and communication owners.
- Abort thresholds and deadline agreed before deployment.

## Decision Tree

1. If only stateless application code is defective and the previous artifact
   is schema-compatible, redeploy that immutable artifact and verify health,
   authorization, SSO, Moodle integration, metrics and queues.
2. If a new additive migration is defective but old code remains compatible,
   roll back application artifacts and create a separately reviewed
   forward-fix migration. Do not remove columns/tables during the incident.
3. If data integrity is compromised, stop writes, preserve evidence and invoke
   the approved disaster-recovery procedure. A point-in-time restore is a
   destructive recovery action and requires explicit approval.
4. If Identity/SSO is involved, stop. The finalized identity boundary requires
   the exact overriding human authorization before any configuration change.

## Verification and Closure

Verify the exact deployed digest, health/readiness, error/latency SLO, Portal
and Admin authorization, Moodle graceful degradation, backlog recovery and
alert acknowledgement. Record timestamps, actors, redacted evidence, customer
impact and follow-up. Do not call rollback complete until the human release
owner signs the evidence.
