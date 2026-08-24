-- TASK-011A: server-authoritative, owner-isolated authoring drafts.
ALTER TABLE news
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE announcements
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS form_drafts (
    id UUID PRIMARY KEY,
    actor_subject UUID NOT NULL,
    draft_key UUID NOT NULL,
    form_key VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID,
    schema_version INTEGER NOT NULL DEFAULT 1,
    payload JSONB NOT NULL,
    base_entity_version VARCHAR(128),
    revision BIGINT NOT NULL DEFAULT 1,
    client_updated_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_form_drafts_owner_key UNIQUE (actor_subject, draft_key),
    CONSTRAINT ck_form_drafts_revision_positive CHECK (revision > 0),
    CONSTRAINT ck_form_drafts_schema_version_positive CHECK (schema_version > 0),
    CONSTRAINT ck_form_drafts_payload_object CHECK (jsonb_typeof(payload) = 'object'),
    CONSTRAINT ck_form_drafts_payload_size CHECK (octet_length(payload::text) <= 262144)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_form_drafts_edit_identity
    ON form_drafts (actor_subject, entity_type, entity_id)
    WHERE entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_form_drafts_owner_form_updated
    ON form_drafts (actor_subject, form_key, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_form_drafts_expiry
    ON form_drafts (expires_at);
