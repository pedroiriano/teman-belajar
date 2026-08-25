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

## SEO and Public Discoverability

News, Announcement, and Knowledge authoring reuse one Cuba discoverability
component for slug, controlled Category/Tags, metadata, Media Asset social
image, indexability, previews, and an advisory checklist. These fields
participate in TASK-011A Auto-Save. The component must use Admin semantic
tokens and pass the light/dark no-orange contract.

News, Announcement, and Knowledge editors use its compact
progressive-disclosure variant: Category remains immediately visible, Tag shows
its selected count, and URL, search preview, social sharing, and
pre-publication checks stay collapsed until requested. Create and editable
detail screens place this component inside the same authoring surface before
one primary save footer. Technical SEO terminology and a second save action
must not interrupt the normal content-authoring flow. Knowledge retains its
required primary hierarchy control and revision semantics within this shared
flow.

Portal public detail and discovery pages use Techwind-derived breadcrumb/card
patterns. Critical title, description, canonical, robots, Open Graph, and
application-owned structured data are rendered by Next.js server components;
client hydration is not required for crawler-visible metadata. Search and
query/filter variants are noindex. Thin Category, Tag, and Knowledge-node
landings remain noindex under the documented threshold policy.

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

## 12. Expansion UI Activation Contract

TASK-013–024 mengikuti
`docs/roadmap/POST-TASK-012-EXPANSION-ROADMAP.md`. UI yang berlabel `Segera`
adalah disclosure roadmap, bukan route palsu atau izin menampilkan data demo.

| Surface | Task | Foundation | Minimum activation evidence |
|---|---|---|---|
| Pelatihan Penuh | TASK-013 | Techwind Portal + Cuba Admin | catalogue/detail, enrol/start truth, aggregated progress, degraded states |
| Pembelajaran Singkat | TASK-014 | Techwind Portal + Cuba Admin | format/duration, authoring, media, bookmark/progress, discovery |
| Webinar | TASK-015 | Techwind Portal + Cuba Admin | provider decision, schedule/time zone, capacity, registration, reminder |
| Jalur Belajar | TASK-016 | Techwind Portal + Cuba Admin | composition, prerequisite, version, progress, next step |
| FAQ/Help Center | TASK-017 | Techwind Portal + Cuba Admin | CMS workflow, public discovery, SEO/structured data |
| Integration Health | TASK-018 | Cuba Admin | sanitized read-only status, freshness, RBAC, degraded states |
| Audit | TASK-019 | Cuba Admin | filter/pagination/detail/export policy, privacy, authorization |
| Configuration | TASK-020 | Cuba Admin + Techwind result | non-secret schema, preview/publish/version/rollback |
| Notification bell/inbox | TASK-021 | Techwind Portal + Cuba Admin | unread/read/preferences/deep-link and resilient inbox |
| Gallery/Video Hub | TASK-022 | Techwind Portal + Cuba Admin | curated collections, visibility, captions/SEO/usage |
| Personalization | TASK-023 | Techwind Portal | safe evidence, reason, fallback, privacy and opt-out policy |

Setiap activation PR harus menghapus status `Segera` hanya untuk feature yang
selesai, mempertahankan states minimum Section 11, dan menyertakan browser QA
mobile/desktop, keyboard, light/dark, serta accessibility evidence.
