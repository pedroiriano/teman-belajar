# TASK-011A — Auto-Save Draft & Crash Recovery

**Owner Agent:** Backend + Frontend + Data + Security + QA
**Feature:** Pre-TASK-012 Content Authoring Resilience
**Dependencies:** TASK-003 Knowledge Hub, TASK-004E Integrated Media Asset Management, TASK-011 Moodle Event Inbox

## Objective

Add a reusable, secure, server-authoritative draft system with an IndexedDB
fallback so supported Cuba Admin authoring forms survive refreshes, tab/browser
closure, transient API failure, and cross-device continuation without weakening
the canonical publication workflow.

## Context and Required Reading

- `AGENTS.md`
- `docs/canonical/06-ui-ux-blueprint.md`
- `docs/canonical/07-database-design.md`
- `docs/canonical/08-api-specification.md`
- `docs/canonical/10-security-architecture.md`
- `docs/design-system/*`
- `docs/governance/MEDIA-ASSET-MANAGEMENT.md`
- `openapi/openapi.yaml`
- `docs/diagrams/erd.mmd`
- `tasks/TASK-003-knowledge-hub.md`
- `tasks/TASK-004E-integrated-media-management.md`
- `docs/handoffs/TASK-011-HANDOFF.md`

## Architecture Matrix — Current to Target

| Layer | Current state | Target state | Gap closed by TASK-011A |
|---|---|---|---|
| Admin editors | Local React form state; explicit final save only | Shared Cuba-aligned auto-save/recovery UX | Refresh/crash/network loss no longer discards eligible draft input |
| Browser persistence | No durable authoring fallback | IndexedDB, partitioned by verified user/form/draft identity | Local recovery without exposing bearer/session secrets |
| Admin boundary | Final mutations use server actions/BFF patterns | Draft requests use Admin BFF only | Browser never calls internal API directly and never receives access tokens |
| Portal API | No draft domain | Go application service, explicit form registry, authz, optimistic revision | Server is authoritative and rejects unknown/sensitive payload fields |
| PostgreSQL | No authoring draft table | Additive versioned migration with owner, expiry, revision, payload limits | Cross-device recovery, retention, and conflict detection |
| Audit | Final content/workflow events only | Created, recovered, discarded, finalized, and conflict events | Privileged draft lifecycle is accountable without logging payload contents |
| Media | Final entity usage is attached after canonical save | Draft stores only safe editor references/IDs; media policy unchanged | No binary/blob/storage secret is serialized into draft payload |

## In Scope

- Stable UUID draft identity that allows multiple intentional create drafts.
- Edit-draft identity bound to user, entity type, and canonical entity ID.
- Server-side draft persistence with a default 30-day, server-configurable
  retention period and bounded lazy cleanup.
- Explicit form definitions and payload allowlists; recursively deny sensitive
  key names, binary values, unknown fields, oversized fields, and arbitrary DOM
  or `FormData` serialization.
- Optimistic draft revision plus canonical entity base-version metadata.
- Shared Admin Web hook and UI primitives for save state, conflict, recovery,
  discard, and degraded/offline state.
- Three-second idle debounce and immediate save for explicit important/media
  changes.
- IndexedDB fallback; server copy wins only according to deterministic revision
  and timestamp rules that are explained to the author.
- Final successful canonical create/update/revision removes both server and local
  draft. Failed canonical save retains the draft.
- Rollout to News create/edit, Announcement create/edit, Knowledge create/edit.
- Portal Administrator and Content Editor mutation access. Reviewer is denied
  draft mutation server-side.
- OpenAPI, ERD, audit documentation, threat model/runbook, tests, and handoff.

## Out of Scope

- Hierarchical Knowledge Explorer (TASK-011B).
- TASK-012 implementation or production deployment.
- Keycloak, OIDC, SSO/SLO, account management, or RBAC mapping changes.
- Moodle core/plugin/database changes or direct Moodle queries.
- New service, microservice, queue, scheduler, or Compose service.
- Background sync, collaborative editing, CRDT/OT, or automatic conflict merge.
- Persisting credentials, tokens, passwords, OTPs, secrets, raw files/blobs,
  storage keys, object-store credentials, or private signed URLs.

## Security and Data Constraints

1. Actor identity comes only from the validated OIDC access-token `sub`.
2. Ownership is enforced in every repository query; another user receives no
   draft existence signal.
3. Draft routes deny by default and require Content Editor or Portal
   Administrator.
4. Payload and error logs contain no draft body, token, secret, or private media
   URL.
5. PostgreSQL payload size and API request size are bounded independently.
6. Cleanup is bounded and opportunistic; no new runtime service is authorized.
7. Final content workflow and Media Manager authorization remain authoritative.

## Acceptance Criteria

- AC-01 A supported create form can hold multiple stable drafts and recover the
  selected draft after refresh, browser restart, and a second signed-in device.
- AC-02 A supported edit form is bound to its canonical entity and detects a
  stale canonical base version before final save.
- AC-03 Dirty input is saved after three seconds of inactivity; important/media
  changes may request an immediate save; status text is accessible and in
  Indonesian.
- AC-04 A transient server failure preserves a valid IndexedDB fallback and
  shows a non-destructive degraded state.
- AC-05 Competing server draft revisions return deterministic HTTP 409 problem
  details and do not silently overwrite either version.
- AC-06 Recovery presents source, age, and conflict choices; it never replaces
  current input without explicit author action when versions diverge.
- AC-07 Final successful canonical save deletes server and IndexedDB draft;
  failed final save keeps both recoverable copies.
- AC-08 Unknown/sensitive fields, oversized payloads, binary-like values, and
  unsupported form keys are rejected by the Go API even if the UI is bypassed.
- AC-09 Reviewer and unrelated users cannot create, read, update, recover, or
  delete another user's drafts; Content Editor and Portal Administrator can use
  only their own drafts.
- AC-10 Expired drafts are excluded from reads and bounded cleanup removes them;
  retention defaults to 30 days and is configurable server-side.
- AC-11 News create/edit, Announcement create/edit, and Knowledge create/edit all
  use the same reusable draft infrastructure and Integrated Media Manager.
- AC-12 OpenAPI examples, ERD, migration, audit events, threat model, runbook,
  and implementation handoff match the shipped behavior.
- AC-13 Light/dark Cuba Admin, desktop/mobile, keyboard, focus, live-region, and
  loading/empty/error/unauthorized states pass browser acceptance.

## Required Tests

- [x] domain validation and retention unit tests
- [x] repository integration tests, including owner isolation and optimistic conflict
- [x] API handler/contract/problem-response tests
- [x] Admin hook and IndexedDB adapter contract/browser tests
- [x] News, Announcement, and Knowledge finalization regression contracts
- [x] direct-API authorization and malicious-payload negative tests
- [ ] browser acceptance: refresh, restart-equivalent, offline/degraded, conflict, discard, final save
- [x] Admin lint, typecheck, build, and production dependency audit
- [x] Go format, vet/test, migration-from-clean, OpenAPI, ERD, and governance verification

## UI/Vendor Impact

- Vendor reference: Cuba Tailwind form feedback, alert, modal, badge, and toast patterns.
- Product target: `apps/admin-web/` only.
- Dependencies introduced: none; IndexedDB uses browser-native APIs.
- [x] vendor original untouched
- [x] no vendor/demo branding or data
- [x] semantic `admin-*` tokens in both themes
- [x] bright-light-blue dark-mode action palette preserved
- [x] responsive, reduced-motion, keyboard, and screen-reader behavior verified

## Observability

- Structured lifecycle logs contain IDs/revisions only, never draft payload.
- Audit: `DRAFT_CREATED`, `DRAFT_RECOVERED`, `DRAFT_CONFLICT`,
  `DRAFT_DISCARDED`, `DRAFT_FINALIZED`.
- Trace ID is present on problem responses and propagated through BFF/API.

## Documentation Impact

- [x] `openapi/openapi.yaml`
- [x] `docs/diagrams/erd.mmd`
- [x] audit/security canonical guidance where applicable
- [x] authoring recovery runbook and threat model
- [x] task registry and TASK-011A handoff

## Release Gate

TASK-011A must have a separate branch, commit set, PR, CI evidence, migration
evidence, browser evidence, and canonical PASS handoff. TASK-011B must not begin
until TASK-011A is merged through the protected-branch workflow. No admin bypass,
force push, history rewrite, or destructive Docker operation is authorized.

## Definition of Done

- [ ] all acceptance criteria pass
- [ ] relevant tests and security gates pass
- [ ] docs/contracts/migration are synchronized
- [ ] diff is scoped and `latest_prompt.txt` is absent from the commit
- [ ] reviewable PR is green and merged through the protected workflow
- [ ] canonical TASK-011A handoff records commit, PR, evidence, risks, and rollback
