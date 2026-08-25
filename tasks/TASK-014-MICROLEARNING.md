# TASK-014 — Pembelajaran Singkat / Microlearning

**Status:** PLANNED
**Owner Agent:** Product/Backend/Frontend/QA
**Feature:** F-LXP-002
**Dependencies:** Media, Knowledge, Unified Search, TASK-008

## Objective

Menyediakan pengalaman materi editorial singkat 3–15 menit dengan format video,
article, atau quick learning, bookmark, progres ringan, dan related content.

## In Scope

- Authoring/publishing, duration/format, curated media, detail/discovery,
  bookmark, lightweight resume/progress, related content, SEO bila publik.
- Batas eksplisit antara editorial Portal dan assessment formal Moodle.

## Out of Scope

- Quiz/grade/completion/certificate formal di Portal, raw storage exposure,
  recommendation 2.0, dan identity changes.

## Acceptance Criteria

- AC-01 Materi editorial dan formal memiliki owner/provenance yang jelas.
- AC-02 Progress ringan idempotent dan tidak dipresentasikan sebagai completion
  Moodle.
- AC-03 Media mengikuti policy endpoint dan Media Asset governance.
- AC-04 `Pembelajaran Singkat` baru aktif setelah route/API/state/QA lengkap.
- AC-05 Search, SEO, authz, accessibility, observability, dan fallback lulus.

## Required Tests

- [ ] unit/domain, media/search integration, contract
- [ ] authorization and malformed/unpublished content tests
- [ ] E2E authoring-to-consumption, responsive, keyboard, light/dark

## Documentation Impact

- [ ] OpenAPI/ERD/migration, canonical feature/UI/navigation, runbook, handoff

## Definition of Done

Semua AC/test/evidence lulus tanpa duplikasi learning engine atau policy media.
