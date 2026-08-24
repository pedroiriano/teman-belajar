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

The human supplied the exact `OVERRIDE IDENTITY BOUNDARY` authorization for the governed local rebuild and Keycloak reconciliation. No recoverable `TB_MOODLE_EVENT_INGEST_SECRET` existed in the ignored local environment or running Moodle container, so a new cryptographically random 48-byte Base64URL value was generated in process and written only to ignored `infrastructure/docker/.env`. The value and its digest were never printed, logged, staged, or committed.

The official `infrastructure/docker/teman-belajar-docker.ps1 up` workflow rebuilt the repository runtime, applied migrations with `migrate` exiting 0, brought every long-running service to healthy/running state, and passed reconciliation for the Portal, Admin, and Moodle Keycloak clients, the Moodle role-claim mapper, and the Admin management client. The official `verify` workflow then returned HTTP 200 for Portal API, Portal Web, Admin Web, Keycloak, Moodle, MinIO, Meilisearch, and Grafana.

The first new-image browser run exposed a real React Server Component boundary defect: the server-rendered Media page passed an inline `onError` callback to an image element. The scoped follow-up replaces that callback with the client-only `MediaPreviewImage` component and adds contract checks that keep event handling out of the server page. The corrected Admin image was rebuilt from commit `a867395` before the final browser run.

Final browser acceptance is **PASS**:

- a fresh Pedro Keycloak session removed the stale-token `Unauthorized` state;
- Media Library loaded the Portal API policy and four local assets with gallery, table, metadata, actions, and deterministic empty/pagination states;
- search and media-type filter submissions used GET query parameters and produced the expected empty and populated results without mutating data;
- the News editor opened the shared Integrated Media Manager with Library/Unggah Baru tabs, API-derived upload limits, search/type controls, selection controls, and disabled insertion until selection;
- focus entered the close button, Escape closed the dialog, body scrolling was restored, and focus returned to the originating `Sisipkan media` button;
- Admin light mode retained its documented warm palette; Admin dark mode used `rgb(56, 189, 248)` bright sky blue with zero detected orange accent nodes;
- the Slug URL field was readable in both modes: light text/background `rgb(30, 41, 59)` / `rgb(255, 255, 255)`, dark `rgb(241, 245, 249)` / `rgb(50, 56, 70)`;
- the same Keycloak browser session entered Portal automatically and entered Moodle automatically through its federated login route; Moodle displayed Pedro Administrator with administrator navigation;
- browser warning/error logs were empty, and post-rebuild Admin logs contained no React Server Component serialization error.

The Portal `my-learning` page still reports that Pedro's formal-learning account is not connected, and Moodle logs the corresponding `local_temanbelajar/usernotmapped` lookup. Direct federated Moodle login succeeds, so this is an existing local identity-mapping data condition, not a TASK-004E media regression and not a reason to expand this scoped fix.

## Residual risks / future work

- No malware scanning/content-disarm/server transcode; see the TASK-004E threat model.
- Small-file extreme-dimension images remain a browser preview resource risk because the server deliberately does not decode images.
- Usage is polymorphic and owner existence is checked at attach time rather than via cross-table foreign key.
- Content editors are Markdown textareas; TASK-004E centralizes safe media insertion but does not introduce a rich-text dependency.
- Migration checksum enforcement remains TASK-012 governance hardening and is not implemented here.

## Release state

- Implementation, local gates, official runtime rebuild/verify, and new-image browser acceptance: **PASS**.
- Feature pull request [#11 — feat(media): integrated media asset management](https://github.com/pedroiriano/teman-belajar/pull/11) was merged to `main` as `4990e095fdc731860507e6c69101d1d62c34b754` through the protected-branch workflow.
- Scoped runtime correction: [#12 — fix(admin): isolate media preview error handling](https://github.com/pedroiriano/teman-belajar/pull/12). GitHub checks on its final head remain the merge authority; mutable check results are intentionally not copied into this handoff.
- The user explicitly authorized completion and merge. PR #12 may be merged through the normal protected-branch workflow only after its final-head checks pass.
