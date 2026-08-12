# TASK-004 Media Platform & MinIO Object Storage Handoff

## Overview

This handoff document covers the implementation of the Media Platform vertical slice in Teman Belajar, integrating MinIO object storage as the authoritative source for binary assets and PostgreSQL for media metadata.

## Implemented Features

1. **Storage Infrastructure:**
   - Deployed MinIO alongside the application via Docker Compose.
   - Configured dedicated MinIO container `minio` and bucket for application media.
   - Created `minio_storage.go` storage adapter implementing `media.StoragePort`.

2. **Domain & API Architecture:**
   - Designed `MediaAsset` domain model.
   - Designed domain-level services handling safe file uploads, chunk streams, and metadata tracking.
   - Implemented compensation logic: If a file upload succeeds in MinIO but the database metadata insertion fails, the orphaned MinIO object is deterministically deleted.
   - Built strict file parsing and MIME type sniffing (supporting JPEG, PNG, WEBP, PDF), enforcing a 20MB limit and rejecting SVGs for security.

3. **Database Schema:**
   - Applied migration `004_create_media_tables.sql` introducing `media_assets` and `media_usages` tables.
   - Created `media_repository.go` implementing `media.Repository`.

4. **REST API & Transport Layer:**
   - Specified OpenAPI endpoints in `openapi/openapi.yaml`.
   - Built endpoints in `media_handler.go` utilizing standard library `net/http` path routing and parsing `multipart/form-data`.
   - Wired dependencies in `cmd/api/main.go`.

5. **Frontend (BFF & Admin UI):**
   - Created Backend-for-Frontend (BFF) proxy routes (`apps/admin-web/src/app/api/bff/media/...`) appending the NextAuth `accessToken` to authorization headers and forwarding standard FormData.
   - Designed and built the Media Library UI in `apps/admin-web/src/app/dashboard/media/page.tsx` with a responsive Next.js Server Component displaying the grid/table of assets.
   - Built an interactive client component `MediaUploader.tsx` with loading states, error boundaries, and visual feedback for file uploads.

## Verification Tests

- ✅ **Backend Tests:** Passed (`go build ./...`, `go test ./...`). Code securely handles database connection errors and prevents unauthenticated access.
- ✅ **Frontend Checks:** Passed (`npm run lint`, `npm run typecheck`). Enforced clean codebase.
- ✅ **API Design Guidelines:** Compliant. Bounded context separates logic; secrets remain uncommitted; authorization occurs server-side.

## Next Steps / Notes for Future Tasks

- **Rich Text Editor Integration:** To truly unlock media value, the CMS components (e.g., News and Announcements forms) must be upgraded with a Rich Text Editor capable of selecting existing assets from this Media Library.
- **Image Optimization API:** Future iterations might consider an edge resizing proxy (e.g., `image-rs`) or integrating Next.js `next/image` optimization securely connected to the internal MinIO S3 origin.
- **Signed URLs:** For private media assets, a signed URL strategy can be implemented at the Go Backend.
