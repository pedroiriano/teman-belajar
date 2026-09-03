# TECHWIND UI/UX — FASE 3B2 Handoff

**Tanggal:** 2026-09-03  
**Status:** READY

## Implementasi

- `/announcements/[slug]` dimigrasi ke centralized Techwind components: `EditorialDetailHero` dan `EditorialBody`.
- Hero mengikuti pola editorial detail dengan visual="announcement", breadcrumbs, dan meta date formatting.
- Body menggunakan `EditorialBody` dengan markdown renderer dan footer taxonomy (category/tags).
- Menghapus komponen legacy `PageHero` dan breadcrumb manual yang non-standar.
- `/news` dan `/news/[slug]` sudah menggunakan Techwind, tidak berubah.

## File berubah

- `apps/portal-web/src/app/announcements/[slug]/page.tsx`

## Verifikasi

- Targeted ESLint: PASS
- TypeScript typecheck: PASS
- Production Webpack build: PASS
- Docker service `web` rebuild/recreate via wrapper kanonis: PASS
- Visual check memerlukan user capture pada 390 px dan 1440 px untuk `/announcements/[slug]`.

## Batasan terjaga

- Design authority termasuk `source/` tetap read-only; vendor `ORIGINAL/` untouched.
- API, auth/Keycloak/SSO, BFF, Moodle, database, route lain, Docker configuration untouched.
- Webinar tetap dummy nonaktif berstatus **Segera**.
- Tidak ada operasi Git atau deployment eksternal.
