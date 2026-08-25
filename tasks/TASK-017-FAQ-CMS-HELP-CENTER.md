# TASK-017 — FAQ CMS & Help Center

**Status:** IN REVIEW — PR #23
**Owner Agent:** Backend/Frontend/SEO/QA
**Feature:** F-FAQ-001
**Dependencies:** TASK-011A, TASK-011D, TASK-004E

## Objective

Mengganti FAQ hard-coded dengan CMS dan Help Center yang dapat dikelola aman.

## In Scope

- Category, question, answer, sort, draft/review/publish/archive, search, SEO,
  valid FAQ structured data, Auto-Save, dan curated Media opsional.
- Techwind public Help Center dan Cuba Admin authoring/discovery UX.

## Out of Scope

- User-generated support ticket/chatbot, raw HTML tanpa sanitasi, raw storage,
  identity changes, atau markup FAQ untuk konten yang tidak terlihat.

## Acceptance Criteria

- AC-01 Public hanya menampilkan published FAQ sesuai visibility.
- AC-02 JSON-LD sesuai konten terlihat dan tidak duplikatif/menyesatkan.
- AC-03 Auto-Save/recovery, media policy, SEO, authz, audit lulus.
- AC-04 FAQ landing memiliki loading/empty/error/search dan mobile accessibility.
- AC-05 FAQ Admin menggantikan placeholder `Segera` hanya setelah merge.

## Required Tests

- [x] domain/workflow/sort unit and DB integration
- [x] contract/authz/sanitization/structured-data tests
- [x] author-to-public E2E, keyboard/mobile/light/dark

## Documentation Impact

- [x] OpenAPI/ERD/migration, SEO/UI blueprint, runbook/handoff

## Definition of Done

FAQ hard-coded telah dimigrasikan/replaced secara aman dan seluruh AC lulus.
