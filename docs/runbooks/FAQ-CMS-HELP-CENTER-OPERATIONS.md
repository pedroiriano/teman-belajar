# FAQ CMS and Help Center Operations

## Ownership and invariants

- Portal API owns FAQ categories, FAQ items, workflow, authorization, audit,
  publication visibility, ordering, and public search eligibility.
- Admin Web renders the Cuba editorial workspace at `/dashboard/faqs`; Portal
  Web renders the Techwind Help Center at `/help`.
- FAQ answers are plain text. Raw HTML and editor-supplied JSON-LD are not
  accepted. React rendering and the JSON-LD serializer must continue escaping
  untrusted text.
- Migration `017_create_faq_help_center.sql` is additive and forward-only. Do
  not edit it after application; evolve the schema through a later migration.
- Identity/SSO/account logic, Moodle, Docker service topology, and production
  release controls are outside TASK-017.

## Editorial workflow and authorization

| Operation | Content Editor | Reviewer | Portal Administrator |
|---|---:|---:|---:|
| View categories/items and select Media | Yes | Yes | Yes |
| Create category and draft FAQ | Yes | No | Yes |
| Edit draft and attach/detach Media | Yes | No | Yes |
| Draft → In review | Yes | No | Yes |
| In review → Approved/Draft | No | Yes | Yes |
| Approved → Published/Draft | No | Yes | Yes |
| Published → Archived | Yes | Yes | Yes |

The Portal API derives actor and roles exclusively from validated OIDC claims.
Client role checks only control affordances and never replace server authz.
Creating, updating, transitioning, and category archiving emit audit events.

## Authoring procedure

1. Open **Admin → FAQ** and create or choose an active category.
2. Create a FAQ draft. Question, answer, category, safe slug, and sort order are
   required. Ordering is category order followed by FAQ order.
3. Optionally choose an image through the shared Media Picker and supply useful
   alternative text. Never paste a MinIO URL, object key, or private URL.
4. Review the collapsed SEO section. `indexable` only makes a published item
   eligible for structured data and unified search; it never publishes a draft.
5. Confirm Auto-Save reports a saved state. The canonical save finalizes the
   recoverable draft. On optimistic conflict, reload and reconcile rather than
   overwriting another editor.
6. Move the item through In review → Approved → Published with the authorized
   roles. Do not bypass states or change roles to make a transition succeed.

## Public visibility, search, and structured data

- `/api/v1/faqs` returns only published items with `published_at <= NOW()` from
  active categories. Optional `q` searches category, question, and answer.
- `/help` includes loading, error, empty, search, responsive accordion, optional
  image, and category grouping states. Search-result pages are `noindex`.
- `FAQPage` JSON-LD is generated only from visible, published, `indexable`
  items. Its question and answer text must match the rendered page and be
  serialized through the HTML-safe JSON-LD function.
- Unified Search indexes only active-category, published, `indexable` FAQs and
  links results to `/help#{slug}`. Draft/review/approved/archived and
  non-indexable content must never enter the public index.

## Media recovery

FAQ item persistence and generic Media usage attachment are separate guarded
API operations. If Admin reports that the FAQ was saved but the Media relation
failed, keep the FAQ in draft, reopen it, reselect or remove the image, and save
again. Do not publish until the warning clears. Public Media delivery requires
an eligible published owner and never exposes storage internals.

## Verification

Run from repository root unless a working directory is stated:

1. `go test ./...` and `go vet ./...` in `services/portal-api` after applying
   migrations to the integration database.
2. `npm run lint`, `npm run typecheck`, `npm run test:faq`, and `npm run build`
   in both frontend applications. On a Windows host lacking native SWC, local
   diagnosis may use `npx next build --webpack`; official Docker/CI builds
   remain authoritative.
3. `npx --yes @redocly/cli@2.7.0 lint openapi/openapi.yaml`.
4. Browser-test Admin and Portal at desktop and mobile widths, keyboard focus,
   Light/Dark readability, Auto-Save recovery, workflow, search, and JSON-LD.
5. Confirm a draft-only marker never appears from `/api/v1/faqs`, `/help`, or
   Search, and that no Admin-controlled orange/amber token was introduced.

## Rollback

Revert the TASK-017 application commit and rebuild the affected `api`, `web`,
`admin`, and `search-worker` services through the official Docker wrapper.
Migration 017 remains forward-applied; do not delete volumes, reverse the
migration, truncate FAQ data, weaken publication filters, or deploy to
production without the separately required human decision.
