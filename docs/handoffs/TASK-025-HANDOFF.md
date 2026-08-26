# TASK-025 Handoff — Indonesian UI and Cuba Data Presentation Recovery

## Status

`IMPLEMENTED — CORRECTIVE RELEASE` on
`codex/task-021-task-025-regression-recovery`, based on canonical SHA
`bb10b118c95c3432b8c51c2e2bbc5855d8153016`.

## Findings

PR #25 introduced useful Indonesian presentation changes and a pagination
component, but the reusable `AdminDataTable` was absent while Users imported it.
A follow-up restored compilation by inlining an English table, and later dirty
work removed the pagination component, glossary, language guard, and handoff.
This corrective task preserves valid copy and restores the missing shared
contracts instead of reverting the full change.

## Result

- `AdminDataTable` is the minimum reusable Cuba-derived table shell with
  consistent header, count, loading, empty, and error presentation.
- `AdminPagination` supports URL-driven server pages; `AdminClientPagination`
  supplies the same Cuba interaction to client workspaces.
- News, Announcements, Knowledge, and Media use existing server-side
  `page/page_size` APIs. FAQ now sends search/status/category/page/page_size to
  its existing server API instead of fetching 100 rows and filtering locally.
- User Management stays a bounded Keycloak view; no Identity/RBAC endpoint or
  behavior was changed. Analytics tables remain bounded aggregate slices where
  no paginated source contract exists.
- Search/filter state is retained through query parameters on server pages and
  retained client state in FAQ/Notification workspaces.
- Visible table/status/date/action copy is Indonesian and human-facing dates use
  `id-ID`; English technical routes, fields, functions, role/status identifiers,
  and event names remain unchanged.
- Representative browser QA proved the shared Cuba table/error state, dark mode,
  visible mobile bell, and a 390 px layout without body overflow. Portal browser
  QA proved the final Indonesian copy and light/dark behavior.
- One root language guard replaces duplicate per-app scanners. Separate focused
  guards cover Admin data presentation and Notification recovery.

The single glossary is `docs/governance/UI-LANGUAGE-TERMINOLOGY.md`. Admin
bright sky/light-blue and no-orange enforcement remain mandatory in both themes.
Final test, browser, CI, PR, merge, and main evidence is authoritative in the
protected GitHub release metadata and final task output.
