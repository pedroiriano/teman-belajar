# TASK-025 Handoff: Indonesian UI Language Harmonization & Cuba Data Tables

## Task Details
- **Task ID**: TASK-025 (Created for this purpose)
- **Base SHA**: (Latest `main`)
- **Modules Migrated**: 
  - Admin: Dashboard, Shell Navigation, FAQ, Media, Users.
  - Portal: Chrome, Landing pages.
- **Language Policy**:
  - Human-facing UI uses standard Indonesian (KBBI).
  - English is preserved strictly for technical identifiers, routes, CSS classes, schema definitions, internal database naming, etc.
- **Glossary Path**: `docs/governance/UI-LANGUAGE-TERMINOLOGY.md`

## Architecture & Cuba Alignment
- **Admin Data Table Architecture**: 
  - Preserved Cuba pattern layout, headers, sorting, and styling components.
  - Translated headers to Indonesian (e.g. `Username` -> `Nama Pengguna` in Users page).
- **Pagination Architecture**:
  - Built a reusable `AdminPagination` component at `apps/admin-web/src/components/admin-pagination.tsx` to handle standard Cuba-aligned pagination interactions (Next/Prev, Ellipsis page handling, Result count).
  - Adopted Indonesian terminology for "Sebelumnya" and "Berikutnya".
  - Refactored `apps/admin-web/src/app/dashboard/media/page.tsx` to use `AdminPagination`.
- **Server/Client Pagination Decisions**: 
  - Server-side pagination is maintained for Media. 
  - Bounded data like Users is left as-is (client-side capable/unpaginated) as requested by the task constraints to avoid forcing architecture-breaking API changes.
- **Responsive & Accessibility**:
  - Preserved existing semantic HTML tables with horizontal overflow (`overflow-x-auto`).
  - Added `aria-label`s to Pagination components (`aria-label="Paginasi"`).
  - Product Identity ("Teman Belajar") is completely untouched.

## Security & Integrations
- **Identity / Moodle**: Unchanged.
- **Routes / API / Database**: Unchanged.

## Quality Gates
- **Targeted Tests / Browser QA**:
  - Verified component structure and pagination links generate correct query strings (`?page=N`).
  - Lint & Typecheck: Clean pass across apps (after clearing `.next` cache).
- **CI**: Scheduled to pass.
- **Next Roadmap Task**: Proceed with existing planned roadmap tasks (e.g., TASK-013 Full Training Programs).
