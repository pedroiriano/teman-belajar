# Vendor UI Runtime Manifest

**Status:** Canonical
**Owner:** TASK-026 / ADR-018

| Experience | Immutable source | Git tree baseline | Runtime entry points |
|---|---|---|---|
| Portal | `vendor/ui-templates/techwind/ORIGINAL/` | `1835eb8d9f93e4073b5dc8c1fa8c678fd04c6d61` | `src/styles/techwind-foundation.css`, `techwind-runtime.ts`, `PortalChrome`, `PortalIcon` |
| Admin | `vendor/ui-templates/cuba/ORIGINAL/` | `a24b122f055fe744c4b4abfbd60e130f49782078` | `src/styles/cuba-foundation.css`, `cuba-runtime.ts`, `AdminShell`, `AdminIcon`, `AdminDataTable`, `AdminPagination` |

## Included from Techwind

- Nunito typography through `next/font` (no remote runtime stylesheet);
- responsive top navigation, dropdown/mobile navigation, footer and back-to-top;
- card, button, field, section and responsive interaction conventions;
- Remix icon visual language through the typed local SVG adapter;
- sticky, escape/outside-click and scroll behavior through a React hook.

## Included from Cuba

- Rubik typography through `next/font`;
- compact page wrapper, sidebar, header, body, breadcrumb and footer hierarchy;
- cards, forms, controls, data tables, pagination, drawer and disclosure patterns;
- Feather icon visual language through the typed local SVG adapter;
- drawer focus trap, Escape/focus restoration and disclosure cleanup hooks.

## Deliberately excluded

- vendor demo pages, data, names, logos and branding;
- jQuery, Vite/Pug runtime, global initializer scripts and duplicate Tailwind;
- charts/editors/calendars/maps/carousels/lightboxes until a product feature
  demonstrates need and passes dependency review;
- duplicate CSS resets, direct Google Fonts CSS imports, license/purchase data;
- Cuba default violet/orange palette and Techwind styles inside Admin;
- any functionality already owned by Portal API, Keycloak, Moodle or NextAuth.

The static command `node scripts/verify-ui-foundation-contract.mjs all` pins
these decisions. A vendor refresh must update this manifest, ADR evidence and
the expected tree ID in the same reviewed change; weakening the guard is not an
acceptable upgrade strategy.

## Library decision matrix

| Source/library | Source version evidence | Foundation | Decision | Runtime/build purpose | Compatibility and security note |
|---|---|---|---|---|---|
| Techwind compiled Tailwind CSS | bundled header: 4.2.2 | Portal | Adapt relevant rules | layout/components | Product stays on Tailwind 3.4.19; importing the full bundle would duplicate reset/utilities. |
| Techwind `app.js` | source snapshot, unlabelled | Portal | React-safe equivalent | navigation/sticky/back-to-top | Hook cleanup prevents global listeners, duplicate initialization and hydration drift. |
| Remix Icon | bundled source, unlabelled | Portal | Typed local SVG mapping | icons | No font request or new npm dependency; decorative SVG is hidden from assistive tech. |
| Tiny Slider, Tobii, Swiper, Choices, particles and other plugins | bundled source, versions not authoritative | Portal | Not used | demo/optional feature | No active product need; exclusion reduces bundle and supply-chain surface. |
| Cuba Vite/Tailwind build | Vite 6.0.1; Tailwind 3.4.17 | Admin | Reference only | vendor compilation | Incompatible build ownership; Next.js/Tailwind product baseline is preserved. |
| Cuba global/custom scripts and jQuery | source snapshot, mixed/unlabelled | Admin | React-safe equivalent or not used | drawer/disclosure/demo | Global mutation is incompatible with React lifecycle; no jQuery enters runtime. |
| Feather icons | bundled source, unlabelled | Admin | Typed local SVG mapping | icons | Avoids icon-font loading and additional npm dependency. |
| FontAwesome, Icofont, Themify and optional Cuba plugins | bundled source, unlabelled | Admin | Not used | demos/optional feature | A second icon system and unused JS/CSS are prohibited. |
| Nunito / Rubik | Google font family via Next.js | Portal / Admin | Used with `next/font` | typography | Self-hosted by the Next.js build; no client-side Google Fonts request. |
