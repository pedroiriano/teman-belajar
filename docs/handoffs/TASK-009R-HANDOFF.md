# TASK-009R — Release Candidate Repair, Evidence Completion & Canonical Release

## Executive status

- **Task:** `TASK-009R`
- **Status:** **BLOCKED for canonical release**
- **Corrective implementation commit:** `d19a6f9` (`fix(task-009r): close release integrity gaps`)
- **Corrective branch:** `antigravity/task-009r-baseline-integrity-final`
- **Historical RC preserved:** `97f24c93336a09bf3765ce9e247ea64ead680940` remains an ancestor; no history rewrite occurred.
- **Canonical main at audit start:** `1e56fc216b577aea7cf9f18905c2bd6da99e69a8`
- **Release decision:** do not fast-forward `main` until the browser-based Portal/Admin/Moodle login, cross-client SSO, global logout, and Cuba visual gates are executed successfully.
- **Next task:** `TASK-010` is **not ready** and was not started. Do not create `TASK-009S`.

The implementation, static, security, Docker, Keycloak service-account, Moodle
Web Service, analytics, privacy, and degraded-state gates passed. The in-app
browser could not be initialized because the installed Browser plugin rejected
its own `browser-service.mjs` as outside a configured trusted code path. The
Browser skill prohibits replacing that surface with standalone Playwright.
Therefore interactive authentication/logout and visual E2E evidence is
truthfully **NOT VERIFIED**, and the canonical release is blocked.

## Initial Git forensic record

| Item | Observed value |
|---|---|
| Current branch | `antigravity/task-009r-baseline-integrity-final` |
| Local branch HEAD | `5825a7779e672d79d2e3095f8e5a605a78716e35` |
| Remote branch HEAD | `5825a7779e672d79d2e3095f8e5a605a78716e35` |
| `origin/main` | `1e56fc216b577aea7cf9f18905c2bd6da99e69a8` |
| Ahead/behind `origin/main` | ahead 5, behind 0 |
| Worktree/staged/untracked | clean / none / none |
| RC ancestry | `97f24c9` is an ancestor of branch HEAD |

The audit continued on the existing branch. No reset, clean, amend, rebase,
force-push, volume deletion, Moodle core patch, or direct Portal-to-Moodle DB
access was used.

## Repairs completed

### Analytics correctness and source truth

- Repaired invalid Go source and removed the false `MAX(raw_event.created_at)`
  rollup-freshness model.
- Added forward migrations `010_create_analytics_worker_state.sql` and
  `011_add_learning_eligible_enrolments.sql`; released migrations were not
  edited.
- Persisted `last_rollup_success_at`, `last_moodle_sync_success_at`, and
  `last_cleanup_success_at`. Each timestamp advances only after its work
  succeeds.
- Implemented typed `fresh`, `stale`, `empty`, and `unavailable` source states.
- Preserved real Prometheus sample timestamps. No-series, NaN/infinity,
  malformed response, and unavailable states cannot become fake numeric zero.
- Restricted Portal visitor metrics to `portal.page_view`, prevented content
  views from becoming page views, and made page/content rollups remove stale
  rows transactionally.
- Validated auth outcome metadata and aligned SSO, search, content, engagement,
  learning, and page-view aggregation contracts.
- Added the same-cohort `eligible_enrolments` denominator to Moodle, Go, DB,
  OpenAPI, ERD, Admin types, and Admin rendering.

### Moodle integration

- Moodle remains the owner of formal-learning data. Portal uses the versioned
  `local_temanbelajar_get_learning_analytics` Web Service only.
- Updated external API classes to current `core_external` namespaces and made
  the Go client reject Moodle exception envelopes even when `errorcode` is
  absent.
- Plugin upgrade adopts the historical external service only when its component
  is empty, then records canonical `local_temanbelajar` ownership.
- Added idempotent `cli/reconcile_integration.php`. It creates a system-only
  `temanbelajar_analytics_reader` role, grants only
  `local/temanbelajar:viewanalytics`, and assigns it only to external-service
  users. It never grants Site Administrator or Manager.
- Container entrypoint runs plugin upgrade and integration reconciliation.
- Plugin version advanced to `2026082002`.

### Keycloak, RBAC, and Admin user management

- Static realm JSON owns the three interactive clients and ten product roles.
  The idempotent reconciliation script exclusively owns
  `teman-belajar-admin-management`.
- The management client secret is reconciled for both create and update paths.
  Required environment guards fail closed; configured-secret rotation was
  exercised without printing either secret or token.
- Service account and client scope contain exactly `manage-users`,
  `query-users`, and `view-users`; reconciliation explicitly rejects
  `realm-admin` and `manage-realm`.
- Admin runtime no longer receives the Keycloak master password and never uses
  `admin-cli`.
- Admin role APIs expose only the ten canonical product roles, resolve
  authoritative Keycloak role IDs server-side, reject spoofed/non-product role
  names, require `Portal Administrator`, use bounded management calls, and do
  not return raw Keycloak error bodies.
- User creation validates fields, makes the initial password temporary, uses
  opaque actor IDs in structured audit records, and never logs email, username,
  password, token, or secret.

### Docker, runtime, and repository governance

- Canonical Compose project remains `teman-belajar`; service keys are fixed at
  19 and volumes at 11 under accepted architecture. No `container_name` or
  public `0.0.0.0` binding was introduced.
- Host ports and real local values remain in ignored
  `infrastructure/docker/.env`; `.env.example` contains nonblank
  `CHANGE_ME_*` placeholders only.
- Wrapper independently requires the Portal internal secret and management
  client secret, rejects blank/placeholder values, duplicate ports, unsafe DB
  identifiers/passwords, non-loopback binding, and raw-query capture.
- Go build images and `go.mod` use Go `1.26.6`; Portal/Admin remain Next.js
  `16.3.0`, React `19.2.8`, and Node 22.
- Removed two root-level one-off reconciliation helpers. Canonical scripts live
  under `infrastructure/` or the Moodle plugin.
- Updated canonical DB/Moodle docs, ERD, OpenAPI, analytics and observability
  runbooks, Docker guidance, Keycloak guidance, Moodle plugin guidance, and
  agent governance in the same corrective change.

## Runtime evidence

### Docker and migrations

- Wrapper `config` returned exactly 19 governed services.
- Wrapper `up` rebuilt the changed API, migrate, analytics-worker,
  search-worker, Admin, and Moodle images. All runtime services were healthy;
  `migrate` exited `0`.
- Migration ledger ends with:
  - `010_create_analytics_worker_state.sql`
  - `011_add_learning_eligible_enrolments.sql`
- Wrapper `verify` returned HTTP 200 for Portal API, Portal Web, Admin Web,
  Keycloak, Moodle, MinIO, Meilisearch, and Grafana.
- Keycloak reconciliation run 1 and run 2 both passed.

### Keycloak management controls

A temporary evidence client was created and removed through the Keycloak Admin
API. The permanent management service account successfully listed users,
created a synthetic user, set a temporary password, disabled/enabled it,
resolved an available product role, assigned and removed `Learner`, and removed
the synthetic user. The permanent client retained only the three approved
realm-management capabilities. A controlled secret rotation proved the old
configured secret returned 401, reconciliation restored the configured local
secret, and client credentials returned 200. No secret or token was printed.

### Product analytics and engagement

A controlled fixture produced and the Admin Statistics API returned exactly:

| Metric | Expected and observed |
|---|---:|
| Portal page views / unique visitors | 3 / 2 |
| Knowledge views / unique visitors | 2 / 2 |
| Searches / zero-result / result-click | 2 / 1 / 1 |
| Successful / failed login | 1 / 1 |
| Engagement current state during fixture | 3 bookmarks, 2 ratings, average 3.0 |

The engagement fixture used authenticated public APIs: one controlled published
knowledge target, one bookmark, and one rating of 4. Subject-bound list/rating
responses were verified. Bookmark and rating were removed through the public
APIs; the article was archived and then the controlled articles/events were
removed precisely from the Portal-owned local database. Final fixture event,
page rollup, content rollup, and article counts are all zero. Existing
engagement baseline returned to 2 bookmarks and 1 rating.

### Moodle learning analytics

A controlled Moodle fixture created one course and ten genuine active student
enrolments through Moodle APIs. The same inclusive daily period returned:

- active learners: 10;
- learning starts: 10;
- eligible enrolments: 10;
- completions: 4;
- completion rate: 40%;
- top courses: 1.

The exact values passed Moodle Web Service → Go worker → Portal DB → Admin
Statistics API. Cleanup used Moodle's official `delete_course` and
`delete_user` functions, not direct SQL. Final active fixture users and fixture
courses are zero; worker reconciliation restored the current learning snapshot
to `0/0/0/0` and 0%.

### Degraded states

- Prometheus stopped: product analytics remained available and Prometheus source
  became `unavailable`; service recovered healthy.
- Moodle stopped: persisted `10/4` learning snapshot remained available,
  period-live result became null, and Moodle source became `unavailable`;
  service recovered healthy.
- Analytics worker stopped: API health remained `ok`; controlled worker-state
  timestamps older than 15 minutes produced `stale`; restarting the worker
  restored both analytics and Moodle sources to `fresh`.

### Privacy canary

The raw query `TB-PRIVACY-CANARY-009R-7f91d4` was issued exactly once and
returned zero results. It was absent from Portal/Keycloak/Moodle PostgreSQL,
all 19 Docker logs, Prometheus series, Loki's index, and Tempo's index. The
query was not included in analytics event metadata. `TB_SEARCH_CAPTURE_RAW_QUERY`
remained `false`.

## Static, test, and security evidence

| Gate | Result |
|---|---|
| `gofmt` and `git diff --check` | PASS |
| `go test ./...` | PASS |
| `go vet ./...` | PASS |
| `go build ./...` | PASS |
| Portal lint / typecheck / build | PASS |
| Admin lint / typecheck / build | PASS |
| Portal production npm audit | PASS — 0 vulnerabilities |
| Admin production npm audit | PASS — 0 vulnerabilities |
| `govulncheck ./...` | PASS — 0 reachable vulnerabilities |
| `gosec` medium+ | PASS — 0 issues |
| Redocly OpenAPI lint | PASS |
| Moodle PHP lint | PASS for every plugin PHP file |
| Keycloak realm JSON parse | PASS |
| Keycloak/Moodle shell syntax in rebuilt containers | PASS |
| Agent governance verification | PASS |
| Targeted secret-signature scan | PASS |
| Changed-file NUL scan | PASS |
| Temporary-cache/repository hygiene | PASS |

## Browser blocker and non-claims

The required browser connection failed twice with:

`Trusted RPC dependency must resolve within a configured trusted code path: .../browser-service.mjs`

Consequently, the following are **NOT VERIFIED** in this closure:

- interactive Portal login and logout;
- interactive Admin login and logout;
- interactive Moodle login and logout;
- cross-client login propagation in one browser;
- logout from one client terminating all three browser sessions;
- browser-visible Cuba Statistics states, responsive behavior, and visual
  parity;
- browser rejection flow for a spoofed `realm-admin` assignment;
- production/global logout SLO.

Source contracts, builds, Keycloak configuration, service-account operations,
API authorization boundaries, and non-browser runtime paths passed, but they do
not substitute for those browser gates.

## Release gate matrix

| Gate | Status |
|---|---|
| Git forensic / RC preservation | PASS |
| Go test / vet / build | PASS |
| Docker config / up / verify | PASS |
| API internal secret / env placeholders / wrapper preflight | PASS |
| Management client / service account / least privilege | PASS |
| Secret reconciliation / local rotation | PASS |
| Reconciliation run 1 / run 2 | PASS / PASS |
| Ten-role catalogue / managed allowlist | PASS |
| Privilege escalation | BLOCKED by server allowlist and least privilege; browser proof NOT VERIFIED |
| Auth contract / outcome aggregation | PASS |
| Portal/Admin/Moodle browser logout | NOT VERIFIED |
| Full auth E2E | NOT VERIFIED |
| Pageview double count | NONE |
| Portal unique visitors | PASS |
| Content / search / engagement E2E | PASS |
| Real rollup / Moodle sync freshness | PASS |
| Prometheus observed-at / no-data semantics | PASS |
| Active learner / period active learner / completion rate | PASS |
| Learning Moodle→WS→worker→DB→Admin API | PASS |
| Cuba Statistics source/data implementation | PASS static/API; visual NOT VERIFIED |
| Degraded states | PASS |
| Keycloak non-browser management E2E | PASS |
| Moodle analytics E2E | PASS |
| Security / privacy / secret scan | PASS |
| Repository hygiene | PASS |
| Moodle fresh install on empty volume | NOT VERIFIED — volume deletion was forbidden |
| Production global SLO | NOT VERIFIED |
| Production credential rotation | HUMAN FOLLOW-UP REQUIRED |

## Canonical release decision

- **Branch push:** authorized and required after this handoff commit.
- **Main push:** **NOT PERFORMED** while browser gates remain unverified.
- **CI:** must be read from GitHub after branch push; do not infer it from local
  checks.
- **Remote SHA/content:** must be verified after branch push.
- **TASK-010 readiness:** **NOT READY**.
- **Human decision required:** repair/reinstall the Browser plugin trusted-path
  configuration, execute the listed browser gates, and only then decide whether
  to fast-forward `main`.

STOP. DO NOT IMPLEMENT TASK-010.
