# TASK-027 — Full Route Online Course UI Harmonization

**Owner Agent:** Frontend/UI Platform
**Dependencies:** TASK-026
**Status:** IMPLEMENTED — READY FOR REVIEW

## Objective

Harmonize every active Portal and Admin route with the licensed online-course
visual language selected by the human owner:

- Portal baseline: `vendor/ui-templates/techwind/ORIGINAL/html/index-course.html`;
- Admin baseline: `vendor/ui-templates/cuba/ORIGINAL/html/template/template/dashboard-03.html`.

Other vendor patterns may be adapted only when they better serve an existing
product capability. Vendor originals remain immutable and vendor demo data,
branding, global scripts, duplicate frameworks, and inactive fake features are
not runtime inputs.

## Scope

- Techwind course-style homepage, inner-page hero, course cards, progress,
  learning dashboard, content lists, detail surfaces, search, FAQ, taxonomy,
  notification, states, footer, and responsive navigation;
- Cuba dashboard-03 shell marker, course-dashboard widgets, page headers,
  cards, tables, forms, filters, pagination, modals, states, and footer;
- light/dark themes, keyboard behavior, reduced motion, responsive layouts,
  Indonesian product copy, and Admin bright-sky/no-orange contract;
- static route-foundation regression guard, source mapping, route matrix,
  ADR, registry, and handoff.

Identity/SSO/RBAC, APIs, database, migrations, Moodle behavior, Docker topology,
dependencies, production, and vendor originals are out of scope.

## Acceptance criteria

1. Every active Portal route renders inside the Techwind shell and either uses
   the shared Online Course inner hero or an explicit course-dashboard/detail
   composition.
2. Every active Admin route renders inside the Cuba dashboard-03 shell and uses
   shared Cuba page, card, form, table, modal, pagination, and state primitives.
3. Portal homepage and Admin dashboard include machine-verifiable baseline
   markers tied to the named vendor source files.
4. Existing auth, authorization, API, content workflow, Auto-Save, Media,
   Notification, SEO, hierarchy, and learning behavior is unchanged.
5. Admin contains no application-controlled orange/amber in either theme and
   continues to use bright sky/light-blue actions.
6. Lint, typecheck, affected contracts, production builds, dependency audit,
   and representative desktop/mobile light/dark browser QA pass.

## Rollback

Revert the TASK-027 application/documentation commit. No data, migration,
Identity, Moodle, secret, or infrastructure rollback is required.
