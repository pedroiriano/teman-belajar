# Webinar & Live Learning Operations

**Scope:** TASK-015 local/non-production and future environment promotion
**Authority:** ADR-020; Moodle `mod_zoom` v5.5.0
**Current status:** BLOCKED_CREDENTIALS_AND_EXTERNAL_GATES

## Activation Gate

Keep Portal navigation `Webinar` marked `Segera` and
`local_temanbelajar/webinarcapacity=0` until every gate passes:

1. approved Zoom tenant, webinar host license, cost cap, capacity, storage,
   DPA, data region, subprocessors, and deletion terms;
2. Server-to-Server OAuth Account ID, Client ID, and Client Secret entered
   directly in Moodle through the approved secret path;
3. least-privilege scopes confirmed against `mod_zoom` CRUD, registration,
   report, and opt-in recording operations;
4. Moodle connection check and all six `mod_zoom` scheduled tasks healthy;
5. disposable activity proves authorized list/detail/RSVP register/cancel,
   Moodle-owned provider registration/join,
   full-capacity rejection, report sync, attendance, and recording opt-in;
6. Portal browser E2E and accessibility pass for normal, full, offline,
   degraded, and recording-visible states.

Never place OAuth values in `.env.example`, Git, shell history, screenshots,
Portal API, browser payload, URLs, logs, or this runbook.

## Configuration

- Author webinars only as Moodle Zoom activities with webinar mode enabled.
- Set `local_temanbelajar/webinarcapacity` to the lesser of licensed capacity
  and the operational cap. Zero is the safe default and rejects registration.
- Keep waitlist off. Do not represent a failed registration as queued.
- Store instants in UTC and render using `Asia/Jakarta`.
- Keep recording off by default. Publish a recording only after host opt-in,
  participant notice/consent, and Moodle capability review.
- TASK-021 creates in-app reminders at T-24h and T-1h. Cancellation removes
  reminders that have not yet become visible.

## Routine Verification

- Moodle schema check must contain no `zoom*` or `local_tb_webinar*` finding.
  Report unrelated plugin findings separately.
- Confirm the four `local_temanbelajar_*_webinar` functions remain members of
  the restricted `teman_belajar_integration` service.
- Monitor `webinar_actions_total{action,outcome}` for success, validation,
  capacity, rate-limit, and dependency failures without learner identifiers.
- Monitor `mod_zoom` scheduled task `fail_delay`, last run, and report
  freshness. Treat unavailable or stale provider state as degraded, never as
  empty attendance.
- Run `local_temanbelajar\task\purge_webinar_attendance` daily. It removes raw
  participant rows after exactly 365 days; registration state remains subject
  to Moodle privacy export/deletion APIs.

## Incident and Rollback

For revoked credentials, 401/429 spikes, schema drift, or report staleness:

1. set capacity to zero and leave the menu gated;
2. capture sanitized error category and correlation/trace ID only;
3. stop retry loops that exceed bounded adapter timeouts;
4. verify Moodle/plugin health before contacting Zoom/account owner;
5. follow `MOD-ZOOM-SCHEMA-RECOVERY.md` only after new human approval if schema
   recovery is required;
6. do not delete volumes, patch Moodle core, edit the plugin ledger, weaken
   capabilities, or run `moodle-reconcile` as a webinar fix.

Code rollback uses the normal application rollback process. Database changes
are forward-only; retain the idempotency ledger because deleting it can replay
old mutations.
