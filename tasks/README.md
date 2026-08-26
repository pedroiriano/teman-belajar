# Teman Belajar — Agent Task Backlog

Task awal:
- TASK-000A UI Vendor Intake & Design-System Baseline
- TASK-000 Repository Bootstrap
- TASK-001 Keycloak SSO
- TASK-002 CMS News & Announcement
- TASK-003 Knowledge Hub
- TASK-004 Media/Object Storage
- TASK-004E Integrated Media Asset Management (TASK-004A–004D identifiers are historical Moodle follow-ups)
- TASK-005 Moodle Adapter
- TASK-006 My Learning Dashboard
- TASK-007 Unified Search
- TASK-008 Bookmark
- TASK-009 Observability
- TASK-010 Security Gates
- TASK-011 Moodle Event Inbox
- TASK-011A Auto-Save Draft & Crash Recovery
- TASK-011B Hierarchical Knowledge Explorer
- TASK-011C Admin Web Cuba UI Harmonization & No-Orange Enforcement
- TASK-011D SEO, Taxonomy & Public Discoverability Platform
- TASK-012 Production Readiness
- TASK-013 Pelatihan Penuh / Full Training Programs — `PLANNED`
- TASK-014 Pembelajaran Singkat / Microlearning — `PLANNED`
- TASK-015 Webinar & Live Learning — `PLANNED`
- TASK-016 Jalur Belajar / Learning Paths — `PLANNED`
- TASK-017 FAQ CMS & Help Center — `DONE — MERGED via PR #23`
- TASK-018 Integration Health Center — `PLANNED`
- TASK-019 Audit Center — `PLANNED`
- TASK-020 Platform Configuration & Dynamic Site Management — `PLANNED`
- TASK-021 Notification Center — `PLANNED`
- TASK-022 Media Gallery & Video Hub — `PLANNED`
- TASK-023 Experience Personalization & Recommendation 2.0 — `PLANNED`
- TASK-024 Post-Expansion Release Gate — `PLANNED`
- TASK-025 Indonesian UI Language Harmonization & Cuba Data Tables — `IN PROGRESS`

## Rule

Satu agent hanya mengambil task yang:
- dependency-nya selesai;
- scope-nya jelas;
- AC testable;
- owner/handoff jelas.

Task baru dibuat dari `templates/TASK.md`.

TASK-013–024 mengikuti
`docs/roadmap/POST-TASK-012-EXPANSION-ROADMAP.md`. Nomor task bukan urutan
eksekusi: TASK-021 mendahului reminder TASK-015, TASK-016 menunggu
TASK-013–015, dan TASK-023 menunggu TASK-013–016. TASK-024 hanya memverifikasi
delta ekspansi dan tidak mengubah status `PRODUCTION HOLD` TASK-012.
