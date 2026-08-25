# TASK-017 HANDOFF — FAQ CMS & Help Center

## Release state

**IN REVIEW — PR #23 — NOT MERGED.** Implementation and local acceptance are
complete. This record will be finalized with the protected-check result after
the evidence commit. Merge remains forbidden without explicit human approval.

- Branch: `codex/task-017-faq-cms-help-center`.
- Fresh-main base: `2ec78ae88d930550dcb64ce30f9fa670a5bdd04b`.
- Source commit: `500ee15` (`feat(faq): add governed FAQ CMS and Help Center`).
- Pull request: [#23](https://github.com/pedroiriano/teman-belajar/pull/23).
- Migration: `017_create_faq_help_center.sql`.
- User-owned `latest_prompt.txt`: untracked, untouched, and excluded.

## Implemented scope

- Added governed FAQ Category and Item data with deterministic ordering,
  optimistic versions, draft/review/approved/published/archive workflow, and an
  additive seed migration that preserves the former homepage answers as CMS
  data rather than component literals.
- Added Portal API public/admin endpoints, server-derived actor/role authz,
  strict bounded JSON decoding, validation, publication isolation, and audit
  events. Reviewer authorship is denied; Portal Administrator retains the
  existing authorized override behavior without any RBAC change.
- Added `faq.create`/`faq.edit` Auto-Save registry definitions and optional
  image Media usage through the existing Media policy and shared Admin picker.
- Replaced the Cuba Admin `Segera` placeholder with a real responsive FAQ
  workspace: discovery filters, category lifecycle, editor, Media, SEO,
  recovery state, optimistic save, and role-appropriate workflow actions.
- Added the Techwind `/help` route with search, category accordions,
  loading/error/empty states, optional imagery, metadata, noindex search
  variants, and HTML-safe `FAQPage` JSON-LD that matches visible content.
- Removed the hard-coded homepage FAQ source, added a CMS-backed teaser, Help
  Center navigation/sitemap entry, and FAQ source/filter support in unified
  search. Only published, active-category, indexable items enter Meilisearch.
- Synchronized OpenAPI, ERD, Media governance, roadmap/task registry, CI static
  guards, and the FAQ operations runbook.

## Security and data boundaries

- FAQ answers remain plain text; no raw HTML, raw JSON-LD, object-storage URL,
  secret, credential, or identity data is accepted or rendered.
- Public API, Help Center, public Media delivery, and Search independently
  enforce publication eligibility. UI hiding is never treated as authz.
- Identity/SSO/account/Keycloak, Moodle, production, secrets, Docker topology,
  ports, and other roadmap tasks are unchanged.
- Migration 017 is additive and forward-only. Rollback reverts application
  code while retaining schema/data; destructive schema rollback is forbidden.

## Verification ledger

| Gate | Current result |
|---|---|
| FAQ domain/workflow/authz/audit tests | PASS |
| Draft registry, Media policy, Search allowlist tests | PASS |
| HTTP strict-body and negative-authz tests | PASS |
| PostgreSQL FAQ publication/sort integration test | PASS against migrated local PostgreSQL |
| Search publication/indexability integration test | PASS; published FAQ included and draft/noindex FAQ excluded |
| Admin/Portal lint, typecheck, static FAQ guards | PASS |
| Admin no-orange static regression guard | PASS in Light and Dark source contracts |
| Admin/Portal production images | PASS through official `frontend-image-verify`; runtime npm/npx absent |
| Migration wrapper/checksum | PASS: 17 applied, 17 checksummed, latest `017` |
| Governed local runtime health | PASS for API, Portal, Admin, Keycloak, Moodle, MinIO, Meilisearch, and Grafana |
| OpenAPI | PASS Redocly 2.7.0; one pre-existing sitemap 4XX-response warning |
| Portal browser desktop/keyboard/Light/Dark/JSON-LD | PASS; filtered result and empty search remain noindex and JSON-LD-visible-content aligned |
| Admin authenticated browser and responsive acceptance | PASS in fixed mobile viewport: SSO, seeded discovery, category/editor disclosures, Auto-Save indicator, published read-only/workflow state, and no persistent QA mutation |
| Admin accessibility semantics | PASS: no unlabeled form controls, duplicate IDs, or images missing alt; skip link and native controls present |
| Admin Light/Dark browser acceptance | PASS; Cuba surfaces remain readable and dark action accent is bright sky/light blue with no orange |
| Protected PR checks | Pending |

The final full `go test ./...` rerun encountered the pre-existing
`TestIntegrationRepository_DeadLetter` shared-runtime race: the test indexes
an empty claim result while local integration workers use the same database.
TASK-017 does not modify that test or integration event repository. The full
suite had passed earlier in the implementation cycle; the deterministic final
FAQ domain, HTTP handler, PostgreSQL FAQ, Search FAQ, and `go vet ./...` gates
all passed in isolation.

During local Search runtime verification, the derived Meilisearch index
reported `MDB_KEYEXIST` for every content batch. Only that reproducible local
derived index was deleted and rebuilt; PostgreSQL, Docker volumes, source
records, credentials, and production were untouched. The worker then indexed
15 news, 1 knowledge article, and 4 published FAQs, and the FAQ search smoke
test returned `/help#lokasi-kelas-formal` as expected.

## Remaining release procedure

Commit, push, open a PR to protected `main`, and wait for every required check.
Do not merge, deploy, rotate secrets, modify Identity, or start another task.
