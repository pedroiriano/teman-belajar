# Media Gallery & Video Hub Governance

TASK-022 extends the existing Media Library; it does not create another storage
or delivery system. PostgreSQL owns collection metadata, the existing Media
domain owns immutable asset metadata and validation, and MinIO remains private.

## Contract

- Kinds are `image_gallery` and `video_hub`; lifecycle is
  `draft → in_review → approved → published → archived`.
- Content Editor creates/edits/submits and may archive. Reviewer approves and
  publishes. Portal Administrator may perform both paths through existing roles.
- At most 100 unique active assets and one featured item are allowed. Ordering
  is explicit and unique. Images require non-empty alt text or explicit
  decorative intent; every video requires a transcript before publication.
- Public list/detail queries are server-paginated and select only published
  collections with active items. Archived collections return not found and a
  failed/removed object renders the deterministic public fallback.
- Only media ID and allowlisted presentation metadata cross the API. Storage
  key, bucket, checksum, original private URL, secrets, and unpublished owners
  are prohibited.
- All Admin reads, denials, mutations, and lifecycle transitions are audited.
  Metrics use bounded operation/result labels; caches are invalidated after
  mutations and public responses remain short-lived.

## Validation and SEO

The Media policy endpoint remains authoritative. MP4 and WebM support uses
server-side extension, magic MIME, and size validation. No transcoding or
streaming service is introduced. Public metadata is derived from the published
collection; archived/missing content is non-indexable and never exposes an
internal dependency error.
