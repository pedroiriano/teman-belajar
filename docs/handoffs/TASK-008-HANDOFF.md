# TASK-008 — Engagement Platform Handoff

## 1. Executive Summary

TASK-008 implements Portal-owned engagement for published Knowledge: bookmark, one-user-one-rating, bounded recently viewed, and deterministic recommendations. It also completes the Phase 0 Cuba desktop/mobile sidebar correction, adds resilient server-side Keycloak token refresh for Portal BFF calls, and establishes one cross-agent constitution for Gemini, Codex/ChatGPT, Antigravity, and humans.

## 2. Initial Git State

Work started on `codex/task-008-engagement` created directly from fetched `origin/main` at `d93dd941da705de668246b44aa6fc005bb4590ca`. The stale local `main` was not reset or used as the base.

## 3. TASK-007R Baseline

TASK-007R is the inherited release baseline. Search remains a derived discovery boundary, Moodle remains the formal-learning owner, and Portal PostgreSQL remains the engagement owner.

## 4. History-Rewrite Safety Check

No force push, force-with-lease, filter-repo, filter-branch, reset, reflog deletion, or history rewrite was performed. Local recovery material, `refs/original`, ignored backups, and volumes were preserved.

## 5. Production Credential Follow-Up State

`HUMAN FOLLOW-UP REQUIRED`. Development verification may proceed, but production readiness remains on HOLD until the TASK-007R credential rotation/revocation work is independently confirmed.

## 6. Source-of-Truth Documents Read

The root constitution, governance, canonical 01–12, ADR-001–014, design-system documents, Docker governance, TASK-005R/006R/007R, Search runbook, repository structure, and the complete TASK-008 master prompt were reviewed. `GEMINI.md` now imports `AGENTS.md`, `AI-AGENT-ALIGNMENT.md`, and `SOURCE-OF-TRUTH.md` instead of duplicating policy.

## 7. Phase 0 Cuba Sidebar Root Cause

The Admin shell coupled desktop and mobile visibility and provided no persistent desktop reopen control after closure. Focus containment/restore and body-scroll behavior also needed explicit mobile treatment.

## 8. Desktop Sidebar Close

The Cuba-derived desktop sidebar exposes `Tutup sidebar admin`, carries `aria-controls="admin-sidebar"`, and collapses the sidebar while expanding the content layout.

## 9. Desktop Sidebar Reopen

When collapsed, the top bar exposes `Buka sidebar admin`; authenticated browser QA confirmed it restores the sidebar and `aria-expanded=true`.

## 10. Mobile Sidebar Regression

Mobile state is separate from desktop state. The drawer has an overlay, X control, route-close behavior, Escape handling, focus entry/trap/restore, and body-scroll lock.

## 11. Sidebar Accessibility

Controls have stable accessible names, `aria-controls`, `aria-expanded`, a dialog landmark on mobile, Escape close, and focus restoration to the opener.

## 12. Authenticated Admin QA

Authenticated QA used the ignored local development Admin identity without recording credentials. Dashboard, Cuba navigation, desktop close/reopen, mobile 390×844 drawer, Escape, focus restore, and dark theme passed.

## 13. Design-System Reconciliation

Portal engagement uses Techwind-derived semantic cards, badges, buttons, typography, responsive grids, theme tokens, footer/header, and icon system. Admin changes remain within the independent Cuba-derived shell; no Techwind global theme crosses into Admin.

## 14. Engagement Requirements

Implemented F-ENG-001 Bookmark, F-ENG-002 Rating, F-ENG-003 Recently Viewed, and F-ENG-004 deterministic Recommendation Rules. TASK-009 functionality is not included.

## 15. Engageable Target Matrix

`knowledge`: bookmark YES, rating YES, recent view YES, recommendation YES. `course`, `news`, and `announcement`: NO in TASK-008 because their final product journeys and rating semantics are not yet approved.

## 16. Identity Model

The API derives `user_subject` only from the validated OIDC access-token `sub`. Email, username, query parameters, request bodies, and route parameters cannot select another user.

## 17. Engagement Domain Architecture

The implementation follows transport → application → domain → ports/adapters. HTTP handlers contain parsing/response work; business rules live in `internal/application/engagement`; PostgreSQL and Search are behind declared interfaces.

## 18. Target Resolver

The Knowledge resolver re-reads the authoritative Knowledge repository on every write/list/recommendation. Missing, unpublished, or archived targets are rejected or omitted; Search metadata is never treated as authority.

## 19. Database Migration

Migration `005_create_engagement_tables.sql` creates the three engagement tables. Docker migration exited 0 and direct PostgreSQL inspection confirmed all three tables.

## 20. Bookmark Schema

`engagement_bookmarks` stores UUID row ID, opaque `user_subject`, target type/ID, and creation time. A unique constraint makes repeated PUT idempotent.

## 21. Rating Schema

`engagement_ratings` stores one integer rating 1–5 per subject/target with created/updated timestamps. The database and application both enforce bounds.

## 22. Recent View Schema

`engagement_recent_views` stores first/last-view timestamps and a view counter per subject/target. Repeated views update one row.

## 23. Indexes/Constraints

Unique subject-target constraints exist on all three tables. User ordering, target aggregate, and recent-retention query indexes are included and exercised by the integration test.

## 24. Bookmark API

`GET /api/v1/me/bookmarks` and `PUT|DELETE /api/v1/me/bookmarks/{targetType}/{targetId}` are implemented and documented. Personal responses are `no-store`.

## 25. Rating API

`GET|PUT|DELETE /api/v1/me/ratings/{targetType}/{targetId}` supports the current user's value with strict one-object JSON validation on PUT.

## 26. Rating Summary

`GET /api/v1/ratings/{targetType}/{targetId}` returns only public average/count and is cacheable for 60 seconds; it never exposes raters.

## 27. Recent View API

`GET /api/v1/me/recent-views` and `PUT /api/v1/me/recent-views/{targetType}/{targetId}` are implemented. Retention is capped at 50 unique targets per user.

## 28. Recommendation API

`GET /api/v1/me/recommendations` accepts bounded `limit` and optional `content_type=knowledge`; unknown parameters and unsupported types fail validation.

## 29. OpenAPI Contract

`openapi/openapi.yaml` contains all paths, schemas, target parameters, rating constraints, recommendation reasons, and problem responses. Redocly CLI 2.7.0 validation passed with zero errors/warnings.

## 30. Authentication

All personal routes use the existing issuer/audience/signature-validating middleware. Portal BFF tokens remain server-only. Expired access tokens are renewed server-side from the HttpOnly NextAuth JWT refresh token; no token is placed in session JSON or browser JavaScript.

## 31. IDOR Protection

No personal endpoint accepts a user ID. Handler tests send user-selector attempts and verify rejection; service tests prove two subjects cannot read or mutate one another's rows.

## 32. Target Eligibility

Only UUID Knowledge targets with a published revision and non-archived status are eligible. Unavailable/private targets cannot be created as engagement state and are filtered from lists.

## 33. Bookmark Semantics

PUT is idempotent; DELETE is safe when absent; list order is newest first; authoritative target data is returned without subject identifiers.

## 34. Rating Semantics

Ratings are integer 1–5, upsert per subject/target, replaceable, removable, and aggregated without exposing identities.

## 35. Recent View Semantics

The Portal records a view only after a successful meaningful Knowledge render. Upsert increases `view_count` and moves `last_viewed_at`.

## 36. Recent View Data Minimization

Only target identity, timestamps, count, and OIDC subject are stored. Query text, referrer, device fingerprint, body content, email, and browser history are not stored. The list retains at most 50 unique targets.

## 37. Recommendation Rule Architecture

Recommendations are deterministic and rule-based. The application asks the existing Search application boundary for candidates, then re-resolves every candidate authoritatively.

## 38. Recommendation ADR if created

ADR-015 records the deterministic approach, Search-as-discovery boundary, seed exclusion, controlled reasons, graceful outage behavior, and rejection of AI/LLM or a new service.

## 39. Recommendation Signals

Signals are bookmarks, recent views, and ratings ≥4. Candidate discovery is restricted to Knowledge and the current target matrix.

## 40. Recommendation Ranking

Weights are fixed, recency is bounded, duplicates collapse by target, seed targets are excluded, and ties resolve by published timestamp, type, then ID for stable output.

## 41. Recommendation Explanation

The wire enum is controlled: `same_category`, `recent_interest`, `popular_rating`, or `fallback_recent`. Portal copy maps these to factual Indonesian explanations.

## 42. Recommendation Fallback

With no personal signals, newest eligible public Knowledge is returned with `personalized=false` and neutral UI heading/copy.

## 43. Search Dependency

Engagement depends only on the Search application interface and never imports Meilisearch directly. Search supplies candidate IDs; Knowledge remains authoritative.

## 44. Search-Down Behavior

With Meilisearch intentionally stopped, bookmark listing still returned data while recommendations returned problem status 503. Search was restarted, reached healthy, and Portal remained usable.

## 45. Portal Techwind UI

Knowledge detail now has a Techwind-derived hero, breadcrumb, metadata, engagement card, content card, related section, global header/footer/theme/back-to-top, and responsive composition.

## 46. Bookmark Button

The control has `aria-pressed`, explicit accessible names, optimistic state with rollback, pending disablement, and live success/failure feedback. Browser QA verified save, delete, save, and reload persistence.

## 47. Rating Control

Native radio inputs provide 1–5 keyboard semantics, labels, checked state, aggregate copy, optimistic rollback, and live feedback. Browser QA changed 4 to 5 and observed `5.0 dari 5 · 1 penilaian`.

## 48. Recently Viewed UI

The canonical learner surface is `/my-learning`. It shows a bounded `Terakhir Dilihat` section only when data exists and records Knowledge views without blocking article rendering.

## 49. Recommendation UI

`/my-learning` renders Techwind cards, neutral fallback heading, personalized heading only when signaled, controlled reasons, skeleton loading, and section omission on failure.

## 50. Guest/Auth UX

Guests see aggregate rating and an instruction to sign in. Bookmark/rating actions use a safe relative callback. Moodle-unmapped users still receive Portal-owned engagement sections.

## 51. BFF Security

Only bounded engagement BFF routes exist; there is no generic proxy. Target type/UUID, method, rating JSON, timeout, response media type, and no-store headers are enforced.

## 52. CSRF/Same-Origin Review

Writes reject cross-site `Sec-Fetch-Site` values and compare `Origin` to public forwarded host/protocol. This is reverse-proxy aware without accepting a foreign origin.

## 53. Privacy Review

Responses never include `user_subject`; aggregates never expose raters; logs and UI contain no token/email selector; personal responses are not cacheable.

## 54. Logging

No credential, access token, refresh token, subject, query text, or rating actor is logged by the new code. User-facing errors are mapped without returning internal dependency details.

## 55. Repository Tests

Full `go test ./...` passed, including new engagement application, handler, and PostgreSQL tests plus existing Search, CMS, Knowledge, Moodle adapter, middleware, and media coverage.

## 56. Bookmark Tests

Tests cover idempotency, isolation, published-target eligibility, hidden-target rejection, list resolution, and handler contract.

## 57. Rating Tests

Tests cover bounds, upsert/update, aggregate, current-user value, isolation, deletion, and strict payload parsing.

## 58. Recent View Tests

Tests cover upsert, count/timestamp behavior, 50-target retention, isolation, and list resolution.

## 59. Recommendation Tests

Tests cover deterministic order, signal weighting, seed exclusion, hidden candidate omission, neutral fallback, invalid limits/types, and Search failure.

## 60. IDOR Tests

Service and handler tests prove subject isolation and reject attempted `user_id` selectors. Browser/API responses contain no subject value.

## 61. Concurrency Tests

The real PostgreSQL integration test runs concurrent bookmark/rating/recent upserts and asserts one row per subject/target without duplicate leakage.

## 62. Actual DB Integration

`TestEngagementRepositoryConcurrencyIsolationAndRetention` passed against the Docker PostgreSQL database. Runtime migration inspection found three engagement tables; temporary QA rows were removed afterward.

## 63. Portal Browser QA

Controlled authenticated QA verified login, Knowledge detail, bookmark save/delete/reload, rating write/reload, recent-view persistence, deterministic personalized output, neutral fallback, and expired-access-token refresh. Test credentials were read only from ignored local configuration and were not recorded.

## 64. Admin Browser QA

Controlled authenticated Portal Administrator QA verified dashboard access, desktop sidebar open/close/reopen, mobile drawer, overlay/X semantics, Escape, focus restore, module navigation availability, and dark mode.

## 65. Accessibility QA

Engagement uses native buttons/radios, accessible labels, `aria-pressed`, radiogroup/fieldset, live feedback, non-color text, and visible theme controls. Admin uses skip link, dialog/navigation landmarks, names, expanded/controls state, Escape, and focus restore.

## 66. Mobile QA

At 390×844, Admin displayed the Cuba mobile header/drawer with successful close/focus behavior and no visual horizontal overflow. Portal displayed a compact Techwind header/menu and one-column engagement cards.

## 67. Light/Dark QA

Portal toggled to HTML class `dark`; Admin toggled to `dark dark-only`; both controls changed to `Aktifkan tema terang`. Visual browser inspection confirmed readable contrast and independent theme boundaries.

## 68. Portal Verification

Portal `npm run lint`, `npm run typecheck`, and Next.js 16.3.0 production build passed. Docker no-cache-equivalent image build stage reran lint/typecheck/build and produced all engagement BFF routes.

## 69. Admin Verification

Admin `npm run lint`, `npm run typecheck`, and Next.js 16.3.0 production build passed. Authenticated browser QA passed the Phase 0 sidebar acceptance checks.

## 70. Go Verification

`go test ./...`, `go vet ./...`, and `go build ./...` passed with a workspace-local GOCACHE.

## 71. OpenAPI Validation

Redocly CLI 2.7.0 returned a valid API description with zero errors and warnings.

## 72. Search Regression

Existing Search application/search-index tests passed. Real recommendation discovery returned eligible candidates; Search-down returned only recommendation 503; after cleanup `fixture_search_hits=0`.

## 73. Moodle Regression

No Moodle write, direct Moodle DB query, or core modification was introduced. Existing Moodle adapter tests passed and Docker verify returned Moodle HTTP 200.

## 74. CMS/Knowledge/Media Regression

Full Go tests passed existing CMS/Knowledge/Media packages; Admin and Portal production builds passed; API/Admin/Portal health checks remained 200.

## 75. Docker Config

The canonical wrapper `config` passed and resolved 13 existing service keys with localhost-bound host ports. No Compose file, port, service name, container name, volume, or secret configuration was changed by TASK-008.

## 76. Docker Up

The canonical wrapper `up` rebuilt application images, applied migration 005, preserved volumes, and waited until long-running services were healthy. No `-v`, prune, reset, or orphan data deletion was used.

## 77. Docker Verify

The canonical wrapper `verify` passed Portal API, Portal Web, Admin Web, Keycloak, Moodle, MinIO, and Meilisearch HTTP health checks; migrate exited 0.

## 78. Repository Hygiene

Implementation staging contained 48 intended files. `git diff --cached --check` passed after removing Markdown trailing whitespace. `.tmp`, ignored `.env`, backups, runtime captures, and fixture SQL were absent.

## 79. Secret Scan

High-confidence staged-content scan returned zero private keys, GitHub/provider tokens, OpenAI-style keys, Google keys, or JWTs. Real local credentials stayed in ignored `.env`; no value is included here.

## 80. Vendor/Backup/Runtime Artifact Exclusion

Staged paths contained zero Techwind/Cuba `ORIGINAL`, `.env`, `.tmp`, backup, `.mbz`, or recording files. Licensed originals were read-only references only.

## 81. Git Diff Review

The diff is scoped to engagement domain/API/data/UI, Phase 0 Admin sidebar, Portal auth resilience, cross-agent governance, canonical design/API/data docs, ADR, CI governance gate, and this handoff. No TASK-009 or architecture rewrite is included.

## 82. Commit SHA(s)

Implementation commit: `75f6f61de8dc5783ca79ae4ea1bff4325326c975`. The handoff publication commit is the Git commit containing this file and is reported by final release verification; a commit cannot embed its own SHA.

## 83. Commit Messages

Implementation: `feat: implement deterministic engagement platform`. Handoff: `docs: close TASK-008 engagement handoff`.

## 84. Main Fast-Forward

Release procedure requires a fresh fetch, proof that current `origin/main` is an ancestor of the task branch, and a normal fast-forward refspec from this branch to `main`. Force is forbidden.

## 85. Final Main SHA

The final immutable SHA is the handoff publication commit resolved by `git rev-parse main` after release and is reported in final chat/remote verification. Implementation parent is `75f6f61de8dc5783ca79ae4ea1bff4325326c975`.

## 86. GitHub Push

Release uses normal `git push` only to `pedroiriano/teman-belajar.git`. If push or ancestry verification fails, this task must be reported BLOCKED rather than force-pushed.

## 87. Remote SHA Verification

Post-push gate requires `main == origin/main` after a fresh fetch and remote presence of engagement domain, migration, OpenAPI, Portal UI, Admin sidebar correction, Gemini governance, and this handoff.

## 88. Post-Push Public Security

Post-push verification must repeat remote path/secret checks without exposing values and confirm that vendor originals, ignored environment files, backups, and runtime artifacts are not present at the remote tip.

## 89. GitHub Actions

CI now includes `agent-governance` plus existing Go, Admin, Portal, and OpenAPI jobs. Final release requires the pushed `main` workflow run to complete successfully; the final chat reports the observed result.

## 90. Acceptance Criteria

All implementation, UI, API, data, identity, IDOR, privacy, resilience, performance, Docker, and documentation criteria are satisfied. Measured local P95: bookmark write 24.6 ms; rating write 27.9 ms; recent-view write 22.3 ms; bookmark list 16.9 ms; recommendations 24.1 ms, all below 500 ms.

## 91. Definition of Done

Code, migration, OpenAPI, ADR, canonical docs, UI, tests, actual DB/API/browser QA, dependency audit, Docker verify, repository hygiene, and agent governance pass. Release/remote/CI gates are mandatory before the final PASS response.

## 92. Production Readiness Gaps

Production remains HOLD pending independent credential rotation confirmation, external secret manager/TLS/private networking, scoped Meilisearch query/admin key separation, and the existing TASK-007R operational decisions. These gaps do not weaken local development security.

## 93. Technical Debt

The repository still emits a non-failing Next.js workspace-root warning because root and app lockfiles coexist. Automated cross-browser E2E and scheduled security tools (gitleaks/Trivy/govulncheck) remain follow-ups. Do not fix these by deleting lockfiles, weakening CI, or adding unapproved tooling.

## 94. Human Decisions Required

Confirm production credential rotation/revocation and the TASK-007R production Search/security topology before deployment. No human decision is required to merge the development implementation.

## 95. TASK-008 Status

Implementation status is PASS subject only to the normal release/remote/CI gates documented above. Production deployment status is HOLD because credential rotation confirmation is human-owned.

## 96. TASK-009 Readiness

`NOT READY` for production sequencing until credential rotation is confirmed. After that confirmation and successful TASK-008 remote CI, TASK-009 may start from the verified remote `main`; it must not reinterpret or replace the engagement architecture.
