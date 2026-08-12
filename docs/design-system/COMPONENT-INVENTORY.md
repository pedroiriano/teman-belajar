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
