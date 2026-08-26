# UI Foundation Integration Guide

## Adding Portal UI

1. Start from Techwind `html/index-course.html`; use another Techwind page only
   when it contains a closer product pattern, then record the choice in
   `UI-SOURCE-MAPPING.md` when it creates a new family.
2. Compose existing `techwind-*` foundation anchors and `portal-*` semantic
   primitives. Add a semantic token before adding an application color.
3. Use `PortalIcon`; do not paste emoji, Unicode decoration or a second icon
   system. Keep copy Indonesian according to the terminology glossary.
4. Put behavior in a React component/hook with cleanup. Never import the vendor
   global `app.js` or plugin initializer.
5. Verify mobile/desktop, keyboard, reduced motion, light/dark and all reachable
   loading/empty/error/unauthorized states.

## Adding Admin UI

1. Start from Cuba `html/template/template/dashboard-03.html`; use another Cuba
   page only when it contains a closer product component.
2. Compose `cuba-*` anchors and `admin-*` semantic primitives; preserve the
   shared data table/pagination and form conventions.
3. Use `AdminIcon` and the fixed bright sky/light-blue tokens. Orange and amber
   remain forbidden; warning uses semantic yellow.
4. Keep drawer/modal focus trapped, Escape-operable and restored to its opener.
5. Run Admin theme, no-orange, language, data-presentation and vendor guards.

## Dependency and upgrade rule

New vendor plugins are not copied by default. Document the product need,
license, browser/runtime compatibility, bundle impact, maintenance and security
audit before adding a dependency. Refresh vendor originals only in a dedicated
human-approved intake task; never patch them in feature work.

## Required commands

From each affected app: `npm run lint`, `npm run typecheck`,
`npm run test:vendor-foundation`, the existing contract tests, `npm run build`
and `npm audit --omit=dev`. Browser acceptance covers representative public and
authenticated routes in both themes at desktop and 390 px mobile.
