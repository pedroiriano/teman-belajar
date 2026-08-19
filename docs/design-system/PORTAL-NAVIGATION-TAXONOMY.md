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
| Pembelajaran | Pelatihan Penuh | Belum ada kontrak format | `Segera` |
| Pembelajaran | Pembelajaran Singkat | Belum ada kontrak format | `Segera` |
| Pembelajaran | Webinar | Belum ada event/session domain | `Segera` |
| Pembelajaran | Jalur Belajar | Belum ada learning-path domain | `Segera` |
| Pengetahuan | Pusat Pengetahuan | `/knowledge` | Aktif |
| Pengetahuan | Cari Pengetahuan | `/search?content_type=knowledge` | Aktif |
| Informasi | Berita | `/news` | Aktif |
| Informasi | Pengumuman | `/announcements` | Aktif |
| Informasi | Media | `/#media` | Aktif sebagai landing section |
| Informasi | FAQ | `/#faq` | Aktif sebagai landing section |

Item `Segera` harus non-interaktif dan berlabel jelas. Agent dilarang menunjuk
beberapa format pembelajaran ke route generik yang sama hanya agar tampak aktif.

## 3. Rekomendasi Tahap Berikutnya

1. Tambahkan atribut format kanonis pada course catalogue sebelum mengaktifkan
   Pelatihan Penuh dan Pembelajaran Singkat.
2. Bentuk domain Webinar dengan jadwal, zona waktu, kapasitas, pendaftaran,
   rekaman, dan state pembatalan sebelum membuat route.
3. Bentuk domain Jalur Belajar dengan urutan materi, prerequisite, progres, dan
   completion rule sebelum membuat menu aktif.
4. Pindahkan `Media` dari anchor landing menjadi route hanya jika ada galeri
   publik dengan visibility contract tersendiri.
5. Kelola taxonomy melalui Admin setelah kontrak navigation/taxonomy tersedia;
   sampai saat itu struktur shell tetap source-controlled dan reviewable.

## 4. Aturan Interaksi

- Desktop menggunakan dropdown dua kolom, dapat dibuka melalui keyboard, dan
  ditutup dengan `Escape` atau perpindahan route.
- Mobile menggunakan accordion native `details/summary` dengan target sentuh
  minimal 44 piksel.
- Search, theme toggle, dan status login tetap utility terpisah dari taxonomy.
- Label harus berbahasa Indonesia, ringkas, dan tidak memakai istilah vendor.
- Dark/light theme, focus indicator, reduced viewport, dan tautan aktif wajib
  dipertahankan sesuai `THEME-INTEGRATION-RULES.md`.
