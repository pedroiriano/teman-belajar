-- TASK-022: curated public image galleries and video hubs.
CREATE TABLE IF NOT EXISTS media_collections (
    id UUID PRIMARY KEY,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(1000) NOT NULL,
    kind VARCHAR(32) NOT NULL CHECK (kind IN ('image_gallery', 'video_hub')),
    status VARCHAR(32) NOT NULL CHECK (status IN ('draft', 'in_review', 'approved', 'published', 'archived')),
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    seo_title VARCHAR(70),
    seo_description VARCHAR(160),
    indexable BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS media_collection_items (
    id UUID PRIMARY KEY,
    collection_id UUID NOT NULL REFERENCES media_collections(id) ON DELETE RESTRICT,
    media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    sort_order INT NOT NULL CHECK (sort_order BETWEEN 0 AND 10000),
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    caption VARCHAR(2000),
    alt_text VARCHAR(255),
    decorative BOOLEAN NOT NULL DEFAULT FALSE,
    transcript TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    UNIQUE (collection_id, media_id),
    UNIQUE (collection_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_media_collections_public
    ON media_collections (featured DESC, published_at DESC, id DESC)
    WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_media_collections_admin
    ON media_collections (status, kind, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_media_collection_items_order
    ON media_collection_items (collection_id, sort_order, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_media_collection_featured_item
    ON media_collection_items (collection_id) WHERE featured;
