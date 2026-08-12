# TASK-011 — Moodle Event Inbox
**Owner Agent:** Moodle Integration + Data Agent  
**Dependencies:** TASK-005, ADR-011

## Objective
Menerima event Moodle/plugin secara idempotent dan memproses asynchronous.

## Acceptance Criteria
- AC-01 Event envelope divalidasi.
- AC-02 `event_id` duplicate tidak menerapkan side effect dua kali.
- AC-03 Authentication service-to-service wajib.
- AC-04 Invalid signature/token ditolak dan security event dicatat.
- AC-05 Failed processing memiliki retry bounded dan dead-letter/reconciliation state.
- AC-06 Backlog/failed count memiliki metrics.

## Tests
Duplicate event, invalid auth, malformed payload, retry, processing success.

## Definition of Done
Threat review event endpoint dan operational reconciliation documented.
