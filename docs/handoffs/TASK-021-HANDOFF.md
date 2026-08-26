# TASK-021 Handoff — Notification Center Corrective Recovery

## Status

`DONE — MERGED via PR #26`

- Base and broken canonical SHA: `bb10b118c95c3432b8c51c2e2bbc5855d8153016`.
- Working branch: `codex/task-021-task-025-regression-recovery`.
- Final reviewed head: `2d624165a38672d87c5b30faccc11df65e2c601d`.
- Protected checks: **PASS** — API, Admin, Portal, governance, OpenAPI,
  SAST Go, npm SCA for both web applications, secret scan, SBOM, and Trivy.
- Release: PR #26 was squash-merged without bypass on 2026-08-26 as
  `0a005f9ec513c73aa6ed51960092be29ccedc17a`; verified `origin/main` matched
  that SHA after fetch.
- Last-known-working committed SHA: **not found**. The previous functional
  Notification Center existed only as uncommitted worktree source and a locally
  built Docker runtime; the branch ref still pointed to its base.

## Root Cause and Recovery

TASK-021 implementation was not committed before a branch/worktree transition,
so canonical `main` retained only the planned task and an inert Admin bell.
Separately, TASK-025 follow-up work removed/inlined shared data-presentation
pieces. Recovery was surgical: no broad revert was used, and correct Indonesian
copy from the merged harmonization work was preserved.

The restored flow is:

`versioned event → idempotent delivery → PostgreSQL inbox → subject-owned API →
trusted Portal/Admin BFF → bell/inbox → read state → validated internal link`.

Migration `018_create_notification_center.sql` is additive and forward-only.
Its guarded creation also adopts the structurally compatible pre-release local
tables left by the recovered uncommitted implementation; no released migration,
ledger row, volume, or notification data is rewritten or deleted.
The application service owns validation and delivery; the repository owns
atomic preference evaluation, uniqueness, pagination, unread counts, and
subject/audience predicates. The Admin audience additionally reuses existing
server-side roles. Identity, SSO, RBAC definitions, Keycloak, Moodle, Docker
topology, and external delivery providers are unchanged.

## Security and Operations

- Event schema: `1.0`; duplicate event IDs do not create duplicate inbox rows.
- Event types and sources are allowlisted/bounded; title/body lengths are
  bounded and must not contain secrets or sensitive profile data.
- Portal/Admin links use separate internal allowlists; absolute, script,
  scheme-relative, fragmented, control-character, and cross-audience paths are
  rejected.
- Mutations are same-origin through BFF, rate-limited per subject, audited, and
  return controlled Indonesian problem details with `no-store`.
- Default retention is 90 days (accepted 1–365). Rollback reverts application
  consumers and leaves migration 018 applied.
- Email, SMS, push, SMTP, and provider adapters remain disabled/out of scope.

## UI and Verification Contract

Admin and Portal both have active, keyboard-accessible bells, bounded `99+`
unread badges, loading/empty/error/unauthorized/degraded states, paginated inbox,
single/all read actions, preferences, and safe deep-links. Admin remains
Cuba-derived with bright sky/light-blue accents and no orange; Portal remains
Techwind-derived. Final local tests, authenticated browser acceptance, protected
checks, and merge evidence are recorded in the PR and final task output.

Final local evidence includes targeted application/handler/repository tests,
Go vet, Admin/Portal lint and typecheck, production Docker builds, static
notification/language/data-presentation/no-orange guards, valid OpenAPI, and
successful migration ledger version 018. Browser QA proved the active Admin
bell/popover and controlled unauthorized state, Cuba table/error presentation,
light/dark switching, a 390 px mobile layout without body overflow, and the
Techwind Portal copy/themes. The retained Pedro browser session could not renew
its Keycloak token (`invalid_grant`), and no authenticated Chrome/Edge session
was available. Therefore browser-only read/unread mutation remains an explicit
environment-limited acceptance item; it was not replaced with mock data,
hard-coded counts, credential reuse, or an identity change. Server tests cover
read/unread persistence, cross-user denial, idempotency, preference suppression,
unsafe deep-link rejection, and rate limiting.

Canonical references:

- `docs/governance/NOTIFICATION-CENTER.md`
- `docs/threat-models/TASK-021-NOTIFICATION-CENTER.md`
- `docs/runbooks/NOTIFICATION-CENTER-OPERATIONS.md`
- `openapi/openapi.yaml`
- `docs/diagrams/erd.mmd`

Next safe roadmap action after release is TASK-015 readiness analysis; starting
TASK-015 remains a separate task and decision.
