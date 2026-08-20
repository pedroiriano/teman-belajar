# Design Tokens — Teman Belajar

**Status:** Implemented baseline through TASK-003E.

## Implemented Experience Tokens

### Portal / Learner (Techwind-inspired)

| Semantic token | Light | Dark |
|---|---|---|
| `portal-primary` | `#0f766e` | `#2dd4bf` |
| `portal-primary-hover` | `#115e59` | `#5eead4` |
| `portal-ink` | `#102a43` | `#f8fafc` |
| `portal-copy` | `#475569` | `#cbd5e1` |
| `portal-muted` | `#64748b` | `#94a3b8` |
| `portal-surface` | `#f8fafc` | `#0f172a` |
| `portal-panel` | `#ffffff` | `#111827` |
| `portal-panel-muted` | `#f1f5f9` | `#1e293b` |
| `portal-border` | `#d9e2ec` | `#334155` |
| `portal-accent` | `#f59e0b` | `#f59e0b` |

Large surface radius: `1rem` to `1.5rem`. Dark surfaces follow the Techwind
`slate-900`/`slate-800` hierarchy; they must not use Cuba card variables.

### Admin / Backoffice (Cuba-inspired)

| Semantic token | Light | Dark |
|---|---|---|
| `admin-primary` (action surface) | `#c2410c` | `#38bdf8` |
| `admin-primary-hover` | `#9a3412` | `#0ea5e9` |
| `admin-on-primary` | `#ffffff` | `#082f49` |
| `admin-accent-text` | `#c2410c` | `#7dd3fc` |
| `admin-ink` | `#1e293b` | `#f1f5f9` |
| `admin-copy` | `#475569` | `#cbd5e1` |
| `admin-muted` | `#64748b` | `#a8a9ad` |
| `admin-surface` | `#f6f7fb` | `#1d1e26` |
| `admin-panel` | `#ffffff` | `#262932` |
| `admin-panel-muted` | `#f8fafc` | `#323846` |
| `admin-border` | `#e2e8f0` | `#374558` |
| `admin-field` | `#ffffff` | `#323846` |
| `admin-field-readonly` | `#f8fafc` | `#1f2533` |
| `admin-field-disabled` | `#f1f5f9` | `#20242d` |
| `admin-field-disabled-text` | `#94a3b8` | `#7d8594` |
| `admin-sidebar` | `#111827` | `#171921` |

Large surface radius: `1rem`. Cuba surface hierarchy is adapted from its
`dark-only` variables. Light mode uses the established Teman Belajar Admin
orange action. **Dark mode is intentionally different and non-negotiable:** its
primary/action color is bright light blue (`sky-400`), hover is `sky-500`, and
accent text is `sky-300`. Dark blue `admin-on-primary` text keeps the bright
button surface accessible. Do not use orange or vendor violet as the Cuba Admin
dark-mode primary/accent palette.

Portal and Admin deliberately use separate presentation tokens. Semantic success,
warning, danger, focus, disabled, and neutral meanings stay consistent.

## Token Families

### Brand
- `brand-primary`
- `brand-secondary`
- `brand-accent`
- `brand-surface`
- `brand-on-primary`

### Semantic
- `success`
- `warning`
- `danger`
- `info`
- `neutral`

### Typography
- display
- heading
- body
- caption
- mono

### Spacing
Gunakan skala konsisten yang compatible dengan Tailwind.

### Shape
- radius-small
- radius-medium
- radius-large
- radius-pill

### Elevation
- surface
- raised
- overlay

### Motion
- fast
- standard
- slow
- reduced-motion-safe

## Governance

1. Jangan membawa seluruh token vendor mentah ke product layer.
2. Petakan token Techwind/Cuba ke semantic token Teman Belajar.
3. Portal dan Admin boleh memiliki presentation token berbeda.
4. Semantic meaning harus konsisten lintas aplikasi.
5. Contrast harus memenuhi target accessibility.
6. Do not hard-code a new neutral page/card/text color when an application
   semantic token already represents it.
7. Status colors may retain semantic hue, but dark mode must use tinted surfaces
   and readable foregrounds rather than light-theme pastel values.
8. Any token change must be checked in both themes and both responsive breakpoints.
9. Admin text fields, textareas, and selects use `.admin-input`; file inputs,
   checkboxes, and choice cards use their dedicated `admin-*` primitives.
10. Never attach `!bg-*`, `!text-*`, or `!border-*` color utilities to
    `.admin-input`. Forced colors bypass Cuba semantic tokens and can make text,
    placeholders, autofill, or native control states illegible in one theme.
11. Cuba Admin dark mode must keep the fixed bright-light-blue contract above.
    Any change to those four action tokens requires explicit human approval and
    a simultaneous update to the automated Admin theme contract.
