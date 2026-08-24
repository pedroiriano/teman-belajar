# Authoring Draft Recovery Runbook

## Scope

TASK-011A draft persistence for Cuba Admin News, Announcement, and Knowledge
create/edit forms. The server copy is authoritative; IndexedDB is a per-browser,
per-OIDC-sub fallback. Draft payloads never contain bearer/session tokens, raw
files, blobs, credentials, storage keys, or signed private URLs.

## Normal verification

1. Run the Docker wrapper `config`; confirm `TB_FORM_DRAFT_RETENTION_DAYS` is an
   integer from 1 to 365 (canonical local value: 30).
2. Run migration 014 and confirm `form_drafts`, CMS `version` columns, owner
   indexes, payload bounds, and expiry index exist.
3. Sign in as Content Editor or Portal Administrator. Type in each supported
   form and stop for three seconds; status must progress from `Belum disimpan`
   to `Menyimpan` to `Tersimpan`.
4. Refresh and explicitly recover the server/device draft. For create forms,
   choose `Draft baru` and confirm the previous draft remains discoverable.
5. Simulate an unavailable API. The UI must report `Tersimpan lokal`, preserve
   IndexedDB, and succeed through `Coba lagi` after recovery.
6. Create a competing update with the same `expected_revision`. The second
   request must return 409 and the UI must require an explicit version choice.
7. Complete canonical save. Confirm server draft and local fallback are deleted
   and `DRAFT_FINALIZED` is audited.
8. Repeat a write as Reviewer and as an unrelated actor. Expect 403 and 404
   respectively; no draft existence or payload may leak.

## Incident handling

- Server unavailable, local copy present: do not clear site data. Restore API
  health, reopen the same draft URL, and use `Coba lagi`.
- Server/local conflict: compare timestamps and content in the recovery panel.
  Never modify PostgreSQL revision values manually and never delete one copy
  before the author chooses.
- Canonical entity conflict: reload the entity, preserve the authoring draft,
  compare against the newer canonical version, then apply a deliberate edit.
- IndexedDB unavailable: server auto-save continues. Warn the author that this
  device has no offline fallback; do not weaken browser security settings.
- Retention misconfiguration: startup fails for values outside 1–365. Correct
  `.env`, run wrapper `config`, and rebuild `api`; do not hard-code a bypass.
- Suspected sensitive data: stop recovery use, restrict access, inspect only
  metadata first, follow incident response, and delete the exact owned draft
  through the API after evidence is preserved. Do not copy payloads to tickets,
  prompts, logs, or screenshots.

## Data checks

Use parameterized, read-only queries for counts/metadata only. A healthy record
has `revision >= 1`, JSON object payload no larger than 262,144 bytes,
`expires_at > updated_at`, and one `(actor_subject, entity_type, entity_id)` row
for edit drafts. Draft body content must not be included in operational reports.

## Rollback

Application code can be rolled back while leaving additive migration 014 in
place. Do not drop `form_drafts` or CMS version columns in an emergency rollback;
they are inert to older code. Retain data until the configured expiry or perform
exact owner-authorized deletion. No volume deletion or destructive Docker action
is part of this rollback.
