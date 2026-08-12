# TASK-004 — Media Library + Object Storage
**Owner Agent:** Media/Backend Agent  
**Dependencies:** TASK-000, ADR-007

## Objective
Secure asset upload dan gallery metadata.

## Acceptance Criteria
- AC-01 Upload type/size diverifikasi server-side.
- AC-02 Object key tidak memakai raw user filename sebagai authoritative path.
- AC-03 Metadata asset tersimpan di PostgreSQL.
- AC-04 Unsupported type ditolak 422.
- AC-05 Private object tidak memiliki anonymous public URL.
- AC-06 Gallery ordering deterministic.
- AC-07 Upload error tidak meninggalkan inconsistent DB state tanpa reconciliation.

## Tests
File validation, repository, storage adapter, failure cleanup/reconciliation.

## Definition of Done
Security review upload lulus dan tidak ada executable upload served unsafely.
