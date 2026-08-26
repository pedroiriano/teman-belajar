# AI Agent Alignment — Teman Belajar

**Status:** Canonical Governance

**Applies to:** Gemini CLI/AI Pro, Codex/ChatGPT, Antigravity, and human contributors
**Primary constitution:** `AGENTS.md`

## 1. One Constitution

All assistants use the same repository authority. `GEMINI.md` is only a loader
for `AGENTS.md` and this document. Tool-specific context may explain how to load
the rules, but may not redefine product identity, architecture, security,
folder structure, ports, workflow, acceptance criteria, or source ownership.

Do not create nested `GEMINI.md`, `AGENTS.md`, hidden prompt files, memories, or
generated policies that silently override root governance. A scoped exception
requires a documented human decision and an accepted governance change.

## 2. Mandatory Read and Preflight

Before every change:

1. read root `AGENTS.md`, the assigned task, and the latest relevant handoff;
2. read the canonical documents and accepted ADRs for the touched domains;
3. read OpenAPI before API changes and migration/ERD rules before data changes;
4. read `docs/design-system/*` before UI changes;
5. read Docker governance before environment, port, service, or image changes;
6. run `git status --short --branch` and preserve user/unrelated changes;
7. inspect actual source, tests, runtime configuration, and existing conventions;
8. state a bounded plan with explicit in-scope and out-of-scope work.

For Gemini CLI, `/memory show` must display the root adapter imports. Use
`/memory reload` after changing governance. Do not use persistent memory as a
replacement for committed canonical documentation.

## 3. Authority and Conflict Resolution

Resolve claims in this order:

1. actual runtime/source/database/test/browser/Git/remote evidence;
2. security and compliance requirements;
3. accepted ADRs and `AGENTS.md`;
4. canonical documents 01–12 and governance;
5. OpenAPI, migrations, ERD, and design-system contracts;
6. current task and latest corrective handoff;
7. historical handoffs and comments.

If two higher authorities conflict, stop and request a human decision. Never
resolve the conflict by editing architecture, weakening security, or inventing
a new convention.

## 4. Repository and Structure Invariants

- Root orientation/governance stays in root; implementation stays under the
  canonical application/service/integration/infrastructure directories.
- Go backend remains a modular monolith with transport → application → domain →
  ports/adapters separation. Business logic does not move into handlers.
- Do not add a microservice, duplicate Go module, generic proxy, new global UI
  theme, or arbitrary top-level folder without accepted authority.
- Portal UI uses Techwind-derived product components only; Admin uses
  Cuba-derived product components only. Vendor `ORIGINAL/` is read-only/local.
- Cuba Admin uses bright sky/light blue in both themes and forbids orange/amber
  across all application-controlled states. Agents must run the canonical
  theme and no-orange guards; warning uses yellow, not an orange substitute.
- Application-controlled Portal/Admin copy follows
  `docs/governance/UI-LANGUAGE-TERMINOLOGY.md`. Agents update that single
  glossary and run the one root language guard; never translate routes, schema
  fields, roles, event names, or code identifiers.
- Admin data listings reuse the Cuba-derived table/pagination components and
  existing server-side paging where available; do not fetch unbounded datasets
  merely to paginate in the browser.
- Shared packages contain neutral contracts/primitives, not mixed vendor themes.
- A new route/menu must have real authorized behavior; otherwise mark it
  `Segera` or omit it.
- Generated files and temporary evidence stay ignored and reproducible.

When actual structure changes legitimately, update `REPOSITORY-STRUCTURE.md`,
the relevant canonical mapping, tests, and handoff in the same change.

## 5. Security and Data Rules

- Never read, print, log, paste, screenshot, commit, or transmit secrets.
- Never place credentials in `NEXT_PUBLIC_*`, URLs, source, docs, fixtures, or
  browser state. Browser clients never receive provider tokens.
- Authentication comes from validated Keycloak/OIDC state; authorization and
  object ownership are enforced server-side. Never accept actor/user identity
  from browser payload or query parameters.
- Validate all untrusted inputs with typed allowlists, bounds, and strict IDs.
- Portal PostgreSQL owns Portal/Engagement; Moodle owns formal learning; Search
  is disposable derived discovery data; MinIO owns media binary.
- Never query Moodle tables directly, modify Moodle core, treat Search/cache as
  authority, fingerprint guests, or expose another user's personal state.
- Personal responses use private/no-store semantics. Logs exclude subject,
  email, tokens, raw personal history, and raw search query.
- Notification delivery is in-app first, idempotent, subject-partitioned, and
  limited to validated internal links. Email, SMS, push providers, and a new
  notification service require separate human/architecture approval.
- Do not disable authentication, health checks, validation, tests, audit, or
  security scans to obtain a green result.

## 6. Configuration and Docker Rules

- Docker project is `teman-belajar`; service keys, internal DNS/ports, network,
  and volume ownership follow `DOCKER-LOCAL-ENVIRONMENT.md`.
- Published ports come only from ignored `infrastructure/docker/.env`, bind to
  `127.0.0.1` by default, and must be unique.
- Do not add `container_name`, hard-coded secrets/ports, fallback credentials,
  or unpinned `latest` runtime images.
- Use `teman-belajar-docker.ps1`. Never use project-wide prune, volume deletion,
  `down -v`, or major datastore/image migration without explicit approval,
  backup evidence, rollback, and invariant verification.

## 7. Implementation Discipline

- Work on one bounded task and keep diffs task-scoped.
- Inspect before editing; use existing interfaces and conventions.
- API changes are contract-first and include handler/domain tests.
- Database changes use the next sequential forward-only migration and update ERD.
- UI behavior includes loading, empty, error, unauthorized, disabled, keyboard,
  mobile, light/dark, and reduced-motion states where applicable.
- Dependencies require necessity, version alignment, lockfile update, audit, and
  documentation. Do not perform an unrelated major upgrade.
- Do not touch commercial originals, local recovery material, backups, dumps,
  ignored environments, or unrelated user work.

## 8. Git and Release Rules

- Normal work uses a task branch from verified `origin/main`.
- Fetch first; do not reset, discard, or overwrite divergent/user work.
- Review `git status`, unstaged diff, staged diff, and `diff --check`.
- Stage intended files explicitly; never stage secrets, vendor originals,
  backups, dumps, recordings, cookies, sessions, or temporary output.
- No history rewrite, force-push, ref deletion, reflog expiry, or garbage
  collection without new task-specific human approval.
- Release through fast-forward and normal push, then verify local/remote SHA and
  factual CI state. A green CI result does not approve architecture.

## 9. Evidence and Honesty

Only report PASS for a command or behavior actually observed. Source review,
build, unit test, container health, browser interaction, remote push, and CI are
different evidence classes and must not be substituted for one another.

If credentials/tooling/runtime are unavailable, record the exact bounded gap as
`HUMAN QA REQUIRED` or `NOT VERIFIED`; do not bypass security or fabricate PASS.

## 10. Stop Conditions

Stop and request a human decision when any of these occurs:

- architecture/framework/service boundary change outside an accepted ADR;
- destructive migration, volume deletion, production action, or major upgrade;
- permission/security weakening, public breaking API, or secret exposure;
- ambiguous identity/data owner, direct Moodle DB need, or Search-as-authority;
- dirty/diverged work that cannot be preserved safely;
- release requires force-push or history rewrite;
- required test/invariant repeatedly fails and the safe fix expands scope;
- loaded Gemini context omits/conflicts with root canonical governance.

## 11. Strict Task Prompt Contract

Every AI task should define:

```text
TASK: one bounded objective
BASELINE: expected branch/SHA and latest handoff
MANDATORY READ: exact governance/task/contract files
SCOPE ALLOWED: exact domains/files/behaviors
SCOPE FORBIDDEN: unrelated refactor and destructive/security exceptions
PRESERVE: user work, data owners, ports, volumes, vendor/recovery material
ACCEPTANCE CRITERIA: observable binary outcomes
MANDATORY VERIFY: tests/build/security/runtime/browser/Git as applicable
DOCUMENTATION: canonical files and handoff to update
RELEASE: branch, fast-forward, normal push, remote/CI verification
STOP CONDITIONS: decisions requiring human authority
OUTPUT: factual status, files, commands/results, gaps, rollback/next safe step
```

Reject vague instructions such as “clean everything” until scope and stop
conditions are bounded by repository authority.

## 12. Expansion Roadmap Discipline

For TASK-013–024, Codex, Antigravity/Gemini, humans, and future agents must:

1. read `docs/roadmap/POST-TASK-012-EXPANSION-ROADMAP.md`, the individual task,
   and all sources required by `AGENTS.md` before editing;
2. treat task numbers as stable identifiers, resolve actual dependency gates,
   and never start a dependent task from an incomplete placeholder;
3. use one bounded task per branch/PR and never batch the entire roadmap;
4. preserve Moodle/Portal/Keycloak data ownership and finalized identity
   boundaries; UI presence never changes backend authority;
5. keep `PLANNED` and `Segera` features inactive until implementation, authz,
   states, tests, docs, browser acceptance, and merge are complete;
6. stop for the human decisions listed by the roadmap/task instead of selecting
   providers, retention, sensitive data, secrets, roles, or production actions;
7. use TASK-024 only for expansion delta evidence and retain every unresolved
   TASK-012 `PRODUCTION HOLD` decision.

Agents must update the task registry and roadmap status factually in the same PR
that changes delivery state. A green check does not authorize merge, production
deployment, secret rotation, or a protected-branch bypass.
