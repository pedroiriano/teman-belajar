# UI Source Mapping — Teman Belajar

**Status:** Canonical UI Governance  
**Version:** 5.0 — TASK-027 / ADR-019

| Experience | Vendor Foundation | Reference Path | Implementation Path |
|---|---|---|---|
| Public Portal | Techwind | `vendor/ui-templates/techwind/ORIGINAL/` | `apps/portal-web/` |
| Learner / My Learning | Techwind | `vendor/ui-templates/techwind/ORIGINAL/` | `apps/portal-web/` |
| Admin / Backoffice | Cuba | `vendor/ui-templates/cuba/ORIGINAL/` | `apps/admin-web/` |

## Primary Online Course Baselines

| Experience | Primary page | Product use |
|---|---|---|
| Portal | `vendor/ui-templates/techwind/ORIGINAL/html/index-course.html` | homepage, inner hero, course cards/progress, discovery, content, FAQ and CTA language |
| Admin | `vendor/ui-templates/cuba/ORIGINAL/html/template/template/dashboard-03.html` | shell, course dashboard widgets, cards, page headers, tables, forms and workflow surfaces |

The complete route-family mapping is maintained in
`FULL-ROUTE-ONLINE-COURSE-MATRIX.md`. Other pages in the same immutable vendor
tree may supply a better matching component when the primary baseline does not
contain the product capability.

## Public / Learner Mapping

Techwind adalah runtime foundation Portal untuk:
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

Cuba adalah runtime foundation Admin untuk:
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

Seluruh pola vendor yang relevan terhadap fitur aktif wajib masuk melalui
foundation dan adapter yang tercatat di `VENDOR-UI-RUNTIME-MANIFEST.md`.
Kelengkapan berarti shell, tipografi, ikon, pola komponen dan interaksi yang
digunakan produk—bukan menyalin semua halaman demo atau plugin yang tidak
dibutuhkan. Implementasi wajib memakai identitas, data, semantic token dan
bahasa Indonesia Teman Belajar. Kelas `portal-*`/`admin-*` adalah alias produk
di atas foundation, bukan sistem visual paralel.

### Acceptance gate

- Portal: header, navigasi responsif, hero/section/card yang diperlukan, footer, tema, dan back-to-top harus berasal dari bahasa visual Techwind.
- Admin: sidebar berkelompok, topbar, breadcrumb, content canvas, cards/widgets, tables/forms/modal yang diperlukan, footer, dan tema harus berasal dari bahasa visual Cuba.
- Ikon harus berasal dari sistem ikon vendor atau adaptasi SVG lokal yang konsisten; emoji dan ikon Unicode dekoratif tidak diterima sebagai fondasi UI.
- Tidak boleh ada shell publik generik berwarna hitam atau shell admin berupa satu kartu login/dashboard tanpa struktur Cuba.
- Route yang belum mempunyai kemampuan backend tidak boleh dibuat seolah-olah aktif. Tandai `Segera` atau jangan tampilkan.
- Perubahan harus lulus lint, typecheck, build, dan inspeksi visual pada desktop, mobile, tema terang, dan tema gelap.
- `test:vendor-foundation` wajib lulus dan vendor `ORIGINAL/` harus tetap pada
  baseline tree yang tercatat. Techwind tidak boleh masuk Admin dan Cuba tidak
  boleh masuk Portal.

## Runtime source anchors

| Family | Portal Techwind | Admin Cuba |
|---|---|---|
| Typography | Nunito via `next/font` | Rubik via `next/font` |
| Shell | `topnav`, `navigation-menu`, footer, back-to-top | page wrapper, sidebar, header, body, footer |
| Icons | typed local Remix mapping | typed local Feather mapping |
| Behavior | `useTechwindRuntime` | `useCubaDrawerRuntime`, `useCubaDisclosureRuntime` |
| CSS | `techwind-foundation.css` + semantic Portal aliases | `cuba-foundation.css` + semantic Admin aliases |
| Data | Portal content/card/list patterns | shared Cuba table and pagination |
