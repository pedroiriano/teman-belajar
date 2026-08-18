# Repository Structure — Teman Belajar

```text
teman-belajar/
├── README.md
├── AGENTS.md
├── GEMINI.md
├── 00-INDEX.md
├── REPOSITORY-STRUCTURE.md
├── .gitignore
├── .editorconfig
├── .env.example
│
├── docs/
│   ├── canonical/
│   │   ├── 01-master-blueprint.md
│   │   ├── 02-brd-prd.md
│   │   ├── 03-srs.md
│   │   ├── 04-system-design-document.md
│   │   ├── 05-feature-catalogue.md
│   │   ├── 06-ui-ux-blueprint.md
│   │   ├── 07-database-design.md
│   │   ├── 08-api-specification.md
│   │   ├── 09-moodle-integration-specification.md
│   │   ├── 10-security-architecture.md
│   │   ├── 11-devsecops-infrastructure.md
│   │   └── 12-agentic-development-playbook.md
│   ├── governance/
│   ├── design-system/
│   ├── adr/
│   ├── diagrams/
│   ├── api/
│   ├── runbooks/
│   └── threat-models/
│
├── vendor/
│   └── ui-templates/
│       ├── techwind/
│       │   ├── README.md
│       │   ├── LICENSE-NOTES.md
│       │   └── ORIGINAL/          # local licensed source; Git ignored
│       └── cuba/
│           ├── README.md
│           ├── LICENSE-NOTES.md
│           └── ORIGINAL/          # local licensed source; Git ignored
│
├── openapi/
│   └── openapi.yaml
├── tasks/
├── templates/
│
├── apps/
│   ├── portal-web/               # Next.js, Techwind-derived
│   └── admin-web/                # Next.js, Cuba-derived
├── services/
│   └── portal-api/
├── integrations/
│   └── moodle-plugin/
├── packages/
│   ├── ui/                       # neutral shared primitives only
│   ├── contracts/
│   └── config/
├── infrastructure/
│   ├── docker/
│   ├── keycloak/
│   ├── proxy/
│   ├── observability/
│   └── deployment/
├── scripts/
└── .github/
    ├── workflows/
    └── PULL_REQUEST_TEMPLATE.md
```

## Root Policy

Root hanya berisi orientasi/global governance dan folder utama.

## UI Boundary

- Techwind vendor source → read-only reference → `apps/portal-web`.
- Cuba vendor source → read-only reference → `apps/admin-web`.
- Jangan cross-import theme vendor.
- `packages/ui` bukan tempat menumpuk kedua stylesheet vendor.

## Backend Module Boundary

```text
module/
├── domain/
├── application/
├── ports/
├── adapters/
├── transport/
└── tests/
```

Business logic tidak boleh berada di HTTP handler atau UI component.

## Search Runtime Layout

Unified Search does not own a second Go module. Both runtime commands share the
Portal API module and its contracts/adapters:

```text
services/portal-api/
├── cmd/api/
├── cmd/search-worker/
├── internal/application/search/
├── internal/adapters/search/
├── internal/domain/search/
└── internal/searchindex/
```

The Compose service key remains `search-worker`, while the obsolete
`services/search-worker/` module must not be recreated.
