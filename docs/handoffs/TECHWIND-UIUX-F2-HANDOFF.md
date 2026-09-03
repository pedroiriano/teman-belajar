# Handoff UI/UX Techwind — Fase 2

Status: **FASE 2 PARTIAL**  
Repository: `teman-belajar`  
Runtime: `apps/portal-web`  
Tanggal: 2026-09-02  
Branch: `main` (perubahan lokal, belum di-commit)

## Matriks A–M

| ID | Area | Hasil |
| --- | --- | --- |
| A | Context | CWD `C:\Datas\Proyek\Aplikasi\teman-belajar`; runtime target Portal; tidak ada commit, push, merge, branch, atau deploy. |
| B | Authority | Design authority `C:\Datas\Proyek\UI\techwind-pembelajaran` diperlakukan read-only; `source/` tidak diubah. Vendor `ui-templates/techwind/ORIGINAL` dan `cuba/ORIGINAL` tidak memiliki diff. |
| C | Baseline | Portal tetap memakai visual root Techwind Online Course melalui `portal-course-hero`, `portal-page-hero`, token `portal-*`, Nunito, Remix mapping, dan runtime adapter yang sudah ada. |
| D | Central foundation | Canonical library dipusatkan di `apps/portal-web/src/components/techwind/index.tsx`: PageHero, Breadcrumb, ContentCard, FilterBar, SearchField, Tabs, Accordion, Progress, Pagination, Empty/Loading/Error/NotFound, MediaPreview, EngagementControls, Badge, ComingSoon, dan date formatter. |
| E | Compatibility | `techwind-foundation.tsx` dan `public-content.tsx` hanya façade re-export; tidak ada definisi visual kedua. Guard UI foundation diselaraskan ke lokasi canonical baru. |
| F | Shell | Search field desktop dan mobile pada Portal shell memakai primitive Techwind yang sama; auth, navigation, notification, theme, dan logout tetap pada alur sebelumnya. |
| G | Homepage `/` | Learning paths, highlights, dan FAQ memakai ContentCard/Accordion terpusat; hero tetap baseline `index-course-hero`; konfigurasi homepage, media, dan tautan auth dipertahankan. |
| H | Search `/search` | FilterBar, SearchField, Tabs, ContentCard, Badge, state, dan Pagination dipakai dari library; query, sort, pagination, API fetch server-side, dan error behavior dipertahankan. |
| I | Training list | FilterBar/SearchField, ContentCard, state, dan Pagination dipakai dari library; katalog tetap bersumber dari `listTrainingPrograms`. |
| J | Training detail | Breadcrumb, ContentCard, Progress, dan formatter terpusat dipakai; data program, learner progress, unauthorized/degraded state, CTA Moodle, dan provenance tetap dipertahankan. |
| K | Webinar | Tetap dummy UI dengan badge `Segera`; tidak ada list/detail fetch, Zoom, registrasi, join, calendar, reminder, capacity, waitlist, atau notification activation. |
| L | Boundary | Tidak ada perubahan auth, Keycloak, SSO, BFF/API, Moodle, database, Docker, Next runtime, vendor ORIGINAL, atau source authority. Tidak ada dependency baru. |
| M | Verification | Lint PASS; typecheck PASS; vendor foundation PASS; training-program PASS; webinar PASS; FAQ PASS; language PASS; Webpack build PASS; smoke isolated server PASS pada lima route. Browser visual inspection tetap `BLOCKED_VISUAL_VERIFICATION_UNAVAILABLE` karena host browser terkena usage limit. |

## Scope patch fase ini

Perubahan fase ini terbatas pada centralized Techwind foundation, Portal shell search field, representative public routes, dan contract guards yang perlu mengikuti lokasi foundation canonical. Handoff F1B tetap dipisahkan di `docs/handoffs/TECHWIND-UIUX-F1B-HANDOFF.md` dan tidak ditimpa.

File utama fase ini:

- `apps/portal-web/src/components/techwind/index.tsx`
- `apps/portal-web/src/components/techwind-foundation.tsx`
- `apps/portal-web/src/components/public-content.tsx`
- `apps/portal-web/src/components/portal-chrome.tsx`
- `apps/portal-web/src/app/page.tsx`
- `apps/portal-web/src/app/search/page.tsx`
- `apps/portal-web/src/app/training-programs/page.tsx`
- `apps/portal-web/src/app/training-programs/[slug]/page.tsx`
- `scripts/verify-ui-foundation-contract.mjs`
- `scripts/verify-training-program-contract.mjs`

## Explicitly untouched

- `C:\Datas\Proyek\UI\techwind-pembelajaran\source\`
- `vendor/ui-templates/techwind/ORIGINAL/`
- `vendor/ui-templates/cuba/ORIGINAL/`
- Identity, Keycloak, SSO, BFF/API, Moodle adapter/plugin, database, Docker, dan deployment.

## Risiko dan rollback lokal

- Risiko utama yang tersisa adalah validasi visual pixel-level belum dapat dilakukan pada browser in-app karena limit host. Smoke HTTP dan build berhasil, tetapi bukan pengganti inspeksi geometry/responsive.
- Rollback aman dilakukan dengan membuang perubahan lokal fase ini secara selektif sesuai file scope; jangan memakai `git reset --hard` karena working tree juga memuat perubahan pengguna sebelumnya.
- Server smoke terisolasi dijalankan pada port `3101`; server lama pada `3100` mengembalikan 500 dan tidak dijadikan evidence final.

## Next step

1. Jalankan browser QA pada viewport mobile/tablet/desktop saat host browser tersedia.
2. Bandingkan geometry shell, hero, card, filter, state, progress, dan pagination dengan root Techwind `source/index-course.html`.
3. Setelah review manusia menyetujui visual dan working tree, baru tentukan proses Git berikutnya. Handoff ini tidak memberi otorisasi commit/push/merge/deploy.

## Cross-workspace coordination

Prompt review sudah disiapkan untuk task UI/UX Techwind `01a05ee7-5f9a-7902-ae52-995518631ac1` pada workspace design authority, tetapi pengiriman lintas workspace ditolak oleh host karena usage limit sampai 2026-09-07 11:20. Tidak ada workaround atau perubahan pada workspace tersebut. Kirim ulang prompt yang sama setelah host tersedia.
