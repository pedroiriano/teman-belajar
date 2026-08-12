# ADR-013 — Techwind + Cuba as UI Vendor Foundations
**Status:** Accepted

## Context

Teman Belajar memiliki dua licensed Tailwind UI templates:
- Techwind untuk public-facing experience.
- Cuba untuk admin/backoffice.

Menggabungkan keduanya dalam satu global theme berisiko menimbulkan konflik CSS, dependency, token dan visual inconsistency.

## Decision

1. Techwind menjadi reference foundation `apps/portal-web`.
2. Cuba menjadi reference foundation `apps/admin-web`.
3. Vendor originals berada di `vendor/ui-templates/*/ORIGINAL/` dan diperlakukan read-only.
4. Product code tidak boleh bergantung pada modifikasi langsung vendor source.
5. Theme/CSS vendor tidak boleh cross-import.
6. `packages/ui` hanya shared neutral primitive.
7. shadcn/ui bersifat selective fallback.

## Consequences

### Positive
- UI investment yang sudah dibeli dimanfaatkan.
- Product implementation tetap maintainable.
- Upgrade/reference vendor lebih mudah dibanding vendor source yang diedit.
- Portal/Admin dapat mempertahankan karakter UI masing-masing.

### Negative
- Perlu token mapping dan component inventory.
- Beberapa primitive mungkin memiliki dua implementation variants.
- Developer/agent harus memahami theme boundary.
