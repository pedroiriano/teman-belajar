# Source of Truth Matrix — Teman Belajar

| Domain | Authoritative Source |
|---|---|
| Product identity | `docs/governance/PRODUCT-IDENTITY-NAMING.md` |
| Architecture | Accepted ADR + `docs/canonical/01` dan `04` |
| Requirements | `docs/canonical/02` + `03` |
| Feature ownership | `docs/canonical/05` |
| Post-foundation delivery order/status | `docs/roadmap/POST-TASK-012-EXPANSION-ROADMAP.md` + `tasks/TASK-XXX-*` |
| UI/UX | `docs/canonical/06` |
| UI foundation/theme integration | `docs/design-system/*` |
| Portal data model | `docs/canonical/07` + migrations |
| Public API | `openapi/openapi.yaml` |
| Moodle integration | `docs/canonical/09` |
| Security | `docs/canonical/10` |
| DevSecOps | `docs/canonical/11` |
| Agent rules | `AGENTS.md` + `docs/governance/AI-AGENT-ALIGNMENT.md` + `docs/canonical/12` |
| Gemini context loading | Root `GEMINI.md` adapter; it may not override Agent rules |
| Formal learning state | Moodle |
| Portal/CMS/Knowledge state | Teman Belajar Portal DB |
| Central identity | Keycloak |

No agent may invent a different authoritative source.
