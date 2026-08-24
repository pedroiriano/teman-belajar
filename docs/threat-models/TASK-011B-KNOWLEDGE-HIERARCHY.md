# TASK-011B Threat Model — Hierarchical Knowledge Explorer

| Threat | Control | Residual risk |
|---|---|---|
| Reviewer or forged client mutates hierarchy | Portal API role enforcement; Reviewer direct-mutation regression tests; UI is not trusted | Realm role administration remains governed by the finalized Identity boundary |
| Request forges actor/audit identity | Actor comes only from validated access-token `sub`; actor fields are rejected/not accepted | A compromised authorized session can act with that user's privileges |
| Parent move creates a cycle | Domain self-cycle validation plus PostgreSQL recursive trigger | Concurrent complex moves rely on serializable transactions and may return retryable conflicts |
| Tree exceeds safe depth | Maximum depth eight in domain/database; recursive queries are bounded | A broad but valid tree can still increase response size |
| Sibling slug/order collision causes ambiguity | Deferrable unique constraints, normalized slugs, full-sibling reorder validation | Human naming conventions can still be semantically confusing |
| Stale tab overwrites newer structure | Optimistic `version` on update/move/archive and canonical 409 conflicts | Reorder currently serializes the sibling operation instead of exposing per-node expected versions |
| Archived content leaks publicly | Public repository filters active nodes and rejects branches with archived ancestry; index source applies the same ancestry rule | Search propagation is asynchronous, so a previously indexed document may persist until the worker refreshes it |
| Forged breadcrumb/hierarchy path widens access | Breadcrumb and search path are derived server-side from PostgreSQL; they are display context, never authorization | Incorrect operator placement can publish an article under the wrong active branch |
| Node deletion breaks article references | No hard-delete endpoint; foreign keys use `ON DELETE RESTRICT`; archive is the governed lifecycle | Privileged direct database operators remain trusted and must follow the runbook |
| Resource exhaustion through hierarchy payload/tree | UUID/type/slug/title/description/order/count bounds, maximum depth, request body limits, deterministic queries/indexes | Very high valid node breadth requires capacity monitoring before production |
| Stored markup/script in node metadata | Plain text fields, React escaping, bounded values, no raw HTML rendering | Same-origin application XSS elsewhere remains a broader platform risk |
| Audit repudiation | Successful privileged operations emit hierarchy audit events with server-derived actor and target | Audit write is best-effort in the current shared audit abstraction and is not transactionally coupled to every mutation |
| Draft leaks hierarchy authoring data | Existing TASK-011A owner-isolated allowlist, bounded fields, no tokens or article body added to node drafts | A same-origin XSS can read current form state/IndexedDB |

## Explicit boundary decisions

TASK-011B adds no microservice, Compose service, port, broker, new dependency,
direct Moodle call/database query, Moodle core/plugin change, Keycloak/SSO/RBAC
change, or permission weakening. Hierarchy is Portal-owned metadata. Migration
015 is additive and forward-only. Production capacity, DAST, backup/restore,
search convergence SLO, and privileged database operator controls remain later
production-readiness gates.
