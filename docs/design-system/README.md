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

## Runtime Theme Contract

- Portal dan Admin wajib menyediakan tema `light` dan `dark`.
- Pilihan pengguna disimpan per origin pada `localStorage` key
  `teman-belajar-theme`. Nama kontraknya sama, tetapi browser memang mengisolasi
  nilai Portal dan Admin ketika host/port berbeda.
- Nilai yang sah hanya `light` atau `dark`; tanpa nilai tersimpan, gunakan
  `prefers-color-scheme` sistem operasi.
- Root document wajib memiliki `data-theme="light|dark"` sebelum body dirender
  untuk mencegah kilatan tema yang salah.
- Portal menambahkan root class `dark` ketika tema gelap aktif, mengikuti pola
  Techwind.
- Admin menambahkan root class `dark` dan `dark-only` ketika tema gelap aktif,
  mengikuti pola Cuba tanpa mengimpor theme global Cuba.
- Detail token, batas aplikasi, larangan, dan matriks verifikasi ada di
  `THEME-INTEGRATION-RULES.md` dan `DESIGN-TOKENS.md`.

## Documents

- `UI-SOURCE-MAPPING.md`
- `DESIGN-TOKENS.md`
- `COMPONENT-INVENTORY.md`
- `THEME-INTEGRATION-RULES.md`
