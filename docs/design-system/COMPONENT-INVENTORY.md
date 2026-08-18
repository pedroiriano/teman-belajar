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

## Implementation Baseline (TASK-007R UI reconciliation)

Status implementasi berikut wajib dipertahankan. `Implemented` berarti pola vendor sudah diadaptasi ke React/Next.js dan token Teman Belajar; bukan berarti seluruh halaman demo vendor disalin.

| Area | Portal / Techwind | Admin / Cuba | Canonical implementation |
|---|---|---|---|
| Brand and global navigation | Implemented | Implemented | `portal-chrome.tsx`, `admin-shell.tsx` |
| Responsive menu/sidebar | Implemented | Implemented | mobile navigation, overlay drawer, grouped sidebar |
| Topbar utilities | Search, theme, authentication | Search, notifications placeholder, theme, profile menu | application shell only |
| Hero and landing sections | Implemented | Not applicable | Portal home |
| Cards and dashboard widgets | Content/path/stat cards | Welcome/stat/module/workflow cards | semantic app content only |
| Tables and toolbars | Not required yet | Implemented | admin content and media lists |
| Forms | Search and public controls | Implemented | admin create/detail/metadata forms |
| Modal/dialog | Not required by current public feature | Implemented | authenticated Media Picker |
| Gallery/media | Implemented landing pattern | Implemented Media Library | no vendor demo data |
| FAQ accordion | Implemented | Feature not implemented | native `details/summary` on Portal home |
| Footer | Implemented | Implemented | global shell footer/page footer |
| Back to top | Implemented | Not required in fixed Cuba shell | scroll-aware floating action |
| Empty/error/loading/unauthorized | Implemented where data-driven | Implemented | reusable state patterns |
| Light/dark theme | Implemented | Implemented | shared persistence key, separate tokens |
| Engagement controls | Bookmark/rating on Knowledge; saved/recent/recommendation learner sections | Not applicable | Techwind-derived, TASK-008 |

TASK-008 carry-forward: the Cuba Admin shell now includes desktop sidebar
close/reopen with layout expansion; the mobile drawer retains overlay, X,
Escape, focus containment/restore, and body-scroll locking.

### Strict maintenance rules

1. New Portal UI must start from a relevant Techwind pattern and use `portal-*` semantic classes.
2. New Admin UI must render inside `AdminShell` and use `admin-*` semantic classes.
3. Never import vendor JavaScript, Pug, precompiled CSS, demo data, or global theme into product code.
4. A vendor demo component is only implemented when a product feature needs it. Unsupported menu entries must be visibly disabled or omitted; never create deceptive links.
5. Every interactive component requires keyboard behavior, an accessible name, and loading/error/empty states where applicable.
6. Portal and Admin theme tokens must remain isolated even though their stored light/dark preference uses the same contract.

Inventory updated based on actual Techwind and Cuba sources in `vendor/ui-templates`.

## Vendor Intake Report

### Techwind (Public/Learner Portal)
- Location: `vendor/ui-templates/techwind/ORIGINAL/`
- Tech Stack: HTML, CSS, JS libraries. Uses Tailwind CSS (pre-compiled).
- Core Dependencies: 
  - `animate.css`, `wow.js` (Animations)
  - `swiper`, `tiny-slider` (Carousels)
  - `tobii` (Lightbox)
  - `jarallax` (Parallax)
  - `gumshoejs` (Scrollspying)
  - `choices.js` (Select boxes)
  - `js-datepicker` (Date picking)
  - `particles.js` (Background particles)
  - `shufflejs` (Filtering)
  - `remixicon` (Icons)
- Findings: Vendor files exist as plain HTML templates. The HTML contains Tailwind classes but the source build pipeline (like tailwind.config.js) is not present. This template serves as a strict visual reference.

### Cuba (Admin/Backoffice)
- Location: `vendor/ui-templates/cuba/ORIGINAL/`
- Tech Stack: Tailwind CSS, Vite, Pug.
- Core Dependencies (`package.json`):
  - `tailwindcss`
  - `vite`
  - `vite-plugin-pug`
  - `postcss`
- Findings: Unlike its older versions which used Gulp and Bootstrap, this version uses Tailwind CSS directly, compiled via Vite. The HTML is generated from Pug templates.

These libraries must be adapted safely into Next.js React components using Tailwind CSS. We will extract only the necessary visual patterns from the `ORIGINAL` directory for use in `apps/portal-web` and `apps/admin-web`, discarding the original vendor runtimes (Vite/Pug).
