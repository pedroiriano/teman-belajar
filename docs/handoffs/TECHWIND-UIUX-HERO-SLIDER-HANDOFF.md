# TECHWIND UI/UX — Homepage Hero Slider Handoff

**Tanggal:** 2026-09-03  
**Status:** READY

## Implementasi

- Hero homepage `/` memakai satu komponen reusable `TechwindHeroSlider` pada centralized Techwind library.
- Tiga slide, gambar, overlay, copy, CTA, alignment kiri/tengah/kanan, transisi, dan perilaku responsive mengikuti Hero root `techwind-pembelajaran/index.html`.
- Tinggi Hero tepat `100vh`; gambar memakai fallback lokal tanpa menambah dependency.
- Kontrol mencakup previous/next, indikator slide, pause/play, keyboard Arrow Left/Right/Space, touch swipe, label ARIA, live status, focus-visible, dan `prefers-reduced-motion`.
- Asset yang disalin hanya `bg01.jpg`, `bg02.jpg`, dan `bg03.jpg` ke `apps/portal-web/public/techwind/hero/`.

## File berubah

- `apps/portal-web/src/app/page.tsx`
- `apps/portal-web/src/app/globals.css`
- `apps/portal-web/src/components/techwind/hero-slider.tsx`
- `apps/portal-web/src/components/techwind/index.tsx`
- `apps/portal-web/public/techwind/hero/bg01.jpg`
- `apps/portal-web/public/techwind/hero/bg02.jpg`
- `apps/portal-web/public/techwind/hero/bg03.jpg`
- `docs/handoffs/TECHWIND-UIUX-HERO-SLIDER-HANDOFF.md`

## Verifikasi

- Targeted ESLint: PASS
- TypeScript typecheck: PASS
- Production Webpack build: PASS
- Docker service `web` saja, rebuild/recreate satu kali melalui wrapper kanonis: PASS
- Visual aktual `http://localhost:3000/` pada 390 px dan 1440 px: PASS; `100vh`, satu H1, tanpa horizontal overflow.
- Kontrol pause/play, dot navigation, dan keyboard Arrow Left: PASS.

## Batasan terjaga

- Design authority termasuk `source/` tetap read-only; vendor `ORIGINAL/` untouched.
- API, auth/Keycloak/SSO, BFF, Moodle, database, route lain, footer, dan Docker configuration untouched.
- Webinar tetap dummy nonaktif berstatus **Segera**.
- Tidak ada operasi Git atau deployment eksternal.
