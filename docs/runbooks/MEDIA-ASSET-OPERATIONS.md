# Media Asset Operations Runbook

## Normal checks

1. Run migrations through `infrastructure/docker/teman-belajar-docker.ps1`; confirm version 013 is recorded.
2. Verify policy through authenticated Admin BFF `/api/bff/media/policy`.
3. Verify list order/filter and an Admin image/PDF preview.
4. Upload a small valid image, a >2.5 MiB image with consent compression, and a valid PDF.
5. Directly attempt fake JPG, SVG, oversized final image, oversized PDF, and Reviewer mutation. All must be denied.
6. Rename an asset and confirm original filename/object key/bytes are unchanged.

## Failure handling

- `IMAGE_COMPRESSION_REQUIRED`: keep the source local; compress with explicit browser consent and retry the final file.
- `MEDIA_TYPE_REJECTED`: do not rename around the rule. Inspect extension and true format offline.
- `MEDIA_PAYLOAD_TOO_LARGE`: do not raise limits ad hoc. Use an approved external document workflow or open a governance change.
- Usage attach warning after content creation: do not publish. Retry/reconcile the specific media/owner relation; attach is idempotent.
- Archive conflict: locate/remove legitimate usages through the owning content workflow. Never delete usage rows manually just to force archive.
- Suspected storage orphan: compare database storage keys to the media bucket in a read-only report first. Object deletion requires an explicit reviewed reconciliation procedure.

## Rollback

Application rollback may ignore the additive `display_filename` column/index. Do not reverse migration 013 in-place and do not delete MinIO volumes. A code rollback continues to read the immutable columns created by migration 004.
