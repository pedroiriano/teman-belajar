# Handoff UI/UX Techwind — Fase 2A

Status: **FASE 2A PARTIAL**  
Tanggal: 2026-09-02  
Repository: `C:\Datas\Proyek\Aplikasi\teman-belajar`  
Runtime: `apps/portal-web`  
Branch: `main` — perubahan lokal, belum commit

## A. Status baseline Fase 1B

Fase 1B ditemukan tersedia dan contract guard-nya PASS. Foundation canonical
berada di `apps/portal-web/src/components/techwind/`, dengan façade kompatibilitas
`techwind-foundation.tsx` dan `public-content.tsx`. Handoff F1B tidak ditimpa.

## B–C. Matriks shell dan homepage

| Area Techwind | Portal target | Gap/adapter Fase 2A | Status |
| --- | --- | --- | --- |
| `#topnav`, `.defaultscroll.is-sticky` | `PortalChrome`, `#topnav`, `.techwind-topnav`, `.portal-header` | Adapter React sticky mempertahankan struktur dan cleanup listener. | PASS source-level |
| `.logo`, `logo-dark.png`/`logo-light.png` | `Brand`, `BrandLogo`, configured media logo | Brand produk menggantikan branding vendor; asset lokal tetap dipakai. | PASS source-level |
| `#navigation`, `.navigation-menu`, `.submenu.megamenu` | `#navigation`, grouped `details`, `NavigationGroupItems` | Native disclosure + `useTechwindRuntime` untuk close, Escape, outside click, active state. | PASS source-level |
| `#isToggle`, mobile navigation | `#isToggle`, `#portal-mobile-navigation` | Button semantics, `aria-expanded`, `aria-controls`, responsive `xl` breakpoint. | PASS source-level |
| Techwind search/action area | centralized `SearchField`, auth link, notification, `ThemeToggle` | Search dan icon tema memakai shared Portal primitives. | PASS source-level |
| footer/back-to-top | `.techwind-footer`, `#back-to-top` | Product footer dan scroll-aware React action mempertahankan visual anchor. | PASS source-level |
| Course hero | `[data-techwind-pattern="index-course-hero"]`, `.portal-course-hero` | Konfigurasi banner/logo tetap data-driven; tidak ada static HTML replacement. | PASS source-level |
| Course discovery cards | `ContentCard`, `.portal-course-card` | Learning paths dan knowledge highlights tidak lagi mendefinisikan wrapper card lokal. | PASS source-level |
| Media section | `.portal-section`, `.portal-gallery-tile` | Media tetap informational dan memakai endpoint/configuration existing. | PASS source-level |
| Trust/statistics | shared `.portal-container`, `.portal-card` | Hierarchy dan semantic tokens dipertahankan. | PASS source-level |
| FAQ accordion | centralized `Accordion`, `.portal-faq` | Native `details/summary`, keyboard-operable tanpa vendor global JS. | PASS source-level |
| CTA | existing Portal semantic buttons | Auth/knowledge links dipertahankan; tidak ada business logic baru. | PASS source-level |

## D–F. Perubahan dan reusable components

File utama yang disentuh pada Fase 2A:

- `apps/portal-web/src/components/portal-chrome.tsx`
- `apps/portal-web/src/components/theme-toggle.tsx`
- `apps/portal-web/src/components/portal-icon.tsx`
- `apps/portal-web/src/components/techwind/index.tsx`
- `apps/portal-web/src/app/page.tsx`
- `docs/handoffs/TECHWIND-UIUX-F2A-HANDOFF.md`

Reusable yang digunakan: `ContentCard`, `Accordion`, `SearchField`, `PortalIcon`,
`BrandLogo`, `ThemeToggle`, dan `useTechwindRuntime`. Tidak ada library UI,
dependency, stylesheet vendor global, atau duplicate icon mapping baru.

## G. Route dan Webinar

Route yang terdampak: `/` dan global shell yang membungkus seluruh Portal route.
Route lain tidak diimplementasikan ulang pada fase ini. Webinar tetap dummy UI
dengan status **Segera**; Zoom, registrasi, join meeting, meeting URL, kalender,
reminder, capacity, waitlist, dan notification Webinar tetap nonaktif.

## H–K. Verification

- Lint: PASS.
- Typecheck: PASS.
- `test:vendor-foundation`: PASS.
- `test:webinars`: PASS.
- `test:faq`: PASS.
- `test:language`: PASS.
- `test:training-programs`: PASS.
- Production build `next build --webpack`: PASS.
- Homepage smoke pada server hasil build port `3102`: HTTP 200; marker shell,
  `index-course-hero`, dan footer terdeteksi.
- Duplicate primitive export check: PASS; foundation exports hanya ditemukan di
  `apps/portal-web/src/components/techwind/index.tsx`.
- `git diff --check`: PASS.

## I–J. Accessibility dan responsive review

Source-level review PASS untuk semantic header/nav/main/footer, labelled search,
button `aria-expanded`/`aria-controls`, theme `aria-label`/`aria-pressed`, native
keyboard disclosure, focus-visible rules, reduced-motion adapter, dan responsive
breakpoint classes. Viewport 320/390/768/1024/1440 serta console/hydration belum
bisa diinspeksi melalui browser automation.

BLOCKED_VISUAL_VERIFICATION_UNAVAILABLE

## K. Security dan performance review

PASS source-level: tidak ada perubahan auth/SSO/API/BFF/Moodle/database/Docker,
tidak ada fetch Moodle dari browser, tidak ada URL eksternal baru, tidak ada
dependency baru, vendor global JS tidak dimuat, dan build production selesai.
Tidak ada security scan atau browser performance trace tambahan karena patch tidak
menyentuh boundary tersebut.

## L–O. Risiko, untouched, dan acceptance matrix

Risiko terbuka adalah pixel-level visual, keyboard interaction lintas viewport,
overflow, console error, dan light/dark reload persistence yang belum dapat
diverifikasi aktual tanpa browser. Server lama pada port `3100` sebelumnya
mengembalikan 500, sehingga evidence smoke memakai server build terisolasi `3102`.

| Acceptance | Hasil |
| --- | --- |
| Shell/header/footer/back-to-top mengikuti Techwind anchor | PASS source-level |
| Homepage hero/section/card/FAQ/CTA memakai foundation | PASS source-level |
| Shared component consistency dan single icon mapping | PASS |
| Webinar tetap dummy `Segera` | PASS |
| Auth/API/Moodle/DB/Docker/vendor/source untouched | PASS |
| Lint/typecheck/contracts/build/smoke | PASS |
| Browser visual 320–1440, light/dark, console, hydration | BLOCKED_VISUAL_VERIFICATION_UNAVAILABLE |

Untouched: `C:\Datas\Proyek\UI\techwind-pembelajaran`, seluruh `source/`,
`vendor/ui-templates/techwind/ORIGINAL/`, `vendor/ui-templates/cuba/ORIGINAL/`,
auth, Keycloak, SSO, BFF/API, Moodle, database, Docker, deployment, dan business
logic. Perubahan pengguna pada `TASK-019-HANDOFF.md` serta empat file logo root
dipertahankan.

Rollback lokal dilakukan selektif berdasarkan file scope; jangan memakai
`git reset --hard` karena working tree berisi perubahan pengguna sebelumnya.

## P. Rekomendasi Fase 2B

Setelah browser host tersedia, lakukan visual QA aktual pada shell/home di lima
viewport dan dua tema, termasuk open/close mega menu, Escape, outside click,
focus-visible, theme reload, dan horizontal overflow. Catat finding P0/P1/P2
sebelum melanjutkan convergence ke route publik berikutnya.

Tidak ada commit, push, merge, branch, reset, atau deploy yang dilakukan.
