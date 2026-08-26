# TASK-013 HANDOFF — Pelatihan Penuh / Full Training Programs

## Release state

**IMPLEMENTED — LOCAL VERIFICATION.** The bounded implementation and local
verification gates pass. No branch, commit, pull request, merge, or production
deployment is claimed by this handoff.

- Migration: `019_create_training_programs.sql`.
- Portal routes: `/training-programs` and `/training-programs/{slug}`.
- Admin route: `/dashboard/training-programs`.
- User-owned untracked logo PNG files at repository root were untouched.

## Implemented scope

- Added Portal-owned program metadata, ordered Moodle course references,
  cohort schedules, optimistic versions, and draft/review/approved/published/
  archived workflow.
- Added public catalogue/detail, authenticated learner aggregation, and Admin
  authoring/workflow APIs with strict query/body validation, pagination,
  server-side role enforcement, audit events, and publication isolation.
- Added Moodle-derived course enrichment, enrolment/progress aggregation, a
  freshness timestamp, and explicit fresh/degraded provenance. The Portal does
  not store Moodle enrolment, completion, or progress as authoritative data.
- Added truthful learner CTAs: `start`/`review` is returned only after confirmed
  Moodle enrolment; unresolved access remains `check_access` and `unverified`.
- Added Techwind Portal catalogue/detail and Cuba Admin composition UI with
  loading, empty, error, unauthorized, and dependency-degraded states.
- Added the aggregation metric, OpenAPI contract, ERD/database documentation,
  navigation and route-matrix updates, regression guards, and operations
  runbook.

## Security and architecture boundaries

- Moodle access uses the existing `integration/moodle` adapter; no Moodle
  database query, Moodle core change, or duplicated formal learning state was
  introduced.
- Actor and role data comes from validated claims. Reviewers cannot create or
  edit programs, and public reads expose published programs only.
- Identity, SSO, account management, role mapping, Keycloak configuration,
  Docker topology, host bindings, and production state are unchanged.
- Migration 019 is additive and forward-only. Rollback reverts application
  code while retaining schema/data.

## Verification ledger

| Gate | Result |
|---|---|
| Training domain aggregation, workflow, authz, degraded and CTA tests | PASS |
| HTTP strict-body, query allowlist, pagination and negative-authz tests | PASS |
| PostgreSQL publication isolation/composition integration test | PASS against migrated local PostgreSQL |
| Full API `go test ./...` and `go vet ./...` | PASS |
| Portal/Admin lint, typecheck, TASK-013 guards and vendor-foundation guards | PASS |
| Admin theme and no-orange regression guards | PASS |
| Portal/Admin production builds | PASS with webpack fallback; native Windows SWC/Turbopack binary is unavailable locally |
| Dependency audit | PASS, zero high-severity production findings in both frontends |
| OpenAPI | PASS Redocly 2.7.0; one pre-existing sitemap 4XX-response warning |
| Final API/migrator and Portal/Admin production images | PASS through safe official wrapper actions; runtime services remain healthy |
| Migration 019 | PASS: 19 applied, 19 checksummed, latest `019` |
| Portal browser catalogue/detail, keyboard, theme, empty and degraded states | PASS |
| Admin browser loading/error/empty shell | PASS; authenticated editor journey was unavailable because the pre-existing browser session token was stale |
| Static SAST for changed training packages | PASS; broader scan retains three pre-existing `cmd/api/main.go` G706 log warnings |

Browser QA used temporary local program and Moodle course fixtures. The Portal
program and cohort/course references were deleted. Moodle course deletion hit
the existing local `mdl_zoom` schema drift, so the exact temporary course
`TASK013-QA-TEMP` (ID 19) was made hidden and is not discoverable to learners.
This residual local-only record contains no user, enrolment, credential, or
production data.

Read-only Moodle diagnostics confirmed `mod_zoom` v5.5.0 is marked `uptodate`
at database/disk version `2026041600`, while its declared `zoom` and
`zoom_meeting_details` tables are absent. Moodle reports no pending upgrade.
Repair therefore requires a human-approved plugin/schema recovery decision;
direct database repair or plugin reinstall is outside TASK-013. Fixture cleanup
is `BLOCKED_HUMAN_DECISION` until that recovery is authorized.

The final official `up` rerun was intentionally not executed because that
wrapper action also reconciles Keycloak SSO clients and TASK-013 has no
`OVERRIDE IDENTITY BOUNDARY` authorization. Final images were built through
`migrate-verify` and `frontend-image-verify`, and the read-only health wrapper
was run separately; no workaround or Identity repository change was made. An
earlier pre-refinement local `up` run had completed its built-in idempotent SSO
client reconciliation successfully; it was not repeated on the final source.

## Remaining human-owned gates

- Review the scoped diff, create the TASK-013 branch/commit/PR, and run
  protected CI on the final SHA.
- Perform authenticated Admin browser acceptance with a fresh local session if
  interactive form-level evidence is required before merge.
- TASK-012 `PRODUCTION HOLD` and all production decisions remain unchanged.
