# TASK-022 — Media Gallery & Video Hub

**Status:** DONE
**Owner Agent:** Backend/Frontend/Media/SEO/QA
**Feature:** F-MED-002, F-MED-003
**Dependencies:** TASK-004E, TASK-011D

## Objective

Mengembangkan Media Library menjadi galeri foto dan video publik yang dikurasi,
tanpa mengekspos bucket atau seluruh storage.

## In Scope

- Collection/album, item order, featured, caption/alt/transcript metadata,
  visibility, public gallery/video routes, SEO, usage/provenance.
- Cuba curation UI dan Techwind public discovery/detail.

## Out of Scope

- Raw bucket listing/key, public unpublished asset, streaming/transcoding engine
  baru tanpa ADR, immutable asset mutation, atau identity changes.

## Acceptance Criteria

- AC-01 Public API hanya mengembalikan collection/item published dan allowlisted.
- AC-02 Immutable asset fields dan media validation policy tetap terjaga.
- AC-03 Caption/alt/decorative/video transcript contract dapat diaudit.
- AC-04 Removed/archive reference memiliki deterministic fallback.
- AC-05 Media anchor diganti route hanya setelah responsive/accessibility/SEO QA.

## Required Tests

- [x] collection/order/visibility unit and isolated PostgreSQL integration tests
- [x] unauthorized/raw-key/unpublished/media-policy negative tests
- [x] Admin-to-public persisted E2E, transcript validation, degraded/accessibility/responsive states, and fixture archive cleanup

## Documentation Impact

- [x] OpenAPI/ERD/migration/media/SEO/UI/runbook/handoff

## Local Recovery Evidence

On 2026-09-01, migration 020 source history and the actual 27-column,
20-constraint, 7-index schema were proven equivalent. After a validated local
backup, its ledger checksum was reconciled with a transactional compare-and-swap
and an audit event; migration source remained unchanged. Migrations 021–023 then
applied with a 23/23 verified ledger. The disposable collection completed
`draft → in_review → approved → published → archived` through official APIs and
was absent from the public list/detail after cleanup.

## Definition of Done

Seluruh AC lulus tanpa storage exposure atau pelanggaran immutable asset rules.
