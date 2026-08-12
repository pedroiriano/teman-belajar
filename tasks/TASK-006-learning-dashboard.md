# TASK-006 — My Learning Dashboard
**Owner Agent:** Backend + Frontend Agent  
**Dependencies:** TASK-001, TASK-005

## Objective
Dashboard learner agregat yang tetap usable ketika Moodle degraded.

## Acceptance Criteria
- AC-01 Authenticated learner melihat profile dan active courses.
- AC-02 Course progress 0–100 atau null jika belum tersedia.
- AC-03 Moodle unavailable tidak menyebabkan 500 untuk seluruh dashboard; response menyatakan dependency status.
- AC-04 UI menampilkan granular degraded state.
- AC-05 Dashboard tidak menampilkan data learner lain.
- AC-06 P95 baseline dan cache policy diukur/didokumentasikan.

## Tests
Authorization, aggregation, degraded dependency, cache, frontend states.

## Definition of Done
Contract, tests, metrics dan UX states lengkap.
