# UI Source Mapping — Teman Belajar

**Status:** Canonical UI Governance  
**Version:** 3.1

| Experience | Vendor Foundation | Reference Path | Implementation Path |
|---|---|---|---|
| Public Portal | Techwind | `vendor/ui-templates/techwind/ORIGINAL/` | `apps/portal-web/` |
| Learner / My Learning | Techwind | `vendor/ui-templates/techwind/ORIGINAL/` | `apps/portal-web/` |
| Admin / Backoffice | Cuba | `vendor/ui-templates/cuba/ORIGINAL/` | `apps/admin-web/` |

## Public / Learner Mapping

Techwind dapat menjadi referensi untuk:
- header/navigation;
- hero;
- landing section;
- cards;
- blog/news patterns;
- course discovery;
- FAQ;
- gallery;
- footer;
- typography/spacing;
- responsive behavior.

## Admin Mapping

Cuba dapat menjadi referensi untuk:
- admin shell;
- sidebar/topbar;
- tables;
- forms;
- filters;
- dashboard cards;
- charts;
- modal/drawer;
- settings;
- audit viewer;
- integration health.

## Rule

Tidak ada kewajiban memakai seluruh komponen vendor. Pilih hanya komponen yang diperlukan feature.

“Sesuai Techwind/Cuba” berarti kesetiaan pada pola visual dan interaksi yang relevan—hierarki, komposisi shell, kepadatan, radius, bayangan, warna aksen, responsive behavior, dan state—bukan menyalin semua halaman demo. Implementasi wajib memakai identitas dan data Teman Belajar.

### Acceptance gate

- Portal: header, navigasi responsif, hero/section/card yang diperlukan, footer, tema, dan back-to-top harus berasal dari bahasa visual Techwind.
- Admin: sidebar berkelompok, topbar, breadcrumb, content canvas, cards/widgets, tables/forms/modal yang diperlukan, footer, dan tema harus berasal dari bahasa visual Cuba.
- Ikon harus berasal dari sistem ikon vendor atau adaptasi SVG lokal yang konsisten; emoji dan ikon Unicode dekoratif tidak diterima sebagai fondasi UI.
- Tidak boleh ada shell publik generik berwarna hitam atau shell admin berupa satu kartu login/dashboard tanpa struktur Cuba.
- Route yang belum mempunyai kemampuan backend tidak boleh dibuat seolah-olah aktif. Tandai `Segera` atau jangan tampilkan.
- Perubahan harus lulus lint, typecheck, build, dan inspeksi visual pada desktop, mobile, tema terang, dan tema gelap.
