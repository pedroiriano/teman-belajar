# ADR-003 — Go Modular Monolith First
**Status:** Accepted

## Decision
Portal backend V1 menggunakan Go modular monolith.

## Extraction
Module baru menjadi microservice hanya jika ada independent scale, ownership, release cycle, technology atau security boundary.
