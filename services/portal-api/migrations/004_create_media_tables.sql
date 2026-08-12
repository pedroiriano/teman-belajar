CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY,
    storage_key VARCHAR(255) UNIQUE NOT NULL,
    bucket VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    detected_mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    title VARCHAR(255),
    alt_text VARCHAR(255),
    caption TEXT,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets(status);

CREATE TABLE IF NOT EXISTS media_usages (
    id UUID PRIMARY KEY,
    media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    usage_role VARCHAR(50) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_media_usages_media ON media_usages(media_id);
CREATE INDEX IF NOT EXISTS idx_media_usages_entity ON media_usages(entity_type, entity_id);
