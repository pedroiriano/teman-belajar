# Notification Center Operations Runbook

## Normal Checks

1. Confirm migration `018_create_notification_center.sql` is checksummed and
   applied through the official migration runner.
2. Confirm API endpoints under `/api/v1/me/notifications` return `no-store` and
   derive the subject from a verified token.
3. Confirm the Portal and Admin BFFs fix their own audience and never accept a
   browser `user_id`.
4. Deliver one idempotent QA event through the notification application service.
5. Verify unread count, inbox, single read, persisted read after reload, and the
   allowlisted deep-link on one representative authenticated account.
6. Verify Portal/Admin light and dark themes, keyboard Escape/focus return, a
   representative mobile viewport, empty state, and safe degraded response.

## Observability

Use the bounded `notification_actions_total` action labels for list/read/rate
outcomes. Business delivery/read/preference actions are written to the existing
audit repository. Do not include event bodies, subjects, tokens, or secrets in
metric labels or operational logs.

## Failure and Rollback

If the inbox dependency is unavailable, leave unrelated Portal/Admin features
operational and show the Indonesian degraded state. Roll back application code
to the previous image while leaving additive migration 018 applied. Never edit
the released migration, delete volumes, or disable authorization. Expired rows
remain excluded from reads; future bounded cleanup must be a separately reviewed
forward-only operation.
