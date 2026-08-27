# TASK-014 HANDOFF — Pembelajaran Singkat / Microlearning

## Release state

**DONE — MERGED.** The bounded implementation, local verification, and all
protected CI gates passed. Source PR #35 was squash-merged at
`2026-08-27T05:23:18Z`.

- Source PR: `#35` — https://github.com/pedroiriano/teman-belajar/pull/35
- Final reviewed head: `8f0a05f00c5c844028658e8ebb29755a2a10efa1`.
- Squash merge: `ed41afbc28e545d1ac2b2ba517eae9095c59a6da`.
- Production deployment remains unauthorized and unclaimed; TASK-012
  `PRODUCTION HOLD` remains unchanged.
- Migration: `020_create_microlearning.sql`.
- Portal routes: `/microlearning` and `/microlearning/{slug}`.
- Admin route: `/dashboard/microlearning`.
- Canonical Teman Belajar logo, favicon, app icon, and web manifest are active
  on both Portal and Admin; the previous placeholder/default icon is removed.
- User-owned untracked logo PNG files at repository root were untouched.

## Implemented scope

- Portal-owned authoring workflow for article, video, and quick learning items
  with 3–15 minute duration, optimistic versioning, publication isolation,
  related items, SEO fields, and curated Media cover.
- Public discovery/detail with accessible filters, responsive Techwind course
  composition, structured `LearningResource` metadata, related content, and
  explicit editorial provenance.
- Authenticated idempotent bookmark and resume progress. Progress is explicitly
  not Moodle completion, assessment, grade, or certification.
- Search source for published/indexable microlearning and safe fallback when
  Search or Media delivery is unavailable.
- Cuba Admin workspace with role-aligned workflow, canonical Media Picker, SEO,
  related-content selection, loading/empty/error/unauthorized behavior, and no
  orange/amber application state.
- Shared `BrandLogo` components and reproducible brand-asset generation keep
  Portal/Admin assets synchronized without crossing Techwind/Cuba boundaries.

## Security and architecture boundaries

- No Moodle database/core access, formal learning engine duplication, identity,
  SSO, account, Keycloak, Docker topology, or production change.
- Video uses a validated HTTPS source; no upload MIME expansion, transcoder,
  new service, dependency, or provider contract was introduced.
- Migration 020 is additive and forward-only. Media storage internals remain
  private and Reviewer media/content mutations remain server-denied.

## Verification ledger

| Gate | Result |
|---|---|
| Microlearning domain, workflow, provenance, idempotence, malformed/unpublished tests | PASS |
| Full Portal API `go test ./...` and `go vet ./...` | PASS |
| Live migrated-Postgres authoring → review → approval → publication → idempotent progress integration | PASS; fixture removed |
| Handler authz, unknown-field/query, draft isolation, Media eligibility, engagement, and Search source tests | PASS |
| Portal/Admin lint, TypeScript typecheck, Microlearning contract | PASS |
| Techwind/Cuba vendor-foundation, Admin theme, and no-orange guards | PASS |
| Canonical branding assets, favicon metadata, and web manifests | PASS — generated hashes synchronized; Portal/Admin assets return 200 |
| Linux Docker build and healthy local API/Portal/Admin runtime | PASS |
| Migration wrapper/checksum verification | PASS — 20 applied and checksummed migrations; latest `020` |
| OpenAPI Redocly 2.7.0 | VALID; one unchanged sitemap 4XX warning remains outside TASK-014 |
| Browser catalogue/filter/detail/related/SEO/sitemap/Search, mobile overflow, focusable keyboard semantics, light/dark | PASS; temporary QA content and Search documents removed |
| Browser logo/favicon/manifest rendering on Portal and Admin | PASS — visible images loaded at 80×80; favicon/app-icon links valid; no console errors |
| `govulncheck` and production `npm audit` (Portal/Admin) | PASS — 0 reachable / 0 production vulnerabilities |
| Protected CI on PR #35 | PASS — all 11 required checks at final reviewed head `8f0a05f` |
| `gosec` | PASS — static list queries remove G202; 0 findings on final CI SHA |

The local Search Worker Microlearning source completed with zero documents
after QA cleanup. Its separate pre-existing Moodle course source still reports
one hidden-course visibility error; no Moodle, Identity, or authorization
configuration was changed as part of TASK-014.
