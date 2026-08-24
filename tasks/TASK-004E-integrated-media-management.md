# TASK-004E — Integrated Media Asset Management

> Identifier note: the requested follow-up label `TASK-004A` is already the immutable historical Moodle readiness handoff. The next unused `TASK-004*` suffix is `TASK-004E`; historical TASK-004A through TASK-004D are not overwritten.

**Owner:** Portal API + Admin Web
**Dependencies:** TASK-004, ADR-007, TASK-003F runtime baseline, TASK-007R Cuba baseline
**Out of scope:** Identity/SSO/RBAC flow changes, Moodle changes, Docker services, TASK-012, server-side image transcoding, malware-scanner service.

## Objective

Provide one secure, reusable Cuba Admin media workflow for library discovery, inline upload, client-consented image compression, metadata/rename, accessible editor insertion, and auditable usage tracking.

## Authoritative Policy

- Extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`.
- Magic MIME: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- Final image maximum: exactly 2,621,440 bytes (2.5 MiB).
- PDF/absolute object maximum: exactly 20,971,520 bytes (20 MiB).
- Request-wide multipart maximum: exactly 33,554,432 bytes (32 MiB).
- SVG, executables, unknown magic, path-like filenames, extension/MIME mismatch, and control characters are denied.
- Backend is authoritative. Client checks and compression are usability controls only.

## Acceptance Criteria

- AC-01 API exposes the same upload policy consumed by Admin Web.
- AC-02 Server validates filename, extension, magic bytes, extension↔MIME, and actual stored size independently.
- AC-03 Oversized images return deterministic `IMAGE_COMPRESSION_REQUIRED`; PDFs are never auto-compressed.
- AC-04 Browser compression requires explicit consent, is bounded, preserves aspect ratio, never upscales, and fails visibly.
- AC-05 One Integrated Media Manager provides Library/Unggah Baru tabs, search, type filter, pagination, inline upload, preview, and selection.
- AC-06 Image insertion requires meaningful alt text or an explicit decorative choice; PDF insertion uses link semantics.
- AC-07 News, Announcement, Knowledge create, and Knowledge revision editors use the same component.
- AC-08 Usage relationships are created only after the owning entity/revision ID exists and are idempotent.
- AC-09 `display_filename` can change while `original_filename`, object key, bucket, checksum, and bytes remain immutable.
- AC-10 Reviewer can list/view/select; only Portal Administrator or Content Editor can upload/update/archive/attach/detach. Backend enforces this.
- AC-11 List search/filter is parameterized and ordering is `created_at DESC, id DESC`.
- AC-12 Public delivery remains usage/publication-gated; Admin delivery remains authenticated; unsafe content sniffing is disabled.
- AC-13 Migration 004 is unchanged; migration 013 is additive, backfills display filename, and makes usage identity unique.
- AC-14 OpenAPI, ERD, security guidance, runbook, threat model, tests, and handoff are updated in the same PR.

## Mandatory Verification

Go formatter/test, repository integration tests with migrations 001–013, Admin lint/typecheck/build/audit, OpenAPI validation, governance verification, Docker no-cache build, browser matrix, and direct-API bypass cases for malformed files/oversize/Reviewer mutation.
