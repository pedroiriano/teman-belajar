# TECHWIND UI/UX FASE 3B1 HANDOFF

Tanggal: 2026-09-03  
Status: **FASE 3B1 PARTIAL**

## Implementasi

- `/knowledge`: PageHero, Breadcrumb, search handoff, hierarchy, EditorialCard, Pagination, dan states memakai library Techwind terpusat.
- `/knowledge/[slug]`: validasi slug, EditorialDetailHero, metadata, engagement, markdown existing, daftar isi, dan related EditorialCard.
- `/knowledge/topics/[id]`: PageHero, Breadcrumb, EditorialCard, empty dan not-found state.
- Loading, error, serta not-found state ditambahkan pada segment Knowledge.
- Tidak ada dummy data, direct browser-to-Moodle fetch, page-local CSS, atau perubahan kontrak API.

## File

- `apps/portal-web/src/components/techwind/index.tsx`
- `apps/portal-web/src/app/knowledge/page.tsx`
- `apps/portal-web/src/app/knowledge/loading.tsx`
- `apps/portal-web/src/app/knowledge/error.tsx`
- `apps/portal-web/src/app/knowledge/[slug]/page.tsx`
- `apps/portal-web/src/app/knowledge/[slug]/not-found.tsx`
- `apps/portal-web/src/app/knowledge/topics/[id]/page.tsx`
- `apps/portal-web/src/app/knowledge/topics/[id]/not-found.tsx`

## Verifikasi

- lint file terdampak, typecheck, foundation, Knowledge hierarchy, production build: PASS.
- Docker service `web` rebuild/recreate: PASS.
- Visual 390/1440 px untuk listing, detail nyata `/knowledge/tes`, dan topic not-found: PASS; tanpa overflow dan satu H1.
- Blocker: `BLOCKED_VALID_KNOWLEDGE_TOPIC_DATA_UNAVAILABLE`; API tree tidak menyediakan topik valid untuk visual QA populated-state.
- `source/`, vendor `ORIGINAL/`, auth, API/BFF, Moodle, database, Docker config, dan route lain tidak disentuh.
- Tidak ada operasi Git atau deployment eksternal.
