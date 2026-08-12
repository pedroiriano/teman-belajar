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
| `admin-primary` (action surface) | `#c2410c` | `#c2410c` |
| `admin-primary-hover` | `#9a3412` | `#9a3412` |
| `admin-accent-text` | `#c2410c` | `#fdba74` |
| `admin-ink` | `#1e293b` | `#f1f5f9` |
| `admin-copy` | `#475569` | `#cbd5e1` |
| `admin-muted` | `#64748b` | `#a8a9ad` |
| `admin-surface` | `#f6f7fb` | `#1d1e26` |
| `admin-panel` | `#ffffff` | `#262932` |
| `admin-panel-muted` | `#f8fafc` | `#323846` |
| `admin-border` | `#e2e8f0` | `#374558` |
| `admin-sidebar` | `#111827` | `#171921` |

Large surface radius: `1rem`. Cuba surface hierarchy is adapted from its
`dark-only` variables. Vendor violet/demo actions are mapped to the established
Teman Belajar Admin orange semantic action. The action surface uses orange-700
rather than the old orange-600 baseline so white small text meets WCAG AA
contrast; do not regress this for visual brightness or reintroduce vendor branding.

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
