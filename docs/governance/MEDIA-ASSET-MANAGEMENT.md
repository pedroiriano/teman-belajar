# Media Asset Management — Mandatory Rules

This document is authoritative for Codex, Gemini, Antigravity, humans, and future agents working on Teman Belajar media. It complements ADR-007, `SECURITY-VALIDATION.md`, the OpenAPI contract, and TASK-004E.

## 1. Boundaries

1. PostgreSQL owns metadata and usage relationships; MinIO owns bytes.
2. Browser code never calls MinIO or the internal Portal API directly. Admin requests use Admin Web BFF/server actions.
3. Do not expose `storage_key`, bucket, checksum, credentials, presigned private URLs, or internal storage errors to browser JSON.
4. Do not add a media microservice, Docker service, transcoder, antivirus service, or dependency without separate architecture/security approval.
5. Do not modify Identity, SSO, account management, or role mapping for media work.

## 2. Upload Policy

The Go media domain is the source of truth. Admin Web must fetch `/api/v1/admin/media/policy`; copied constants are forbidden.

| Kind | Extensions | Magic MIME | Final maximum |
|---|---|---|---:|
| Image | `.jpg`, `.jpeg`, `.png`, `.webp` | JPEG, PNG, WEBP | 2,621,440 bytes |
| Document | `.pdf` | PDF | 20,971,520 bytes |

Request-wide multipart maximum is 33,554,432 bytes. SVG, executable, archive, unknown, empty, path-like, control-character, mismatched extension/MIME, and oversized input must be rejected. Browser MIME is advisory. Server magic detection and actual stored length are authoritative.

## 3. Compression

1. Only an image over 2.5 MiB and at most 20 MiB is eligible for client compression.
2. Show an explicit consent dialog before any transformation.
3. Use browser-native decode/canvas/Blob only; preserve aspect ratio, never upscale, keep PNG output as PNG, and bound attempts/quality/scaling.
4. Never compress PDF.
5. Upload only the compressed result. The server must still validate it and return `IMAGE_COMPRESSION_REQUIRED` if it remains oversized.
6. Compression failure is a visible terminal state; never upload the original as fallback.

## 4. Naming and Immutability

- `original_filename`, `storage_key`, `bucket`, checksum, detected MIME, and stored bytes are immutable.
- `display_filename` is the only renameable filename. Rename is a metadata update; never copy/move the MinIO object.
- Display names may contain Unicode but must be non-empty, at most 255 Unicode code points, contain no path separator/control/CRLF, and retain an extension compatible with detected MIME.

## 5. Authorization and Usage

- Portal Administrator and Content Editor: list/view/select/upload/update/rename/archive/attach/detach.
- Reviewer: list/view/select only.
- UI hiding is not authorization. Portal API denies Reviewer mutations.
- Allowed entity types: `news`, `announcement`, `knowledge_revision`,
  `faq_item`, `microlearning`. FAQ and Microlearning use curated images only; the FAQ item stores the selected
  Media Asset UUID and its required non-empty alternative text.
- Platform Configuration may reference an active image UUID for logo, banner,
  or SEO presentation. These typed references are validated on draft save and
  become publicly eligible only while their configuration version is published;
  they do not expose or mutate storage metadata.
- Allowed roles: `inline`, `featured`, `attachment`.
- Attach only after entity ID exists. Usage identity is `(media_id, entity_type, entity_id, usage_role)` and attach is idempotent.
- Archive is denied while any usage exists. Public delivery additionally requires an eligible published owner.

## 6. Editor Contract

One `MediaPicker`/Integrated Media Manager is reused by every supported editor. Selection returns media ID, display/original names, detected MIME, title, alt, caption, and size—never storage internals. Image Markdown uses image semantics and requires alt/decorative intent. PDF Markdown uses link semantics. Do not use a generic image token for PDF.

FAQ authoring is intentionally image-only. The image is rendered only when its
FAQ owner is published and its category remains active; Admin must repair any
failed usage attachment before moving the FAQ out of draft.

## 7. Change Checklist

Any media change must update tests and, when relevant, migration/OpenAPI/ERD/task/handoff/threat model/runbook. Migration 004 is immutable. Run API bypass tests even when client validation passes. Never weaken validation or authorization to make UI tests green.
