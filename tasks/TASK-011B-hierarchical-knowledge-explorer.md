# TASK-011B — Hierarchical Knowledge Explorer

**Owner Agent:** Product Architecture + Backend + Frontend + Data + Security + QA
**Feature:** Pre-TASK-012 Hierarchical Knowledge Experience
**Dependencies:** TASK-003 Knowledge Hub, TASK-004E Integrated Media Asset Management, TASK-011A Auto-Save Draft & Crash Recovery (canonical PASS and merged)

## Objective

Provide a generic, governed Knowledge hierarchy and a Techwind-aligned public
explorer so authors can organize Knowledge articles into a deterministic tree
and learners can navigate contextual, accessible, SEO-friendly content.

## Sequence Lock

TASK-011B must not start from an unmerged TASK-011A branch or reuse its PR. Begin
from fresh protected `main` only after TASK-011A has a canonical PASS handoff.
TASK-012 remains out of scope.

## Architecture Matrix — Current to Target

| Layer | Current state | Target state | Gap closed by TASK-011B |
|---|---|---|---|
| Knowledge model | Flat articles/revisions | Generic adjacency-list nodes plus explicit article association | Hierarchical grouping without encoding one organization into the engine |
| Integrity | No tree invariants | Max depth 8, no self-parent/cycle, deterministic sibling order | Corrupt or ambiguous trees are rejected server-side |
| Admin UX | Article list/create/revision workflow | Cuba tree management, metadata/governance, article placement | Editors manage hierarchy without direct database changes |
| Public UX | Flat Knowledge cards/detail | Techwind three-pane explorer with responsive drawer and article TOC | Learners retain hierarchy context and can traverse related knowledge |
| Search | Flat result metadata | Hierarchy-aware breadcrumb/context fields | Search results explain where content belongs |
| API/data contract | Flat Knowledge endpoints | Contract-first node/tree/association and public explorer resources | Stable boundary for future consumers without leaking PostgreSQL details |

## In Scope

- Additive versioned migration for generic `knowledge_nodes` using adjacency
  hierarchy with UUID identity, parent, type, slug, title, description,
  deterministic sort order, lifecycle metadata, and optimistic version.
- Allowed node types: `collection`, `aspect`, `indicator`, `sub_indicator`,
  `topic`, `section`.
- Maximum depth eight, self-parent and cycle prevention, sibling uniqueness,
  stable ordering, and transactional move/reorder operations.
- Initial product taxonomy may represent the approved Pemdi content hierarchy,
  but names are seed/content data rather than hard-coded engine behavior.
- Explicit primary hierarchy association for Knowledge articles, with safe
  handling of archived/unpublished nodes.
- Admin Cuba UI for tree browse/create/edit/move/reorder/archive and Knowledge
  article placement/metadata/governance.
- TASK-011A auto-save/recovery integration for every new or changed authoring
  form introduced by this capability.
- Public Techwind explorer: breadcrumb, left hierarchy tree, center article,
  right in-page table of contents, keyboard navigation, mobile drawer, loading,
  empty, not-found, error, and unavailable states.
- Hierarchy context in public Knowledge/search contracts and SEO metadata.
- OpenAPI, ERD, runbook, threat model, tests, and handoff.

## Out of Scope

- TASK-012 implementation, production deployment, or production data import.
- Identity, SSO/SLO, Keycloak, user management, account linking, or RBAC changes.
- Moodle core/plugin/database changes or direct Moodle database queries.
- New microservice, Compose service, graph database, search engine, or material
  dependency.
- Arbitrary DAG/multiple-parent semantics, unlimited depth, or silently
  repairing corrupt hierarchy data.
- Copying complete Techwind/Cuba demos, vendor runtimes, or demo content.

## Security and Integrity Constraints

1. Portal Administrator and Content Editor may mutate hierarchy; Reviewer is
   read-only unless an existing canonical workflow explicitly permits more.
2. Every mutation is authorized server-side and audited.
3. Cycle and depth validation occurs inside the application transaction and is
   backed by database constraints where feasible.
4. Public APIs return only eligible published content and active hierarchy.
5. Slugs, titles, descriptions, filters, IDs, and ordering values use the shared
   untrusted-input validation rules.
6. Browser calls use Portal/Admin BFF boundaries; no direct database or Moodle
   access is introduced.

## Acceptance Criteria

- AC-01 Admin can create, edit, move, reorder, and archive allowed node types;
  invalid type, self-parent, cycle, depth greater than eight, duplicate sibling
  slug/order, and stale version are rejected deterministically.
- AC-02 Tree reads use stable sibling order and return enough ancestry metadata
  to render breadcrumbs without client-side guesswork.
- AC-03 Knowledge articles can be assigned to an eligible primary node; public
  responses omit draft/private hierarchy and handle archived associations
  without exposing private content.
- AC-04 The public desktop explorer provides a left tree, center article, and
  right article TOC; mobile uses an accessible hierarchy drawer and preserves
  navigation context.
- AC-05 Tree and TOC support keyboard operation, visible focus, correct ARIA,
  logical headings, reduced motion, and WCAG 2.2 AA contrast in both themes.
- AC-06 Breadcrumbs, canonical metadata, and hierarchy-aware search context are
  generated from authoritative server data.
- AC-07 Admin hierarchy/article forms inherit TASK-011A recovery, conflict,
  finalization, and payload-safety behavior.
- AC-08 Existing flat Knowledge URLs and eligible articles remain functional or
  have an explicit compatible migration/fallback plan; no breaking public API is
  introduced without approval.
- AC-09 Audit events cover node create/update/move/reorder/archive and article
  association changes without recording article bodies or sensitive payloads.
- AC-10 OpenAPI, migration, ERD, tests, threat model, runbook, task, and handoff
  match the implementation.

## Required Tests

- [ ] hierarchy domain unit tests for type, depth, ancestry, cycle, order, and version
- [ ] PostgreSQL integration tests including concurrent move/reorder and rollback
- [ ] API contract/problem/authz tests and public visibility regressions
- [ ] Admin tree keyboard, form, auto-save, and authorization tests
- [ ] Portal explorer breadcrumb/tree/TOC/responsive/accessibility tests
- [ ] search context and SEO metadata tests
- [ ] migration-from-clean and migration-from-TASK-011A evidence
- [ ] Go format/vet/test, frontend lint/typecheck/build/audit, OpenAPI/ERD/governance gates
- [ ] Docker no-cache build and browser acceptance in light/dark desktop/mobile

## UI/Vendor Impact

- Public vendor reference: Techwind documentation/help-center/sidebar and
  article-navigation patterns in `vendor/ui-templates/techwind/ORIGINAL/`.
- Admin vendor reference: Cuba tree, sidebar, card, form, modal, badge, toolbar,
  and feedback patterns in `vendor/ui-templates/cuba/ORIGINAL/`.
- Product targets: `apps/portal-web/`, `apps/admin-web/`.
- Dependencies introduced: none unless separately justified and approved.
- [ ] vendor originals remain read-only
- [ ] only required patterns/assets are adapted
- [ ] Portal/Admin token families remain isolated
- [ ] Cuba dark-mode bright-light-blue contract preserved
- [ ] no vendor branding/demo data

## Documentation Impact

- [ ] `openapi/openapi.yaml`
- [ ] `docs/diagrams/erd.mmd`
- [ ] Knowledge canonical UI/data/API sections
- [ ] hierarchy operations runbook and threat model
- [ ] task registry and TASK-011B handoff

## Release Gate

TASK-011B uses a branch, PR, CI run, migration evidence, browser matrix, and
handoff separate from TASK-011A. Merge only through protected-branch workflow.
No admin bypass, force push, history rewrite, destructive Docker operation, or
TASK-012 work is authorized.

## Definition of Done

- [ ] TASK-011A canonical PASS is verified on fresh `main`
- [ ] all acceptance criteria pass
- [ ] data integrity, authz, accessibility, and security regressions pass
- [ ] docs/contracts/migration are synchronized
- [ ] diff is scoped and `latest_prompt.txt` is absent from the commit
- [ ] green reviewable PR is merged through the protected workflow
- [ ] canonical TASK-011B handoff records commit, PR, evidence, risks, and rollback
