# TASK-007R UI Appendix — Reconciliation UI Techwind dan Cuba

**Status:** Implemented as TASK-007R UI appendix; verification evidence recorded below
**Scope:** `apps/portal-web`, `apps/admin-web`, dan dokumentasi design system
**Vendor sources:** Techwind untuk Portal; Cuba untuk Admin

## 1. Tujuan

Mengoreksi implementasi yang sebelumnya hanya menyerupai template pada tingkat warna. Portal harus mempunyai struktur landing/public experience Techwind; Admin harus mempunyai shell backoffice Cuba yang utuh tanpa menyalin demo, branding vendor, atau fungsi palsu.

## 2. Diagnosis sebelum koreksi

### Portal

- Shell sudah mempunyai beberapa token Techwind, tetapi landing hanya berisi sedikit section.
- Belum ada navigasi mobile yang lengkap, footer kaya informasi, galeri/media, FAQ, CTA, dan back-to-top.
- Ikon tersebar dan tidak mempunyai kontrak konsisten.

### Admin

- Warna dan kartu saja belum membentuk Cuba.
- Tidak ada sidebar berkelompok, topbar utilities, breadcrumb, content canvas, dan footer yang konsisten.
- Dashboard, table, form, modal, gallery, dan detail workflow memakai gaya yang berbeda-beda.
- Beberapa pesan dan aksi masih berbahasa Inggris.

## 3. Implementasi Portal / Techwind

- `PortalChrome`: brand, navbar desktop, navigasi mobile, search, autentikasi, theme toggle, footer, dan back-to-top.
- Landing page: hero, preview card, foundation strip, learning paths, category grid, content highlights, gallery/media section, platform statistics, FAQ accordion, dan CTA.
- `PortalIcon`: SVG lokal dengan ukuran/stroke konsisten; tidak memakai emoji sebagai fondasi ikon.
- Light/dark tetap memakai kontrak tema Teman Belajar dan token Portal yang terisolasi.
- Public data pages tetap memakai komponen `PageHero`, card, pagination, empty/error/loading state yang sudah ada.

## 4. Implementasi Admin / Cuba

- `AdminShell`: sidebar berkelompok, mobile drawer/overlay, topbar search, notification placeholder yang jujur, theme toggle, profile dropdown, breadcrumb, dan footer.
- Dashboard: welcome panel, statistic cards, module cards, dan visual editorial workflow.
- List pages: page header, toolbar, status badge, responsive table, count, empty dan unauthorized state.
- Create/detail pages: form card, label dan control yang konsisten, error alert, localized action, dan workflow transition.
- Media Library: uploader/dropzone, gallery, asset table, accessible Media Picker modal, dan metadata detail/edit/archive.
- Route canonical yang belum mempunyai implementasi backend ditampilkan disabled dengan label `Segera`; tidak diarahkan ke route palsu.
- Light/dark memakai token Admin/Cuba sendiri dan tidak mengimpor global theme Techwind.

## 5. Component/source rule untuk agent berikutnya

1. Baca `AGENTS.md`, `UI-SOURCE-MAPPING.md`, `COMPONENT-INVENTORY.md`, `THEME-INTEGRATION-RULES.md`, dan handoff ini sebelum mengubah UI.
2. Cari pola paling dekat di vendor `ORIGINAL/`; direktori tersebut read-only.
3. Adaptasi hanya pola yang dibutuhkan fitur. Jangan mengimpor vendor runtime, CSS global, Pug, data demo, atau branding.
4. Gunakan `portal-*` hanya di Portal dan `admin-*` hanya di Admin.
5. Tidak boleh menambah route/menu aktif tanpa fungsi nyata dan authorization server-side.
6. Ikon baru masuk ke registry SVG aplikasi (`PortalIcon`/`AdminIcon`) dengan accessible name pada tombol induk.
7. State interaktif wajib mencakup focus, keyboard, loading, empty, error, dan unauthorized sesuai konteks.
8. Modal wajib memiliki `role="dialog"`, `aria-modal`, judul terhubung, Escape, close control, overlay behavior, dan pengembalian focus.
9. Perubahan tema harus diuji pada light/dark dan tidak boleh mengubah product identity.
10. Selesai hanya setelah lint, typecheck, build, desktop/mobile visual check, dan console check.

## 6. Matriks kesesuaian

| Komponen | Portal Techwind | Admin Cuba | Keputusan |
|---|---:|---:|---|
| Navbar/topbar | Ya | Ya | Implemented |
| Sidebar | N/A | Ya | Implemented |
| Hero/landing section | Ya | N/A | Implemented |
| Card/widget | Ya | Ya | Implemented |
| Form | Sesuai kebutuhan route | Ya | Implemented |
| Modal | Belum dibutuhkan fitur publik | Ya | Media Picker |
| Table | Belum dibutuhkan fitur publik | Ya | Implemented |
| Gallery/media | Ya | Ya | Implemented |
| FAQ | Ya | Fitur Admin belum tersedia | Portal implemented |
| Footer | Ya | Ya | Implemented |
| Back to top | Ya | Tidak perlu pada fixed shell | Implemented sesuai konteks |
| Theme light/dark | Ya | Ya | Implemented, token terisolasi |

## 7. Verification evidence

Perintah wajib dijalankan dari masing-masing direktori aplikasi:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

Hasil akhir rekonsiliasi UI TASK-007R:

- Portal lint: pass.
- Portal typecheck: pass.
- Admin lint: pass.
- Admin typecheck: pass.
- Portal production build: pass (Next.js 16.3.0, 11 generated routes).
- Admin production build: pass (Next.js 16.3.0, 14 generated routes).
- Portal visual QA: pass pada 1440×1000 dan 390×844; navbar, mobile menu, light/dark, hero, cards/sections, dan back-to-top diverifikasi.
- Admin visual QA tanpa sesi: pass pada desktop 1280×720 serta mobile 390×844, light/dark; login tetap dilindungi Keycloak.
- Browser console Portal/Admin: tidak ada warning atau error aplikasi.
- Admin authenticated visual QA: dibatasi oleh kebutuhan sesi/role Keycloak nyata; shell dan seluruh route terproteksi diverifikasi melalui lint, typecheck, build, dan code review tanpa melemahkan authentication.

Catatan non-blocking: build/dev masih mengeluarkan warning inferensi Turbopack workspace root karena repository mempunyai lockfile root dan lockfile per aplikasi. Warning tersebut sudah ada di luar scope reconciliation UI dan tidak menyebabkan build gagal.

## 8. Known boundary

- Admin shell yang sudah login memerlukan sesi dan role Keycloak nyata. QA tidak boleh melemahkan autentikasi atau menambahkan route preview tanpa proteksi hanya untuk screenshot.
- FAQ/Taxonomy, Users/Profile, Integration Health, Audit, dan Configuration masih roadmap. Shell menandainya `Segera`; implementasi penuh memerlukan task backend/frontend tersendiri.
- Ketidaksediaan data API harus menghasilkan state jujur, bukan demo count atau chart palsu.

## 8A. Docker activation correction

Saat mengaktifkan UI pada port kanonis, ditemukan tiga defect TASK-007 yang membuat image terbaru tidak dapat direcreate:

- `.env` lokal belum memiliki `TB_MEILI_PORT` dan `TB_MEILI_MASTER_KEY`;
- service `search` memakai volume `meili-data` yang belum dideklarasikan;
- Dockerfile `search-worker` memakai Go 1.24, sedangkan modul mensyaratkan Go 1.26.5.

Koreksi aktivasi UI menambahkan konfigurasi lokal yang diabaikan Git, named volume kanonis `teman-belajar-meili-data`, validasi port/key pada wrapper, serta menyelaraskan worker ke Go 1.26 dan runtime Alpine 3.22. Tidak ada volume yang dihapus atau database yang diinisialisasi ulang.

Activation evidence:

- wrapper `config`: pass, 13 service terdeteksi;
- application checks di Docker build: lint, typecheck, dan Next.js production build pass;
- Compose recreate: pass tanpa penghapusan volume;
- seluruh long-running dependency sehat dan `migrate` berakhir `Exited (0)`;
- wrapper `verify`: Portal API, Portal Web, Admin Web, Keycloak, Moodle, MinIO, dan Meilisearch mengembalikan HTTP 2xx;
- browser runtime `localhost:3000` dan `localhost:3001`: UI baru terkonfirmasi dan console bersih.

## 9. Task numbering clarification

Dokumen ini adalah appendix UI bagi TASK-007R, bukan awal TASK-008 Engagement.
TASK-008 tetap belum dimulai.

## 10. Supersession

Handoff ini adalah baseline UI setelah TASK-007. Bila handoff UI lama menyiratkan bahwa satu halaman login generik atau perubahan warna saja sudah “sesuai template”, asumsi tersebut tidak berlaku lagi.
