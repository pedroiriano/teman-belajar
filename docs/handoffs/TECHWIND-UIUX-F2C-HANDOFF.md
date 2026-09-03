# Handoff UI/UX Techwind — Fase 2C

Status: **FASE 2C PARTIAL**  
Tanggal: 2026-09-02  
Repository: `C:\Datas\Proyek\Aplikasi\teman-belajar`  
Runtime: `apps/portal-web`  
Branch: `main` — perubahan lokal, belum commit

## A. Status Fase 2

Handoff `TECHWIND-UIUX-F2-HANDOFF.md` berstatus **FASE 2 PARTIAL** karena
visual browser QA belum tersedia. Tidak ada P0 yang dilaporkan pada routing,
hydration, auth, API, BFF, foundation, atau data contract. Pekerjaan Fase 2A/2B
yang sudah PASS tidak diulang sebagai scope implementasi.

`BLOCKED_VISUAL_VERIFICATION_UNAVAILABLE`

## B. Pemetaan Microlearning Techwind → Portal

Reference yang tersedia pada design authority read-only:
`microlearning-listing.html`, `microlearning-detail.html`, dan
`source/index-course.html`. Root Techwind memberi bahasa inner hero, breadcrumb,
filter, card, metadata, media panel, progress, related content, dan state.

| Techwind | Portal |
| --- | --- |
| Inner learning hero + breadcrumb | `/microlearning` memakai `PageHero` + `Breadcrumb` |
| Format/duration discovery cards | `MicrolearningCard` pada centralized foundation |
| Filter/search | `FilterBar`, `SearchField`, `SelectField`; hanya parameter API `q` dan `format` |
| Editorial detail hero + media | `MicrolearningDetailHero` + `ContentCard` |
| Reading/video surface | `ContentCard`, safe HTTPS video guard, text body tetap escaped oleh React |
| Bookmark/lightweight resume | `MicrolearningState` existing; Portal provenance dipertahankan |
| Related content | `MicrolearningCard` reusable bila `related` tersedia |

Topic/category tidak ditambahkan karena tidak tersedia pada Microlearning API
public contract/repository.

## C. Pemetaan Learning Paths Techwind → Portal

Reference yang tersedia: `learning-path-listing.html`,
`learning-path-detail.html`, dan `source/index-course.html`.

| Techwind | Portal |
| --- | --- |
| Inner learning hero + breadcrumb | `/learning-paths` memakai `PageHero` + `Breadcrumb` |
| Discovery path cards | `LearningPathCard` reusable dengan version, item count, optional publish date |
| Search | `FilterBar` + `SearchField`; hanya query `q` yang didukung repository |
| Detail header | `DetailHero` dengan version/item metadata |
| Ordered roadmap/module list | `LearningPathStepCard` reusable dengan nomor, kind, required/optional, milestone, prerequisite |
| Progress/journey | existing `getLearningPathProgress` + centralized `Progress` |
| Locked/unavailable | existing learner/source states dan safe disabled action |

## D–E. Reusable foundation

Dipakai dari `apps/portal-web/src/components/techwind/`:
`PageHero`, `Breadcrumb`, `DetailHero`, `FilterBar`, `SearchField`,
`SelectField`, `MicrolearningCard`, `MicrolearningDetailHero`,
`LearningPathCard`, `LearningPathStepCard`, `ContentCard`, `Badge`,
`Progress`, `Pagination`, `LoadingState`, `EmptyState`, `ErrorState`, dan
`NotFoundState`.

Reusable baru yang diperlukan:

- `SelectField` untuk kontrol format yang konsisten.
- `MicrolearningCard` dan `MicrolearningDetailHero` untuk pola editorial.
- `LearningPathCard` dan `LearningPathStepCard` untuk discovery/roadmap.
- `DetailHero` sebagai shared detail wrapper untuk route family.

Tidak dibuat duplicate component, page-local design system, duplicate CSS,
duplicate icon mapping, compiled vendor CSS, atau dependency baru.

## F. File yang diubah pada Fase 2C

- `apps/portal-web/src/app/microlearning/page.tsx`
- `apps/portal-web/src/app/microlearning/[slug]/page.tsx`
- `apps/portal-web/src/app/microlearning/[slug]/not-found.tsx`
- `apps/portal-web/src/app/microlearning/loading.tsx`
- `apps/portal-web/src/app/microlearning/error.tsx`
- `apps/portal-web/src/app/learning-paths/page.tsx`
- `apps/portal-web/src/app/learning-paths/[slug]/page.tsx`
- `apps/portal-web/src/app/learning-paths/[slug]/not-found.tsx`
- `apps/portal-web/src/app/learning-paths/loading.tsx`
- `apps/portal-web/src/app/learning-paths/error.tsx`
- `apps/portal-web/src/components/techwind/index.tsx`
- `apps/portal-web/src/components/techwind-foundation.tsx`
- `apps/portal-web/src/lib/microlearning.ts`
- `apps/portal-web/src/lib/learning-paths.ts`
- `scripts/verify-microlearning-contract.mjs`
- `scripts/verify-learning-path-contract.mjs`
- `docs/handoffs/TECHWIND-UIUX-F2C-HANDOFF.md`

Perubahan fase sebelumnya pada working tree tetap dipertahankan.

## G–H. Untouched dan data/runtime boundary

Untouched: `C:\Datas\Proyek\UI\techwind-pembelajaran`, seluruh `source/`,
`vendor/ui-templates/techwind/ORIGINAL/`, `vendor/ui-templates/cuba/ORIGINAL/`,
auth, Keycloak, SSO, BFF/API contract, Moodle, database, Docker configuration,
deployment, serta route di luar scope.

Repository dan cache policy existing dipakai apa adanya:

- Microlearning list: `listMicrolearning`, server-side `q`/`format`/`page`,
  existing `revalidate: 60`.
- Microlearning detail: `getMicrolearning`, existing `revalidate: 60`;
  learner progress/bookmark tetap melalui server helper/BFF.
- Learning Paths list/detail/progress: helper existing dengan existing
  `no-store` dan server-side pagination.

Tidak ada fetch Moodle dari browser, hardcoded runtime data, raw HTML, atau
browser-side full-dataset pagination.

## I. State matrix

| Route | Loading | Normal | Empty | Error | Not-found/invalid | Optional/unavailable |
| --- | --- | --- | --- | --- | --- | --- |
| `/microlearning` | `LoadingState` | hero/filter/card/pagination | `EmptyState` | `ErrorState` + retry boundary | n/a | missing image memakai duration/icon fallback |
| `/microlearning/[slug]` | route boundary | detail hero/content/resume/related | n/a | `ErrorState` | `NotFoundState` + invalid slug guard | missing video menampilkan status media belum tersedia |
| `/learning-paths` | `LoadingState` | hero/search/card/pagination | `EmptyState` | `ErrorState` + retry boundary | n/a | publish date optional; item count dari version items |
| `/learning-paths/[slug]` | route boundary | detail hero/description/ordered steps/progress | n/a | `ErrorState` | `NotFoundState` + invalid slug guard | locked/source unavailable disabled action dan badge non-color-only |

Pagination hanya dirender ketika `total_pages > 1`; previous/next memiliki
`aria-disabled` dan keyboard link semantics.

## J. Webinar

Webinar tetap dummy UI dengan status **Segera**. Zoom, registrasi, join meeting,
meeting URL, kalender, reminder, capacity, waitlist, dan notification Webinar
tidak diaktifkan.

## K. Verification

- `npm.cmd run lint`: PASS.
- `npm.cmd run typecheck`: PASS.
- `npm.cmd run test:microlearning`: PASS.
- `npm.cmd run test:learning-paths`: PASS.
- `npm.cmd run test:training-programs`: PASS.
- `npm.cmd run test:vendor-foundation`: PASS.
- `npm.cmd run test:webinars`: PASS.
- `npm.cmd run build -- --webpack`: PASS.
- Smoke server build terisolasi port `3105`: empat route HTTP 200; kedua
  invalid slug merender title/not-found marker tanpa API error.
- Endpoint port `3000` merespons HTTP 200 untuk `/microlearning` pada saat audit.
  Rebuild/recreate service Docker `web` setelah patch Fase 2C belum dapat
  diverifikasi karena akses Docker engine ditolak oleh host dan eskalasi
  diblokir usage limit; tidak ada konfigurasi Docker atau volume yang diubah.
- API read-only list saat smoke mengembalikan `data: []` untuk kedua domain;
  UI menampilkan empty state dan tidak membuat dummy content.
- `git diff --check`: PASS.

Build hanya memberi warning environment yang sudah dikenal: native SWC Windows
tidak tersedia sehingga WASM fallback dipakai, dan terdapat dua lockfile.

## L. Security review

PASS source-level: slug Microlearning/Learning Paths divalidasi sebelum fetch;
video hanya dirender bila HTTPS; action Learning Paths hanya menerima path
internal atau origin `MOODLE_PUBLIC_BASE_URL`; parameter/query dibatasi; body
ditampilkan sebagai React text; tidak ada secret, permission, auth, redirect
allowlist, API, Moodle, atau identity boundary yang dilemahkan.

## M. Performance review

PASS source-level: fetch tetap server-side, pagination tetap repository/API
driven, tidak ada dataset besar di browser, media hanya dirender bila tersedia,
dan tidak ada dependency/vendor bundle baru. Tidak ada performance trace browser
karena host browser tidak tersedia.

## N–O. Accessibility dan responsive review

PASS source-level untuk satu H1 pada normal/not-found state, heading hierarchy,
semantic `nav`/`main`/`article`/`ol`, labelled search/select, icon-only fallback
memiliki accessible name, image alt text, progress ARIA, disabled state yang
tidak hanya mengandalkan warna, focus-visible semantic controls, dan responsive
grid/breakpoint classes untuk 320/390/768/1024/1440.

Inspeksi aktual keyboard, geometry, horizontal overflow, tema light/dark,
hydration, serta console belum dapat dilakukan.

`BLOCKED_VISUAL_VERIFICATION_UNAVAILABLE`

## P. Visual verification

Source mapping dan class composition mengikuti reference Techwind yang tersedia.
Visual pixel-level belum boleh diklaim PASS karena browser automation host
menolak akses akibat usage limit sampai 2026-09-07.

## Q. Risiko dan keputusan terbuka

- API lokal saat ini kosong untuk Microlearning dan Learning Paths; card/detail
  normal perlu diuji lagi setelah content published melalui workflow resmi.
- Image Docker `web` mungkin masih menggunakan build sebelum Fase 2C sampai
  rebuild lokal dijalankan pada host yang memiliki akses Docker engine.
- Next App Router streaming pada invalid slug teramati dapat mengirim HTTP 200
  walaupun UI/title not-found benar; acceptance transport 404 perlu dikonfirmasi
  pada runtime target final.
- Visual browser QA tetap terbuka.
- Reference HTML yang tidak tersedia tidak digantikan dengan file rekaan.

## R. Acceptance matrix

| Acceptance | Hasil |
| --- | --- |
| Empat route memakai centralized Techwind foundation | PASS source-level |
| Microlearning listing/detail mengikuti inner-course language | PASS source-level |
| Learning Paths listing/detail mengikuti inner-course language | PASS source-level |
| Existing repository/API/cache/auth/progress boundary dipertahankan | PASS |
| Loading/empty/error/not-found/invalid/missing media/unavailable state | PASS source-level |
| Webinar tetap dummy `Segera` | PASS |
| source/vendor ORIGINAL untouched | PASS |
| Auth/Keycloak/SSO/BFF/API/Moodle/DB/Docker config untouched | PASS |
| Lint/typecheck/contracts/build/smoke | PASS |
| Pixel visual/browser/responsive/theme QA | BLOCKED_VISUAL_VERIFICATION_UNAVAILABLE |

## S. Rekomendasi Fase 3

Publikasikan fixture/content melalui workflow resmi agar card/detail normal dapat
diverifikasi tanpa dummy data, lalu jalankan visual QA aktual untuk empat route
di lima viewport dan dua tema. Setelah itu audit route publik tersisa yang masih
memiliki markup visual lokal.

Tidak ada commit, push, merge, branch, reset, atau deploy yang dilakukan.
