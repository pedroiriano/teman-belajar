# ADR-007 — Object Storage untuk Media
**Status:** Accepted

## Decision
Binary media disimpan di MinIO/S3-compatible object storage; PostgreSQL menyimpan metadata.

## Consequence
Backup, lifecycle dan signed URL perlu dikelola terpisah.
