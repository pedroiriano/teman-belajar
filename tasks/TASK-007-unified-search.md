# TASK-007 — Unified Search
**Owner Agent:** Search/Backend Agent  
**Dependencies:** TASK-002, TASK-003, TASK-005

## Objective
Search lintas knowledge/news/FAQ/course dengan index asynchronous.

## Acceptance Criteria
- AC-01 Published content saja masuk public index.
- AC-02 Search dapat filter content type.
- AC-03 Reindex job idempotent.
- AC-04 Search engine unavailable menghasilkan controlled error/fallback.
- AC-05 Query logging tidak merekam data sensitif secara tidak perlu.
- AC-06 Zero-result metric tersedia.

## Tests
Index mapping, publish/unpublish, reindex idempotency, failure path.

## Definition of Done
Operational reindex procedure terdokumentasi.
