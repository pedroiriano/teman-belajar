# TASK-005 — Moodle Adapter Foundation
**Owner Agent:** Moodle Integration Agent  
**Dependencies:** TASK-001, ADR-001, ADR-004, ADR-010

## Objective
Membuat adapter Moodle yang terisolasi untuk course catalogue dan user mapping tanpa direct DB access.

## Acceptance Criteria
- AC-01 Moodle client hanya berkomunikasi melalui documented HTTP/API/plugin interface.
- AC-02 Semua call memiliki request timeout.
- AC-03 External Moodle model dipetakan ke canonical `Course`.
- AC-04 Credentials berasal dari secret/config injection.
- AC-05 Moodle 5xx/timeout dipetakan ke typed dependency error.
- AC-06 Public portal dapat menggunakan cached course snapshot saat policy mengizinkan.
- AC-07 Moodle ID dan identity subject mapping unique dan auditable.
- AC-08 Metrics mencatat latency/error tanpa sensitive payload.

## Tests
HTTP fake server, timeout, malformed response, mapping, 5xx, auth error.

## Definition of Done
No `mdl_*` SQL, adapter contract documented, OpenAPI public model tidak Moodle-specific.
