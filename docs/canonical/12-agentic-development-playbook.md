# 12 — Agentic Development Playbook
## Codex / Antigravity Operating Model

**Product:** Teman Belajar  
**Repository:** `teman-belajar`  
**Product Type:** Enterprise Digital Learning Experience Platform (LXP + LMS)

**Status:** Canonical  
**Version:** 1.0

## 1. Principle

AI agent adalah engineering accelerator, bukan architecture authority.

Agent tidak menerima prompt “bangun semua”. Agent menerima **bounded task** dengan:
- context;
- objective;
- in scope;
- out of scope;
- dependencies;
- acceptance criteria;
- tests;
- security constraints;
- documentation impact;
- Definition of Done.

## 2. Agent Roles

### Architecture Agent
Analisis impact dan ADR draft. Tidak mengubah architecture otomatis.

### Backend Agent
Go domain/application/API implementation.

### Frontend Agent
Next.js/UI implementation sesuai design system.

### Data Agent
Migration, repository, indexing dan data tests.

### Moodle Integration Agent
Adapter/plugin, mapping, sync, event.

### Security Agent
Threat review, authz, CI security gates.

### QA Agent
Test plan, integration/E2E, regression.

### DevOps Agent
CI/CD, container, observability, deployment automation.

## 3. Required Read Order

Sebelum task:
1. `AGENTS.md`
2. task file
3. related canonical docs
4. relevant ADR
5. OpenAPI/ERD
6. existing code/tests

## 4. Standard Agent Loop

```text
READ
↓
INSPECT
↓
PLAN
↓
IMPLEMENT SMALL
↓
TEST
↓
SELF-REVIEW
↓
DOCUMENT
↓
PR
```

## 5. Forbidden Agent Behaviors

Tanpa explicit human approval agent dilarang:
- mengubah architecture;
- mengganti core technology;
- patch Moodle core;
- query Moodle DB;
- disable security scanning;
- store secret;
- force push protected branch;
- destructive production migration;
- broad refactor unrelated to task;
- add dependency tanpa justification;
- loosen authorization agar test lewat.

## 6. Task Granularity

Good:
> Implement endpoint GET `/api/v1/news` sesuai OpenAPI, repository PostgreSQL, pagination, unit/integration tests.

Bad:
> Buat backend portal enterprise.

## 7. Acceptance Criteria Standard

AC harus:
- observable;
- binary/testable;
- menyebut auth requirement;
- menyebut error behavior;
- menyebut data side effect;
- menyebut degraded behavior bila external dependency.

Contoh:
- Given published news, when GET `/api/v1/news?page=1`, then 200 dengan pagination contract.
- Unpublished news tidak muncul pada endpoint public.
- Invalid page size > max menghasilkan 422.
- Trace ID tersedia pada error.

## 8. Definition of Done

Task selesai hanya jika:
- implementation sesuai scope;
- tests pass;
- lint/typecheck pass;
- relevant security checks pass;
- migration reversible/safe;
- OpenAPI updated bila API berubah;
- ERD/data docs updated bila data berubah;
- ADR updated bila architectural decision berubah;
- logs/metrics added bila operationally relevant;
- no unresolved TODO critical;
- PR description berisi verification evidence.

## 9. Human Approval Gates

Human approval wajib untuk:
- ADR acceptance;
- public breaking API;
- role/permission model;
- production migration destructive;
- security exception;
- new infrastructure dependency;
- Moodle version upgrade;
- production release.

## 10. Agent Handoff Contract

Agent summary harus menyebut:
- files changed;
- behavior added;
- tests run;
- known limitations;
- migration/config requirement;
- security consideration;
- follow-up task bila ada.

## 11. Codex/Antigravity Neutrality

Repository tidak boleh bergantung pada prompt syntax proprietary. Source of truth:
- Markdown docs;
- AGENTS.md;
- OpenAPI;
- migrations;
- tests;
- ADR.

Dengan demikian Codex, Antigravity, atau developer manusia mengikuti aturan yang sama.

Gemini mengikuti aturan yang sama melalui root `GEMINI.md`, yang hanya mengimpor
`AGENTS.md` dan governance alignment. Tool-specific memory/context tidak boleh
menjadi source of truth baru. Gate `scripts/verify-agent-governance.ps1` menjaga
adaptor, authority, dan struktur governance tetap konsisten.

## 12. Quality Gate

Agent output dianggap proposal sampai CI + review selesai.

`green CI != auto-approved architecture`.

## 13. UI Adaptation Agent Workflow

Untuk task UI:
1. Baca `docs/design-system/*`.
2. Inspect vendor reference yang sesuai.
3. Inventaris komponen yang relevan.
4. Pilih minimum source pattern yang dibutuhkan.
5. Adapt ke product component, jangan edit `ORIGINAL/`.
6. Ganti vendor/demo branding dan data.
7. Apply Teman Belajar tokens.
8. Verify mobile + keyboard + accessibility.
9. Remove unused dependencies/assets.
10. Catat mapping vendor → product pada PR.
