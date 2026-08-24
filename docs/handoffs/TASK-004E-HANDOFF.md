# TASK-004E HANDOFF — Integrated Media Asset Management

## Identifier decision

The user-provided implementation brief proposed TASK-004A only if that identifier was unused. `docs/handoffs/TASK-004A-HANDOFF.md` already records the historical Moodle 5.2.2+ readiness gate, followed by TASK-004B through TASK-004D. This implementation therefore uses the next free canonical suffix, **TASK-004E**, and does not overwrite historical handoffs.

## Delivered scope

- Central Go media policy and authenticated policy endpoint.
- Exact image/object/multipart limits: 2,621,440 / 20,971,520 / 33,554,432 bytes.
- Extension + filename + magic MIME + extension↔MIME + actual-size validation.
- Deterministic `IMAGE_COMPRESSION_REQUIRED`, object-store compensation, and hidden storage internals.
- Additive migration 013: `display_filename`, legacy backfill, duplicate usage cleanup, unique usage identity.
- Metadata-only rename with immutable original filename/storage key/bucket/checksum/bytes.
- Parameterized search/type filter/pagination and deterministic `created_at DESC, id DESC` ordering.
- Owner-existence validation and idempotent bounded usage attachment.
- Server-side Admin/Editor mutation gate; Reviewer remains view/select-only.
- Public publication/usage gate preserved; short revalidation cache, PDF attachment, `nosniff`; Admin content is private/no-store.
- Cuba Integrated Media Manager with Library/Unggah Baru tabs, search, filter, pagination, keyboard/focus behavior, inline upload, preview, and complete selection object.
- Browser-native, explicit-consent, bounded image compression; PDFs are never compressed.
- MIME-aware Markdown: images require alt/decorative intent; PDFs become document links.
- Shared integration in News create, Announcement create, Knowledge create, and Knowledge revision edit.
- Post-create usage attachment in server actions; partial attachment failure is surfaced and publishing is blocked operationally until reconciliation.
- OpenAPI, ERD, canonical UI/security docs, threat model, runbook, task spec/backlog, and root agent constitution updated.

## Security invariants

1. Identity/Keycloak/SSO/account/role-mapping code and configuration were not changed.
2. Migration 004 is byte-for-byte untouched.
3. No Docker service, microservice, server transcoder, ClamAV service, frontend package, or Go dependency was added.
4. Browser JSON omits storage key, bucket, checksum, and actor IDs.
5. Random storage keys remain authoritative; user filenames never become object paths.
6. Reviewer bypass tests cover upload/update/archive/attach/detach.

## Verification evidence

| Gate | Result |
|---|---|
| Go formatter | PASS |
| `go build ./...` | PASS |
| `go test ./...` with local PostgreSQL | PASS |
| Media repository integration: search/filter/tie-break/rename/idempotent usage | PASS |
| Media service regression: MIME mismatch/SVG/path/size/compensation/rename/missing owner | PASS |
| Handler Reviewer bypass + policy exactness | PASS |
| `go vet ./...` | PASS |
| `gosec ./...` | PASS for TASK-004E changes; 12 pre-existing LOW G706 log-taint findings remain in migration/main startup logging, no medium/high finding |
| `govulncheck ./...` | PASS — 0 called vulnerabilities |
| Admin lint/typecheck | PASS |
| Admin `test:media`, theme, user-management contracts | PASS |
| Admin production build (`next build --webpack`) | PASS; Windows installation lacks native SWC so the default Turbopack local command cannot run, CI Linux uses the normal script |
| Admin production dependency audit | PASS — 0 vulnerabilities |
| Redocly OpenAPI 2.7.0 | PASS |
| Agent governance verification | PASS |
| `git diff --check` | PASS |
| Migration 004 diff | PASS — empty |
| Local migration 013 | PASS |

## Local migration reconciliation

The local database history ended at 011 although the exact TASK-011 `integration.event_inbox`/`event_outbox` columns, constraints, foreign key, and indexes already existed. Read-only inspection proved structural equality with migration 012. One missing local `schema_migrations` row for 012 was inserted, then the repository `portal-migrate` binary applied 013 successfully. No production environment was touched.

## Runtime browser gate

Browser inspection at `http://localhost:3001/dashboard/media` is **NOT a pass for TASK-004E**. The running Admin container still serves the prior image (legacy single file input and “Maksimum 20 MB” copy). No console error was present, but the new Integrated Media Manager was not loaded.

The governed wrapper currently fails Compose interpolation because ignored `infrastructure/docker/.env` has no non-empty `TB_MOODLE_EVENT_INGEST_SECRET`. That secret was not fabricated, copied into the repository, rotated, or printed. The wrapper `up` action also runs Keycloak reconciliation; TASK-004E cannot invoke that Identity mutation without explicit `OVERRIDE IDENTITY BOUNDARY` authorization. Therefore runtime refresh/browser acceptance remains a post-PR local gate after the human restores the existing event-ingest secret through the approved secret channel or provides the required explicit override.

## Residual risks / future work

- No malware scanning/content-disarm/server transcode; see the TASK-004E threat model.
- Small-file extreme-dimension images remain a browser preview resource risk because the server deliberately does not decode images.
- Usage is polymorphic and owner existence is checked at attach time rather than via cross-table foreign key.
- Content editors are Markdown textareas; TASK-004E centralizes safe media insertion but does not introduce a rich-text dependency.
- Migration checksum enforcement remains TASK-012 governance hardening and is not implemented here.

## Release state

- Implementation and local non-runtime gates: **PASS**.
- Fresh CI migrations/checks: **PENDING PR**.
- New-image browser acceptance: **BLOCKED by governed local secret/Identity boundary**, not waived.
- Merge authorization: not inferred; leave a green PR unmerged unless the user explicitly authorizes merge.
