# TASK-020 — Platform Configuration & Dynamic Site Management

**Status:** DONE
**Owner Agent:** Product/Backend/Frontend/Security/QA
**Feature:** F-ADM-005
**Dependencies:** CMS, Media, TASK-011D

## Objective

Mengelola konfigurasi presentasi situs non-secret secara dinamis dengan schema,
preview, audit, dan rollback yang aman.

## In Scope

- Site identity display, homepage sections/order, navigation, banner, footer,
  contact/help, SEO defaults, feature presentation, draft/publish/version/rollback.
- Typed allowlist schema, safe preview, Media references, cache invalidation.

## Out of Scope

- Secret/env, database URL, API key, Keycloak/Moodle credential, security
  controls, arbitrary HTML/script/CSS, feature authorization, infrastructure.

## Acceptance Criteria

- AC-01 Server-side schema hanya menerima allowlisted non-secret keys.
- AC-02 Draft/preview/publish/version/rollback atomic dan diaudit.
- AC-03 Invalid navigation/reference/unsafe URL ditolak.
- AC-04 Public fallback tetap aman saat config/cache unavailable.
- AC-05 Cuba Admin dan Techwind result lulus accessibility/responsive/browser QA.

## Required Tests

- [x] schema/version/cache unit and DB integration
- [x] authz/injection/unsafe URL/secret-key negative tests
- [x] Admin publish-to-Portal E2E and rollback test

## Documentation Impact

- [x] OpenAPI/ERD/migration/config governance/runbook/handoff

## Definition of Done

Seluruh AC lulus; tidak ada secret atau security control yang UI-configurable.
