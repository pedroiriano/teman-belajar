# 08 — API Specification

**Product:** Teman Belajar  
**Repository:** `teman-belajar`  
**Product Type:** Enterprise Digital Learning Experience Platform (LXP + LMS)

**Status:** Canonical  
**Version:** 1.0  
**Contract:** `openapi/openapi.yaml`

## 1. API Style

REST JSON, resource-oriented, contract-first.

Base:
`/api/v1`

Internal:
`/internal/v1`

## 2. Rules

- nouns untuk resource;
- HTTP semantics konsisten;
- pagination untuk list besar;
- filter/sort eksplisit;
- versioned public API;
- validation error terstruktur;
- trace ID pada error;
- idempotency untuk operation yang relevan;
- no secret in URL/query;
- authorization server-side.

## 3. Authentication

OIDC bearer access token untuk protected API.

Frontend dapat menggunakan secure server-side session/BFF pattern; token exposure ke browser diminimalkan sesuai design final.

## 4. Standard Error

Gunakan problem-style response:

```json
{
  "type": "validation_error",
  "title": "Validation failed",
  "status": 422,
  "detail": "Request contains invalid fields",
  "trace_id": "01...",
  "errors": [
    {"field":"title","message":"required"}
  ]
}
```

## 5. Pagination

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

## 6. Endpoint Families

Public:
- `/news`
- `/announcements`
- `/knowledge`
- `GET /knowledge/tree`
- `/faqs`
- `/galleries`
- `/videos`
- `/courses`
- `/search`
- `GET /microlearning`
- `GET /microlearning/{slug}`

Authenticated:
- `/me`
- `/me/dashboard`
- `/me/learning`
- `GET /me/bookmarks`
- `PUT|DELETE /me/bookmarks/{targetType}/{targetId}`
- `GET|PUT|DELETE /me/ratings/{targetType}/{targetId}`
- `GET /me/recent-views`
- `PUT /me/recent-views/{targetType}/{targetId}`
- `GET /me/recommendations`
- `GET /me/notifications`
- `GET /me/notifications/summary`
- `PATCH /me/notifications/{id}/read`
- `POST /me/notifications/read-all`
- `GET|PUT /me/notification-preferences[/{eventType}]`
- `GET|PUT /me/microlearning/{id}/progress`

Public aggregate:
- `GET /ratings/{targetType}/{targetId}`

Engagement identity always comes from validated access-token `sub`; the API accepts no user selector. Ratings, recent views, and recommendation 1.0 remain `targetType=knowledge`; bookmarks additionally accept `microlearning` under TASK-014. Canonical wire details and problem responses remain authoritative in `openapi/openapi.yaml`.

Notification identity also comes exclusively from validated access-token `sub`.
The trusted Portal/Admin BFF fixes `audience`; the API rechecks Admin roles,
partitions every read/mutation by subject and audience, rate-limits mutations,
and accepts only audience-specific internal deep-links. Inbox responses are
paginated and `no-store`. Event names and wire fields remain canonical English.

Admin:
- `/admin/news`
- `/admin/knowledge`
- `/admin/knowledge-hierarchy/nodes`
- `/admin/media`
- `/admin/form-drafts`
- `/admin/configuration`
- `/admin/microlearning`

Microlearning authoring requires Content Editor/Administrator for draft writes
and Reviewer/Administrator for approval/publication. Learner progress is an
idempotent Portal resume state with `formal_completion=false`; unpublished
items are unavailable to both engagement and progress endpoints.

Admin form drafts are owned exclusively by validated access-token `sub`, require
Content Editor or Portal Administrator, use optimistic `expected_revision`, and
return 409 rather than overwriting a newer working copy. Browser clients access
them through the Admin BFF only.

The public Knowledge tree contains active nodes only, deterministic children,
depth, and published article counts. `GET /knowledge` accepts an optional
`node` UUID filter and Knowledge detail responses include authoritative
hierarchy breadcrumbs when assigned. Search hits may include `hierarchy_path`;
this is derived by the indexer and is never an authorization
signal.

Hierarchy mutation endpoints require Portal Administrator or Content Editor;
Reviewer is read-only. Create/update/move/reorder/archive use validated UUIDs,
bounded fields, and optimistic versions where applicable. Conflicts return the
canonical 409 problem response. Article placement is updated through
`PUT /admin/knowledge/{id}/primary-node`. The exact wire schemas, status codes,
and request bounds are authoritative in `openapi/openapi.yaml`.

## SEO and Taxonomy API

`/admin/taxonomy/{kind}` governs controlled Categories and Tags;
`/admin/discoverability/{contentType}/{contentId}` reads/replaces the canonical
authoring profile and performs safe slug transitions. Both require bearer auth
and server-side editor/administrator authorization.

Public content detail responses include resolved `seo` metadata. Historical
slugs return an internal 308. `/discovery/sitemap` supplies canonical eligible
URLs without bodies or history URLs, while `/discovery/{kind}/{slug}` applies
the thin-landing policy. Portal Web exposes `/sitemap.xml` and `/robots.txt` as
Next.js metadata routes. `openapi/openapi.yaml` remains the executable contract.

Internal:
- `/internal/v1/moodle/events`

## 7. API Change Policy

Breaking change:
- endpoint removal;
- field semantic change;
- required field addition;
- enum narrowing;
- auth policy incompatible change.

Breaking change wajib:
- ADR bila significant;
- version strategy;
- migration communication;
- contract tests.

## 8. Contract Testing

CI wajib:
- lint OpenAPI;
- detect incompatible diff;
- API handler tests;
- generated/example validation;
- security scheme check.

## 9. Moodle Adapter

Moodle-specific response tidak boleh bocor langsung menjadi public API contract. Adapter menerjemahkan external model → canonical learning DTO.

## 10. Platform Configuration

`GET /api/v1/platform-configuration` returns only a published typed
presentation schema or safe fallback. `/api/v1/admin/platform-configuration*`
requires exact Portal Administrator authorization and provides state, private
preview, optimistic draft save, atomic publish, and versioned rollback. The
canonical request/response definitions are in `openapi/openapi.yaml`.
