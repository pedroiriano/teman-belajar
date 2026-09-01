# 07 — Database Design

**Product:** Teman Belajar  
**Repository:** `teman-belajar`  
**Product Type:** Enterprise Digital Learning Experience Platform (LXP + LMS)

**Status:** Canonical  
**Version:** 1.0

## 1. Data Ownership

### Portal PostgreSQL
Authoritative untuk:
- portal profile extensions;
- CMS;
- knowledge;
- media metadata;
- taxonomy;
- engagement;
- portal notification;
- integration mapping;
- audit.

### Moodle DB
Authoritative untuk:
- learning course;
- enrollment;
- grades;
- activities;
- completion;
- Moodle-specific user state.

Portal **tidak** melakukan SQL terhadap Moodle DB.

## 2. Logical Schemas

```text
portal
cms
knowledge
media
engagement
integration
notification
analytics
audit
```

Schema `analytics` menyimpan raw event ber-retensi, rollup harian, dan tepat
satu baris `analytics.worker_state`. Kolom `last_rollup_success_at`,
`last_moodle_sync_success_at`, dan `last_cleanup_success_at` hanya diperbarui
setelah job terkait berhasil; waktu raw event tidak boleh dipakai sebagai bukti
freshness worker.

`analytics.learning_daily` menyimpan `eligible_enrolments` bersama active
learners, starts, completions, dan rate agar denominator cohort yang diterima
dari Moodle tetap dapat diaudit setelah melewati analytics worker.

## 3. Core Tables

### portal
- `portal.user_profiles`
- `portal.user_preferences`
- `form_drafts`: owner-isolated, expiring working copies with optimistic
  revision and explicit form payload registry (physical baseline remains the
  current flat Portal schema until a separately approved schema migration).

### cms
- `cms.pages`
- `cms.news`
- `cms.announcements`
- `cms.categories`
- `cms.tags`
- `cms.content_tags`
- `cms.navigation_items`
- `cms.banners`

### knowledge
- `knowledge.articles`
- `knowledge.revisions`
- `knowledge.article_reviewers`
- `knowledge.related_articles`
- physical `knowledge_nodes`: adjacency-list hierarchy with an active/archived
  lifecycle, optimistic `version`, deterministic sibling order, and maximum
  depth eight;
- physical `knowledge_article_nodes`: exactly one primary hierarchy association
  per Knowledge article.

The current physical schema remains flat for backward compatibility. Migration
015 adds `knowledge_nodes` and `knowledge_article_nodes`; the logical
`knowledge.*` names above describe ownership, not PostgreSQL schemas. Allowed
node types are `collection`, `aspect`, `indicator`, `sub_indicator`, `topic`,
and `section`. Sibling slug and sibling order are unique, including at the root.
Cycles, self-parenting, missing parents, depth greater than eight, hard deletion
of referenced nodes, and assignment to archived nodes are rejected. Archive is
forward-only through the application service; an archived node or archived
ancestor makes its branch unavailable to public reads and search indexing.

### media
- `media.assets`
- `media.galleries`
- `media.gallery_items`
- `media.videos`

### engagement
- `engagement_bookmarks`: one row per OIDC `sub` + eligible target.
- `engagement_ratings`: one integer 1–5 per OIDC `sub` + eligible target.
- `engagement_recent_views`: one mutable counter/timestamp row per OIDC `sub` + eligible target; retain at most 50 unique targets per user.

TASK-008 enables only `knowledge` as an engagement target. Target metadata is not duplicated in engagement tables; every read re-resolves the authoritative published Knowledge record and omits unavailable/private/archived targets.

### integration
- `integration.identity_mappings`
- `integration.moodle_user_mappings`
- `integration.moodle_course_snapshots`
- `integration.event_inbox`
- `integration.event_outbox`
- `integration.sync_jobs`
- `integration.sync_logs`

### audit
- `audit.events`
- `audit.security_events`

## 4. ID Policy

Public/domain entity menggunakan UUID atau sortable unique identifier. Internal surrogate numeric ID boleh digunakan bila tidak diekspos dan justified.

## 5. Standard Columns

Untuk mutable business entity:
- `id`
- `created_at`
- `created_by`
- `updated_at`
- `updated_by`
- optional `deleted_at`
- `version` bila optimistic locking diperlukan

## 6. Publication State

CMS/Knowledge:
- `draft`
- `in_review`
- `approved`
- `published`
- `archived`

State transition dilakukan melalui application service, bukan arbitrary DB update.

## 7. Migration Rules

- semua schema change via migration;
- forward migration wajib versioned;
- destructive migration dua tahap bila memungkinkan;
- migration harus diuji pada copy schema;
- tidak melakukan manual DDL production kecuali incident procedure terdokumentasi.

## 8. Indexing Principles

Index berdasarkan query nyata:
- slug unique;
- status + published_at;
- category_id;
- author_id bila queried;
- integration external_id unique;
- outbox processing state;
- audit timestamp + actor;
- bookmarks, ratings, and recent views unique on `user_subject + target_type + target_id`;
- recent views ordered by `user_subject + last_viewed_at`;
- rating aggregate by `target_type + target_id`.
- hierarchy children by `parent_id + sort_order + id`;
- hierarchy publication by `status`;
- article placement by unique `article_id` and lookup by `node_id`.

## SEO and Taxonomy (Migration 016)

- `categories` is the controlled editorial classification table. Migration 016
  adds normalized identity, description, active/archive state, and lifecycle
  fields; uniqueness is enforced by `(domain, normalized_name)` and
  `(domain, slug)`.
- `tags` is a flat controlled reusable vocabulary with normalized name and
  unique slug. `content_tags` is the normalized many-to-many relation for News,
  Announcement, and Knowledge; tags are never comma-separated.
- `seo_profiles` owns optional Category, SEO/social metadata, active-image Media
  Asset ID, indexability, and safe internal canonical override per content.
- `slug_redirects` owns published slug history. Route and old slug are unique;
  self-loops and unsafe paths are constrained, while the repository prevents
  cycles/collisions and collapses chains transactionally.
- `announcements.category_id` and the existing Knowledge category reference use
  the controlled Category table. Public/search/sitemap queries additionally
  enforce publication and active Knowledge ancestry.

## Notification Center (Migration 018)

- `notification.inbox` stores the Portal-owned in-app delivery record. The
  opaque OIDC UUID `user_subject` is never accepted from the browser; all reads
  and mutations include subject plus audience predicates.
- `(user_subject, audience, event_id)` is unique, making repeated event delivery
  idempotent without using mutable presentation text as a key.
- `notification.preferences` stores explicit per-subject, per-audience,
  per-event-type choices. No row means enabled; delivery evaluates the choice
  atomically.
- Available/expiry timestamps support scheduled reminders and bounded retention.
  Default retention is 90 days and accepted configuration is 1–365 days.
- Migration 018 is additive and forward-only. Rollback removes application
  consumers while leaving the schema applied.

## Full Training Programs (Migration 019)

- `training_programs` owns Portal editorial metadata and publication workflow;
  it never stores authoritative Moodle enrolment, completion, grade, or learning
  state.
- `training_program_courses` stores only ordered Moodle course IDs plus the
  Portal composition flag `required`. Course names and availability are resolved
  through the Moodle adapter and reported with freshness/provenance.
- `training_program_cohorts` owns schedule presentation. It does not create a
  second registration or attendance engine.
- Public queries isolate `published` rows with an effective `published_at`.
  Optimistic versions protect draft edits and publication revalidates visible
  Moodle course IDs.
- Migration 019 is additive and forward-only. Rollback removes application
  consumers while retaining schema and authored program data.

## Microlearning (Migration 020)

- `microlearning_items` owns Portal editorial content, format, 3–15 minute
  duration, workflow, curated cover reference, and SEO fields. Video format
  stores a validated HTTPS source; it does not expose object-storage internals.
- `microlearning_related` stores ordered Portal content relationships. Public
  reads resolve only currently published related items.
- `microlearning_progress` stores learner resume position by validated opaque
  OIDC subject and item ID. It is not Moodle completion, grade, assessment, or
  certification state.
- `engagement_bookmarks` additionally accepts the `microlearning` target type;
  ratings/recent views/recommendation 1.0 remain Knowledge-only.
- Migration 020 is additive and forward-only. Rollback removes consumers while
  retaining authored content and learner resume data.

## Learning Paths (Migration 024)

- `learning_paths` menyimpan identity, optimistic row version, pointer versi
  terbaru, dan pointer versi publik.
- `learning_path_versions` dan item/prerequisite-nya immutable setelah publish;
  revisi dibuat sebagai versi draft baru.
- `learning_path_enrollments` mengikat learner ke versi publik pertama sehingga
  revisi editorial tidak mengubah progres historis.
- Progress formal course tetap berasal dari Moodle; state editorial dari Portal.
  Webinar TASK-015 dengan capacity 0 disajikan optional dan degraded.
- Migration 024 additive dan forward-only. Rollback melepas consumer aplikasi
  tanpa menghapus schema atau binding learner.

## 9. Audit

Audit log bukan pengganti application logs.
Audit menyimpan business/security action yang perlu accountability.

## 10. Data Lifecycle

Sebelum production tentukan:
- classification;
- purpose;
- retention;
- archival;
- deletion/anonymization;
- backup retention.

Authoring drafts default to 30-day retention, configurable from 1–365 days.
Expired drafts are unavailable to reads and removed in bounded lazy batches;
draft payload must not appear in operational logs or audit event details.

## 11. ERD

ERD source terdapat di `docs/diagrams/erd.mmd`.

## 12. Platform Configuration Versions

`platform_config_versions` stores immutable typed JSON revisions. Partial unique
indexes allow at most one current draft and one published revision. Publish and
rollback are serialized transactionally; rollback inserts a new published
version linked by `based_on_version`. No secret or operational configuration is
permitted in this table.
