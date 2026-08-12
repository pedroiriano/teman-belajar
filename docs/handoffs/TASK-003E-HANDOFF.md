# TASK-003E Handoff — Portal/Admin Light and Dark Themes

**Tanggal:** 2026-08-12
**Status:** implemented; verification evidence must remain current
**Scope:** Portal Techwind theme, Admin Cuba theme, persistence, accessibility,
legacy color normalization, documentation, and runtime verification

## 1. Outcome

Portal Publik dan Admin sekarang memiliki tema terang dan gelap yang benar-benar
terpisah secara visual:

- Portal memakai hierarchy surface Techwind (`white`, `slate-50`, `slate-800`,
  `slate-900`) dengan action teal Teman Belajar.
- Admin memakai hierarchy body/card/inset Cuba (`#1d1e26`, `#262932`,
  `#323846`, border `#374558`) dengan action orange-700 Teman Belajar agar
  teks putih pada tombol memenuhi target kontras WCAG AA.
- Keduanya memakai nama preference key `teman-belajar-theme`, bukan stylesheet
  atau presentation token bersama. Nilainya tetap terisolasi per origin sesuai
  keamanan browser; Portal dan Admin pada port/domain berbeda menyimpan pilihan
  masing-masing.
- Tema awal diterapkan sebelum body paint untuk mencegah flash tema salah.
- Toggle dapat dipakai dengan keyboard, memiliki visible focus, Indonesian
  accessible label, `aria-pressed`, tooltip, serta icon/label yang berubah.
- Explicit preference bertahan setelah reload dan tersinkron antar-tab pada
  origin yang sama.
- Tanpa explicit preference, tema mengikuti `prefers-color-scheme`.

## 2. Files and Ownership

| Responsibility | Portal | Admin |
|---|---|---|
| Theme controller | `apps/portal-web/src/components/theme-toggle.tsx` | `apps/admin-web/src/components/theme-toggle.tsx` |
| Pre-paint bootstrap | `apps/portal-web/src/app/layout.tsx` | `apps/admin-web/src/app/layout.tsx` |
| Tokens/adapters | `apps/portal-web/src/app/globals.css` | `apps/admin-web/src/app/globals.css` |
| Vendor reference | `vendor/ui-templates/techwind/ORIGINAL/` | `vendor/ui-templates/cuba/ORIGINAL/` |

Vendor `ORIGINAL/` remains read-only and no vendor runtime/dependency was copied.

## 3. Runtime Contract — Do Not Improvise

1. Storage key exact: `teman-belajar-theme`.
2. Allowed values exact: `light`, `dark`.
3. Root attribute exact: `data-theme="light|dark"`.
4. Dark Portal root class: `dark`.
5. Dark Admin root classes: `dark dark-only`.
6. `color-scheme` must equal the resolved theme.
7. The bootstrap script runs in `<head>` before body rendering.
8. Theme toggle must not call an API or expose authentication/session data.
9. Portal and Admin token names must never cross application boundaries.
10. Do not add a theme dependency unless a separate approved task demonstrates
    a need and includes migration/flash/accessibility analysis.
11. Never describe or implement `localStorage` as cross-origin storage. Sharing
    a preference across Portal/Admin origins requires a separately reviewed
    server-mediated contract.

## 4. Legacy Color Reconciliation

Some TASK-003 content screens still use direct Tailwind demo utilities. The
owning global stylesheet now adapts those utilities in a scoped manner:

- Portal legacy indigo action/link colors map to Portal teal.
- Admin legacy indigo action/link/focus colors map to Admin orange.
- Common light neutral surfaces, text, borders, inputs, and semantic status
  colors receive dark-mode equivalents.

This adapter is a compatibility layer, not permission to add more hard-coded
page colors. New UI must use semantic component classes/tokens. When a legacy
screen is refactored, remove only the adapter selector proven to be unused.

## 5. Mandatory Agent/Gemini Procedure

Before editing UI:

1. Read `AGENTS.md` fully.
2. Read `docs/design-system/README.md`.
3. Read `docs/design-system/DESIGN-TOKENS.md`.
4. Read `docs/design-system/THEME-INTEGRATION-RULES.md`.
5. Inspect the owning application and its vendor reference; use `rg -uu` because
   vendor paths may be ignored by Git.
6. Run `git status --short` and preserve unrelated user changes.

During implementation:

1. Edit only the owning app; never import the other app's globals.
2. Preserve server-side auth boundaries and do not move business/auth logic into
   the theme component.
3. Cover navigation, mobile menu, page background, cards, text, controls,
   tables, badges, loading, empty, error, and unauthorized states.
4. Keep reduced-motion behavior and visible focus.
5. Never edit either vendor `ORIGINAL/` tree.

Before declaring DONE:

```powershell
Set-Location apps/portal-web
npm run lint
npm run build

Set-Location ../admin-web
npm run lint
npm run build
```

Then use a real browser on `http://localhost:3000` and
`http://localhost:3001`. Toggle light → dark → light, reload in dark, verify
storage persistence, inspect 390px mobile layout, and check the console. Record
any unreachable authenticated path rather than weakening authentication.

## 6. Prohibited Changes

- No Portal/Cuba or Admin/Techwind cross-import.
- No modification of licensed vendor originals.
- No second localStorage key or page-specific theme preference.
- No global inversion/filter shortcut.
- No dark text on dark surfaces or light pastel badges with unreadable text.
- No removal of `suppressHydrationWarning` while the root theme is initialized
  client-side before hydration.
- No claim of completion without lint, production build, browser toggle,
  persistence, mobile, and console evidence.

## 7. Verification Record

Fill/update this section whenever theme behavior changes:

| Check | Portal | Admin |
|---|---|---|
| lint | PASS — no warning/error | PASS — no warning/error |
| TypeScript `--noEmit` | PASS | PASS |
| production build | PASS — Docker Node 22/Next.js 14.2.35 | PASS — Docker Node 22/Next.js 14.2.35 |
| light desktop | PASS — body `#f8fafc`, panel `#fff` | PASS — body `#f6f7fb`, card `#fff` |
| dark desktop | PASS — body `#0f172a`, panel `#111827` | PASS — body `#1d1e26`, card `#262932` |
| dark reload persistence | PASS — `data-theme=dark`, root `dark` | PASS — `data-theme=dark`, root `dark dark-only` |
| same-origin tab sync | PASS | covered by identical controller contract |
| 390px mobile/no overflow | PASS — `scrollWidth <= viewport` | PASS — `scrollWidth == viewport` |
| console/hydration errors | PASS — no warning/error | PASS — no warning/error |
| authenticated shell | not reached — no Portal login session used | not reached — no Admin login session used |

Authenticated paths were deliberately not bypassed and no local credential was
read or transmitted for visual testing. Future changes with an existing safe
session must repeat the authenticated rows; never weaken Keycloak authorization
to obtain screenshots.

## 8. Known Dependency Risk

`npm audit --omit=dev --audit-level=high` reports two high severity dependency
groups in both applications (`next` and its nested `postcss`). The registry's
automatic fix upgrades Next.js 14 to Next.js 16, a breaking major framework
change. In accordance with `AGENTS.md`, this task did not run
`npm audit fix --force`. The same risk and required separate upgrade task are
recorded in `TASK-003D-HANDOFF.md`; do not hide the audit result or perform the
major upgrade opportunistically inside a UI task.
