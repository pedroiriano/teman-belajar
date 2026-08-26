# Notification Center Governance

TASK-021 implements a Portal-owned, in-app-first Notification Center. It does
not authorize email, SMS, push providers, a new microservice, identity changes,
or arbitrary external links.

## Contract

The delivery envelope is version `1.0` and requires a unique event ID, bounded
source, opaque OIDC UUID subject, audience (`portal` or `admin`), allowlisted
event type, Indonesian title/body, validated internal deep-link, priority, and
optional availability time. Uniqueness on `(user_subject, audience, event_id)`
makes repeated delivery idempotent. Preferences are evaluated atomically during
delivery and default to enabled when no explicit row exists.

The authenticated subject is always derived server-side. Browser-provided user
identifiers are rejected. Admin audience reads require an existing Portal
Administrator, Content Editor, or Reviewer role; this does not change RBAC.

## Security and Privacy

- Portal links are limited to `/`, `/my-learning`, `/knowledge`, `/news`,
  `/announcements`, `/help`, and `/search` descendants. Admin links are limited
  to `/dashboard` descendants.
- Absolute URLs, scheme-relative paths, fragments, control characters, and
  cross-audience links are rejected.
- Notification bodies must not contain secrets, tokens, sensitive profiles, or
  raw dependency errors.
- Reads, unread counts, read mutations, and preferences are partitioned by
  authenticated subject plus audience in PostgreSQL predicates.
- Mutations are rate-limited per subject; responses and BFFs use `no-store`.
- Default retention is 90 days, configurable only within 1–365 days.

## Event Types

`learning.reminder` provides the reminder foundation for TASK-015;
`learning.course_updated`, `learning.course_completed`, `content.workflow`, and
`system.notice` cover currently approved in-app use cases. Producers call the
application service; they do not insert inbox rows or duplicate UI text as a
deduplication key.
