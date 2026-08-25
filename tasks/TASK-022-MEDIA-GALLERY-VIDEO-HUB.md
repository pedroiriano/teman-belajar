# TASK-022 — Media Gallery & Video Hub

**Status:** PLANNED
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

- [ ] collection/order/visibility unit and integration
- [ ] unauthorized/raw-key/unpublished/media-policy negative tests
- [ ] Admin-to-public gallery/video E2E and accessibility

## Documentation Impact

- [ ] OpenAPI/ERD/migration/media/SEO/UI/runbook/handoff

## Definition of Done

Seluruh AC lulus tanpa storage exposure atau pelanggaran immutable asset rules.
