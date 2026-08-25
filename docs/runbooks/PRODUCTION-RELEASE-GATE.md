# Production Release Gate

This runbook governs promotion of Teman Belajar. It does not define or
authorize a production deployment. **No agent may approve** production release,
secret action, destructive operation, identity change, or bypass.

## Required Inputs

1. Release commit and immutable image/artifact digests.
2. Green protected checks for that exact commit.
3. Completed TASK-012 AC matrix and human decision matrix.
4. Security scan/SBOM/provenance for every deployable artifact, including
   Portal, Admin, API, workers, Moodle and infrastructure images.
5. Signed access review, backup/restore drill, performance report, staging SSO
   and Moodle-degradation report, alert-delivery test, compatibility review and
   rollback drill.
6. Named release owner, operator, security approver, Moodle owner, database
   owner, communication owner, window, go/no-go time and rollback deadline.

## Go/No-Go Sequence

1. Freeze the candidate commit; do not rebuild from mutable tags.
2. Verify every evidence artifact names that commit and artifact digest.
3. Confirm production secrets are injected from the approved secret manager.
   Never print, paste, export to Git, or place them in command arguments/URLs.
4. Confirm backup freshness meets the approved RPO and a restore drill met RTO.
5. Confirm dashboards, alert receiver and on-call acknowledgement are working.
6. Review open incidents, high/critical findings and risk acceptances.
7. Run production-like smoke tests in staging. Do not use localhost as
   production evidence.
8. Human release owner records GO or NO-GO. Silence is NO-GO.
9. Only after GO, execute the separately approved deployment procedure.
10. Observe the agreed burn-in window and use `docs/runbooks/ROLLBACK.md` when
    abort criteria are met.

## Mandatory Abort Conditions

- Evidence points to a different commit/digest.
- Any unaccepted critical/high security issue or exposed secret.
- Migration checksum missing/mismatched in strict mode.
- Backup or restore evidence is absent/stale.
- SSO, authorization, Moodle degradation, alert delivery or rollback drill
  fails.
- Required owner is unavailable or production change approval is absent.

## Evidence Record

Record timestamps in UTC and include release ID, environment, operator,
approver, results, redacted logs and SHA-256 of the evidence bundle. Never store
secrets, access tokens, session cookies or personal data in the bundle.
