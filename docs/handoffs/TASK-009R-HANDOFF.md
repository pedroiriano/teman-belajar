# TASK-009R — Release Candidate Repair, Evidence Completion & Canonical Release

## Executive status

- **Task:** `TASK-009R`
- **Status:** **LOCAL RELEASE ACCEPTANCE COMPLETE — corrective branch published**
- **Corrective baseline commit:** `d19a6f9` (`fix(task-009r): close release integrity gaps`)
- **Current continuation:** corrective worktree on the same branch; all mandatory local browser, static, security, runtime, and fixture-cleanup gates now pass.
- **Corrective branch:** `antigravity/task-009r-baseline-integrity-final`
- **Historical RC preserved:** `97f24c93336a09bf3765ce9e247ea64ead680940` remains an ancestor; no history rewrite occurred.
- **Canonical main at audit start:** `1e56fc216b577aea7cf9f18905c2bd6da99e69a8`
- **Release decision:** the corrective branch was committed, pushed by fast-forward,
  and verified remotely. Any `main` promotion remains a separate PR/CI decision.
- **Next task:** `TASK-010` was not started in this change. Do not create `TASK-009S`.

The former Browser trusted-path blocker has been resolved. Portal/Admin visual,
Statistics, User Management, learner/editor/reviewer RBAC, temporary-password
activation, and SSO now have direct browser evidence. Pedro's explicit Moodle
entitlement and the deterministic three-direction global logout chain passed in
one browser. All synthetic QA users were removed through the official Keycloak
Admin API and their absence was rechecked in Web Admin. Production/global SLO
remains outside local evidence.

## 2026-08-20 continuation — authoritative record

This section supersedes the earlier browser-blocker conclusion while preserving
the historical evidence below. All changes remain on
`antigravity/task-009r-baseline-integrity-final`; no commit, push, main
fast-forward, history rewrite, volume deletion, direct Moodle DB query, or
Moodle core modification has been performed during this continuation.

### Human-approved Moodle administrator exception

Browser acceptance proved that `Pedro Administrator` could access
`/admin/user.php` and system-role administration through a historical Moodle
`Manager` assignment even though the recovery account was already the sole
entry in `siteadmins`. This was treated as a real privilege-path defect, not a
pass.

The human owner then explicitly required Pedro to remain a Moodle administrator
because Pedro is the Super Admin of Web Admin, and explicitly approved the
dedicated entitlement with the exact statement:

`Setujui role Moodle Administrator khusus untuk pedro.`

The governed implementation does **not** infer Moodle authority from Web Admin:

1. Keycloak username must equal the exact environment allowlist
   `TB_MOODLE_FEDERATED_ADMIN_USER=pedro`.
2. The fresh Moodle OIDC login must carry the dedicated canonical product role
   `LMS Administrator` in claim `teman_belajar_roles`.
3. `Portal Administrator` and `Super Administrator` alone never grant Moodle
   Site Administrator.
4. The Moodle account must be active and have an official OAuth2 linked-login
   record.
5. The local `manual` recovery administrator remains separate and is never
   linked to Keycloak.
6. Maximum approved Moodle Site Administrators are the local recovery account
   plus the one exact configured federated account.
7. Removal of `LMS Administrator` revokes a stale Site Administrator grant on
   the next federated login; sensitive role removal must also terminate active
   sessions operationally.

The `LMS Administrator` role was assigned to Keycloak user `pedro` through the
Web Admin User Management UI. User ID and secrets are not duplicated in source.

### Keycloak claim and reconciliation contract

- Static realm JSON describes `LMS Administrator` as an explicit Moodle Site
  Administrator entitlement that is never implied by Portal Administrator.
- Moodle client `teman-belajar-moodle` owns protocol mapper
  `teman-belajar-realm-roles` using Keycloak's realm-role mapper.
- The mapper emits only the dedicated multivalued claim
  `teman_belajar_roles` to user-info, ID token, and access token.
- `reconcile-sso-clients.sh` creates or updates the mapper idempotently for an
  already-imported realm. It uses Bash built-ins only; an initial use of `awk`
  failed because the minimal Keycloak image does not contain it and was replaced
  without adding packages.
- Wrapper `sso` passed and reported all three SSO clients, the Moodle mapper,
  and the least-privilege management client as PASS.

### Moodle privilege reconciliation

Plugin `local_temanbelajar` advanced through `2026082011`.

- Recovery identity is resolved from exact configured username, not the first
  item in `get_admins()`.
- A missing recovery account is recreated through Moodle user APIs; an active
  local manual Site Administrator owning the configured recovery email may be
  safely adopted instead of duplicated.
- Recovery email and username drift are repaired without printing the injected
  password.
- OAuth2 links are removed from recovery and prohibited administrators, while
  the approved Pedro OAuth2 link is preserved.
- Startup reconciliation writes only the approved Site Administrator IDs.
- Every system-context role assignment whose role archetype is `manager` is
  removed from non-recovery users. Pedro's Moodle authority therefore comes
  from the explicit Site Administrator entitlement, not residual Manager
  capability.
- Component-owned least-privilege roles, including analytics reader and the
  integration API role, are preserved.
- Runtime observer grants the approved Site Administrator only when both exact
  username and dedicated claim match. Other federated Site Administrator or
  Manager-equivalent logins fail closed and their privileged session is
  destroyed.
- Regression coverage checks local recovery login, prohibited federated Site
  Administrator, system Manager drift, recovery identity restoration, and that
  `Portal Administrator` cannot substitute for `LMS Administrator`.

Observed reconciliation evidence before the signed-bridge increment:

```text
Teman Belajar integration capability reconciled for 1 service user(s).
Moodle recovery administrator account reconciled; created 0 local account(s).
Moodle recovery administrator drift reconciled; adopted 0 local account(s).
Moodle recovery administrator identity reconciled; removed 0 prohibited federated link(s).
Moodle Site Administrator boundary reconciled; removed 0 non-recovery assignment(s).
Moodle federated administrator boundary reconciled; approved 1 explicit account(s).
Moodle system Manager boundary reconciled; removed 0 non-recovery assignment(s).
```

A browser reload of Moodle `Assign system roles` subsequently showed
`Manager 0`; the least-privilege integration roles remained assigned only to
`System Integration`.

### Signed top-level global-logout bridge

Direct browser evidence for the pre-bridge Admin logout was:

- Admin local session cleared: PASS.
- Portal protected route returned to sign-in: PASS.
- Moodle session remained logged in as Pedro: **FAIL**.

Root cause: Keycloak sends front-channel logout in a cross-origin iframe, while
Moodle's session cookie is `SameSite=Lax`; browsers may omit or refuse to expire
that third-party cookie. The iframe receiver remains as defense-in-depth, but it
is not accepted as the sole logout mechanism.

Portal and Admin initiated logout now use this sequence:

1. A valid server-side NextAuth session is required before generating a bridge
   request.
2. The application constructs its own fixed return URL ending in
   `/api/auth/federated-logout?bridge=1`; arbitrary return URLs are impossible.
3. The request is signed with HMAC-SHA256 using a dedicated random secret,
   timestamped, and given a random nonce.
4. The browser first navigates top-level to the counterpart application's
   `/api/auth/logout-bridge`. That route verifies the outer signed request,
   verifies the nested Moodle request, requires the exact initiator final URL,
   expires every counterpart NextAuth cookie chunk, and returns HTTP 303.
5. The browser then navigates top-level to
   `/local/temanbelajar/logout_bridge.php`, so the first-party Moodle session
   cookie is available.
6. Moodle accepts only the two exact Portal/Admin return URLs, a signature made
   with the dedicated secret, and a timestamp no older/newer than 60 seconds.
7. Moodle logs out and expires its cookie, then returns with HTTP 303.
8. The initiating Portal/Admin expires all local NextAuth cookie chunks and
   starts Keycloak RP logout. Keycloak front-channel receivers remain as
   defense in depth; the deterministic chain no longer depends on them to clear
   the counterpart web session.

First browser execution correctly failed closed because `req.nextUrl.origin`
resolved to the standalone Next.js container hostname instead of the governed
public origin. The implementation was corrected to construct the return URL
only from required `NEXTAUTH_URL`; the Moodle exact allowlist was not weakened.

The corrected single-Moodle-bridge implementation then passed Admin-initiated
logout for Admin, Portal, and Moodle, but Portal-initiated logout cleared Portal
and Moodle while leaving Admin authenticated. This second browser failure proved
that the Admin NextAuth cookie was also unreliable in the Keycloak cross-origin
front-channel iframe. The deterministic counterpart-web hop above was added;
`ADMIN_PUBLIC_BASE_URL` and `PORTAL_PUBLIC_BASE_URL` come only from the governed
Compose URLs. Both web routes reject duplicate/extra parameters, invalid or
expired HMAC, unexpected Moodle origin/path, and any nested final URL other than
the exact initiating route.

`TB_SSO_LOGOUT_BRIDGE_SECRET` is a new required value. The committed
`.env.example` contains only a placeholder; the ignored local `.env` contains a
new cryptographically random 48-byte value generated without printing it. It is
not reused from NextAuth, OIDC client, Moodle recovery, management-client, or
Portal internal secrets. Moodle stores the injected value only in its protected
runtime `config.php` (`0640`). Invalid signature, expired timestamp, or
non-allowlisted return URL fails closed with HTTP 400.

### Additional corrective work in the continuation

- Portal API authentication middleware now returns 503 when the verifier is
  unavailable instead of silently accepting requests; regression test added.
- Admin server-side Keycloak access-token refresh was repaired; Statistics data
  recovered without exposing bearer tokens to the public session.
- Portal/Admin JWT sessions no longer persist raw ID tokens. Admin uses its
  dedicated session-cookie namespace; cookie chunk expiry and front-channel
  expiry were corrected.
- Moodle Apache local header limits were raised only to the bounded value needed
  for OIDC responses.
- User Management now supports profile edit with immediate path revalidation;
  role and enable/disable mutations also render immediately without hard refresh.
- A User Management contract verifier was added.
- Portal/Admin Alpine Docker builds install synchronized optional dependencies
  explicitly with Linux x64 musl `npm ci`, preventing SWC reproducibility drift.
- Admin form controls were normalized for light/dark contrast. Cuba Admin dark
  primary/action/accent remains the governed bright light-blue palette; orange
  and vendor violet are forbidden by `AGENTS.md` and design-token documentation.

### Browser evidence completed in the continuation

- Admin Statistics: all sections, values, source badges, and no fake invalid
  numeric state — PASS.
- Cuba light/dark mode, narrow layout, no horizontal overflow, drawer open,
  Escape close, and focus restoration — PASS.
- User Management list, create, detail, profile edit, status toggle, and role
  assignment immediate rendering — PASS.
- Content Editor first login required `UPDATE_PASSWORD`, accepted the generated
  replacement password, and then rendered the protected knowledge-create form
  — PASS.
- Reviewer first login required `UPDATE_PASSWORD` and completed activation —
  PASS. A controlled knowledge-create submission was rejected server-side with
  `Content Editor role required`; no content was created.
- Reviewer User Management detail rendered profile fields and role controls as
  disabled, with no mutation actions — PASS.
- Reviewer UI least privilege after the corrective guard: knowledge/news/
  announcement create routes render an explicit access-denied state; the
  dashboard hides the create CTA; Media Library does not render the uploader
  and labels read-only navigation as `Lihat` — PASS.
- Learner Portal access — PASS.
- Learner Moodle SSO as `John Learner`, no Site Administration — PASS.
- Learner direct Moodle `/admin/search.php` denial — PASS.
- Learner direct Web Admin User Management denial (403) — PASS.
- Fresh baseline logout state for Portal, Admin, and Moodle — PASS.
- Admin-to-Portal silent SSO and Portal-to-Admin shared Keycloak session — PASS.
- Pre-bridge Admin logout cleared Admin and Portal but left Moodle — FAIL,
  corrected by the first signed bridge.
- Admin-initiated logout through the first signed bridge cleared Admin, Portal,
  and Moodle — PASS.
- Portal-initiated logout through the first signed bridge cleared Portal and
  Moodle but left Admin authenticated — FAIL; corrected by the deterministic
  counterpart-web bridge.
- Portal-initiated logout through the final counterpart-web -> Moodle -> Portal
  -> Keycloak chain: **PASS**. After confirmation, protected Portal
  `/my-learning` rendered Keycloak sign-in, protected Admin `/dashboard`
  rendered Keycloak sign-in, and Moodle `/` visibly reported guest access.
- Admin-initiated logout through the final counterpart-web -> Moodle -> Admin
  -> Keycloak chain: **PASS**. Before logout, Portal `/my-learning`, Admin
  `/dashboard`, and Moodle `/` visibly identified Pedro. After confirmation,
  both protected web routes rendered Keycloak sign-in and Moodle visibly
  reported guest access.
- Moodle-initiated RP logout using Keycloak front-channel alone: **FAIL**.
  Moodle visibly returned to guest access, but protected Portal `/my-learning`
  and Admin `/dashboard` still rendered Pedro. The same third-party iframe
  cookie limitation applies to both NextAuth clients.

The Moodle observer now builds a short-lived HMAC chain without putting tokens
or identity data in the URL: Moodle local logout -> signed Portal
`/api/auth/moodle-logout-bridge` -> signed Admin
`/api/auth/moodle-logout-bridge` -> exact Keycloak Moodle-client RP logout.
Portal verifies both signed envelopes and the exact Admin/Keycloak hops; Admin
verifies its signed envelope and the exact Keycloak hop. Each application
expires its own cookie chunks first-party before HTTP 303. Plugin version
`2026082011` records this behavior without a schema/capability change.

Regression after rebuilding `2026082011`: **PASS**. Before logout, Moodle
visibly identified Pedro Administrator, Portal `/my-learning` displayed
`Halo, Pedro!`, and Admin `/dashboard` displayed `Selamat datang, Pedro`.
Logout through Moodle's visible user-menu action traversed the signed Portal and
Admin hops and reached the exact Keycloak Moodle-client confirmation. After
confirmation, Moodle visibly reported guest access, Portal `/my-learning`
rendered Keycloak sign-in, and Admin `/dashboard` rendered Keycloak sign-in.
This completes browser evidence for Portal-, Admin-, and Moodle-initiated global
logout in one browser.

### Static and runtime evidence added

- Portal lint and typecheck after the counterpart-web bridge: PASS.
- Admin lint and typecheck after the counterpart-web bridge: PASS.
- Unsigned requests to both web `/api/auth/logout-bridge` routes: HTTP 400
  fail-closed PASS.
- Unsigned requests to both web `/api/auth/moodle-logout-bridge` routes: HTTP
  400 fail-closed PASS.
- No-cache-equivalent Docker build stages ran Portal/Admin lint, typecheck, and
  Next.js 16.3.0 production build: PASS.
- Keycloak realm JSON parse: PASS.
- `git diff --check`: PASS (line-ending warnings only).
- Wrapper `config`: PASS with exactly the 19 governed service keys.
- Wrapper `up` after the counterpart-web bridge: PASS; all 18 long-running
  services are healthy/running as applicable and `migrate` exited 0.
- Keycloak SSO/client/mapper reconciliation: PASS.
- Portal/Admin production npm audits after final browser acceptance: 0
  vulnerabilities.
- Go test and vet after final browser acceptance: PASS; medium+ gosec scanned 52
  files/7,887 lines with 0 issues.
- Full plugin PHP lint after `2026082011`: PASS.
- Agent governance verifier: PASS.
- High-confidence secret-pattern scan excluding ignored local environment and
  licensed vendor archive: PASS.
- Final wrapper `verify`: PASS; all eight endpoint checks returned HTTP 200,
  runtime services were healthy/running as applicable, and `migrate` remained
  `Exited (0)`.

### Final QA fixture cleanup

The exact synthetic users `qa009r5429514`, `qaed249599206`, and
`qarv249599206` were resolved by immutable Keycloak user ID, rechecked against
their expected usernames, and deleted through the official Keycloak Admin API
using the governed least-privilege management client. No database was queried
or modified directly. A second Admin API query returned zero matching fixtures,
and a fresh Web Admin browser view showed only the three canonical local users
with no QA username present.

### Remaining non-local follow-up

1. Open a PR to `main` only when separately authorized. The repository CI
   workflow triggers only for a PR to `main` or a push to `main`; therefore the
   corrective branch push alone correctly produced no CI run.
2. Merge or fast-forward `main` only after the PR-triggered CI is green.
3. Execute production SLO verification and production credential rotation in
   the authorized production change process.

Production global logout SLO is still **NOT VERIFIED** by localhost acceptance.

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
  users. That analytics role never grants Site Administrator or Manager; the
  later approved Pedro entitlement is a separate exact-username-plus-claim path.
- Container entrypoint runs plugin upgrade and integration reconciliation.
- Plugin version ultimately advanced to `2026082011` during the continuation.

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

## Historical browser blocker — superseded

The earlier trusted-path error is retained as historical evidence only. Browser
control was later restored and the authoritative completion/pending matrix is in
the 2026-08-20 continuation section above. Production/global logout SLO remains
unverified; localhost evidence must never be presented as production evidence.

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
| Privilege escalation | Learner denial PASS; Pedro explicit LMS entitlement and fresh-token Site Administrator proof PASS |
| Auth contract / outcome aggregation | PASS |
| Portal/Admin/Moodle browser logout | PASS in all three initiation directions through signed top-level chains |
| Full auth E2E | PASS — learner, Content Editor, Reviewer, Portal Administrator, temporary-password activation, shared SSO, and global logout |
| Pageview double count | NONE |
| Portal unique visitors | PASS |
| Content / search / engagement E2E | PASS |
| Real rollup / Moodle sync freshness | PASS |
| Prometheus observed-at / no-data semantics | PASS |
| Active learner / period active learner / completion rate | PASS |
| Learning Moodle→WS→worker→DB→Admin API | PASS |
| Cuba Statistics source/data implementation | PASS static/API/browser visual |
| Degraded states | PASS |
| Keycloak non-browser management E2E | PASS |
| Moodle analytics E2E | PASS |
| Security / privacy / secret scan | PASS |
| Repository hygiene | PASS |
| Moodle fresh install on empty volume | NOT VERIFIED — volume deletion was forbidden |
| Production global SLO | NOT VERIFIED |
| Production credential rotation | HUMAN FOLLOW-UP REQUIRED |

## Canonical release decision

- **Branch push:** **PERFORMED** by fast-forward after all local browser/static
  gates and fixture cleanup passed; the remote branch SHA was verified.
- **Main push:** **NOT PERFORMED** in this corrective worktree; require remote
  branch/CI verification before a fast-forward decision.
- **CI:** no run was expected or present for the branch push because `CI
  Baseline` triggers only on a PR to `main` or push to `main`; do not infer a
  remote CI pass from local checks.
- **Remote SHA/content:** verified after branch push.
- **TASK-010 readiness:** locally ready only after the branch is published and
  remote CI is verified; TASK-010 itself was not started here.
- **Human action required:** none for local TASK-009R acceptance. Production SLO,
  production rotation, and any `main` promotion remain separately controlled.

STOP. DO NOT IMPLEMENT TASK-010.
