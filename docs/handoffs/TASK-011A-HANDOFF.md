# TASK-011A HANDOFF — Auto-Save Draft & Crash Recovery

## Release state

**RELEASE CANDIDATE — local implementation and acceptance PASS; protected PR
and merge are still required.** Capability B (`TASK-011B`) and `TASK-012` must
not begin until this task is merged and the handoff is updated with canonical
commit/PR/CI evidence.

## Delivered scope

- Reusable Cuba Admin auto-save status and explicit recovery UI for News,
  Announcement, and Knowledge create/edit forms.
- Three-second idle debounce, immediate save requests for media insertion,
  stable UUID draft URLs, multiple intentional create drafts, and edit-draft
  binding to the canonical entity.
- Native IndexedDB fallback partitioned by validated OIDC actor subject and
  draft key; only explicit allowlisted form payloads and media UUID references
  are persisted.
- Admin BFF routes that retain the bearer token server-side and deny users
  without Portal Administrator or Content Editor capability.
- Go draft domain, explicit form schema registry, owner isolation, payload and
  request bounds, optimistic revision conflicts, retention, bounded lazy
  cleanup, and lifecycle audit events.
- Additive migration 014 for `form_drafts` plus canonical optimistic `version`
  columns on draft News and Announcement rows.
- Optimistic canonical News/Announcement PATCH and atomic Knowledge revision
  update so stale edit forms cannot silently overwrite a newer draft.
- Final-save cleanup with bounded retry: local draft data is deleted only after
  server deletion succeeds or confirms 404; a failed cleanup preserves the
  recoverable local copy.
- OpenAPI, ERD, canonical UI/data/API/security documents, design-system
  inventory, Docker retention configuration, runbook, threat model, task
  registry, and CI contract checks.

## Security invariants

1. Keycloak, OIDC, SSO/SLO, account management, role mappings, Moodle core,
   Moodle plugin, and Moodle database were not changed.
2. Actor identity comes only from the validated OIDC `sub`; actor identity in a
   browser request body is ignored because it is not accepted by the contract.
3. Draft repository reads, writes, list, recovery, and deletion are scoped by
   owner. Reviewer bypass tests prove mutation is denied server-side.
4. Draft payload schemas reject unknown fields, sensitive key fragments,
   binary/non-string content, signed/private credential URLs, invalid or
   duplicate media UUIDs, unsupported form keys, and oversized values.
5. Browser code stores no bearer/refresh token, password, secret, binary media,
   MinIO key, bucket, checksum, or private signed URL.
6. No dependency, Compose service, microservice, scheduler, or background queue
   was added. Migration and normal runtime operations did not delete volumes.

## Acceptance defects found and corrected

Browser acceptance found three release-blocking defects that static checks did
not expose:

1. Adding `?draft=<uuid>` changed the `useSearchParams` dependency, cancelled
   initialization, and left the UI at **Menyiapkan**. Initialization now uses a
   one-time query snapshot and a stable URL callback; a contract regression
   check forbids the unstable dependency.
2. PostgreSQL JSONB and IndexedDB used different object-key ordering, producing
   a false conflict for identical payloads. Payload comparison now recursively
   canonicalizes object keys before serialization.
3. Cross-tab discovery compared UUID `entity_id` with a text parameter, causing
   a server error and a silent new-key fallback. The repository now uses a
   fixed UUID-typed query, and its live integration test covers unfiltered and
   entity-filtered list plus owner isolation.
4. A consumed media immediate-save request remained numerically non-zero and
   would make all later text edits bypass debounce. Each request is now consumed
   exactly once; the contract and browser run prove the next text edit waits for
   the normal idle window.

## Verification evidence

| Gate | Result |
|---|---|
| Go formatting | PASS |
| `go test -p 1 -count=1 ./...` | PASS; serial package execution prevents unrelated integration tests from racing on their shared local fixtures |
| Draft domain/repository/handler focused tests against migration 014 | PASS |
| `go vet ./...` | PASS |
| `gosec -severity medium ./...` | PASS — 0 issues |
| `govulncheck ./...` | PASS — 0 called vulnerabilities |
| Admin `test:drafts`, `test:media`, `test:theme` | PASS |
| Admin lint and typecheck | PASS |
| Linux Docker no-cache Admin build (`npm ci`, lint, typecheck, Next.js 16.3 production build) | PASS |
| Linux Docker no-cache Portal API build | PASS |
| Admin production dependency audit | PASS — 0 vulnerabilities |
| Redocly OpenAPI 2.7.0 | PASS |
| AI agent governance verifier | PASS |
| `git diff --check` | PASS; Windows line-ending notices only |
| Migration 014 apply | PASS; `migrate` exited 0 and schema inspection confirmed table/columns |
| Official Docker `verify` | PASS — HTTP 200 for API, Portal, Admin, Keycloak, Moodle, MinIO, Meilisearch, and Grafana |
| Keycloak reconciliation | PASS for Portal, Admin, Moodle, Moodle role mapper, and Admin management client |

The first parallel full-Go test attempt reproduced a pre-existing shared-state
race between integration event/dead-letter tests. The task-scoped draft tests
were already green; the required full suite then passed with `-p 1`, without
changing or disabling any test.

## Browser acceptance

Acceptance used a fresh Pedro Portal Administrator session on the rebuilt
production Admin image:

- News create initialized to **Auto-save aktif** with a stable draft URL.
- Dirty input immediately announced **Belum disimpan**, then changed after the
  three-second idle window to **Tersimpan di server dan perangkat ini**.
- Reload detected both copies without overwriting the form. Explicit server
  recovery restored title, slug, summary, and body.
- **Draft baru** generated a distinct UUID, cleared the form, and preserved the
  preceding draft.
- A second tab without a draft query selected the latest server draft and
  offered explicit recovery, proving server-authoritative continuation.
- Two recovered tabs created a real stale revision. The second write returned
  the governed conflict UI and did not overwrite the newer server copy.
- Media insertion required accessible alternative text, saved the resulting
  media UUID reference immediately, and returned **Tersimpan** in under one
  second. A following text edit was still **Belum disimpan** after 500ms and
  became **Tersimpan** only after the three-second debounce.
- Announcement create, Knowledge create, and draft News edit all initialized
  the shared auto-save infrastructure successfully. Static integration
  contracts cover the other eligible edit pages.
- Mobile 390×844 exposed the Admin navigation trigger with a 375px main region;
  desktop 1440×900 exposed the Cuba sidebar with an 1149px main region.
- Dark mode retained readable Slug URL colors and bright light blue
  `rgb(56, 189, 248)` as its primary/action accent. Light mode retained its
  separate documented palette. The original dark preference was restored.
- Browser warning/error logs were empty after the final acceptance run.
- Before cleanup, read-only PostgreSQL evidence showed one selected QA draft
  with successful `DRAFT_CREATED` and `DRAFT_RECOVERED` audit events; the
  deliberate stale write also generated `DRAFT_CONFLICT`.

The destructive UI click used to prove `DRAFT_DISCARDED` is intentionally held
until the human gives action-time approval. No canonical test content was
created. Full browser network-offline injection was not performed because the
governed Docker wrapper has no single-service pause action; the IndexedDB-first
failure branch and non-destructive degraded state are covered by implementation
contracts and review rather than an unauthorized Docker/network mutation.

## Configuration and operations

- Canonical setting: `TB_FORM_DRAFT_RETENTION_DAYS` in ignored
  `infrastructure/docker/.env`; `.env.example` contains only the safe default.
- Default: 30 days. Wrapper validation accepts integers 1–365 and passes only
  `FORM_DRAFT_RETENTION_DAYS` to the existing `api` service.
- Expired records are excluded from reads and deleted in bounded batches; no
  cron or new service is required.
- Rollback: revert application code first. Migration 014 is additive and may
  remain dormant; do not drop `form_drafts` or version columns as an ad-hoc
  rollback. Preserve rows until retention/data-owner review authorizes removal.

## Residual risks and next gate

- Canonical content save and draft cleanup are two bounded operations, not one
  distributed transaction. Cleanup retries three times and preserves local
  recovery data on failure; the runbook describes reconciliation.
- IndexedDB availability depends on browser policy/quota. Server persistence
  remains authoritative when local storage is unavailable.
- Conflict resolution is explicit source selection; automatic merge and
  collaborative editing remain intentionally out of scope.
- This handoff is not canonical PASS until the separate TASK-011A PR is green
  and merged through protected-branch workflow, then updated with the final
  commit, PR, CI, discard evidence, and merge SHA.
- `latest_prompt.txt` is user-owned, remains untracked, and must not be staged or
  committed.
