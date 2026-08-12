# TASK-003C Handoff — UI/UX and Functional Reconciliation

**Date:** 2026-08-12
**Scope:** Reconcile TASK-000 through TASK-003 handoffs with the actual implementation.

## Corrected Gaps

- Rebuilt the Portal shell using a responsive Techwind-inspired navigation, hero,
  content cards, footer, semantic design tokens, skip link, focus states, and
  reduced-motion handling.
- Rebuilt the Admin shell using a Cuba-inspired sidebar/topbar, correct
  `/dashboard/*` navigation, responsive table containers, editorial overview,
  consistent cards, buttons, loading, and error states.
- Added explicit Portal loading, empty, error, and mobile behavior.
- Implemented the missing public Knowledge list route and protected Admin
  Knowledge list/detail routes.
- Corrected the public Knowledge detail response so it matches the Portal
  consumer while preserving related articles and review metadata.
- Corrected Admin Knowledge to list unpublished content and load the current
  working revision instead of using the public endpoint.
- Kept raw OIDC access tokens server-only. The browser-visible NextAuth session
  now exposes roles but not the access token; Server Actions and Server
  Components retrieve the token only inside the BFF.
- Added role enforcement for all `/api/v1/admin/*` routes and Knowledge workflow
  transitions.
- Corrected Knowledge revision behavior: a new edit returns the working copy to
  `draft` while the last published revision remains publicly visible.
- Removed the fake all-zero category UUID from Knowledge creation.
- Removed duplicate Knowledge schemas and added the missing Admin list/detail
  operations in OpenAPI.

## Verification

- Portal Web: `npm run lint` PASS; `npm run build` PASS.
- Admin Web: `npm run lint` PASS; `npm run build` PASS.
- Portal API: `go test ./...` PASS; `go build ./...` PASS.
- Vendor `ORIGINAL/` sources were not modified.

## Local Runtime Reconciliation

The Docker containers on ports 3000 and 3001 were still using images built
before the UI reconciliation, which caused browsers to keep showing the
original `Create Next App` bootstrap screens even though the source and local
production builds were already correct.

Both web services were rebuilt and recreated with:

```powershell
docker compose -p teman-belajar -f infrastructure/docker/docker-compose.yml up -d --build --no-deps portal-web admin-web
```

Runtime verification on the canonical local URLs now passes:

- `http://localhost:3000` → title `Teman Belajar` and the new public Portal.
- `http://localhost:3001` → title `Admin Teman Belajar` and the new Admin login.
- Desktop and 390px mobile viewport checks pass without horizontal overflow.
- Browser console verification passes without errors or warnings.

## Remaining Scope

TASK-004 and later product features remain out of scope. The learner dashboard
continues to show an honest integration placeholder until TASK-006 rather than
inventing Moodle learning data.
