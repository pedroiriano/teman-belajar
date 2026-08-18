# ADR-014 — Unified Search Engine Selection

**Status:** Accepted
**Date:** 2026-08-18
**Decision owners:** Teman Belajar Engineering
**Scope:** Public unified search and its derived index

## Context

Teman Belajar needs one public search surface across Portal content and visible Moodle courses while preserving domain ownership. PostgreSQL and Moodle remain authoritative; the search index is disposable derived data. Browser clients must never receive engine credentials or raw filter syntax.

The TASK-007 implementation selected Meilisearch but did not record a sufficient comparison, exact server version, asynchronous-task policy, or source-isolation design.

## Options considered

| Option | Strengths | Costs and risks | Fit now |
|---|---|---|---|
| Meilisearch | Purpose-built typo-tolerant search, compact single-node local operation, explicit searchable/filterable/sortable attributes, Go SDK | Separate derived store; write/settings operations are asynchronous and must be awaited; master/admin keys require strict server-only handling | Best fit for the current corpus and team |
| Typesense | Fast search, explicit schemas, search-only/scoped keys | Another dedicated store; schema and cluster operations add migration effort without a demonstrated advantage for current requirements | Viable alternative, not selected |
| OpenSearch | Rich analysis, aggregations, field/document security, mature distributed operation | Highest memory and operational complexity; official Docker guidance expects material host tuning and memory; capabilities exceed current needs | Revisit only when scale/analytics justify it |
| PostgreSQL FTS | No additional datastore, transactional proximity to Portal content, built-in `tsvector`, `tsquery`, and ranking | Cannot directly own Moodle data; cross-source indexing and typo tolerance need more application work; adds search workload to the authoritative Portal database | Good fallback for a Portal-only scope, not the unified target |

## Decision

Use **Meilisearch server 1.6.2**, pinned as `getmeili/meilisearch:v1.6.2`, with **`meilisearch-go` 0.36.3**.

```text
Browser → Next.js Portal → Go Search application service
        → Search Provider port → Meilisearch adapter → Meilisearch

Portal PostgreSQL providers ─┐
                             ├→ Go search-worker → derived index
Moodle Web Service adapter ──┘
```

The worker remains a separate runtime but is built from `services/portal-api/cmd/search-worker`. This removes the duplicate Go module, HTTP client, Moodle mapping, and document contract formerly under `services/search-worker`.

## Mandatory constraints

1. The index is never authoritative and must rebuild deterministically from source systems.
2. Moodle data is obtained only through the existing Moodle Web Service adapter; direct Moodle database access is forbidden.
3. Each source reconciles independently. A failed source fetch does not become an empty snapshot and must not delete its previous documents.
4. Stable IDs use `<source_type>_<source_id>`.
5. Upsert, settings, and deletion tasks are awaited and must finish with `succeeded`.
6. Stale deletion occurs only after a successful source snapshot and successful upsert.
7. Only allowlisted application parameters become engine filters or sort expressions.
8. Engine credentials remain server-only. Local host exposure is loopback-only; production uses a private service network and a scoped search credential for the API.
9. Raw search-query analytics are disabled by default.
10. Moving to another engine requires a superseding ADR and contract/performance evidence.

## Consequences

- Search is independently degradable; an outage returns 503 for Search without taking down Portal content.
- Operators must monitor task failures, source freshness, and index counts.
- Meilisearch volume loss is recoverable by reindexing.
- Production still needs environment-specific secret injection, TLS/reverse-proxy design, and a scoped query-only key; the repository must not embed those credentials.

## Evidence and references

- Running local server `/version`: `1.6.2`, commit `1a083d54fc2840ac59530e5395397211cace35be`.
- Go module lock: `github.com/meilisearch/meilisearch-go v0.36.3`.
- [Meilisearch search/filter contract](https://www.meilisearch.com/docs/reference/api/search/search-with-get)
- [Meilisearch asynchronous task model](https://www.meilisearch.com/docs/capabilities/indexing/tasks_and_batches/manage_task_database)
- [Typesense access-control model](https://typesense.org/docs/guide/data-access-control.html)
- [OpenSearch Docker operational requirements](https://docs.opensearch.org/latest/install-and-configure/install-opensearch/docker)
- [OpenSearch security model](https://docs.opensearch.org/latest/security/)
- [PostgreSQL full-text search and ranking](https://www.postgresql.org/docs/current/textsearch-controls.html)
