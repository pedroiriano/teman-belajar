# 06 — UI/UX Blueprint

**Product:** Teman Belajar  
**Repository:** `teman-belajar`  
**Product Type:** Enterprise Digital Learning Experience Platform (LXP + LMS)

**Status:** Canonical  
**Version:** 1.0

## 0. UI Foundation Decision

Teman Belajar tidak memulai desain dari nol.

### Public & Learner
**Techwind Tailwind** adalah visual/reference foundation.

### Admin
**Cuba Tailwind** adalah visual/reference foundation.

### Shared Layer
`packages/ui` hanya neutral product primitives dan semantic tokens.

### shadcn/ui
Opsional/selective fallback, bukan foundation utama.

Detail: `docs/design-system/`.

## 1. Experience Principles

- Simple before clever.
- Mobile-first.
- Learning progress selalu mudah ditemukan.
- Portal dan Moodle terasa satu ekosistem.
- Content hierarchy lebih penting daripada dekorasi.
- Motion mendukung orientasi, bukan mengganggu.
- Semua critical flows accessible.

## 2. Global Information Architecture

```text
Beranda
Belajar
  ├─ Program
  ├─ Kursus
  ├─ Learning Path
  └─ Microlearning
Knowledge
  ├─ Artikel
  ├─ Tutorial
  ├─ Panduan
  └─ Best Practice
Media
  ├─ Galeri
  └─ Video
Informasi
  ├─ Berita
  ├─ Pengumuman
  ├─ Agenda
  └─ FAQ
My Learning
```

## 3. Homepage Blocks

1. Header/navigation
2. Hero
3. Continue learning (authenticated)
4. Featured learning
5. Categories
6. Popular/new courses
7. Knowledge highlights
8. News
9. Announcements
10. Media
11. Statistics
12. FAQ teaser
13. CTA
14. Footer

Semua block harus dapat dikonfigurasi tanpa code deployment sejauh feasible.

## 4. Course Detail

- title;
- cover;
- summary;
- instructor;
- duration;
- level;
- objectives;
- syllabus preview;
- prerequisites;
- related courses;
- CTA.

CTA learning mengarahkan melalui SSO ke Moodle activity/course context.

## 5. Knowledge Detail

- breadcrumb;
- title;
- summary;
- author;
- reviewer;
- last reviewed;
- reading time;
- TOC;
- article body;
- attachment;
- related content;
- bookmark/rating/share.

## 6. My Learning Dashboard

Cards:
- continue learning;
- active courses;
- progress;
- upcoming activity;
- completion;
- certificate/badge;
- recommendations;
- saved knowledge.

Saved Knowledge, Recently Viewed, and deterministic recommendations are Portal-owned and remain available when Moodle mapping or course data is unavailable. Moodle error state must not short-circuit the Portal engagement sections.

Loading state dan dependency error harus granular; satu widget gagal tidak menjatuhkan seluruh dashboard.

## 7. Admin UX

Navigation:
- Dashboard
- Content
- Knowledge
- Media
- FAQ
- Taxonomy
- Navigation/Banner
- Users/Profile
- Integration Health
- Audit
- Configuration

Dangerous action memakai explicit confirmation dan authorization.

## 8. Design System

Minimum tokens:
- color semantic;
- typography;
- spacing;
- radius;
- elevation;
- breakpoints;
- motion duration/easing;
- focus;
- state: success/warning/error/info.

Component library:
- Button
- Link
- Input
- Select
- Checkbox
- Radio
- Dialog
- Toast
- Table
- Pagination
- Tabs
- Breadcrumb
- Card
- Badge
- Progress
- Empty State
- Skeleton
- Search
- File uploader
- Rich text content shell

Admin content editors use one Cuba-aligned Integrated Media Manager with Library/Unggah Baru tabs, search, filter, pagination, consent-based image compression, accessible alt/decorative intent, and MIME-aware Markdown insertion. Parallel per-editor media pickers are forbidden.

## 9. Responsive

Reference classes:
- small mobile
- mobile
- tablet
- desktop
- wide desktop

Breakpoints final mengikuti framework/design system, bukan hard-coded di tiap feature.

## 10. Accessibility

Target WCAG 2.2 AA:
- logical heading;
- landmark;
- keyboard;
- focus visible;
- contrast;
- form label/error;
- alt text;
- captions/transcript;
- no keyboard trap;
- reduced motion;
- touch target adequate.

## 11. UI Acceptance

Setiap feature UI harus punya:
- default;
- loading;
- empty;
- error;
- unauthorized;
- disabled bila relevan;
- mobile;
- keyboard test;
- screen reader label untuk control penting.
