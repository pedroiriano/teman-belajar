# TASK-023 — Experience Personalization & Recommendation 2.0

**Status:** PLANNED  
**Owner Agent:** Product/Data/Backend/Frontend/Security/Privacy/QA  
**Feature:** F-ENG-004  
**Dependencies:** TASK-006, TASK-008, TASK-013, TASK-014, TASK-015, TASK-016

## Objective

Menyediakan Untuk Anda, lanjutkan belajar, related knowledge, serta rekomendasi
program/path yang explainable berdasarkan evidence aman.

## In Scope

- Deterministic baseline, approved interaction/learning evidence, ranking,
  reason label, freshness, diversity, fallback, user preference/opt-out bila
  diwajibkan kebijakan, metrics tanpa sensitive profiling.

## Out of Scope

- Sensitive attribute inference, opaque high-impact automation, grades/health/
  protected traits, raw cross-system profile copying, identity changes, atau AI
  service/microservice tanpa ADR dan human review.

## Acceptance Criteria

- AC-01 Input allowlist, purpose, retention, provenance, dan owner terdokumentasi.
- AC-02 Setiap recommendation memiliki reason/fallback dan dapat dihentikan.
- AC-03 Tidak ada sensitive profile atau cross-user leakage.
- AC-04 Moodle/search outage tidak menghilangkan Portal-owned safe fallback.
- AC-05 Relevance, privacy, performance, accessibility, dan abuse tests lulus.

## Required Tests

- [ ] ranking/fallback/freshness unit and integration
- [ ] privacy/cross-user/manipulation/empty-evidence negative tests
- [ ] Portal recommendation/resume E2E and accessibility

## Documentation Impact

- [ ] data/privacy/ADR if AI, OpenAPI/ERD/runbook/metrics/handoff

## Definition of Done

Semua AC dan human privacy/security review lulus dengan evidence reproducible.
