# Media Gallery & Video Hub Operations

## Publish

1. Confirm referenced assets are active and match the collection kind.
2. Confirm image alt/decorative intent or video transcript, ordering, cover,
   visibility, and SEO metadata.
3. Submit for review, approve, then publish through Admin. Never manipulate the
   tables or MinIO directly.
4. Verify the public list/detail and correlation-aware metrics/audit event.

## Archive and degraded state

Archive the collection through Admin before retiring it. A published collection
becomes unavailable immediately after cache invalidation. If an object cannot be
delivered, Portal shows `Media tidak lagi tersedia`; investigate the Media Asset
status and object-store health without exposing storage internals. Do not delete
or rewrite migration 023. Rollback reverts application consumers while leaving
the additive schema intact.

## Fixture cleanup

Transition disposable collections to `archived`, detach/archive their disposable
Media Assets through official APIs, and confirm they no longer appear publicly.
Never use direct SQL against a non-ephemeral environment.
