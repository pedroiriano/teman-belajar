-- 025_create_publication_schedules_and_admin_workflow.sql
-- Migration to persist publication schedules, application-level role policies, and editorial review notes.

-- 1. Publication Schedules
CREATE TABLE publication_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    target_date DATE NOT NULL,
    target_time VARCHAR(8) NOT NULL,
    publish_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'cancelled', 'failed')),
    owner TEXT NOT NULL,
    cohort_label TEXT NULL,
    participants_count INT NOT NULL DEFAULT 0,
    description TEXT NULL,
    executed_at TIMESTAMPTZ NULL,
    failure_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_publication_schedules_target ON publication_schedules(target_date, target_time);
CREATE INDEX idx_publication_schedules_pending ON publication_schedules(status, publish_at) WHERE status = 'scheduled';
CREATE INDEX idx_publication_schedules_entity ON publication_schedules(entity_type, entity_id);

-- 2. Application-Level Role Policies (Fine-grained module permission matrix, separate from Keycloak)
CREATE TABLE app_role_policies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_system BOOLEAN NOT NULL DEFAULT false,
    user_count INT NOT NULL DEFAULT 0,
    permissions JSONB NOT NULL CHECK (jsonb_typeof(permissions) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed canonical role policies
INSERT INTO app_role_policies (id, name, description, is_system, user_count, permissions) VALUES
(
    'super-administrator',
    'Super Administrator',
    'Akses penuh tanpa batas ke seluruh modul, konfigurasi sistem, dan manajemen keamanan.',
    true,
    2,
    '{
        "dashboard": ["read"],
        "workflow": ["read", "create", "edit", "review", "publish", "delete"],
        "review-queue": ["read", "create", "edit", "review", "publish", "delete"],
        "schedule": ["read", "create", "edit", "review", "publish", "delete"],
        "statistics": ["read"],
        "knowledge": ["read", "create", "edit", "review", "publish", "delete"],
        "news": ["read", "create", "edit", "review", "publish", "delete"],
        "announcements": ["read", "create", "edit", "review", "publish", "delete"],
        "faqs": ["read", "create", "edit", "review", "publish", "delete"],
        "training-programs": ["read", "create", "edit", "review", "publish", "delete"],
        "microlearning": ["read", "create", "edit", "review", "publish", "delete"],
        "learning-paths": ["read", "create", "edit", "review", "publish", "delete"],
        "media": ["read", "create", "edit", "review", "publish", "delete"],
        "media-gallery": ["read", "create", "edit", "review", "publish", "delete"],
        "knowledge-hierarchy": ["read", "create", "edit", "review", "publish", "delete"],
        "taxonomy": ["read", "create", "edit", "review", "publish", "delete"],
        "users": ["read", "create", "edit", "review", "publish", "delete"],
        "roles": ["read", "create", "edit", "review", "publish", "delete"],
        "integration-health": ["read"],
        "audit": ["read"],
        "platform-configuration": ["read", "create", "edit", "review", "publish", "delete"],
        "notifications": ["read", "create", "edit", "review", "publish", "delete"]
    }'::jsonb
),
(
    'portal-administrator',
    'Portal Administrator',
    'Pengelola utama platform dengan wewenang penuh atas konten, pengguna, integrasi, dan audit.',
    true,
    4,
    '{
        "dashboard": ["read"],
        "workflow": ["read", "create", "edit", "review", "publish", "delete"],
        "review-queue": ["read", "create", "edit", "review", "publish", "delete"],
        "schedule": ["read", "create", "edit", "review", "publish", "delete"],
        "statistics": ["read"],
        "knowledge": ["read", "create", "edit", "review", "publish", "delete"],
        "news": ["read", "create", "edit", "review", "publish", "delete"],
        "announcements": ["read", "create", "edit", "review", "publish", "delete"],
        "faqs": ["read", "create", "edit", "review", "publish", "delete"],
        "training-programs": ["read", "create", "edit", "review", "publish", "delete"],
        "microlearning": ["read", "create", "edit", "review", "publish", "delete"],
        "learning-paths": ["read", "create", "edit", "review", "publish", "delete"],
        "media": ["read", "create", "edit", "review", "publish", "delete"],
        "media-gallery": ["read", "create", "edit", "review", "publish", "delete"],
        "knowledge-hierarchy": ["read", "create", "edit", "review", "publish", "delete"],
        "taxonomy": ["read", "create", "edit", "review", "publish", "delete"],
        "users": ["read", "create", "edit", "review", "publish", "delete"],
        "roles": ["read", "create", "edit", "review", "publish", "delete"],
        "integration-health": ["read"],
        "audit": ["read"],
        "platform-configuration": ["read", "create", "edit", "review", "publish", "delete"],
        "notifications": ["read", "create", "edit", "review", "publish", "delete"]
    }'::jsonb
),
(
    'content-editor',
    'Content Editor',
    'Penulis dan pengelola draf materi editorial pada Pusat Pengetahuan, Berita, dan Pengumuman.',
    true,
    8,
    '{
        "dashboard": ["read"],
        "workflow": ["read", "edit"],
        "review-queue": ["read"],
        "schedule": ["read"],
        "statistics": ["read"],
        "knowledge": ["read", "create", "edit"],
        "news": ["read", "create", "edit"],
        "announcements": ["read", "create", "edit"],
        "faqs": ["read", "create", "edit"],
        "media-gallery": ["read", "create", "edit"],
        "media": ["read", "create", "edit"],
        "notifications": ["read"]
    }'::jsonb
),
(
    'reviewer',
    'Reviewer',
    'Peninjau editorial yang memverifikasi kelayakan draf sebelum diterbitkan ke publik.',
    true,
    5,
    '{
        "dashboard": ["read"],
        "workflow": ["read", "edit"],
        "review-queue": ["read", "review", "publish"],
        "schedule": ["read"],
        "statistics": ["read"],
        "knowledge": ["read", "review"],
        "news": ["read", "review"],
        "announcements": ["read", "review"],
        "faqs": ["read", "review"],
        "training-programs": ["read", "review"],
        "microlearning": ["read", "review"],
        "learning-paths": ["read", "review"],
        "media-gallery": ["read"],
        "media": ["read"],
        "notifications": ["read"]
    }'::jsonb
);

-- 3. Editorial Review Notes
CREATE TABLE editorial_review_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    action VARCHAR(32) NOT NULL,
    notes TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    reviewer_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_editorial_review_notes_entity ON editorial_review_notes(entity_type, entity_id, created_at DESC);
