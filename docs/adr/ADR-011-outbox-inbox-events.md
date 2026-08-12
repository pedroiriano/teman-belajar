# ADR-011 — Inbox/Outbox untuk Event Integration
**Status:** Accepted

## Decision
Gunakan inbox deduplication untuk external events dan outbox untuk reliable internal publication bila consistency diperlukan.

## Consequence
Worker dan reconciliation tooling menjadi bagian dari platform.
