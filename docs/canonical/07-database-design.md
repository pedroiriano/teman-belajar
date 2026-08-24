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
