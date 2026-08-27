# Portal Navigation Taxonomy — Teman Belajar

**Status:** Canonical UI Governance
**Foundation:** Techwind header/dropdown patterns
**Owner:** Portal experience

## 1. Tujuan

Navbar memprioritaskan maksud pengguna, bukan struktur teknis aplikasi. Tingkat
pertama dibatasi menjadi `Beranda`, `Pembelajaran`, `Pengetahuan`, dan
`Informasi` agar mudah dipindai pada desktop dan mobile.

## 2. Struktur Aktif

| Kelompok | Item | Target | Status |
|---|---|---|---|
| — | Beranda | `/` | Aktif |
| Pembelajaran | Pembelajaran Saya | `/my-learning` | Aktif, perlu login |
| Pembelajaran | Cari Kelas | `/search?content_type=course` | Aktif |
| Pembelajaran | Pelatihan Penuh | `/training-programs` | Aktif; katalog/detail publik dan progres perlu login |
| Pembelajaran | Pembelajaran Singkat | `/microlearning` | Aktif; katalog/detail publik, bookmark dan resume perlu login |
| Pembelajaran | Webinar | TASK-015 (setelah TASK-021) | `Segera` / PLANNED |
| Pembelajaran | Jalur Belajar | TASK-016 (setelah TASK-013–015) | `Segera` / PLANNED |
| Pengetahuan | Pusat Pengetahuan | `/knowledge` | Aktif |
| Pengetahuan | Cari Pengetahuan | `/search?content_type=knowledge` | Aktif |
| Informasi | Berita | `/news` | Aktif |
| Informasi | Pengumuman | `/announcements` | Aktif |
| Informasi | Media | `/#media` | Aktif sebagai landing section |
| Informasi | FAQ | `/#faq` | Aktif sebagai landing section |

Item `Segera` harus non-interaktif dan berlabel jelas. Agent dilarang menunjuk
beberapa format pembelajaran ke route generik yang sama hanya agar tampak aktif.
Status dan urutan dependency mengikuti
`docs/roadmap/POST-TASK-012-EXPANSION-ROADMAP.md`, bukan nomor task semata.

## 3. Rekomendasi Tahap Berikutnya

1. Pelatihan Penuh dan Pembelajaran Singkat telah memiliki route, ownership,
   dan state yang berbeda. Pertahankan batas completion formal di Moodle.
2. Jalankan TASK-021 sebelum TASK-015 agar reminder Webinar memakai kontrak
   Notification Center, lalu selesaikan provider/time-zone/capacity policy.
3. Jalankan TASK-016 setelah TASK-013–015 agar composition dan progress path
   memiliki source item yang stabil.
4. Pindahkan `Media` dari anchor landing menjadi route melalui TASK-022, hanya
   untuk galeri publik terkurasi dengan visibility contract tersendiri.
5. FAQ landing berkembang menjadi Help Center melalui TASK-017; navigation dan
   homepage menjadi dinamis melalui TASK-020 tanpa memasukkan secret ke UI.

## 4. Aturan Interaksi

- Desktop menggunakan dropdown dua kolom, dapat dibuka melalui keyboard, dan
  ditutup dengan `Escape` atau perpindahan route.
- Mobile menggunakan accordion native `details/summary` dengan target sentuh
  minimal 44 piksel.
- Search, theme toggle, dan status login tetap utility terpisah dari taxonomy.
- Label harus berbahasa Indonesia, ringkas, dan tidak memakai istilah vendor.
- Dark/light theme, focus indicator, reduced viewport, dan tautan aktif wajib
  dipertahankan sesuai `THEME-INTEGRATION-RULES.md`.
