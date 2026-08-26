# Admin UI Visual Contract — Cuba Harmonization

**Status:** Canonical

**Canonical task:** TASK-011C — Admin Web Cuba UI Harmonization & No-Orange Enforcement

**Applies to:** `apps/admin-web/` only

## 1. Non-negotiable palette rule

Teman Belajar Admin uses the established Cuba-derived shell and component
hierarchy with a bright sky/light-blue product accent in **both light and dark
themes**. Orange and amber are forbidden in every application-controlled Admin
surface and state, including default, hover, focus, active, selected, checked,
disabled, loading, validation, table, tree, modal, file, caret, outline, border,
shadow, gradient, and decorative UI.

Status colors keep their meaning:

- success: green/emerald;
- warning: yellow, never orange or amber;
- error/destructive: rose/red;
- information and product action: sky/cyan;
- neutral/disabled: the Admin slate surface hierarchy.

This contract does not apply to user-uploaded media pixels or third-party pages
outside the Admin application. It does apply to every color controlled by Admin
HTML, CSS, SVG, Tailwind utilities, inline styles, and component state.

## 2. Fixed action and interaction tokens

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `admin-primary` | `#38bdf8` | `#38bdf8` | primary action/active surface |
| `admin-primary-hover` | `#0ea5e9` | `#0ea5e9` | primary hover/pressed surface |
| `admin-on-primary` | `#082f49` | `#082f49` | readable foreground on bright actions |
| `admin-accent-text` | `#0369a1` | `#7dd3fc` | links, labels, icons, and emphasis |
| `admin-accent-border` | `#0284c7` | `#38bdf8` | selected/control border |
| `admin-focus` | `#0284c7` | `#38bdf8` | opaque visible focus indicator |
| `admin-accent-soft` | `rgba(56, 189, 248, .18)` | `rgba(56, 189, 248, .16)` | selected/inset accent surface |
| `admin-warning` | `#eab308` | `#fde047` | non-orange warning indicator |

The light theme deliberately uses a darker sky value for normal-size accent
text and focus/border contrast; copying the lighter dark-theme foreground into
a white surface is prohibited. Primary text contrast is 6.48:1 and hover text
contrast is 5.01:1. Light accent text on white is 5.93:1, while the opaque light
focus color against white is 4.10:1. Light muted text uses `#475569`, providing
at least 6.92:1 across the white and muted panel surfaces used by Admin.

## 3. Required component and state coverage

The semantic contract must govern the Admin shell, sidebar, topbar, search,
profile menu, breadcrumbs, cards, tables, toolbars, forms, native controls,
checkboxes, choice cards, file selectors, Media Library, Media Picker tabs and
selection, hierarchy tree selection, status badges, autosave/recovery states,
empty/loading/error/unauthorized states, dialogs, overlays, footer, and every
future Admin component.

New code must prefer `admin-*` semantic primitives. A new raw product-action
color is not permitted when a semantic token already exists. Warning UI must
use the yellow semantic path instead of an amber utility.

## 4. Static regression gate

`npm run test:no-orange` scans Admin application sources and fails on:

- Tailwind orange or amber utility families;
- orange/amber hue names;
- known raw Tailwind orange/amber hexadecimal and RGB values;
- raw HSL colors in the orange hue range.

`npm run test:theme` independently pins the light and dark action, text,
border, and focus tokens. Both commands are mandatory in the Admin CI contract
job. Do not weaken, exclude, or bypass either guard to make a change pass.

## 5. Browser and accessibility acceptance

For every Admin color change, verify authenticated representative routes in
light and dark themes at desktop and 390 px mobile. Exercise shell navigation,
search/profile controls, tables, forms and focus, selected tree/tab/card states,
modal behavior, statuses, and error/empty/loading states that are reachable.

Acceptance requires:

1. computed application styles contain no orange-range UI color;
2. theme toggle, reload persistence, focus visibility, keyboard navigation, and
   responsive overflow checks pass;
3. normal text targets at least 4.5:1, large text at least 3:1, and meaningful
   non-text/focus boundaries at least 3:1;
4. no browser console error or hydration warning is introduced;
5. static guards, lint, typecheck, production build, and dependency audit pass.

## 6. Cuba runtime source

`vendor/ui-templates/cuba/ORIGINAL/` is the immutable licensed reference. The
relevant shell, component, icon and typography patterns are adapted through
`apps/admin-web/src/styles/cuba-foundation.css`, the React-safe Cuba runtime,
and semantic `admin-*` product aliases. Vendor source, branding, demo data,
unused plugins, and incompatible global initializers must never enter the
application runtime. See ADR-018 and `UI-SOURCE-MAPPING.md`.

## 7. Change authority

Any future exception that would introduce orange/amber into Admin, change the
fixed action palette, or weaken the static/browser gates requires an explicit
human governance decision and a simultaneous update to this contract,
`DESIGN-TOKENS.md`, automated guards, and the relevant handoff. Portal Techwind
tokens remain separate and are not changed by TASK-011C.
