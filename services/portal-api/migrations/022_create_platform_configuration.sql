CREATE TABLE platform_config_versions (
    id UUID PRIMARY KEY,
    version BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
    status VARCHAR(16) NOT NULL CHECK (status IN ('draft', 'published', 'superseded')),
    config JSONB NOT NULL CHECK (jsonb_typeof(config) = 'object'),
    based_on_version BIGINT NULL,
    created_by TEXT NOT NULL,
    published_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ NULL,
    CONSTRAINT platform_config_based_on_fk FOREIGN KEY (based_on_version) REFERENCES platform_config_versions(version),
    CONSTRAINT platform_config_publish_time_ck CHECK ((status = 'published' AND published_at IS NOT NULL) OR status <> 'published')
);

CREATE UNIQUE INDEX platform_config_one_draft_idx ON platform_config_versions(status) WHERE status = 'draft';
CREATE UNIQUE INDEX platform_config_one_published_idx ON platform_config_versions(status) WHERE status = 'published';
CREATE INDEX platform_config_history_idx ON platform_config_versions(version DESC);
