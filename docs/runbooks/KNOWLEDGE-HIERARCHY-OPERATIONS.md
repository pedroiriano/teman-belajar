# Knowledge Hierarchy Operations Runbook

## Scope

TASK-011B hierarchy management for Portal-owned Knowledge. It covers the
existing Portal API, Cuba Admin, Techwind-derived Portal, PostgreSQL migration
015, and Meilisearch hierarchy context. It does not change Keycloak, SSO, RBAC,
Moodle, service topology, ports, or the finalized Identity boundary.

## Invariants

1. Nodes use an adjacency list and one of `collection`, `aspect`, `indicator`,
   `sub_indicator`, `topic`, or `section`.
2. Maximum depth is eight. Cycles and self-parenting are invalid.
3. Sibling slug and `sort_order` are unique, including root siblings.
4. Each Knowledge article has at most one primary node.
5. Archive is non-destructive. There is no normal hard-delete operation.
6. A public branch is visible only when the node and all ancestors are active.
7. Portal Administrator and Content Editor may mutate. Reviewer is read-only.
8. Actor identity is derived from the validated access token, never request
   payload.

## Deployment and normal verification

1. Confirm a clean, reviewed migration chain through 015. Never edit a released
   migration or reset a shared volume to make the migration pass.
2. From `infrastructure/docker`, run
   `.\teman-belajar-docker.ps1 config`, then
   `.\teman-belajar-docker.ps1 up`. The `migrate` service must exit 0 before the
   API starts. No `--volumes`, prune, new project name, or raw legacy Compose.
3. Run the live repository integrity test with a controlled
   `TEST_DATABASE_URL`. It must exercise migration 015 rather than skip.
4. Run OpenAPI lint, Go tests/vet/security scanners, both frontend hierarchy
   contracts, lint, typecheck, production builds, and production dependency
   audits.
5. Sign in to Admin as an authorized author. Verify create, edit, move, reorder,
   archive confirmation, one-primary-node article placement, auto-save, and
   explicit draft recovery.
6. Sign in as Reviewer and verify the tree is readable while every direct
   mutation is denied by the API.
7. Verify Portal desktop hierarchy/article/TOC panes, mobile drawers,
   authoritative breadcrumb, node filtering, empty/error states, heading
   anchors, and keyboard focus.
8. Verify search documents/results display hierarchy context only for branches
   whose full ancestry is active.

## Conflict and integrity response

- HTTP 409 during edit/move/archive means the submitted optimistic version is
  stale. Reload the tree, compare the latest state, and reapply deliberately.
  Never overwrite `version` manually.
- Sibling order/slug conflict: choose a unique value or reorder the complete
  sibling set. Do not temporarily disable constraints.
- Cycle/depth rejection: inspect the intended parent and ancestry. Correct the
  request; never weaken the trigger or maximum depth.
- Archived-node assignment: choose an active branch. Do not reactivate through
  direct SQL; reactivation is not a TASK-011B operation.
- Missing public content after archive is expected when any ancestor is
  archived. Verify Admin state before treating this as an incident.
- Search context stale after a hierarchy change: verify `search-worker` health,
  allow the normal indexing interval, and inspect bounded logs. Do not query or
  modify the Meilisearch index with unreviewed ad-hoc scripts.

## Read-only diagnostic checks

Use parameterized queries and return IDs/status/counts only. Useful checks are:

- current migration version is 015;
- duplicate `(parent_id, slug)` or `(parent_id, sort_order)` count is zero;
- recursive ancestry never exceeds eight and contains no repeated ID;
- every `knowledge_article_nodes.node_id` exists;
- public/search candidates have no archived node in their ancestry;
- hierarchy audit events exist for privileged mutations.

Do not include article bodies, draft payloads, access tokens, database URLs, or
secrets in tickets, logs, prompts, or screenshots.

## Rollback

Roll back application images first and leave additive migration 015 in place.
Older application code ignores the new tables. Do not drop hierarchy tables,
delete nodes, delete volumes, or rewrite migration history as an operational
rollback. Before any future destructive cleanup, require explicit human
approval, an exact target inventory, backup evidence, and a recovery plan.

## Residual limitations

- Archive is intentionally irreversible through the current API.
- One primary placement is supported; secondary/cross-listing relationships are
  out of scope.
- Reordering is explicit, not drag-and-drop.
- Licensed Techwind/Cuba originals are not present in this checkout; only the
  governed placeholder READMEs exist. Acceptance therefore validates the
  established adapted product patterns and semantic tokens, not pixel identity
  with an unavailable vendor source.
