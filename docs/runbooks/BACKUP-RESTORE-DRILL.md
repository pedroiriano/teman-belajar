# Backup and Restore Drill

This procedure is documentation only until a human authorizes an **isolated
restore target** and cleanup. It must never restore over a live Portal, Moodle,
Keycloak, MinIO or search data store.

## Human Inputs

- Approved RPO and RTO. Provisional recommendation: RPO 24 hours, RTO 4 hours.
- Authoritative asset inventory: Portal PostgreSQL (including Keycloak logical
  database), Moodle PostgreSQL, Moodle application/data, MinIO objects and
  required configuration manifests.
- Encrypted destination, key owner, retention period and restore-test target.
- Operators for Portal DB, Moodle DB/application, object store and validation.
- Explicit authorization for creating and later deleting the isolated target.

## Backup Controls

1. Resolve release commit, schema ledger and component versions.
2. Quiesce writes or use a documented transactionally consistent snapshot.
3. Obtain database credentials from the secret manager without command-line or
   log exposure. Use PostgreSQL custom-format dumps with ownership/ACL policy
   documented for the destination.
4. Capture Moodle application/data and MinIO objects consistently with their
   database metadata. Redis, search indexes and analytics caches are derived
   and must be rebuilt rather than treated as authoritative.
5. Encrypt in transit and at rest. Generate a SHA-256 manifest, store it
   separately, and record sizes/timestamps without secret values or PII.
6. Verify backup readability before declaring the backup complete.

## Restore Drill

1. Prove the target is isolated, non-production, empty and access-restricted.
2. Restore Portal and Moodle databases to separate owners; restore Moodle files
   and MinIO objects; inject test-only secrets through the approved channel.
3. Run migrations in `strict` checksum mode. A NULL or mismatched checksum is a
   STOP requiring human reconciliation; never edit released SQL.
4. Rebuild derived Redis/search/analytics state from authoritative sources.
5. Verify schema versions/checksums, object counts and representative object
   hashes, Moodle file references, Portal content, authentication boundary,
   least privilege and health endpoints.
6. Execute critical read journeys without sending real notifications or
   modifying production identity.
7. Measure elapsed restore time against RTO and backup age against RPO.
8. Preserve redacted evidence and obtain database, Moodle, security and release
   owner signatures.

Cleanup is a separate destructive step. Re-resolve the exact isolated target,
obtain explicit approval, and never use broad paths, shared volumes, globs or
production credentials.
