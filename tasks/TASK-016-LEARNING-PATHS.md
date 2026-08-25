# TASK-016 — Jalur Belajar / Learning Paths

**Status:** PLANNED
**Owner Agent:** Product/Backend/Frontend/Moodle/QA
**Feature:** F-LXP-004
**Dependencies:** TASK-013, TASK-014, TASK-015

## Objective

Menyusun course, knowledge, microlearning, dan webinar menjadi jalur bertahap
dengan prerequisite, milestone, progres, dan rekomendasi next step.

## In Scope

- Path/version/order, item provenance, prerequisite, milestone, aggregated
  progress, next-step rules, authoring/review/publish/archive, degraded states.
- Portal Techwind learner experience dan Cuba Admin composer.

## Out of Scope

- Mengubah completion Moodle, AI recommendation TASK-023, direct Moodle DB,
  graph/microservice baru tanpa ADR, dan identity changes.

## Acceptance Criteria

- AC-01 Formal item completion berasal dari Moodle; editorial state dari Portal.
- AC-02 Published path version stabil dan perubahan tidak merusak progres lama.
- AC-03 Cycle/orphan/unauthorized item ditolak server-side.
- AC-04 Degraded source tidak menjatuhkan seluruh path dan freshness terlihat.
- AC-05 `Jalur Belajar` aktif hanya setelah browser QA serta AC lengkap.

## Required Tests

- [ ] graph/order/version/progress unit tests
- [ ] source adapter/contract/integration tests
- [ ] cycle/authz/stale/degraded negative tests
- [ ] Admin composer and learner journey E2E/accessibility

## Documentation Impact

- [ ] OpenAPI/ERD/migration, canonical UI/feature/navigation, runbook/handoff

## Definition of Done

Semua AC dan regression TASK-013–015 lulus dengan ownership/provenance jelas.
