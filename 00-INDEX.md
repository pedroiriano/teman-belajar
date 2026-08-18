# Teman Belajar
## Canonical Documentation Index — v2.0

**Product:** Teman Belajar  
**Repository:** `teman-belajar`  
**Product Type:** Enterprise Digital Learning Experience Platform (LXP + LMS)  
**Architecture:** Composable Experience Portal + Moodle Learning Engine  
**Engineering Model:** Governed Agentic Software Engineering

Dokumen ini adalah peta resmi seluruh artefak arsitektur, product, security, integration, dan engineering **Teman Belajar**.

## 1. Root Files — Wajib Terlihat oleh Agent

| File | Fungsi |
|---|---|
| `README.md` | Identitas, orientasi dan cara mulai proyek |
| `AGENTS.md` | Engineering Constitution; aturan wajib semua agent/developer |
| `GEMINI.md` | Thin Gemini context adapter; mengimpor constitution canonical |
| `00-INDEX.md` | Peta dokumentasi dan hierarki source of truth |
| `REPOSITORY-STRUCTURE.md` | Struktur monorepo final |

## 2. Dokumen Kanonis 01–12

Semua berada di `docs/canonical/`.

| No | Dokumen | Fungsi |
|---|---|---|
| 01 | `01-master-blueprint.md` | North star, scope, prinsip, target architecture |
| 02 | `02-brd-prd.md` | Business Requirement + Product Requirement |
| 03 | `03-srs.md` | Functional & Non-Functional Requirements |
| 04 | `04-system-design-document.md` | Component/runtime/deployment design |
| 05 | `05-feature-catalogue.md` | Feature, priority dan ownership |
| 06 | `06-ui-ux-blueprint.md` | IA, journey, responsive, accessibility, design system |
| 07 | `07-database-design.md` | Data ownership, schema, lifecycle, migration |
| 08 | `08-api-specification.md` | API governance dan contract rules |
| 09 | `09-moodle-integration-specification.md` | Moodle API/plugin/event/SSO integration |
| 10 | `10-security-architecture.md` | IAM, authorization, threat controls, audit |
| 11 | `11-devsecops-infrastructure.md` | CI/CD, environment, observability, backup/DR |
| 12 | `12-agentic-development-playbook.md` | Codex/Antigravity operating model |

## 3. Governance & Machine-Readable Contracts

- `docs/governance/PRODUCT-IDENTITY-NAMING.md`
- `docs/governance/SOURCE-OF-TRUTH.md`
- `docs/governance/THIRD-PARTY-ASSET-REGISTER.md`
- `docs/governance/DOCKER-LOCAL-ENVIRONMENT.md`
- `docs/governance/AI-AGENT-ALIGNMENT.md`
- `docs/adr/ADR-001...ADR-012`
- `docs/diagrams/erd.mmd`
- `openapi/openapi.yaml`
- `tasks/`
- `templates/`


## 3A. UI/UX Design System

- `docs/design-system/README.md`
- `docs/design-system/UI-SOURCE-MAPPING.md`
- `docs/design-system/DESIGN-TOKENS.md`
- `docs/design-system/COMPONENT-INVENTORY.md`
- `docs/design-system/THEME-INTEGRATION-RULES.md`

Vendor references:
- `vendor/ui-templates/techwind/ORIGINAL/`
- `vendor/ui-templates/cuba/ORIGINAL/`

## 4. Canonical Product Identity

- Product Name: **Teman Belajar**
- Repository: `teman-belajar`
- Portal Web: `teman-belajar-web`
- Admin Web: `teman-belajar-admin`
- API: `teman-belajar-api`
- Worker: `teman-belajar-worker`
- Keycloak Realm: `teman-belajar`
- OIDC Clients: `teman-belajar-web`, `teman-belajar-admin`, `teman-belajar-moodle`
- Portal PostgreSQL: `teman_belajar`
- Moodle Integration Plugin: `local_temanbelajar`
- OpenAPI Title: `Teman Belajar API`

Nama lain hanya boleh digunakan bila didefinisikan sebagai component/service, bukan sebagai nama produk.

## 5. Required Read Order for Coding Agents

1. `AGENTS.md`
2. assigned `tasks/TASK-xxx.md`
3. related `docs/canonical/*`
4. relevant `docs/adr/*`
5. `openapi/openapi.yaml` if API touched
6. `docs/diagrams/erd.mmd` + DB canonical doc if data touched
7. existing source and tests
8. `docs/governance/DOCKER-LOCAL-ENVIRONMENT.md` when Docker, ports, environment, or local runtime is touched

## 6. Authority Hierarchy

Jika terjadi konflik:
1. Security/compliance requirement
2. Accepted ADR
3. `AGENTS.md`
4. Canonical documents 01–12
5. OpenAPI / data contract
6. Feature/task specification
7. Existing implementation

Agent tidak boleh menyelesaikan konflik dengan mengubah architecture secara diam-diam.
