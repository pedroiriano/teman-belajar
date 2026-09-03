# Techwind UI/UX Handoff — Fase 1B Centralized Foundation

**Tanggal:** 2026-09-02  
**Sumber:** `teman-belajar`  
**Target runtime:** `apps/portal-web`  
**Design authority:** `C:\Datas\Proyek\UI\techwind-pembelajaran`  
**Status:** LOCAL — siap direview UI/UX; belum commit/push/merge/deploy

## Tujuan

Menetapkan satu sumber reusable untuk visual primitive Portal berbasis visual
root Techwind Online Course, tanpa mengganti runtime Next.js atau mengubah
kontrak produk.

## Implementasi

- Visual primitive Portal dipusatkan di:
  `apps/portal-web/src/components/techwind-foundation.tsx`
  - `PageHero`
  - `EmptyState`
  - `ErrorState`
  - `ComingSoonState`
  - `Pagination`
  - `formatDate`
- `public-content.tsx` hanya menjadi compatibility façade; tidak ada definisi
  primitive visual kedua.
- Page hero tetap memakai marker `course-inner-hero` dan kelas semantic
  `portal-*` yang sudah menjadi adapter visual Techwind.
- Ikon tetap memakai `PortalIcon` / local Remix-mapped SVG.

## Webinar boundary

Webinar sengaja dikembalikan menjadi dummy UI `Segera` pada:

- `apps/portal-web/src/app/webinars/page.tsx`
- `apps/portal-web/src/app/webinars/[id]/page.tsx`
- `apps/portal-web/src/components/webinars/webinar-actions.tsx`

Route UI tidak membaca `listWebinars`/`getWebinar`, tidak melakukan mutation,
dan tidak menampilkan capability atau data sesi Webinar. API/BFF/OpenAPI
Webinar yang sudah ada tidak diubah; assertion perlindungan BFF tetap diuji.

Jangan mengaktifkan Zoom, registrasi, join meeting, calendar, reminder,
capacity, waitlist, atau notification Webinar pada follow-up ini.

## Boundary yang wajib dipertahankan

- Jangan mengubah `C:\Datas\Proyek\UI\techwind-pembelajaran\source\`.
- Jangan mengubah `vendor/ui-templates/techwind/ORIGINAL/`.
- Jangan menyalin compiled CSS/plugin/vendor global JS secara wholesale.
- Jangan mengubah auth, Keycloak, SSO, BFF, API, Moodle, database, Docker,
  atau production behavior.
- Jangan membuat page-local visual override atau library visual kedua.
- Semua follow-up tetap memakai bahasa visual root Techwind dan semantic alias
  Portal yang sudah ada.

## Verifikasi terakhir

- `npm run test:vendor-foundation`: PASS
- `npm run test:webinars`: PASS
- `npm run test:language`: PASS
- `npm run test:faq`: PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build -- --webpack`: PASS
- `npm audit --omit=dev --offline`: PASS, 0 vulnerabilities
- `git diff --check`: PASS
- Browser visual QA belum terverifikasi karena browser automation host diblokir
  usage limit; jangan mengklaim desktop/mobile light/dark PASS tanpa inspeksi
  aktual.

## File yang berubah pada slice ini

- `apps/portal-web/src/components/techwind-foundation.tsx` — baru
- `apps/portal-web/src/components/public-content.tsx`
- `apps/portal-web/src/app/webinars/page.tsx`
- `apps/portal-web/src/app/webinars/[id]/page.tsx`
- `apps/portal-web/src/components/webinars/webinar-actions.tsx`
- `scripts/verify-ui-foundation-contract.mjs`
- `scripts/verify-webinar-contract.mjs`

Working tree juga memiliki perubahan user sebelumnya yang bukan bagian slice
ini: `docs/handoffs/TASK-019-HANDOFF.md` dan empat file logo root. Jangan
overwrite atau stage perubahan tersebut.

## Permintaan review lintas workspace

Workspace Techwind diminta melakukan read-only visual review terhadap root
`source/index-course.html`, terutama header/nav, hero, card, state, spacing,
typography, responsive breakpoint, light/dark behavior, dan icon language.

Balasan review sebaiknya berformat:

1. `PASS` atau `FINDING` per area.
2. Selector/section sumber Techwind yang menjadi evidence.
3. Saran adapter yang tetap berada di `apps/portal-web` dan tidak mengubah
   `source/` atau vendor `ORIGINAL/`.
4. Prioritas: `P0` blocking, `P1` penting, `P2` polish.
5. Nyatakan jika visual browser tidak dapat diverifikasi.

## Prompt lintas workspace siap kirim

```text
Koordinasi lintas workspace untuk Teman Belajar Fase 1B — Centralized Techwind Foundation.

Baca handoff sumber ini terlebih dahulu:
C:\Datas\Proyek\Aplikasi\teman-belajar\docs\handoffs\TECHWIND-UIUX-F1B-HANDOFF.md

Di workspace C:\Datas\Proyek\UI\techwind-pembelajaran, lakukan read-only visual/source review terhadap source/index-course.html dan asset/style/interaction yang relevan sebagai design authority Techwind Online Course. Bandingkan dengan implementasi Portal yang dirujuk handoff.

Fokus: header/nav, hero, card, empty/error/coming-soon state, pagination, typography, spacing, responsive breakpoint, light/dark, accessibility, dan icon language.

Boundary: jangan mengubah source/, vendor ORIGINAL/, atau repository Teman Belajar. Jangan mengubah auth, Keycloak, SSO, BFF, API, Moodle, database, Docker, atau deploy. Webinar tetap dummy UI berstatus “Segera”; jangan mengaktifkan Zoom, registrasi, join meeting, calendar, reminder, capacity, waitlist, atau notification Webinar.

Kembalikan PASS atau FINDING per area, selector/section/file source sebagai evidence, adapter yang disarankan hanya di apps/portal-web, prioritas P0/P1/P2, dan keterbatasan bila browser visual tidak tersedia. Jangan commit, push, merge, branch, atau deploy.
```
