# TASK-011B HANDOFF — Hierarchical Knowledge Explorer

## Release state

**LOCAL RELEASE CANDIDATE — protected PR/CI evidence pending.** Implementation,
schema verification, and local test evidence are recorded below. This status
must not be rewritten as canonical release or production verification until the
final PR head passes every required check and is merged through the protected
workflow. TASK-012 remains untouched.

## Fresh-main provenance

- Branch: `codex/task-011b-hierarchical-knowledge-explorer`.
- Base: canonical `origin/main` after protected PR #14.
- Base commit: `f23ab83bb4e9b44296e2d4da7cb50e63d4ec5c5d`.
- TASK-011A canonical predecessor: PR #13, merge
  `47877479d5bf70c57919b519bd8ad919b46f43ff`.
- `latest_prompt.txt` is user-owned, untracked, and excluded from every commit.

## Delivered scope

- Migration 015 with a constrained adjacency-list Knowledge hierarchy,
  maximum depth eight, deterministic sibling order, active/archive lifecycle,
  optimistic versions, and one primary article association.
- Go domain/application/repository/HTTP implementation for list/create/update,
  move, reorder, archive, article placement, authoritative breadcrumb, active
  public tree, and hierarchy-aware Knowledge filtering.
- Server-side authorization and audit events for privileged mutations;
  Reviewer remains read-only.
- Contract-first OpenAPI endpoints and schemas under the unambiguous
  `/admin/knowledge-hierarchy` namespace.
- Cuba Admin hierarchy manager, explicit archive confirmation, article primary
  node selector, and TASK-011A server/device auto-save recovery for hierarchy
  create/edit forms.
- Techwind-derived Portal three-pane Knowledge explorer, mobile hierarchy and
  TOC drawers, active tree state, authoritative breadcrumb, stable heading
  anchors, node-aware pagination/empty states, and SEO canonical/OpenGraph
  metadata.
- Search indexing/results enriched with server-derived `hierarchy_path`, while
  excluding any branch with archived ancestry.
- CI hierarchy contract checks for Admin and Portal, canonical documents, ERD,
  runbook, threat model, and this handoff.

## Security and architecture invariants

1. Keycloak, OIDC, SSO/SLO, User Management, role mapping, Moodle core/plugin,
   and Moodle database are unchanged.
2. No dependency, microservice, Compose service, host port, broker, or secret
   was added.
3. Public ancestry is database-derived; client-supplied labels/path/actor data
   cannot authorize or publish a branch.
4. Archive is non-destructive; hard deletion is absent and referenced rows are
   protected by foreign keys.
5. Database constraints independently reject cycle, self-parent, missing
   parent, excessive depth, sibling slug/order collision, and invalid status.
6. Search hierarchy context is display metadata, not an authorization source.

## Defect found during live database verification

The initial real-PostgreSQL association test found that two existence queries
in `AssignArticleNode` referenced `$1` without passing `articleID`/`nodeID` to
`QueryRowContext`, yielding PostgreSQL 42P02. Both arguments were added, and
the same migration-015 integration test now passes end-to-end. Static mocks had
not exposed this defect; the regression test is retained.

Browser acceptance then exposed stale `Hierarchy test` nodes in the Portal.
The repository assertions passed, but `t.Cleanup` ran after a deferred database
close and the old bulk self-referencing delete ignored its error. Cleanup now
runs before connection close, selects only UUID-patterned/null-actor fixtures,
deletes child-first, reports every failure, and removes pre-existing stale test
fixtures before and after execution. The final API tree contains zero test
roots and the Portal cache was cleared by the governed rebuild.

Final review also tightened two boundary cases: article placement now rejects an
active child when any ancestor is archived, and the Knowledge edit page blocks
an empty required primary-node selection before invoking the server action.
Nested Portal and Admin tree lists use ARIA `group` rather than starting a new
independent `tree` at every level. Public hierarchy counts now join only
articles with a published revision; the authenticated Admin tree retains the
all-workflow count. A live PostgreSQL regression proves that a draft contributes
zero publicly and one administratively.

## Local verification evidence

| Gate | Result |
|---|---|
| Migration 015 via official Docker wrapper | PASS; `migrate` exited 0, existing volumes preserved |
| Real PostgreSQL hierarchy integrity test | PASS; create/depth/cycle/order/stale-version/assignment/archive covered |
| Focused Go domain/repository/handler tests | PASS |
| `go test -p 1 -count=1 ./...` with live PostgreSQL | PASS |
| `go vet ./...` and `go build ./...` | PASS |
| Gosec medium+ | PASS; 0 issues |
| Govulncheck | PASS; 0 called vulnerabilities |
| Admin hierarchy contract | PASS |
| Portal hierarchy contract | PASS |
| Admin lint/typecheck/Next.js 16.3 production Docker build | PASS |
| Portal lint/typecheck/Next.js 16.3 production Docker build | PASS |
| Docker dependency install/audit during build | PASS; 0 vulnerabilities in both frontend installs |
| Explicit Admin/Portal production npm audit | PASS; 0 vulnerabilities |
| Redocly OpenAPI 2.7.0 | PASS; zero errors/warnings |
| AI agent governance verifier | PASS |
| `git diff --check` | PASS; line-ending notices only |
| Governed runtime startup | PASS; API, Admin, Portal and dependencies healthy |
| Portal browser acceptance | PASS; desktop/mobile explorer, mobile drawer empty state, detail metadata/breadcrumb/TOC shell, no console errors |
| Admin browser acceptance | PASS; authenticated hierarchy/form/article-placement states, native required-field blocking, mobile drawer, light/dark field contrast, fixed dark `#38bdf8` accent, and zero hierarchy mutation residue verified |

The Windows host production build attempted to use missing optional native SWC
bindings and correctly advised Webpack; it is not release evidence. The governed
Linux Docker builds installed the supported bindings and completed both
Next.js 16.3 production builds successfully.

Gitleaks, Trivy, reproducible clean CI jobs, and final-head protected workflow
evidence remain pending until the pull request is opened and its checks finish.

## Vendor reference limitation

The governed Techwind and Cuba `ORIGINAL/` directories contain only placeholder
README files in this checkout. TASK-011B therefore follows and verifies the
existing adapted Techwind/Cuba product shells and semantic tokens. It does not
claim pixel-perfect comparison against unavailable licensed originals, and it
does not add guessed vendor runtimes or dependencies.

## Operations and rollback

Use `docs/runbooks/KNOWLEDGE-HIERARCHY-OPERATIONS.md`. Roll back application
images first and leave additive migration 015 in place. Do not drop tables,
delete hierarchy rows/volumes, reset migration history, or weaken constraints
as an emergency rollback.

## Residual risks and next gate

- Search refresh is asynchronous; production convergence targets remain a
  production-readiness concern.
- Audit writes use the current best-effort audit abstraction and are not a
  distributed transaction with each hierarchy mutation.
- One primary node is supported; secondary classification, reactivation,
  drag-and-drop, bulk import, and localization are out of scope.
- Canonical completion requires final-head protected CI success and merge
  authorization. Until then TASK-011B is not canonical and TASK-012 is not
  started by this branch.
