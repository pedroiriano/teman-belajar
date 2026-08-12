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
- `/faqs`
- `/galleries`
- `/videos`
- `/courses`
- `/search`

Authenticated:
- `/me`
- `/me/dashboard`
- `/me/learning`
- `/me/bookmarks`

Admin:
- `/admin/news`
- `/admin/knowledge`
- `/admin/media`
- `/admin/configuration`

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
