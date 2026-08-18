# Teman Belajar

> **Enterprise Digital Learning Experience Platform (LXP + LMS)**  
> Experience Portal + Knowledge Hub + Moodle Learning Engine + Central SSO + Governed Agentic Engineering

## Product Definition

**Teman Belajar** adalah platform pembelajaran digital terpadu yang menyediakan portal modern, Knowledge Hub, berita, pengumuman, FAQ, galeri, video, course discovery, learning dashboard dan pengalaman belajar terpersonalisasi. **Moodle** dipertahankan sebagai authoritative Learning Management Engine untuk course, enrollment, activity, quiz, assignment, grade, completion, competency, badge, certificate, SCORM, H5P dan fungsi LMS formal lainnya.

## Canonical Architecture

```text
User
 │
 ▼
CDN / WAF / Reverse Proxy
 │
 ├──────────────► Moodle Learning UI
 │
 ▼
Teman Belajar Web (Next.js)
 │
 ▼
Teman Belajar API/BFF (Go)
 │
 ├── Portal PostgreSQL
 ├── Redis
 ├── Search
 ├── MinIO/S3
 ├── Moodle Adapter ─────► Moodle API / Integration Plugin
 └── Keycloak OIDC
```

## Engineering Strategy

- Modular Monolith First
- Selective Microservices only with evidence + accepted ADR
- REST + OpenAPI contract-first
- Separate Portal/Moodle data ownership
- No direct `mdl_*` query
- No Moodle core patch
- Secure-by-design
- Observability-by-default
- Codex/Antigravity work through bounded tasks

## Start Here

1. Read `AGENTS.md`.
2. Gemini users confirm root `GEMINI.md` imports are loaded; all agents then read `00-INDEX.md`.
3. Read relevant canonical docs in `docs/canonical/`.
4. Review ADRs in `docs/adr/`.
5. Start with `tasks/TASK-000-repository-bootstrap.md`.
6. Implement one bounded task at a time.
7. Require tests, contract/docs update, CI and human review.

## Product Naming

See `docs/governance/PRODUCT-IDENTITY-NAMING.md`.

Canonical technical names:
- repository: `teman-belajar`
- API: `teman-belajar-api`
- portal: `teman-belajar-web`
- admin: `teman-belajar-admin`
- worker: `teman-belajar-worker`
- Keycloak realm: `teman-belajar`
- Moodle plugin: `local_temanbelajar`

## Important

Do **not** prompt a coding agent with “build the whole Teman Belajar platform”.
Assign tasks from `tasks/` with explicit Acceptance Criteria and Definition of Done.

## UI/UX Foundations

Teman Belajar menggunakan dua licensed UI template sebagai referensi:

- **Techwind (Tailwind)** → Public Portal + Learner Experience
- **Cuba (Tailwind)** → Admin / Backoffice

Original vendor source diletakkan secara lokal di:
- `vendor/ui-templates/techwind/ORIGINAL/`
- `vendor/ui-templates/cuba/ORIGINAL/`

Implementasi final tetap di:
- `apps/portal-web/`
- `apps/admin-web/`

Baca `docs/design-system/` sebelum mengerjakan UI. Vendor source adalah read-only

## Quick Start / Local Bootstrap

1. Install Docker Desktop with Docker Compose v2.
2. Read `docs/governance/DOCKER-LOCAL-ENVIRONMENT.md`.
3. Create the ignored local environment file and replace every placeholder:
   ```powershell
   Copy-Item infrastructure/docker/.env.example infrastructure/docker/.env
   ```
4. Validate, start, and verify the complete stack:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 config
   powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 up
   powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 verify
   ```
5. Portal, Admin, API, Keycloak, Moodle, MinIO, Redis, and both databases run in Docker. See `infrastructure/docker/README.md` for the canonical URLs and ports.

To stop local infrastructure:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 down
```
