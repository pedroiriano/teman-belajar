# TASK-027 Handoff — Full Route Online Course UI Harmonization

## Status

`DONE — MERGED via PR #30`

## Implemented

- Techwind `index-course.html` is the explicit Portal primary baseline.
- Cuba `dashboard-03.html` is the explicit Admin primary baseline.
- Portal homepage, shared inner-page hero, learning dashboard, course cards,
  progress, controls, content cards, states, and Notification route now compose
  the Online Course visual layer.
- Admin shell carries the dashboard-03 runtime marker; dashboard widgets,
  every shared page header, card, form, table, input, filter, modal, pagination,
  and state inherit the Cuba Online Course visual layer.
- Existing application behavior, Identity/SSO/RBAC, API, data, Moodle, Docker,
  and dependencies were not changed.
- The Admin bright sky/light-blue and no-orange contracts remain mandatory.

## Verification

- Portal: vendor-foundation guard, lint, typecheck, language contract,
  Notification contract, and production dependency audit passed.
- Admin: vendor-foundation, theme, no-orange, language, data-presentation, and
  Notification guards plus lint, typecheck, and production dependency audit
  passed.
- Canonical Linux/Docker frontend verification passed for both applications:
  clean `npm ci`, lint, typecheck, Next.js 16.3 production builds, and runtime
  image assertions.
- Docker configuration verification passed; only `web` and `admin` were
  recreated, both became healthy, and the standard local HTTP health checks
  returned `200` without changing topology, ports, volumes, or environment
  ownership.
- Browser acceptance passed at 1440x900 and 390x844. Portal homepage and search
  rendered their Techwind course markers in light/dark without page overflow or
  console warnings/errors. Admin dashboard, knowledge list degraded state, and
  knowledge create form rendered under the Cuba `dashboard-03` shell in
  light/dark without page overflow or console warnings/errors.
- Browser computed-style scans found zero application-controlled orange/amber
  colors on the Admin dashboard in both themes. Dark form fields, including the
  slug/SEO input family, use dark surfaces with light readable text.
- Agent-governance verification and final whitespace review passed.

## Merge record

- Source commit: `fc0d826b3ad71b7914239ae724081e4605c850c4`.
- Protected checks: 11/11 passed.
- PR: `#30`.
- Squash commit on `main`: `f6fc598ee231d2c879d7b5aca7ab13158fbaa3e8`.
- Merged at: `2026-08-26T12:16:37Z`.
- No branch-protection bypass, production deployment, secret rotation, schema
  change, or Identity/SSO/RBAC change occurred.

## Rollback

Revert the TASK-027 change. No schema, secret, Identity, Moodle, or
infrastructure rollback is needed.
