# AGENTS.md
## Engineering Constitution — Teman Belajar

This file is mandatory for every AI coding agent and human contributor.


## 0. Product Identity — Non-Negotiable

- Product Name: **Teman Belajar**
- Repository: `teman-belajar`
- Product Type: Enterprise Digital Learning Experience Platform (LXP + LMS)
- Portal service: `teman-belajar-web`
- Admin service: `teman-belajar-admin`
- API service: `teman-belajar-api`
- Worker: `teman-belajar-worker`
- Keycloak realm: `teman-belajar`
- Moodle plugin: `local_temanbelajar`

Do not invent, translate, abbreviate, or rename the product identity. Read `docs/governance/PRODUCT-IDENTITY-NAMING.md`.

## 1. Mission

Build and maintain a secure, modular **Learning Experience Platform + Moodle LMS** where:
- Portal owns experience/content.
- Moodle owns formal learning.
- Keycloak owns central identity.
- APIs and contracts isolate implementation details.

## 2. Mandatory Architecture Rules

1. Do not query Moodle database directly.
2. Do not modify Moodle core.
3. Moodle integration goes through `integration/moodle` adapter and/or approved plugin.
4. Portal API starts as modular monolith.
5. Do not create a new microservice without accepted ADR.
6. Public API must match `openapi/openapi.yaml`.
7. Database schema changes require migration.
8. Cross-module calls use declared application/domain interfaces.
9. Business logic must not live in HTTP handlers or UI components.
10. Secrets must never be committed.

## 3. Repository Rules

- Prefer small, task-scoped diffs.
- Do not refactor unrelated code.
- Preserve existing conventions unless an accepted ADR changes them.
- Add dependencies only when necessary; document why.
- Generated files must be reproducible.
- No vendored secrets, tokens or local credentials.

## 4A. UI Template Governance — Non-Negotiable

Teman Belajar uses licensed commercial UI references:

### Public / Learner
- Vendor: Techwind
- Technology: Tailwind CSS
- Reference: `vendor/ui-templates/techwind/ORIGINAL/`
- Target: `apps/portal-web/`

### Admin / Backoffice
- Vendor: Cuba
- Technology: Tailwind CSS
- Reference: `vendor/ui-templates/cuba/ORIGINAL/`
- Target: `apps/admin-web/`

Rules:
1. Treat vendor `ORIGINAL/` as read-only reference.
2. Do not redesign from scratch when an appropriate vendor pattern exists, unless the task explicitly requires it.
3. Do not copy unused demo pages/components/assets.
4. Remove vendor branding and demo data from product implementation.
5. Do not cross-import Techwind global theme into Admin or Cuba global theme into Portal.
6. Adapt visual tokens to Teman Belajar semantic tokens.
7. Preserve or improve responsive and accessibility behavior.
8. `shadcn/ui` is optional fallback, not the primary visual foundation.
9. Audit third-party dependencies before introducing them into product code.
10. Never commit purchase codes, license keys, invoices, or vendor credentials.
11. Follow `docs/design-system/*` for UI implementation decisions.

## 4. Backend Rules

- Language: Go.
- Layers: transport → application → domain → ports/adapters.
- Validate untrusted input.
- Authorization server-side.
- Use context/timeouts for I/O.
- Propagate trace/correlation ID.
- Wrap external dependency behind interface.
- No panic for normal business error.
- Avoid global mutable state.

## 5. Frontend Rules

- Next.js + React + TypeScript.
- Mobile-first.
- Use shared design system.
- Accessible semantics.
- Implement loading/empty/error/unauthorized states.
- Do not expose privileged API capability only through hidden UI; backend must enforce authz.
- Avoid direct Moodle calls from browser.

## 6. Data Rules

- Portal and Moodle data stores are separate ownership.
- Migrations are versioned.
- Destructive migration requires explicit review.
- Use transactions for atomic domain change.
- Add index only for demonstrated query/constraint.
- Never use cache as authoritative data.

## 7. API Rules

- Contract-first.
- OpenAPI changes in same PR as implementation.
- Consistent problem/error response.
- No breaking change without version/migration plan.
- Pagination on large lists.
- Internal API under `/internal/v1`.

## 8. Security Rules

- Least privilege.
- Deny by default.
- No secret in code/log/URL.
- Validate issuer/audience/scope for tokens.
- Rate-limit sensitive endpoints.
- Audit privileged actions.
- File uploads use allowlist and size limits.
- Never disable security test to make CI green.

## 9. Moodle Rules

- Use official APIs/web services first.
- Custom capability goes into versioned plugin.
- Plugin must not patch core.
- External IDs mapped explicitly.
- Events must be idempotent.
- Moodle outage must degrade gracefully.

## 10. Testing Rules

Every behavior change requires appropriate test:
- unit for domain logic;
- integration for DB/external adapters;
- contract for API;
- E2E for critical journeys.

Bug fix requires regression test when practical.

## 11. Documentation Rules

Update in same change when applicable:
- canonical docs;
- OpenAPI;
- ERD;
- ADR;
- runbook;
- task status.

## 12. Required Agent Workflow

Before coding:
1. Read this file.
2. Read assigned task.
3. Read relevant canonical docs/ADR.
4. Inspect code and tests.
5. State an implementation plan in task/PR notes.

Before declaring done:
1. Run formatter/lint.
2. Run relevant tests.
3. Run security checks available locally/CI.
4. Review diff for scope creep.
5. Update contracts/docs.
6. Provide verification evidence.

## 13. Forbidden Without Human Approval

- architecture rewrite;
- framework replacement;
- new microservice;
- direct production action;
- destructive migration;
- permission weakening;
- security exception;
- public breaking API;
- Moodle major/minor upgrade;
- dependency with material operational/security impact.

## 14. Definition of Done

A task is DONE only when:
- AC pass;
- tests pass;
- lint/typecheck pass;
- security requirements pass;
- docs/contracts updated;
- migration safe;
- observability adequate;
- no critical known defect;
- PR is reviewable and scoped.

If a requirement is ambiguous, prefer the safest implementation compatible with canonical docs and record the ambiguity; do not invent architecture.
