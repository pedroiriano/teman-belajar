# TASK-008 — Bookmark & Recently Viewed
**Owner Agent:** Backend + Frontend Agent  
**Dependencies:** TASK-001

## Objective
User dapat menyimpan entity yang didukung dan melihatnya kembali.

## Acceptance Criteria
- AC-01 Bookmark unique per user/entity.
- AC-02 User hanya dapat membaca/menghapus bookmark miliknya.
- AC-03 Duplicate create menghasilkan idempotent/409 behavior sesuai contract.
- AC-04 Deleted/unpublished target ditangani aman.
- AC-05 UI accessible dan mobile-friendly.

## Tests
Object-level authorization, uniqueness, target validation, API contract.

## Definition of Done
No cross-user data leak; relevant indexes ada.
