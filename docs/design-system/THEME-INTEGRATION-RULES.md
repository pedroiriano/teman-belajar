# Theme Integration Rules — Teman Belajar

**Status:** Canonical UI Governance  
**Version:** 5.0

## 1. Techwind Boundary

Techwind hanya menjadi visual foundation untuk:
- `apps/portal-web/`
- public pages;
- authenticated learner experience.

Jangan import stylesheet/theme Techwind ke `apps/admin-web`.

## 2. Cuba Boundary

Cuba hanya menjadi visual foundation untuk:
- `apps/admin-web/`
- backoffice/admin experience.

Jangan import stylesheet/theme Cuba ke `apps/portal-web`.

## 3. Shared UI

`packages/ui/` hanya menampung primitive netral yang benar-benar aman dipakai lintas experience, misalnya:
- product logo wrapper;
- accessibility utilities;
- status badge semantic;
- loading;
- error/empty state;
- shared icon abstraction;
- progress semantic component.

## 4. Tailwind Governance

- Portal dan Admin boleh memiliki Tailwind preset/config berbeda.
- Jangan merge seluruh vendor Tailwind config secara buta.
- Audit plugin/dependency vendor sebelum dipakai.
- Gunakan product semantic tokens untuk branding.
- Purge/content paths harus hanya mencakup source yang diperlukan.

## 4A. Light/Dark Runtime Contract — Mandatory

1. The only persisted key is `teman-belajar-theme`.
2. The only persisted values are `light` and `dark`.
3. If the key is absent, resolve from `prefers-color-scheme`.
4. Apply the resolved value to `document.documentElement.dataset.theme` before
   the page body paints. Do not wait for a React effect for initial application.
5. In Portal, dark mode must also toggle the root `dark` class.
6. In Admin, dark mode must also toggle both root `dark` and `dark-only` classes.
7. Set the document `color-scheme` to the active value so native controls match.
8. The toggle must be a real `button`, expose an Indonesian accessible label,
   publish state through `aria-pressed`, remain keyboard reachable, and show a
   visible focus indicator.
9. Theme preference must synchronize through the browser `storage` event
   between tabs on the same origin. Do not claim cross-origin synchronization;
   `localStorage` is isolated by scheme, host, and port.
10. OS theme changes may update the UI only while no explicit preference exists.

The implementation locations are fixed:

- Portal controller: `apps/portal-web/src/components/theme-toggle.tsx`
- Portal tokens/adapters: `apps/portal-web/src/app/globals.css`
- Admin controller: `apps/admin-web/src/components/theme-toggle.tsx`
- Admin tokens/adapters: `apps/admin-web/src/app/globals.css`

Do not introduce a second storage key, cookie, context provider, theme package,
or duplicate page-level toggle without an accepted design-system change.

## 4B. Surface and Color Rules

- Portal light/dark surfaces follow Techwind's white/slate hierarchy and Teman
  Belajar teal actions.
- Admin light/dark surfaces follow Cuba's body/card/inset hierarchy. Both Admin
  themes use the canonical bright sky/light-blue action/accent family. Orange
  and amber are prohibited across every application-controlled state, while
  warning uses semantic yellow. Light mode uses its contrast-safe darker sky
  text/border tokens; dark mode keeps `sky-300` accent text and dark-blue text
  on primary. The binding contract is `ADMIN-UI-VISUAL-CONTRACT.md`.
- Do not apply Portal CSS variables to Admin or Admin CSS variables to Portal.
- Legacy utility colors may be normalized inside the owning application's
  stylesheet. Normalization must be scoped by `.portal-root` or `.admin-root`.
- Text, borders, cards, inputs, tables, menus, overlays, status badges, loading,
  empty, error, and unauthorized states must remain readable in both themes.
- Admin form controls must use the semantic primitives in
  `apps/admin-web/src/app/globals.css`: `.admin-input`, `.admin-file-input`,
  `.admin-checkbox`, and `.admin-choice-card`. Do not override their foreground,
  background, or border with forced Tailwind color utilities.
- Validate editable, read-only, disabled, selected, placeholder, native select,
  date/time, file-picker, and browser-autofill states in both Admin themes.
- Do not solve dark mode with `filter`, image inversion, opacity over the whole
  application, or a global imported vendor stylesheet.
- Run both `npm run test:theme` and `npm run test:no-orange`; neither guard may
  be weakened or bypassed to introduce a color exception.

## 4C. Required Verification Matrix

Before a theme change is DONE, all rows below are mandatory:

| Application | Authentication state | Viewport | Themes |
|---|---|---|---|
| Portal | public | desktop and 390px mobile | light + dark |
| Portal | authenticated route or honest auth boundary | desktop | light + dark |
| Admin | unauthenticated login | desktop and 390px mobile | light + dark |
| Admin | authenticated shell when credentials are available | desktop | light + dark |

For each reachable row, verify:

1. the toggle changes `data-theme` and its accessible label;
2. reload preserves the explicit preference;
3. no horizontal overflow at 390px;
4. no console error or hydration warning;
5. primary text, muted text, controls, borders, and focus ring remain legible;
6. `npm run lint` and `npm run build` pass in both web applications.

Portal and Admin intentionally persist independently when served on different
origins. Cross-origin preference sharing would require a separately approved,
server-mediated design; do not attempt to read another origin's storage.

If an authenticated row cannot be reached locally, record that limitation in
the handoff; never bypass Keycloak or weaken authorization merely to screenshot it.

## 5. shadcn/ui Policy

`shadcn/ui` **bukan visual foundation utama**.

Boleh digunakan secara selektif bila:
- vendor tidak menyediakan primitive yang diperlukan;
- accessibility/behavior lebih baik;
- style dapat diselaraskan dengan Teman Belajar;
- tidak menyebabkan third visual language.

Penambahan komponen shadcn yang material harus dijelaskan di PR.

## 6. Vendor Copy Policy

Dilarang:
- copy semua vendor demo;
- mempertahankan lorem ipsum/demo credentials;
- mempertahankan vendor logo/branding;
- menyalin page yang tidak masuk feature catalogue.

Wajib:
- adapt only what is used;
- rename berdasarkan domain Teman Belajar;
- test responsive/accessibility;
- remove unused dependency/assets.

## 7. Upgradeability

Vendor source tetap read-only agar:
- dapat dibandingkan dengan implementasi;
- upgrade vendor dapat dinilai;
- customization produk tidak hilang saat vendor update.

## 8. Prohibited Agent Shortcuts

- Do not edit anything under either vendor `ORIGINAL/` directory.
- Do not copy Techwind dark utilities into Admin or Cuba `dark-only` globals into Portal.
- Do not add `next-themes` or another dependency for this baseline implementation.
- Do not remove the pre-paint initialization script; doing so reintroduces theme flash.
- Do not declare theme complete based only on source inspection or build output;
  perform browser interaction and visual checks.
