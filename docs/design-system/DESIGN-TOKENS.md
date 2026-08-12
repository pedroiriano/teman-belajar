# Design Tokens — Teman Belajar

**Status:** Baseline; values finalized during UI inventory.

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
