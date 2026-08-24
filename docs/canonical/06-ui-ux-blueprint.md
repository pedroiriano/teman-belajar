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

- three-pane desktop explorer: hierarchy, article, and table of contents;
- mobile hierarchy and table-of-contents drawers;
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

The breadcrumb is derived from the article's authoritative hierarchy ancestry,
not from a browser-supplied label. Public hierarchy navigation exposes active
nodes only, keeps sibling order deterministic, identifies the selected node,
and has explicit empty/error states. A node filter scopes the Knowledge list
without replacing the existing category filter. Heading anchors for level two
and three Markdown headings provide a stable, keyboard-reachable table of
contents.

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
- Knowledge Hierarchy
- Navigation/Banner
- Users/Profile
- Integration Health
- Audit
- Configuration

Dangerous action memakai explicit confirmation dan authorization.

The Cuba-derived Admin experience uses bright sky/light blue for actions and
accents in both light and dark themes. Orange and amber are prohibited in every
application-controlled Admin component and interaction state; warnings use
semantic yellow. `docs/design-system/ADMIN-UI-VISUAL-CONTRACT.md` is the
canonical token, component, static-guard, browser, and accessibility contract.

Knowledge Hierarchy uses the Cuba shell and semantic Admin tokens. Portal
Administrators and Content Editors can create, edit, move, reorder, archive,
and assign one primary node to an article. Reviewers receive a read-only tree;
the API remains authoritative for denial. Hierarchy create/edit forms use the
same server-authoritative auto-save and explicit recovery contract as other
eligible authoring forms. Archive is non-destructive and requires confirmation.

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

Supported Admin authoring forms use one shared recovery contract: server-side
draft authority, user-partitioned IndexedDB fallback, three-second idle save,
visible Indonesian save state, explicit conflict recovery, and final cleanup.
Draft recovery must never silently replace current input.

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
