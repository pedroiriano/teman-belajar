# Component Inventory — Teman Belajar

Status:
- `R` = Reference available in vendor
- `A` = Adapt into application
- `S` = Shared neutral primitive candidate
- `N` = New component required

| Component | Public/Techwind | Admin/Cuba | Strategy |
|---|---:|---:|---|
| Header/Nav | R | - | A Public |
| Hero | R | - | A Public |
| Footer | R | - | A Public |
| Content Card | R | R | Application-specific |
| Course Card | R/Adapt | - | A Public |
| Knowledge Card | R/Adapt | - | A Public |
| FAQ Accordion | R | R | A Public |
| Sidebar | - | R | A Admin |
| Admin Topbar | - | R | A Admin |
| Data Table | - | R | A Admin |
| Filter Bar | - | R | A Admin |
| Form Controls | R | R | S selectively |
| Modal/Dialog | R | R | S if behavior can be neutral |
| Toast | R | R | S selectively |
| Status Badge | R | R | S |
| Progress | R | R | S semantic model |
| Empty State | Adapt | Adapt | S visual variants |
| Error State | N/Adapt | N/Adapt | S |
| Loading/Skeleton | R | R | S |
| Accessibility Helpers | N | N | S |
| Light/Dark Theme Toggle | R/Adapt | R/Adapt | Application-specific controller, shared persistence contract |

## Implementation Baseline (TASK-026 runtime foundation)

Status implementasi berikut wajib dipertahankan. `Implemented` berarti pola
vendor berjalan melalui foundation React/Next.js dan semantic token Teman
Belajar; bukan berarti seluruh halaman demo atau plugin vendor disalin.

| Area | Portal / Techwind | Admin / Cuba | Canonical implementation |
|---|---|---|---|
| Brand and global navigation | Implemented | Implemented | `portal-chrome.tsx`, `admin-shell.tsx` |
| Navigation taxonomy/dropdown | Implemented | Not applicable | Portal: Beranda + Pembelajaran/Pengetahuan/Informasi; unsupported learning formats marked `Segera` |
| Responsive menu/sidebar | Implemented | Implemented | mobile navigation, overlay drawer, grouped sidebar |
| Topbar utilities | Search, active Notification Center, theme, authentication | Search, active Notification Center, theme, profile menu | application shell plus subject-owned BFF/API |
| Hero and landing sections | Implemented | Not applicable | Portal home |
| Cards and dashboard widgets | Content/path/stat cards | Welcome/stat/module/workflow cards | semantic app content only |
| Tables and toolbars | Not required yet | Implemented | reusable Cuba-derived `AdminDataTable` for content, media, users, and bounded statistics |
| Pagination | Techwind-derived Notification inbox | Implemented | reusable `AdminPagination`/`AdminClientPagination`; server-side where API supports it |
| Forms | Search and public controls | Implemented | admin create/detail/metadata forms |
| Authoring recovery | Not applicable | Implemented | shared auto-save status, conflict recovery, and IndexedDB fallback |
| Modal/dialog | Not required by current public feature | Implemented | authenticated Media Picker |
| Gallery/media | Implemented landing pattern | Implemented Media Library | no vendor demo data |
| FAQ accordion/editor | Implemented Help Center | Implemented | TASK-017 CMS, workflow, search/filter, and reusable long-list pagination |
| Footer | Implemented | Implemented | global shell footer/page footer |
| Back to top | Implemented | Not required in fixed Cuba shell | scroll-aware floating action |
| Empty/error/loading/unauthorized | Implemented where data-driven | Implemented | reusable state patterns |
| Light/dark theme | Implemented | Implemented | shared persistence key, separate tokens |
| Engagement controls | Bookmark/rating on Knowledge; saved/recent/recommendation learner sections | Not applicable | Techwind-derived, TASK-008 |
| Knowledge hierarchy | Three-pane explorer, mobile drawer, breadcrumb, TOC | Cuba tree manager, node forms, explicit archive confirmation | TASK-011B; semantic application components |
| SEO & discoverability | SSR metadata, breadcrumb, taxonomy/node landings | Shared compact News/Announcement/Knowledge progressive disclosure, search/social preview, pre-publication checklist, and a single tabbed taxonomy workspace with progressive creation and list filters | TASK-011D foundation; Media Picker and Auto-Save reused; one editable save flow; semantic Cuba controls; no orange |
| Notification Center | Techwind-derived bell, inbox, preferences, states | Cuba-derived bell, inbox, preferences, states | TASK-021; server-authoritative unread/read, internal deep-link allowlist, no external channels |

TASK-008 carry-forward: the Cuba Admin shell now includes desktop sidebar
close/reopen with layout expansion; the mobile drawer retains overlay, X,
Escape, focus containment/restore, and body-scroll locking.

### Strict maintenance rules

1. New Portal UI must compose the Techwind foundation and `portal-*` semantic aliases.
2. New Admin UI must render inside the Cuba foundation `AdminShell` and use `admin-*` semantic aliases.
3. Never load vendor global JavaScript, Pug, complete precompiled CSS, demo data, or branding. Adapt relevant CSS/behavior through the declared runtime entry points.
4. A vendor demo component is only implemented when a product feature needs it. Unsupported menu entries must be visibly disabled or omitted; never create deceptive links.
5. Every interactive component requires keyboard behavior, an accessible name, and loading/error/empty states where applicable.
6. Portal and Admin theme tokens must remain isolated even though their stored light/dark preference uses the same contract.
7. Every Admin component/state must comply with
   `ADMIN-UI-VISUAL-CONTRACT.md`: bright sky/light blue in both themes, no
   orange/amber application color, and yellow-only warning semantics.

Inventory is maintained against implemented product patterns and the immutable
licensed sources present at TASK-026. Tree baselines and runtime inclusion/
exclusion are recorded in `VENDOR-UI-RUNTIME-MANIFEST.md`.

## Vendor Intake Report

### Current vendor-source availability

- Techwind licensed HTML/CSS/JS/assets are available under its `ORIGINAL/`
  tree; the bundled CSS declares Tailwind 4.2.2.
- Cuba licensed HTML/Pug/CSS/JS/assets are available under its `ORIGINAL/`
  tree; its build manifest declares Vite 6.0.1 and Tailwind 3.4.17.
- Product runtime remains Next.js 16/React 19/Tailwind 3.4.19. Relevant vendor
  patterns are translated into the bounded foundation; vendor build systems
  and global bundles are reference inputs, not product dependencies.
