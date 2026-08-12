# TASK-002 — CMS News & Announcement
**Owner Agent:** Backend + Frontend Agent  
**Dependencies:** TASK-000, TASK-001

## Objective
Implementasi vertical slice berita dan pengumuman dengan editorial state.

## Acceptance Criteria
- AC-01 Editor dapat membuat draft berita.
- AC-02 Public endpoint hanya menampilkan `published` yang sudah mencapai `published_at`.
- AC-03 Reviewer/authorized role dapat mengubah state sesuai allowed transition.
- AC-04 Unauthorized state change ditolak 403.
- AC-05 Slug unique.
- AC-06 List public paginated dan batas page_size <=100.
- AC-07 Create/publish/unpublish diaudit.
- AC-08 UI menyediakan loading, empty, error, mobile states.

## Tests
- domain state transition;
- repository;
- API contract;
- authorization;
- public filtering.

## Definition of Done
Migration, OpenAPI, UI, audit dan tests dalam satu PR/series terkoordinasi.
