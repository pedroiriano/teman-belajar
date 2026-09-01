# Engineering Handoffs

This directory contains the engineering handoff reports for each completed task in the Teman Belajar project.
A handoff report provides a summary of what was accomplished, verification results, and technical notes for developers picking up the next task.

## Directory Structure
- `TASK-XXX-HANDOFF.md`: The handoff report for a specific bounded task.

## Authority Rule

Handoff adalah catatan historis, bukan source of truth yang berdiri sendiri. Untuk Docker lokal, selalu baca `docs/governance/DOCKER-LOCAL-ENVIRONMENT.md` dan handoff terbaru. Nama/perintah Docker pada handoff lama dianggap superseded bila berbeda dari registry kanonis.

Untuk perubahan UI, `docs/design-system/*` adalah source of truth. Mulai
`TASK-003E`, kontrak tema terang/gelap di
`docs/design-system/THEME-INTEGRATION-RULES.md` wajib dibaca sebelum menyentuh
shell, warna, token, atau komponen Portal/Admin.

Untuk frontend runtime, `TASK-003F` menggantikan catatan dependency lama:
Portal dan Admin wajib memakai Next.js `16.3.0`, React/React DOM `19.2.8`, Node
`22`, ESLint flat config, dan async request APIs. Jangan menyalin perintah
`next lint` atau tipe synchronous `params/searchParams/cookies` dari handoff lama.

Untuk baseline UI terbaru, baca `TASK-007R-UI-APPENDIX.md`. Appendix tersebut
menggantikan asumsi bahwa tema terang/gelap saja sudah cukup untuk menyatakan
Portal sesuai Techwind atau Admin sesuai Cuba. Gunakan matriks implementasi di
`docs/design-system/COMPONENT-INVENTORY.md` sebagai daftar pemeriksaan wajib.

Untuk Unified Search, `TASK-007R-HANDOFF.md` dan ADR-014 menggantikan klaim
kelengkapan pada `TASK-007-HANDOFF.md`. Worker kanonis berada di
`services/portal-api/cmd/search-worker`; kontrak API bertipe dan source
isolation tidak boleh diturunkan ke implementasi TASK-007 lama.

Untuk Engagement Platform dan aturan lintas-agent terbaru, baca
`TASK-008-HANDOFF.md`, ADR-015, root `GEMINI.md`, dan
`docs/governance/AI-AGENT-ALIGNMENT.md`. TASK-008 mengaktifkan engagement hanya
untuk Knowledge, menggunakan OIDC `sub`, dan melarang Gemini/Codex/Antigravity
membuat struktur, service, konfigurasi, atau aturan keamanan alternatif.

Untuk cross-Portal SSO/SLO dan Portal navigation, `TASK-008A-HANDOFF.md` adalah authoritative completion record. TASK-008A is complete only for the environment actually verified; production cross-site/global SLO remains subject to its documented production readiness limitations.

For hierarchical Knowledge structure, article placement, public three-pane
exploration, hierarchy-aware search, and hierarchy operations, read
`TASK-011B-HANDOFF.md` together with
`docs/runbooks/KNOWLEDGE-HIERARCHY-OPERATIONS.md`. Do not weaken its maximum
depth, archive-only lifecycle, optimistic conflict, server-side authorization,
or active-ancestry publication rules.

For Admin visual governance after TASK-011B, **TASK-011C — Admin Web Cuba UI
Harmonization & No-Orange Enforcement** is the human-assigned canonical task
identifier. Read `TASK-011C-HANDOFF.md` and
`docs/design-system/ADMIN-UI-VISUAL-CONTRACT.md`. Cuba Admin uses bright
sky/light blue in both themes; orange/amber is forbidden across all
application-controlled states, and both static regression guards are required.

For public discoverability, taxonomy, SEO metadata, slug history, sitemap,
robots, and content landing policies, read `TASK-011D-HANDOFF.md` together with
`docs/runbooks/SEO-TAXONOMY-OPERATIONS.md`. TASK-011D is the mandatory P0 gate
immediately before TASK-012; it does not authorize Identity, Moodle, framework,
Docker-service, or TASK-012 changes.

For production readiness, read `TASK-012-HANDOFF.md` together with
`docs/readiness/TASK-012-PRODUCTION-READINESS.md`. PR #20 merged the hardened
release-candidate baseline at `00619d68`; the merge is not production approval.
Backup/restore, staging, access, alert delivery,
compatibility, secret action, deployment and final GO remain human-owned.

For FAQ CMS and Help Center expansion work, read `TASK-017-HANDOFF.md` together
with `docs/runbooks/FAQ-CMS-HELP-CENTER-OPERATIONS.md`. FAQ answers are plain
text, public visibility is publication-gated, JSON-LD must match visible
indexable content, and Admin Auto-Save/Media/workflow rules must not be weakened.
TASK-017 is `DONE — MERGED via PR #23` through squash commit `224abe0e`.

For the Notification Center, read `TASK-021-HANDOFF.md`,
`docs/governance/NOTIFICATION-CENTER.md`, its threat model, and operations
runbook. For Indonesian UI copy and Cuba data presentation, read
`TASK-025-HANDOFF.md` and the single canonical terminology glossary. TASK-021
and TASK-025 corrective release status must be taken from their latest factual
handoffs; neither authorizes Identity/SSO/RBAC, external notification channels,
or production deployment.

For the full runtime UI foundations, read `TASK-026-HANDOFF.md`, ADR-018,
`docs/design-system/VENDOR-UI-RUNTIME-MANIFEST.md`, and
`docs/design-system/UI-FOUNDATION-INTEGRATION-GUIDE.md`. Techwind is mandatory
for Portal and Cuba is mandatory for Admin; vendor originals remain immutable,
cross-imports and parallel UI frameworks are forbidden, and Admin no-orange
plus bright sky/light-blue remains authoritative.

For full route-level visual harmonization, read `TASK-027-HANDOFF.md`, ADR-019,
and `docs/design-system/FULL-ROUTE-ONLINE-COURSE-MATRIX.md`. The primary Portal
baseline is Techwind `html/index-course.html`; the primary Admin baseline is
Cuba `html/template/template/dashboard-03.html`. This extends TASK-026 across
all active routes without authorizing fake `Segera` features, vendor demo
runtime, Identity changes, or weakening the Admin no-orange contract. TASK-027
is `DONE — MERGED via PR #30` through squash commit
`f6fc598ee231d2c879d7b5aca7ab13158fbaa3e8`.

For Full Training Programs, read `TASK-013-HANDOFF.md` together with
`docs/runbooks/FULL-TRAINING-PROGRAMS-OPERATIONS.md`. Portal owns editorial
program/cohort composition while Moodle remains authoritative for course,
enrolment, completion, and progress. CTA access claims require Moodle
confirmation; degraded reads must retain explicit provenance.

For Webinar & Live Learning, read `TASK-015-HANDOFF.md`, ADR-020, the webinar
operations runbook, and its threat model. Moodle `mod_zoom` is authoritative;
the Portal menu stays `Segera` and capacity stays fail-closed until OAuth,
commercial/compliance inputs, live fixture, and browser acceptance all pass.

For Audit Center, read `TASK-019-HANDOFF.md`, the TASK-019 decision record,
threat model, and `docs/runbooks/AUDIT-CENTER-OPERATIONS.md`. Its local source is
`IMPLEMENTED_LOCAL_UNVERIFIED`; it is not `DONE` until the deferred QA gate
passes. Never weaken exact Portal Administrator authorization, redaction,
export bounds, IP masking, or retention controls.

For Platform Configuration, read `TASK-020-HANDOFF.md`, its governance record,
threat model, and operations runbook. It governs presentation-only values; the
product name, authorization, active route set, identity, and secrets are outside
the schema. TASK-020 is `DONE`; the Admin route is active only for the existing
Portal Administrator role.
