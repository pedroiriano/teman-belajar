# Microlearning Operations — TASK-014

## Boundary and ownership

Microlearning is Portal-owned editorial content. `microlearning_progress` is a
resume aid only and always returns `source=portal`, `state=editorial_activity`,
and `formal_completion=false`. Moodle remains authoritative for formal course
assessment, completion, grade, certificate, and badge state.

## Data and rollback

- Migration `020_create_microlearning.sql` is additive and forward-only.
- `microlearning_items` owns metadata, 3–15 minute duration, format, workflow,
  optional curated video URL, cover Media Asset reference, and SEO flags.
- `microlearning_related` stores at most eight ordered references; public reads
  omit unpublished targets.
- `microlearning_progress` is isolated by validated OIDC `sub` plus item ID.
  Repeating an identical write preserves `updated_at`.
- Rollback removes application consumers and navigation while retaining schema
  and authored data. Do not drop migration 020 in a normal rollback.

## Media and video

Cover selection uses the existing Media policy endpoint and accepts active
image assets only. Public bytes are delivered through `/media/{id}` after the
published-owner eligibility check; storage key, bucket, checksum, and MinIO
details are never exposed. Video format uses a curated HTTPS URL. TASK-014 does
not expand upload MIME policy or add a transcoder/provider service.

## Health and diagnostics

- Public catalogue/detail expose published rows only.
- Unified Search indexes only published, effective, `indexable=true` rows.
- Observe `microlearning_actions_total{operation,result}` and generic HTTP/DB
  latency/error telemetry. Audit actions use target type `microlearning`.
- If Search is unavailable, catalogue/detail remain usable and Portal Search
  shows its existing degraded state.
- If Media is unavailable, editorial text remains readable and the image
  request fails closed; do not expose raw object storage as a fallback.

## Security checks

- Editor/Administrator: create and edit drafts.
- Reviewer/Administrator: approve and publish; Reviewer cannot mutate drafts.
- Progress/bookmark subject comes only from validated claims and responses are
  `no-store`.
- Portal progress writes pass through a same-origin BFF with a 4 KiB body cap,
  strict UUID validation, a five-second upstream timeout, and JSON response
  validation.
- Unknown query fields, unknown JSON fields, malformed UUIDs, non-HTTPS video
  URLs, duration outside 3–15 minutes, inactive media, and unpublished targets
  fail closed.
