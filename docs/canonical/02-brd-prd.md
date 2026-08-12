# 02 — Business Requirement Document + Product Requirement Document

**Product:** Teman Belajar  
**Repository:** `teman-belajar`  
**Product Type:** Enterprise Digital Learning Experience Platform (LXP + LMS)

**Status:** Canonical  
**Version:** 1.0

# A. BRD

## 1. Business Problem

Organisasi membutuhkan LMS yang matang namun juga portal pembelajaran yang:
- lebih modern daripada antarmuka LMS tradisional;
- mampu menyajikan informasi non-course;
- mampu menjadi pusat knowledge;
- mudah diintegrasikan;
- dapat berkembang tanpa mengubah core Moodle;
- memiliki governance, security, dan audit enterprise.

## 2. Business Objectives

BO-01. Menyatukan discovery, knowledge dan learning dalam satu pengalaman.  
BO-02. Mengurangi customisasi core Moodle.  
BO-03. Mempercepat delivery melalui reuse capability Moodle.  
BO-04. Menyediakan SSO dan role governance.  
BO-05. Meningkatkan engagement dan discoverability.  
BO-06. Menyediakan platform yang AI-ready.  
BO-07. Menurunkan risiko maintenance jangka panjang.  
BO-08. Menyediakan auditability dan observability.

## 3. Stakeholder

- Executive sponsor
- Product owner
- Portal administrator
- LMS administrator
- Content editor
- Reviewer
- Instructor
- Learner
- Auditor
- Security/Infrastructure team
- Developer/DevOps
- External system owner

## 4. Business Success Metrics

Baseline harus ditetapkan saat discovery. Kandidat KPI:
- login success rate;
- course discovery → start conversion;
- completion rate;
- knowledge article engagement;
- search success rate;
- zero-result search ratio;
- active learner;
- content publishing lead time;
- API availability;
- incident MTTR;
- deployment frequency;
- change failure rate.

# B. PRD

## 5. Persona

### Guest
Menemukan informasi, course, knowledge dan pengumuman tanpa login.

### Learner
Mengakses dashboard, course, progress, certificate dan bookmark.

### Instructor
Mengelola proses pembelajaran melalui Moodle sesuai hak akses.

### Content Editor
Membuat berita, knowledge, page, FAQ dan media.

### Reviewer
Melakukan quality review sebelum publikasi.

### Administrator
Mengelola konfigurasi, menu, taxonomy, role mapping dan audit.

### Auditor
Mengakses bukti audit read-only sesuai kewenangan.

## 6. Core User Journeys

### UJ-01 Discover and Learn
Home → Search/Explore → Course detail → Login → Enroll/Access → Moodle activity → Completion → Portal dashboard refreshed.

### UJ-02 Knowledge Discovery
Search → Article → Related content → Bookmark → Return later.

### UJ-03 Editorial Publishing
Draft → Review → Approval → Scheduled/Immediate Publish → Analytics.

### UJ-04 SSO
Portal login → IdP → Portal → Moodle without second login.

## 7. Product Requirements

PR-001 Dynamic public homepage.  
PR-002 CMS pages, news and announcements.  
PR-003 Knowledge Hub with revisions/reviewer.  
PR-004 Gallery and video catalogue.  
PR-005 FAQ and taxonomy.  
PR-006 Unified search.  
PR-007 Course catalogue powered by Moodle integration.  
PR-008 My Learning dashboard.  
PR-009 Bookmark/rating/recently viewed.  
PR-010 Central notification preference.  
PR-011 SSO and role mapping.  
PR-012 Admin portal.  
PR-013 Audit and analytics.  
PR-014 API-first integration.  
PR-015 Responsive and accessible UI.

## 8. Product Constraints

- Moodle remains source of truth for learning data.
- Portal remains source of truth for portal/CMS data.
- No direct Moodle DB dependency.
- No Moodle core patch.
- Agentic code must pass automated and human review.
- Public API changes must be contract-controlled.

## 9. Release Priorities

### P0
SSO, homepage, CMS, knowledge, FAQ, media, course catalogue, learning dashboard, search, admin, audit.

### P1
Bookmark, rating, notification, recommendation rules, agenda, testimonials.

### P2
AI assistant, semantic search, gamification, learning path personalization, advanced analytics.

## 10. Acceptance at Product Level

Release diterima bila:
- seluruh P0 acceptance criteria lulus;
- SSO portal↔Moodle terbukti;
- portal publik tetap tersedia ketika Moodle dependency degraded;
- no critical/high unaccepted vulnerability;
- backup/restore terbukti;
- audit trail tersedia;
- accessibility critical defects ditutup;
- operational runbook tersedia.

## 11. UI Product Constraint

- Public/Learner experience harus mengadaptasi Techwind sebagai baseline visual.
- Admin experience harus mengadaptasi Cuba sebagai baseline visual.
- Semua branding vendor diganti Teman Belajar.
- UI harus memenuhi responsive/accessibility requirement.
- Pembelian template tidak berarti seluruh demo/vendor page masuk scope produk.
