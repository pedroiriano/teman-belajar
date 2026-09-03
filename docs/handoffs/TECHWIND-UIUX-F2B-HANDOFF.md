# Handoff UI/UX Techwind — Fase 2B

Status: **FASE 2B PARTIAL**  
Tanggal: 2026-09-02  
Repository: `C:\Datas\Proyek\Aplikasi\teman-belajar`  
Runtime: `apps/portal-web`  
Branch: `main` — perubahan lokal, belum commit

## A. Baseline dan gate Fase 2A

Handoff Fase 2A berstatus **FASE 2A PARTIAL**. Satu blocker terbuka adalah
inspeksi visual browser automation; tidak ditemukan P0 pada shell, hydration,
routing, auth, API/BFF, atau centralized foundation. Fase 2B tetap dilanjutkan
untuk dua route yang scoped.

`BLOCKED_VISUAL_VERIFICATION_UNAVAILABLE`

## B. Authority dan pemetaan route

Design authority read-only: `C:\Datas\Proyek\UI\techwind-pembelajaran`.
Reference route yang tersedia pada authority adalah `source/course-listing.html`,
`source/course-detail.html`, dan `source/index-course.html`. File
`source/training-listing.html`, `source/training-detail.html`,
`PUBLIC_ROUTE_MAP.md`, dan `COMPONENTS.md` tidak tersedia pada lokasi yang
diminta; tidak dibuat pengganti baru.

| Visual Techwind | Route Portal | Implementasi |
| --- | --- | --- |
| Course listing, filter/search, cards, pagination | `/training-programs` | `PageHero`, `Breadcrumb`, `FilterBar`, `SearchField`, `TrainingProgramCard`, `Pagination` |
| Course detail hero, metadata, program content, progress/action state | `/training-programs/[slug]` | `CourseDetailHero`, `Breadcrumb`, `ContentCard`, `CourseCard`, existing progress/auth/CTA contract |
| Loading, error, not-found | kedua route | `LoadingState`, `ErrorState`, route not-found state |

## C. Perubahan Fase 2B

- Menerapkan pola visual Online Course Techwind ke listing dan detail program.
- Memusatkan card program, course card, dan detail hero ke library
  `apps/portal-web/src/components/techwind/index.tsx`.
- Menambahkan validasi slug allowlist sebelum pengambilan data detail.
- Memakai `cache: "no-store"` dan server-side learner progress yang sudah ada;
  tidak mengubah API, BFF, Moodle adapter, auth, atau persistence.
- Mengganti skeleton/error route-local dengan `LoadingState` dan `ErrorState`.
- Menambahkan not-found UI khusus detail program menggunakan `NotFoundState`.
- Tidak menambahkan field kontrak yang tidak tersedia: cover thumbnail,
  instructor, learning outcomes, provider, related programs, enrollment baru,
  atau capability webinar.

## D. File scope utama

File Fase 2B:

- `apps/portal-web/src/app/training-programs/page.tsx`
- `apps/portal-web/src/app/training-programs/[slug]/page.tsx`
- `apps/portal-web/src/app/training-programs/loading.tsx`
- `apps/portal-web/src/app/training-programs/error.tsx`
- `apps/portal-web/src/app/training-programs/[slug]/not-found.tsx`
- `apps/portal-web/src/components/techwind/index.tsx`
- `apps/portal-web/src/components/techwind-foundation.tsx`
- `apps/portal-web/src/lib/training-programs.ts`
- `docs/handoffs/TECHWIND-UIUX-F2B-HANDOFF.md`

Working-tree changes dari fase sebelumnya tetap dipertahankan dan tidak
di-reset, termasuk handoff F1B/F2/F2A, façade kompatibilitas, shell, search,
homepage, dan guard contract.

## E. Reusable foundation

Primitive dan pola yang dipakai route:

- `PageHero`, `Breadcrumb`, `FilterBar`, `SearchField`;
- `TrainingProgramCard`, `CourseDetailHero`, `CourseCard`;
- `ContentCard`, `Badge`, `Progress`, `Pagination`;
- `LoadingState`, `ErrorState`, `NotFoundState`.

Tidak ada duplicate export foundation, page-local visual override baru,
stylesheet vendor global baru, atau dependency baru. `source/` dan seluruh
`vendor/ui-templates/techwind/ORIGINAL/` tetap read-only.

## F. State matrix

| Route/state | Hasil |
| --- | --- |
| Listing normal | card grid program + filter/search + pagination |
| Listing query/page | query diteruskan ke repository dan pagination tetap server-driven |
| Listing kosong | centralized `EmptyState` |
| Listing error | centralized `ErrorState` dan retry boundary |
| Detail normal | hero, breadcrumb, metadata, description, audience/eligibility, cohort, course list, progress/action |
| Detail anonymous | CTA sign-in existing dengan callback route |
| Detail authenticated/degraded | data tetap readable dan progress state existing dipertahankan |
| Invalid slug/not found | `NotFoundState`, title `Program tidak ditemukan | Teman Belajar`, tanpa course-detail hero |
| Webinar | tetap dummy UI berstatus **Segera** |

Webinar tidak mengaktifkan Zoom, registrasi, join meeting, calendar, reminder,
capacity, waitlist, atau notification.

## G. Repository dan security boundary

PASS source-level: route tetap membaca repository/API internal melalui helper
existing; browser tidak memanggil Moodle langsung; server-side progress tetap
memakai auth token; slug divalidasi allowlist; tidak ada secret, URL eksternal,
auth/Keycloak/SSO/BFF/API/Moodle/database/Docker change; tidak ada dependency
baru atau permission change.

## H. Verification

- `npm.cmd run lint`: PASS.
- `npm.cmd run typecheck`: PASS.
- `npm.cmd run test:training-programs`: PASS.
- `npm.cmd run test:vendor-foundation`: PASS.
- `npm.cmd run test:webinars`: PASS.
- `npm.cmd run build -- --webpack`: PASS.
- Production smoke server terisolasi port `3103`: listing HTTP 200 dan marker
  Techwind terdeteksi; invalid slug merender not-found marker, title not-found,
  tanpa API error dan tanpa detail hero.
- Docker local service `web` direbuild/recreate melalui wrapper kanonis dari
  working tree terbaru; `teman-belajar-web-1` started dan port `3000` kembali
  diverifikasi: listing HTTP 200 dengan hero/breadcrumb/filter terbaru, invalid
  slug merender not-found marker dan title not-found tanpa API error.
- `git diff --check`: PASS.

Pada Next App Router streaming runtime, response invalid slug teramati HTTP
200 walaupun UI dan metadata not-found benar. Ini dicatat sebagai runtime
verification caveat; tidak ada klaim HTTP 404 tanpa browser/runtime evidence
yang mendukungnya.

## I. Accessibility, responsive, dan performance review

PASS source-level untuk semantic breadcrumb/nav/main, labelled search, native
link/button semantics, status/progress labels, focus-visible class, responsive
grid/breakpoint classes, dan state coverage loading/empty/error/not-found.

Pixel-level geometry, keyboard interaction aktual, light/dark reload, console,
hydration, dan overflow pada viewport 320/390/768/1024/1440 belum dapat
diinspeksi karena browser automation unavailable.

`BLOCKED_VISUAL_VERIFICATION_UNAVAILABLE`

Build production selesai tanpa error. Tidak ada performance trace atau security
scan tambahan karena perubahan terbatas pada composition UI dan tidak menyentuh
boundary runtime.

## J. Acceptance matrix

| Acceptance | Hasil |
| --- | --- |
| Listing/detail mengikuti Online Course Techwind visual language | PASS source-level |
| Kedua route memakai centralized reusable foundation | PASS |
| Existing API/repository/auth/progress/CTA dipertahankan | PASS |
| Loading/empty/error/not-found state tersedia | PASS source-level; HTTP status caveat dicatat |
| Webinar tetap dummy `Segera` | PASS |
| source/vendor ORIGINAL untouched | PASS |
| Auth, Keycloak, SSO, BFF, API, Moodle, DB, Docker untouched | PASS |
| Lint/typecheck/contracts/build/smoke | PASS |
| Visual QA browser lintas viewport dan tema | BLOCKED_VISUAL_VERIFICATION_UNAVAILABLE |

## K. Risiko dan rekomendasi

Risiko terbuka: visual pixel-level dan interaksi aktual belum diverifikasi;
status HTTP 200 pada streamed not-found perlu dikonfirmasi pada browser/runtime
target final bila acceptance mensyaratkan transport status 404.

Rekomendasi Fase 2C: lakukan visual QA browser pada dua route di lima viewport
dan dua tema, lalu audit detail route lain yang masih memakai markup lokal.

Tidak ada commit, push, merge, branch, reset, atau deploy yang dilakukan.
