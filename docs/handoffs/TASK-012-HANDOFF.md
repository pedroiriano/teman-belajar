# TASK-012 Handoff — Production Readiness

## Disposition

Implementation status: **RELEASE-CANDIDATE HARDENING COMPLETE / PR PENDING**

Production status: **HOLD — HUMAN RELEASE APPROVAL REQUIRED**

TASK-012 began from fresh `main` commit
`5596882e2b0ee28d9f1c26ab151327cbe883c0ea`. This task does not deploy
production and does not self-approve the release.

## Safe Changes Implemented

1. Migration ledger now records canonical-LF SHA-256 for each new SQL migration and rejects
   any mismatch. Legacy NULL checksums fail closed unless the environment uses
   an explicit one-time `adopt` policy. The binary default is `strict`.
2. Governed local Compose uses `adopt` only for the previously approved
   pre-production migration-history exception. No SQL migration was edited and
   no database was reset.
3. Prometheus alert rules now cover high API latency, failed/pending Moodle
   inbox state and SSO failure bursts; the error-rate expression is safe for a
   zero-request denominator.
4. A read-only, loopback-by-default performance baseline script and a static
   readiness regression guard were added. CI runs the static guard.
5. Canonical release-gate, backup/restore and rollback runbooks plus the
   evidence/human-decision matrix were added.
6. Portal/Admin final images remove npm/npx after the build stage. The first PR
   scan exposed one critical and eight high npm-package findings in the Portal
   runtime; no ignore rule or risk exception was added.

## Audit Findings Carried to Humans

- GitHub `main` requires 11 strict checks, but administrator enforcement,
  independent review and conversation resolution are disabled. No setting was
  changed.
- No production GitHub environment/deployment evidence was discoverable.
- Alert evaluation exists, but receiver delivery/on-call acknowledgement and
  production retention are not evidenced.
- Backup/restore and rollback need an approved isolated staging target and
  drill; no live data or Docker volume was touched.
- CI now scans API, Portal and Admin final images, but production evidence must
  still cover workers, Moodle and every pinned infrastructure artifact.
- The Moodle build uses an ignored licensed `moodle.tgz`; immutable production
  provenance must be supplied outside Git through an approved artifact channel.
- `local_temanbelajar` remains `v0.1.0`/alpha and the TASK-011 Moodle event
  publisher remains unimplemented. These are explicit product/release decisions,
  not facts an agent may waive.
- Production secret rotation/revocation, production SSO/SLO and immediate
  launch compatibility review remain human-controlled.

The authoritative status and recommendations are in
`docs/readiness/TASK-012-PRODUCTION-READINESS.md`.

## Boundary and Safety Record

- Identity/Keycloak/SSO/account-management logic: unchanged.
- Moodle core: unchanged.
- Migration SQL/history: unchanged; checksum metadata only.
- Production deployment/secret rotation/destructive action: not performed.
- Branch protection: read-only audit only; no bypass or mutation.
- `latest_prompt.txt`: remains untracked and excluded from every commit.
- TASK-012 PR must not be merged without explicit human approval.

## Verification Evidence

| Gate | Result |
|---|---|
| TASK-012 static guard / agent governance | PASS / PASS |
| Go test / vet / build | PASS / PASS / PASS |
| Migrator checksum regression | PASS; fresh apply, mismatch rejection, legacy strict rejection/adoption and orphan-ledger rejection covered |
| Local migration ledger | PASS; 16 applied = 16 checksummed; latest 016; migrator exit 0 |
| Portal lint / typecheck / hierarchy / Webpack build | PASS |
| Admin lint / typecheck / theme / no-orange / media / drafts / hierarchy / Webpack build | PASS |
| Portal/Admin production npm audit | PASS; 0 vulnerabilities each |
| Portal/Admin final image npm/npx absence | PASS; governed Docker build and runtime assertion |
| govulncheck / gosec medium+ | PASS; 0 reachable vulnerabilities / 0 issues |
| Redocly OpenAPI | PASS; valid with one pre-existing sitemap 4XX warning |
| Prometheus config / alert rules | PASS; six rules |
| Docker config / eight endpoint smoke | PASS; 19 services / all HTTP 200 |
| Local performance probe | PASS; 120 requests, 0 errors; p95 1.97/3.54/2.59ms |
| Anonymous browser smoke | PASS for five Portal pages, Admin sign-in redirect and Moodle guest page |
| Authenticated staging SSO / backup restore / rollback / alert delivery / role sign-off / launch compatibility | PENDING HUMAN-CONTROLLED EVIDENCE |

The local Windows native Turbopack optional binding was unavailable, so the
production frontend build was additionally verified with Next.js Webpack;
protected CI remains authoritative for the normal Linux Turbopack build.

PR and protected-check links are appended after publication. Until every human
gate is closed, this handoff must not be interpreted as production approval.
