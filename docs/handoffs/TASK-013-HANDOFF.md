# TASK-013 HANDOFF — Pelatihan Penuh / Full Training Programs

## Release state

**DONE — MERGED.** The bounded implementation, fresh authenticated Admin
acceptance, local verification, and protected CI gates passed. Source PR #33
was squash-merged at `2026-08-27T00:31:10Z`.

- Source PR: `#33` — https://github.com/pedroiriano/teman-belajar/pull/33
- Final reviewed head: `ca8b20174a838cf059b39a7e0ac8a747d38f754b`.
- Squash merge: `5ec7893cba6ec5fff634d734d6d811d891a242cf`.
- Production deployment remains unauthorized and unclaimed.

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
- Enforced Alpine OpenSSL `3.5.8-r0` or newer in API, Portal, and Admin runtime
  images after protected Trivy identified CVE-2026-14456 in the inherited
  `3.5.7-r0` packages.

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
| Admin authenticated browser create/edit, one-course composition, cohort, and draft → review → approved → published → archived workflow | PASS with a fresh Portal Administrator session |
| Admin responsive Light/Dark and accessibility semantics | PASS at 390×844 with no horizontal overflow; mobile navigation, labelled native controls, focusable actions, and skip-link semantics verified |
| Admin error/degraded behavior | PASS before dependency recovery: the Moodle catalogue failed closed and composition remained locked |
| Admin authz | PASS: Portal Administrator authoring/review controls matched validated claims; reviewer mutation denial remains covered by domain/HTTP negative tests |
| Static SAST for changed training packages | PASS; broader scan retains three pre-existing `cmd/api/main.go` G706 log warnings |

Protected CI on PR #33 passed all 11 required checks at final reviewed head
`ca8b201`, including API, both frontends, governance, OpenAPI, SAST, SCA,
SBOM, secret scan, and Trivy.

Browser QA used temporary local program and Moodle course fixtures. The exact
Portal program and its cascaded cohort/course references were deleted and
verified absent. The temporary Moodle integration-user enrolment was removed,
and course ID 19 was restored to hidden. Moodle course deletion hit
the existing local `mdl_zoom` schema drift, so the exact temporary course
`TASK013-QA-TEMP` (ID 19) was made hidden and is not discoverable to learners.
This residual local-only record contains no QA enrolment, credential, or
production data.

The local Moodle web-service token had also drifted. A replacement token was
issued through Moodle's official token API for the existing restricted
integration user, persisted only in ignored `infrastructure/docker/.env`, and
injected into the API/search/analytics containers. No role, capability,
Keycloak, SSO, account-management, source-controlled secret, or production
configuration was changed.

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

## Remaining human-owned constraints

- Moodle fixture course ID 19 cleanup remains `BLOCKED_HUMAN_DECISION` pending
  an approved `mod_zoom` plugin/schema recovery plan.
- TASK-012 `PRODUCTION HOLD` and all production decisions remain unchanged.
