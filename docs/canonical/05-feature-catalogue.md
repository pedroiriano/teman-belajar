# 05 — Feature Catalogue

**Product:** Teman Belajar  
**Repository:** `teman-belajar`  
**Product Type:** Enterprise Digital Learning Experience Platform (LXP + LMS)

**Status:** Canonical  
**Version:** 1.0

Priority: P0 Must, P1 Should, P2 Later.

| ID | Domain | Feature | Priority | Source of Truth |
|---|---|---|---|---|
| F-PUB-001 | Public | Dynamic Homepage | P0 | Portal |
| F-PUB-002 | Public | Dynamic Menu | P0 | Portal |
| F-PUB-003 | Public | Static/Dynamic Pages | P0 | Portal |
| F-CMS-001 | CMS | News | P0 | Portal |
| F-CMS-002 | CMS | Announcement | P0 | Portal |
| F-CMS-003 | CMS | Editorial Workflow | P0 | Portal |
| F-KNW-001 | Knowledge | Article | P0 | Portal |
| F-KNW-002 | Knowledge | Revision | P0 | Portal |
| F-KNW-003 | Knowledge | Reviewer/Approval | P0 | Portal |
| F-KNW-004 | Knowledge | Related Content | P1 | Portal |
| F-MED-001 | Media | Asset Library | P0 | Portal |
| F-MED-002 | Media | Photo Gallery | P0 | Portal |
| F-MED-003 | Media | Video Catalogue | P0 | Portal |
| F-FAQ-001 | FAQ | FAQ + Category | P0 | Portal |
| F-SRC-001 | Search | Unified Search | P0 | Search index / portal |
| F-LMS-001 | Learning | Course Catalogue | P0 | Moodle |
| F-LMS-002 | Learning | Course Detail | P0 | Moodle |
| F-LMS-003 | Learning | Enrollment View | P0 | Moodle |
| F-LMS-004 | Learning | Progress | P0 | Moodle |
| F-LMS-005 | Learning | Certificate Metadata | P1 | Moodle/plugin |
| F-LMS-006 | Learning | Badge | P1 | Moodle |
| F-ME-001 | Experience | My Learning Dashboard | P0 | Aggregated |
| F-ENG-001 | Engagement | Bookmark | P1 | Portal |
| F-ENG-002 | Engagement | Rating | P1 | Portal |
| F-ENG-003 | Engagement | Recently Viewed | P1 | Portal |
| F-ENG-004 | Engagement | Recommendation Rules | P1 | Portal |
| F-NOT-001 | Notification | In-app | P1 | Portal |
| F-NOT-002 | Notification | Email | P1 | Portal |
| F-ID-001 | Identity | SSO | P0 | Keycloak |
| F-ID-002 | Identity | MFA | P0/P1 policy | Keycloak |
| F-ID-003 | Identity | Role Mapping | P0 | Portal integration |
| F-ADM-001 | Admin | Content Management | P0 | Portal |
| F-ADM-002 | Admin | Taxonomy | P0 | Portal |
| F-ADM-003 | Admin | Audit Viewer | P0 | Audit |
| F-AN-001 | Analytics | Portal Analytics | P1 | Portal |
| F-AI-001 | AI | Semantic Search | P2 | AI/Search |
| F-AI-002 | AI | Learning Assistant | P2 | AI Gateway |
| F-GAM-001 | Gamification | XP/Level | P2 | Portal |

## Feature Ownership Rules

- Jika business logic adalah pembelajaran formal, default owner = Moodle.
- Jika business logic adalah discovery/content/experience, default owner = Portal.
- Jika fitur membutuhkan keduanya, Portal menyajikan experience dan Moodle tetap authoritative untuk learning state.
- Data tidak diduplikasi kecuali read model/cache yang memiliki TTL dan provenance.

## Feature Readiness Checklist

Sebelum feature masuk development:
- business objective jelas;
- persona jelas;
- user journey jelas;
- source of truth jelas;
- security classification jelas;
- acceptance criteria testable;
- API/data impact diketahui;
- dependency diketahui;
- observability requirement diketahui.

## UI Foundation Mapping

| Feature Family | UI Foundation |
|---|---|
| Public navigation/home/content | Techwind |
| Course discovery/detail | Techwind |
| My Learning | Techwind |
| Knowledge/News/FAQ/Gallery | Techwind |
| Admin dashboard | Cuba |
| CMS/Knowledge administration | Cuba |
| Media administration | Cuba |
| Audit/config/integration health | Cuba |
