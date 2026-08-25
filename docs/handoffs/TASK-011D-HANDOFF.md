# TASK-011D HANDOFF — SEO, Taxonomy & Public Discoverability Platform

## Release state

**IMPLEMENTED — FINAL RELEASE GATES IN PROGRESS / NOT MERGED.** TASK-011D is the mandatory
P0 discoverability gate before TASK-012. This record must be finalized with the
reviewable commit, PR, protected CI, and merge state; it does not authorize
TASK-012 or an unapproved merge.

- Branch: `codex/task-011d-seo-taxonomy`.
- Fresh-main base: `a6000b664833c8cd5da105c4151d09b062eba949`
  (protected merge of TASK-011C PR #17).
- Migration: `016_create_seo_taxonomy_discovery.sql`.
- User-owned `latest_prompt.txt`: untracked, untouched, and excluded.

## Major implementation

- Added controlled Category and flat Tag governance with normalized duplicate
  prevention, archive lifecycle, usage counts, and normalized many-to-many
  content relations.
- Added reusable SEO profiles for News, Announcement, and Knowledge: safe slug,
  title/description and social fallbacks, active-image Media Asset reference,
  canonical path, indexability, and real social-image alt evidence.
- Added published slug history with internal 308 redirects, transactionally
  collapsed history, cycle/collision checks, and database prevention of later
  reuse by another content record.
- Added the shared Cuba Admin **SEO & Discovery** panel to all six create/edit
  forms, controlled Taxonomy management, Media Picker reuse, previews, and an
  advisory Health checklist. TASK-011A Auto-Save carries every canonical field.
- Added Techwind-derived Category/Tag and Knowledge-node landings, News and
  Announcement detail reconciliation, SSR metadata, absolute and safely
  serialized JSON-LD, BreadcrumbList, runtime-generated `sitemap.xml`, and
  `robots.txt`. A request proxy guarantees that historical public slugs return
  an actual HTTP 308 before App Router streaming begins.
- Extended Meilisearch documents with active Category, Tags, and Knowledge
  hierarchy context while excluding noindex/unpublished public revisions.

## Policies

- Category identity is unique by normalized name within its domain and slug is
  globally unique because `/categories/{slug}` is one public route.
- Tag identity and slug are globally unique; Tags are controlled vocabulary,
  never meta keywords or comma-separated values.
- Category landings require two eligible items, Tag landings three, and
  Knowledge nodes two. Thin pages are noindex and omitted from the sitemap.
- Critical metadata is server-rendered. Editor-supplied JSON-LD, external
  canonical paths, open redirects, private/draft indexing, and inactive
  Knowledge ancestry are denied.
- Knowledge uses its canonical published revision even while a newer revision
  is draft; no unpublished revision body is indexed or exposed.

## Data and contracts

Migration 016 evolves Categories and Announcement/Knowledge relations and adds
Tags, content-tag relations, SEO profiles, slug history, lookup indexes, and
historical-slug guards. It is additive and forward-only. OpenAPI, ERD,
canonical UI/data/API/security docs, component inventory, runbook, and threat
model were synchronized.

Fresh-schema evidence: migrations 001–016 applied successfully to a dedicated
temporary PostgreSQL database, repository/search integration tests passed, and
the exact temporary database was removed afterward. The retained local database
also passed the TASK-011D repository integration test; no volume was deleted.

## Verification state

Targeted domain, draft, PostgreSQL, search, handler, Admin, Portal, OpenAPI, and
no-orange checks passed. The final backend gate, production Docker builds, and
official runtime verification also passed. Public browser smoke proved News and
Knowledge SSR metadata/JSON-LD, dynamic sitemap content, robots policy, and the
historical-slug 308. Authenticated Admin create/Auto-Save/Media browser smoke is
the only remaining local browser item before the PR can be release-ready.

| Gate | Result |
|---|---|
| Fresh migrations 001–016 + PostgreSQL integration | PASS |
| Category/Tag normalization and relation persistence | PASS |
| Fallback/canonical/indexability and redirect security tests | PASS |
| Admin reusable SEO/Auto-Save/no-orange contracts | PASS |
| Portal SSR/JSON-LD/sitemap/robots contracts | PASS |
| Runtime sitemap and HTTP redirect smoke | PASS — dynamic entries present; historical News URL returns 308 to current URL |
| OpenAPI lint | PASS; one pre-existing-style advisory for sitemap 4xx response |
| Final local gate | PASS — Go test/vet/build; Admin and Portal lint/typecheck/build; OpenAPI, audit, SAST, governance; production Docker builds and endpoint verification |
| Representative browser QA | PARTIAL — public metadata, sitemap/robots, real 308, and Admin Light/Dark no-orange passed; authenticated create/Auto-Save/Media awaits fresh human login |
| Pull request / protected CI | PENDING |

## Security and scope invariants

Identity/SSO/RBAC/Keycloak, Moodle, Docker services/ports, framework versions,
and TASK-012 are unchanged. Taxonomy/profile mutations are authorized
server-side and audited without content bodies. Vendor originals and secrets
remain untouched. Admin retains the bright-sky two-theme no-orange contract.

## Rollback and next gate

Revert the TASK-011D application/documentation commits and rebuild through the
official Docker wrapper. Do not reverse migration 016, delete volumes, edit
slug rows manually, weaken publication checks, or modify finalized identity.

P0 SEO gate remains **NOT CLOSED** until the final SHA passes protected checks
and is merged with explicit human authorization. TASK-012 is **NOT IMPLEMENTED**.
