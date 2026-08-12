# ADR-004 — Separate Data Ownership
**Status:** Accepted

## Decision
Portal DB dan Moodle DB terpisah. Portal tidak melakukan SQL ke Moodle database.

## Consequence
Integrasi harus melalui API/event; read snapshot portal harus memiliki provenance/freshness.
