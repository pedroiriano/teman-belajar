# TASK-012 Production Readiness Evidence Package

Status: **PRODUCTION HOLD — HUMAN RELEASE DECISION REQUIRED**

Audit date: 2026-08-25 (Asia/Jakarta)

Source branch: `codex/task-012-production-readiness` from fresh `main` at
`5596882e2b0ee28d9f1c26ab151327cbe883c0ea`

Integration record: [PR #20](https://github.com/pedroiriano/teman-belajar/pull/20)
passed all 11 protected checks and was merged to `main` at
`00619d68fd576c29cc49891aa49b8c32a06dfd0f`. This merge is not production
authorization.

This package is an evidence index, not a production approval. No agent may
self-approve release readiness. No production deployment, production secret
rotation, destructive operation, migration rewrite, identity-boundary change,
or branch-protection mutation was performed.

## Audit Summary

The repository has a healthy local 19-service Compose topology, local endpoint
verification, CI/SAST/SCA/secret/config scanning, OIDC/Moodle regression
evidence, and an observability stack. TASK-012 adds forward migration checksum
enforcement, stricter operational alert rules, a repeatable read-only local
performance probe, release/backup/rollback runbooks, a static readiness guard,
and minimal Portal/Admin runtime images without the unused npm package manager.

Production cannot yet be approved. The repository intentionally contains no
production deployment definition or production environment evidence. A backup
restore drill, notification delivery test, staging SSO/degradation test,
access-review sign-off, launch-time Moodle compatibility review, production
secret action, and human release decision remain external gates. The Moodle
event publisher is also not implemented, and the local Moodle build depends on
an ignored `moodle.tgz`; both require an explicit product/release disposition.

## Acceptance-Criteria Matrix

| AC | Current evidence | Status before human release approval | Required closure |
|---|---|---|---|
| AC-01 Critical journeys E2E | Prior browser evidence covers Portal/Admin/Moodle SSO/SLO and content journeys; PR #20 protected checks and final anonymous browser smoke passed | LOCAL EVIDENCE; STAGING PENDING | Execute signed release-candidate E2E in staging and attach immutable evidence |
| AC-02 Backup + restore | Governed drill procedure exists; no existing data or volume was touched | PENDING | Approve an isolated restore target, RPO/RTO, encrypted destination, and execute the drill |
| AC-03 No high/critical issue | All 11 PR #20 protected checks passed, including gosec, govulncheck, npm audit, Gitleaks and Trivy filesystem/config/API/Portal/Admin-image checks | PR PASS; COVERAGE GAP | Scan every remaining deployable image/artifact and sign any exception |
| AC-04 Performance baseline | Read-only local probe passed 40 requests/endpoint with 0% errors; p95 health 1.97ms, news 3.54ms, knowledge 2.59ms | LOCAL PASS/PROVISIONAL | Product owner approves SLO; run representative staging workload |
| AC-05 SSO Portal↔Moodle | Historical same-browser local E2E PASS; identity code remains frozen | LOCAL PASS; PRODUCTION-LIKE PENDING | Execute staging test using production-like HTTPS, cookie domains, proxies and IdP |
| AC-06 Moodle unavailable | Adapter timeout/unavailable tests and prior local degradation evidence exist | LOCAL PASS; STAGING PENDING | Run approved staging fault exercise and verify user-facing degradation/alerts |
| AC-07 Monitoring/alerts/runbook | Prometheus/Grafana/Loki/Tempo and API/inbox/SSO alert rules exist | LOCAL CONFIG PASS; DELIVERY PENDING | Select receiver/on-call owner; test firing, delivery, acknowledgement and retention |
| AC-08 Rollback | Forward-only database and application rollback runbook added | DOCUMENTED; DRILL PENDING | Approve previous immutable artifacts and run staging rollback drill |
| AC-09 Access/role review | Least-privilege design and historical local role evidence exist | HUMAN SIGN-OFF PENDING | Security owner exports authoritative inventory and signs the review |
| AC-10 Moodle compatibility | Local target is Moodle 5.2.2+; plugin `local_temanbelajar` is `v0.1.0`, maturity alpha | LAUNCH REVIEW PENDING | Recheck supported Moodle/PHP/PostgreSQL matrix, plugin maturity and vendor advisories immediately before launch |

## Human Decision Matrix

| ID | Decision required | Audit evidence | Recommendation | Explicit authorization needed |
|---|---|---|---|---|
| D-012-01 | Harden `main` protection | Strict checks exist, but `enforce_admins=false`, zero required approvals, no conversation-resolution requirement | Enable admin enforcement and conversation resolution now; require one independent approval once a second reviewer is available | Approval to mutate GitHub branch protection; no bypass |
| D-012-02 | Define production target and release window | GitHub has no discoverable deployment/environment evidence; repository documents local Compose only | Name environment owner, topology, region, domain, change window and rollback owner before any deploy | Separate production deployment approval |
| D-012-03 | Production secret rotation/revocation | Historical tasks carry production rotation as human follow-up | Rotate only through the approved secret manager with dual-control evidence; never through Git, logs or URLs | Separate secret-action approval and secure channel |
| D-012-04 | Backup RPO/RTO and restore drill | No approved isolated restore target or signed drill exists | Start with RPO 24h and RTO 4h as provisional values, then obtain business approval and drill both Portal and Moodle stores | Approval for backup destination and isolated drill/cleanup |
| D-012-05 | Legacy checksum adoption | Migrator defaults to strict; local Compose uses the already approved one-time pre-production adoption | Fresh production must remain `strict`; any established ledger with NULL checksums must stop for environment-specific human reconciliation | Explicit per-environment adoption approval; never rewrite SQL history |
| D-012-06 | Security exception register | CI scans three first-party application images but not every final runtime image; the ignored Moodle archive is not reproducible from Git | Produce signed SBOM/provenance and scan all immutable release images; accept nothing implicitly | Security owner sign-off for every high/critical exception |
| D-012-07 | Alert routing and retention | Rules evaluate locally; no Alertmanager/managed receiver or production retention evidence exists | Use an organization-owned receiver with primary/secondary on-call and test delivery | Approval to configure external receiver and retention |
| D-012-08 | Performance SLO | Local provisional thresholds are p95 ≤750ms and error rate ≤1% | Approve endpoint-specific SLOs and a representative load model; do not treat localhost as capacity evidence | Product/SRE sign-off and staging-load authorization |
| D-012-09 | Staging SSO and Moodle fault test | Local E2E exists; production-like HTTPS/proxy/cookie behavior is unproven | Execute portal→admin→Moodle silent login, three-origin logout, token expiry and Moodle outage in staging | Staging test window/fault-injection approval |
| D-012-10 | Moodle event publisher scope | TASK-011 inbox/processor exists, but `local_temanbelajar` does not publish events | Implement and release-test the publisher before enabling event-driven features, or explicitly disable those features for launch | Product scope decision; implementation is a separate task |
| D-012-11 | Moodle launch compatibility | Target evidence says 5.2.2+; plugin declares alpha maturity and broad minimum `2023100900` | Reconcile exact Moodle build, PHP 8.3, PostgreSQL 16, plugin version/maturity and supported security releases just before launch | Moodle owner/security sign-off |
| D-012-12 | Final production release | AC-02, AC-07–10 and external evidence remain open | Keep **PRODUCTION HOLD** until every row has an owner, timestamp and immutable evidence link | Exact human `APPROVE TASK-012 PRODUCTION RELEASE` decision; not implied by PR merge |

## Migration Integrity Policy

Every newly applied migration records the SHA-256 of canonical LF SQL text in
`schema_migrations.checksum_sha256`. A recorded mismatch fails closed. A legacy
NULL checksum also fails closed unless `MIGRATION_CHECKSUM_POLICY=adopt` is
explicitly selected. The binary defaults to `strict`; only the governed local
Compose environment defaults to `adopt` because the human already approved the
documented one-time pre-production history exception. The narrowly bounded
local adoption also converts a prior raw CRLF hash only when it exactly matches
the same current SQL content. Adoption never edits a migration, accepts another
content hash, or fabricates prior evidence.

## Evidence Index

- Release gate: `docs/runbooks/PRODUCTION-RELEASE-GATE.md`
- Backup/restore: `docs/runbooks/BACKUP-RESTORE-DRILL.md`
- Rollback: `docs/runbooks/ROLLBACK.md`
- Observability: `docs/runbooks/OBSERVABILITY-OPERATIONS.md`
- Environment controls: `docs/governance/ENVIRONMENT-SECURITY-MATRIX.md`
- TASK-011 reconciliation: `docs/handoffs/TASK-011-HANDOFF.md`
- Current implementation handoff: `docs/handoffs/TASK-012-HANDOFF.md`

Evidence generated outside Git must include UTC timestamp, environment,
release commit/image digests, operator, approver, redacted command/output,
result, and artifact checksum. Secrets and personal data are forbidden.

## Local Verification Snapshot

Executed 2026-08-25 against loopback Docker only:

- governed Compose registry: 19 service keys; config PASS;
- endpoint smoke: API, Portal, Admin, Keycloak, Moodle, MinIO, Meilisearch and
  Grafana HTTP 200;
- migration ledger: 16 applied, 16 checksummed, latest
  `016_create_seo_taxonomy_discovery.sql`; idempotent rerun PASS;
- Prometheus config and six alert rules: promtool PASS;
- read-only performance probe: 120 measured requests, zero errors, all three
  p95 values below the provisional 750ms threshold;
- anonymous browser smoke: Portal home/knowledge/news/announcements/search,
  Admin protected redirect and Moodle guest page PASS;
- Go test/vet/build, gosec medium+, govulncheck, frontend lint/typecheck/
  contract tests/Webpack production builds and production npm audits PASS;
- OpenAPI valid with one pre-existing recommended-rule warning for a missing
  explicit 4XX sitemap response.

This snapshot is local functional evidence only. It is not capacity,
production security, authenticated staging SSO, backup/restore, rollback, alert
delivery, access-review or launch-compatibility evidence.
