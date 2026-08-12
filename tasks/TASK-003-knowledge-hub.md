# TASK-003 — Knowledge Hub
**Owner Agent:** Backend + Frontend + Data Agent  
**Dependencies:** TASK-002

## Objective
Knowledge article dengan revision history dan reviewer workflow.

## Acceptance Criteria
- AC-01 Setiap perubahan body yang disimpan sebagai revision menghasilkan revision number berikutnya.
- AC-02 Published article menunjuk revision approved.
- AC-03 Public tidak dapat membaca draft/review revision.
- AC-04 Reviewer action tercatat.
- AC-05 Article dapat memiliki category dan related article.
- AC-06 Detail menampilkan last-reviewed timestamp bila tersedia.
- AC-07 Keyboard navigation dan heading semantics lulus checklist.

## Tests
Unit revision rules, integration persistence, authz, public visibility, accessibility critical flow.

## Definition of Done
ERD dan OpenAPI diperbarui sesuai implementasi; no direct SQL in handler.
