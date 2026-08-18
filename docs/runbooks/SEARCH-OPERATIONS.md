# Search Operations Runbook

**Service:** Teman Belajar Unified Search
**Server:** Meilisearch 1.6.2
**Index:** `teman_belajar_public_v1`
**Worker runtime:** `teman-belajar-search-worker`

## Safety invariants

- The index is derived data; PostgreSQL and Moodle remain authoritative.
- Never query Moodle tables directly.
- Never display or paste Meilisearch/Moodle credentials into commands, logs, handoffs, screenshots, or tickets.
- Use `infrastructure/docker/teman-belajar-docker.ps1`; never use project-wide prune or normal shutdown with `--volumes`.
- Do not delete `teman-belajar-meili-data` during routine troubleshooting.

## Local topology and ports

All host ports are declared exactly once in ignored `infrastructure/docker/.env` and validated for range and collisions. Meilisearch may be host-published only on the configured loopback address. Internal clients always use `http://search:7700`; the worker opens no host port.

## Start and verify

```powershell
cd infrastructure/docker
powershell -NoProfile -ExecutionPolicy Bypass -File ./teman-belajar-docker.ps1 config
powershell -NoProfile -ExecutionPolicy Bypass -File ./teman-belajar-docker.ps1 up
powershell -NoProfile -ExecutionPolicy Bypass -File ./teman-belajar-docker.ps1 verify
```

Expected: Search health is HTTP 200, Portal health remains HTTP 200, and worker logs show one success/failure line per source without query text or tokens.

## Source coverage

| Source | Authority | Public rule | Failure behavior |
|---|---|---|---|
| News | Portal PostgreSQL | status published, `published_at` present and not future | Preserve previous News generation |
| Knowledge | Portal PostgreSQL | body joined only to `published_revision_no` | Preserve previous Knowledge generation |
| Announcement | Portal PostgreSQL | published, not future, active window, not expired | Preserve previous Announcement generation |
| Course | Moodle Web Service | visible only; site course omitted | Preserve previous Course generation |

FAQ, Page, Video, and taxonomy tag mappings do not yet have implemented source domains/contracts and must not be fabricated.

## Reindex behavior

For each successful source snapshot the worker assigns a new generation, upserts stable IDs, waits for task success, lists source IDs, removes stale IDs, and waits for deletion success. A fetch failure skips replacement entirely. Running the same snapshot twice keeps the same IDs and logical count.

## Search outage test

1. Stop only the `search` service using Compose with the canonical project/environment files.
2. Confirm `/api/v1/health`, News, Knowledge, Portal, and Admin remain healthy.
3. Confirm `GET /api/v1/search?q=health` returns RFC 7807 HTTP 503.
4. Confirm the Portal Search page renders its unavailable state.
5. Start Search again; worker reconciliation should resume without manual data repair.

Do not stop databases or remove volumes for this test.

## Index loss or corruption

For production, obtain incident approval before destructive index actions. Create a new temporary index, run a complete source reconciliation, validate publication isolation and counts, then switch the configured index in a controlled release. For local development only, a deliberately removed Search volume must rebuild from authoritative sources; database/Moodle data must remain untouched.

## Required security checks

- anonymous writes fail;
- master/admin key is worker-only in production;
- Go API uses a scoped server-only query key in production;
- no key appears in browser bundles or `NEXT_PUBLIC_*`;
- host publication remains loopback-only locally;
- telemetry is disabled;
- raw search-query capture is `false`;
- exact image and SDK versions remain pinned.

## Monitoring

Track per-source last success, duration, document count, task failures, Search 503 rate, total searches, zero-result searches, and zero-result ratio. Do not attach raw query, user ID, OIDC subject, email, full IP, cookie, or session ID.

## Rollback

Application rollback uses previous immutable API/web/worker images. Schema migrations are not required by TASK-007R. Never roll back by restoring a database dump from the Git repository.
