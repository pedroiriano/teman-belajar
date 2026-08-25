# TASK-011D — SEO, Taxonomy & Public Discoverability Platform

**Owner Agent:** Product Architecture + Backend + Frontend + Data + Security + QA
**Feature:** Mandatory P0 Public Discoverability Gate
**Dependencies:** TASK-004E Media, TASK-011A Auto-Save, TASK-011B Knowledge Hierarchy, TASK-011C Admin Cuba harmonization (all merged on fresh `main`)

## Objective

Provide reusable, server-rendered SEO and controlled taxonomy capabilities for
News, Announcements, and Knowledge without creating a new service or weakening
publication, identity, workflow, or media boundaries.

## In Scope

- Controlled Category and flat many-to-many Tag vocabulary with normalized
  identity, safe archive, relation integrity, and server authorization.
- Per-content SEO profiles, safe slug history and permanent redirects,
  canonical/indexability policy, Open Graph fallback, and active-image Media
  Asset references.
- Shared Cuba Admin authoring section and taxonomy governance, including the
  canonical TASK-011A auto-save payload.
- Server-rendered metadata, safe application-owned JSON-LD, breadcrumbs,
  taxonomy and Knowledge-node landing pages, sitemap, and robots policy.
- Meilisearch category/tag/hierarchy fields and exclusion of unpublished or
  noindex content.
- Migration 016, OpenAPI, ERD, runbook, threat model, focused tests, browser
  acceptance, protected PR/CI evidence, and handoff.

## Out of Scope

- TASK-012, production deployment, Identity/SSO/RBAC/Keycloak, Moodle, new
  microservices or Compose services, framework upgrades, raw editor JSON-LD,
  meta keywords, arbitrary redirect targets, and generic Pages not represented
  by an actual repository domain.

## Policy Decisions

1. Category is controlled editorial classification; Tag is controlled reusable
   vocabulary and is never stored comma-separated or emitted as meta keywords.
2. Category hierarchy is not introduced because current content classification
   does not require it; Knowledge retains its separate governed hierarchy.
3. Category landing is indexable with at least two eligible items; Tag landing
   requires at least three. Thin pages remain `noindex` and are omitted from the
   sitemap.
4. Critical metadata and JSON-LD are generated on the server. Editors cannot
   submit raw JSON-LD.
5. Published slug changes create an internal 308 redirect; history is collapsed
   to the current slug and cycles, self-loops, reserved slugs, and external
   canonical targets are rejected.

## Acceptance Criteria

- AC-01 normalized duplicate terms are rejected and active relations persist.
- AC-02 SEO fallback and explicit overrides produce one safe canonical URL and
  published-state-gated indexability.
- AC-03 Media, Auto-Save, Knowledge hierarchy, and search reuse canonical
  capabilities rather than parallel implementations.
- AC-04 published slug changes preserve one safe permanent redirect without
  chains or cycles.
- AC-05 public metadata, JSON-LD, breadcrumbs, sitemap, robots, and landing
  policies are server-rendered and exclude private/draft/noindex/history URLs.
- AC-06 Admin uses the shared Cuba panel, supports light/dark themes, remains
  accessible, and passes the static no-orange guard.
- AC-07 migration, OpenAPI, ERD, security evidence, tests, browser evidence,
  protected CI, and handoff match the final SHA.

## Required Tests

- [ ] domain validation/fallback/security unit tests
- [ ] PostgreSQL taxonomy/profile/redirect/sitemap integration tests
- [ ] draft/search/handler contracts
- [ ] Admin/Portal lint, typecheck, production build, and static contracts
- [ ] OpenAPI lint and local security checks
- [ ] representative browser QA for Admin, public SSR, robots/sitemap/redirect

## Release Gate

Use a task branch and protected PR. Never direct-push `main`, bypass checks,
force-push, merge without explicit human authorization, or start TASK-012.
