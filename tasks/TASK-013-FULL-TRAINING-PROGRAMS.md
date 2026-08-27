# TASK-013 — Pelatihan Penuh / Full Training Programs

**Status:** DONE — MERGED via PR #33 (`5ec7893c`)
**Owner Agent:** Product/Backend/Frontend/Moodle/QA
**Feature:** F-LXP-001
**Dependencies:** TASK-005, TASK-006, TASK-007

## Objective

Menyediakan katalog dan detail program pelatihan terstruktur yang mengagregasi
course Moodle tanpa mengambil alih enrolment, completion, atau learning state.

## In Scope

- Program, cohort/jadwal, eligibility presentation, course composition, CTA
  enrol/start, discovery/search, dan progress read model berprovenance.
- Techwind Portal catalogue/detail serta Cuba Admin composition UI.
- API contract, authz, pagination, loading/empty/error/degraded states.

## Out of Scope

- Quiz, gradebook, completion engine, direct Moodle DB, atau Moodle core change.
- Identity/SSO/account changes dan program recommendation TASK-023.

## Acceptance Criteria

- AC-01 Moodle tetap authoritative untuk course/enrolment/completion.
- AC-02 Eligibility dan CTA tidak menjanjikan akses yang belum dikonfirmasi API.
- AC-03 Progress menunjukkan provenance/freshness dan degradasi parsial.
- AC-04 Menu `Pelatihan Penuh` aktif hanya setelah route dan browser QA lulus.
- AC-05 Authz, contract, accessibility, responsive, observability, dan rollback
  evidence tersedia.

## Required Tests

- [x] domain/unit dan aggregation integration
- [x] Moodle adapter/contract serta degraded-state test
- [x] API authorization/pagination/negative tests
- [x] Portal/Admin route contracts, keyboard semantics, responsive light/dark source guards

## Documentation Impact

- [x] OpenAPI/ERD/migration bila berubah
- [x] canonical feature/UI, navigation taxonomy, runbook, handoff

## Definition of Done

Semua AC dan test lulus, vendor originals tidak berubah, tidak ada secret atau
direct Moodle access, PR scoped telah di-review dan di-merge.
