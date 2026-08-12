# Teman Belajar Design System

Dokumen ini mengatur bagaimana dua UI template komersial digunakan tanpa membuat produk menjadi campuran visual yang tidak konsisten.

## Foundations

- **Public/Learner:** Techwind
- **Admin/Backoffice:** Cuba
- **CSS foundation:** Tailwind CSS
- **Shared product layer:** Teman Belajar design tokens + neutral shared primitives

## Core Principle

Vendor template adalah **input/reference**, bukan output akhir.

Semua implementasi final:
- diberi branding Teman Belajar;
- mengikuti accessibility requirement;
- menghapus demo/vendor branding;
- menggunakan domain data Teman Belajar;
- berada di `apps/*`, bukan di `vendor/*`.

## Documents

- `UI-SOURCE-MAPPING.md`
- `DESIGN-TOKENS.md`
- `COMPONENT-INVENTORY.md`
- `THEME-INTEGRATION-RULES.md`
