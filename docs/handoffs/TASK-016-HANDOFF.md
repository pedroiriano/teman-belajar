# TASK-016 Handoff — Learning Paths

## Status

`IMPLEMENTED_BLOCKED_TASK015`

Migration 024 adds versioned learning paths, prerequisite graphs and stable
learner-version bindings. The Go modular monolith exposes strict public,
learner-progress and Admin workflow APIs; Cuba Admin composes paths and Techwind
Portal renders the journey, provenance, next step and per-source degraded state.

Course completion remains Moodle-authoritative; Knowledge and Microlearning
progress remain Portal-owned. Published versions are immutable, edits create a
new draft revision, and existing learners retain their original version.

TASK-015 is still blocked by Zoom Basic/no Webinar license. Webinar capacity is
therefore 0, entries are optional unavailable/degraded, and no activation is
claimed. The Jalur Belajar route may remain active because required non-external
requirements pass, but this task cannot be labelled DONE until TASK-015 passes.

Canonical references: OpenAPI, migration 024, ERD, TASK-016 threat model and
`docs/runbooks/LEARNING-PATHS-OPERATIONS.md`.
