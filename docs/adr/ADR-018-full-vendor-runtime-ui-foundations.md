# ADR-018 — Full Vendor Runtime UI Foundations

**Status:** Accepted
**Date:** 2026-08-26
**Supersedes:** ADR-013

## Context

Portal and Admin already used product-specific semantic components inspired by
Techwind and Cuba, but no executable contract proved that the licensed sources
were the runtime foundations. This allowed future work to drift into a parallel
generic design system while still claiming vendor alignment.

Copying vendor bundles verbatim is also unsafe: both distributions contain demo
pages, branding, optional plugins and global DOM initializers that conflict with
Next.js 16 and React 19 lifecycle ownership. Cuba's default violet/orange visual
choices also conflict with the accepted bright sky/light-blue Admin contract.

## Decision

1. Portal uses a bounded Techwind runtime foundation: Nunito typography,
   `topnav`/navigation/footer/back-to-top structure, Remix-mapped local SVG
   icons, relevant layout/component rules, and a React-safe interaction adapter.
2. Admin uses a bounded Cuba runtime foundation: Rubik typography,
   page/sidebar/header/body/footer structure, Feather-mapped local SVG icons,
   table/pagination/form/card conventions, and React-safe drawer/disclosure
   adapters.
3. `portal-*` and `admin-*` remain product-semantic compatibility aliases over
   the corresponding foundation. They are not independent design systems.
4. Vendor `ORIGINAL/` trees are immutable. Product runtime contains only
   adapted, attributable rules; no demo branding/data, purchase material,
   vendored global bundles or unused plugins.
5. Vendor imperative scripts are not loaded globally. Necessary behavior is
   translated into client hooks with event cleanup, focus management and
   reduced-motion support.
6. Next.js 16.3.0, React 19.2.8, Node 22 and Tailwind 3.4.19 remain unchanged.
   No external icon/UI package is added: local typed SVG adapters avoid a new
   supply-chain dependency while retaining the vendor icon language.
7. Techwind cannot be imported into Admin and Cuba cannot be imported into
   Portal. A static guard enforces source boundaries, shell anchors, fonts,
   icon mappings, immutable vendor tree IDs, data presentation and branding.
8. Admin's bright sky/light-blue and no-orange rules override vendor colors in
   every light/dark application-controlled state.

## Rejected alternatives

- Loading complete vendor CSS/JS bundles: too much unused code and unsafe global
  DOM ownership.
- Keeping reference-only governance: not machine-verifiable and permits drift.
- Adding another component framework or icon package: unnecessary dependency
  and parallel-system risk.
- Editing vendor originals: destroys the upgrade/reference baseline.

## Consequences

New UI must map to a vendor pattern and product semantic token before adding a
new primitive. Upstream vendor refreshes are reviewed against the manifest and
tree baseline, then selectively re-adapted. CI runs the foundation guard beside
existing language, accessibility-adjacent, Notification, and Admin no-orange
contracts. Identity, data, API, Moodle, and authorization behavior are not
changed by this decision.
