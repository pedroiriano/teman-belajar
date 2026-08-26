# ADR-019 — Online Course Route Harmonization

**Status:** Accepted
**Date:** 2026-08-26
**Owner:** TASK-027

## Context

ADR-018 established bounded Techwind and Cuba runtime foundations, but it did
not require every route family to visibly compose a single named online-course
demo. The product owner selected `index-course.html` for Portal and
`dashboard-03.html` for Admin as the primary visual baselines for all active
routes.

## Decision

1. Portal route families compose the Techwind Online Course language through
   shared shell, hero, course card, progress, content, state, and detail
   primitives.
2. Admin route families compose the Cuba Online Course dashboard language
   through the dashboard-03 shell, page header, widget, card, table, form,
   filter, modal, pagination, and state primitives.
3. Route harmonization is implemented at shared semantic layers first so
   behavior and authorization remain owned by existing feature modules.
4. Relevant patterns from other pages in the same licensed vendor tree may be
   adapted when the primary demo lacks an appropriate product component.
5. Vendor originals remain read-only references. Full vendor CSS, scripts,
   plugins, branding, and demo data do not enter the application runtime.
6. Admin retains the fixed bright sky/light-blue palette and no-orange rule.

## Consequences

- Visual changes propagate consistently across present and future routes.
- Feature pages keep their current data and interaction contracts.
- A new route that bypasses the shared foundation fails the static contract or
  the required route-matrix review.
- This ADR extends ADR-018 and does not change Identity, API, Moodle, or
  infrastructure boundaries.
