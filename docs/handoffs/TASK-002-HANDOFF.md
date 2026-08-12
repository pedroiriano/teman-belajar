# TASK-002: CMS News & Announcement Implementation Handoff

## 1. Overview
This handoff details the completion of TASK-002, which involved implementing a full vertical slice for the News and Announcement features inside the Teman Belajar platform.

## 2. Work Completed

### Database
- Created migration script `services/portal-api/migrations/001_create_cms_tables.sql` for PostgreSQL.
- Includes `news` and `announcements` tables with `status`, `published_at`, `start_at`, `end_at` fields to support editorial workflow rules.

### Go Backend (portal-api)
- **Domain**: Created `News` and `Announcement` models in `internal/domain/cms/model.go`.
- **Logic**: Enforced strict state transition rules (`draft` -> `in_review` -> `approved` -> `published`) bounded by user roles (Content Editor, Reviewer, Portal Administrator).
- **Repository**: Implemented `database/sql` mapping using the `github.com/lib/pq` driver in `internal/repository/postgres/cms_repository.go`.
- **Handlers**: Exposed Public and Admin HTTP endpoints, integrating with `AuthMiddleware` for JWT RBAC protection in `internal/transport/http/handler/cms.go`.

### Frontend
- **Public Portal (`apps/portal-web`)**:
  - Implemented `app/news/page.tsx` for listing published news items.
  - Implemented `app/news/[slug]/page.tsx` for viewing a single published news article.
  - Used Tailwind styles inspired by Techwind guidelines, ensuring server-side rendering for API calls.
- **Admin Portal (`apps/admin-web`)**:
  - Implemented `app/dashboard/news/page.tsx` to view the news dashboard using Cuba-inspired table layouts.
  - Implemented `app/dashboard/news/create/page.tsx` as a Client Component for form submission securely sending the OIDC access token to the Go API.

## 3. Governance Adherence
- **Security**: Authentication and authorization are enforced strictly server-side in Go `AuthMiddleware`.
- **Architecture**: Remained inside the `portal-api` monolith instead of spawning new microservices.
- **Vendor Code**: Recreated Cuba and Techwind visual layouts natively in React/Tailwind rather than running Pug/Gulp/Vite toolchains.

## 4. Next Steps
- Implement integration tests using `httptest` to ensure CI pipeline completes with >80% coverage.
- Wire `portal-web` and `admin-web` API proxies (`next-auth`) correctly if CORS restricts client-side access in production.
- Proceed to the next module/task.
