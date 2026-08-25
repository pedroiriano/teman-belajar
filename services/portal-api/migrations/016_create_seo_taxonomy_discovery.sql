-- TASK-011D: reusable SEO, taxonomy, slug history, and public discovery.
-- Forward-only: earlier migrations remain immutable.

ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS description VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS normalized_name VARCHAR(220),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE categories
SET name = regexp_replace(btrim(name), '\s+', ' ', 'g'),
    slug = lower(regexp_replace(btrim(slug), '[^a-zA-Z0-9]+', '-', 'g')),
    normalized_name = lower(regexp_replace(btrim(name), '\s+', ' ', 'g')),
    updated_at = NOW()
WHERE normalized_name IS NULL;

ALTER TABLE categories
    ALTER COLUMN normalized_name SET NOT NULL,
    ADD CONSTRAINT categories_status_check CHECK (status IN ('active', 'archived')) NOT VALID,
    ADD CONSTRAINT categories_normalized_name_check CHECK (normalized_name = lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) NOT VALID,
    ADD CONSTRAINT categories_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$') NOT VALID;

ALTER TABLE categories VALIDATE CONSTRAINT categories_status_check;
ALTER TABLE categories VALIDATE CONSTRAINT categories_normalized_name_check;
ALTER TABLE categories VALIDATE CONSTRAINT categories_slug_check;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_domain_normalized_name
    ON categories (domain, normalized_name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_domain_slug
    ON categories (domain, slug);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_public_route_slug
    ON categories (slug);

ALTER TABLE announcements
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE RESTRICT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_articles_category_fk'
    ) THEN
        ALTER TABLE knowledge_articles
            ADD CONSTRAINT knowledge_articles_category_fk
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT NOT VALID;
    END IF;
END $$;
ALTER TABLE knowledge_articles VALIDATE CONSTRAINT knowledge_articles_category_fk;

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY,
    slug VARCHAR(120) NOT NULL,
    name VARCHAR(120) NOT NULL,
    normalized_name VARCHAR(120) NOT NULL,
    description VARCHAR(1000),
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tags_status_check CHECK (status IN ('active', 'archived')),
    CONSTRAINT tags_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT tags_normalized_name_check CHECK (normalized_name = lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))),
    CONSTRAINT tags_slug_unique UNIQUE (slug),
    CONSTRAINT tags_normalized_name_unique UNIQUE (normalized_name)
);

CREATE TABLE IF NOT EXISTS content_tags (
    content_type VARCHAR(24) NOT NULL,
    content_id UUID NOT NULL,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    PRIMARY KEY (content_type, content_id, tag_id),
    CONSTRAINT content_tags_type_check CHECK (content_type IN ('news', 'announcement', 'knowledge'))
);
CREATE INDEX IF NOT EXISTS idx_content_tags_tag_content
    ON content_tags (tag_id, content_type, content_id);

CREATE TABLE IF NOT EXISTS seo_profiles (
    content_type VARCHAR(24) NOT NULL,
    content_id UUID NOT NULL,
    seo_title VARCHAR(200),
    meta_description VARCHAR(500),
    social_title VARCHAR(200),
    social_description VARCHAR(500),
    social_media_id UUID REFERENCES media_assets(id) ON DELETE RESTRICT,
    indexable BOOLEAN NOT NULL DEFAULT TRUE,
    canonical_path VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    PRIMARY KEY (content_type, content_id),
    CONSTRAINT seo_profiles_type_check CHECK (content_type IN ('news', 'announcement', 'knowledge')),
    CONSTRAINT seo_profiles_canonical_path_check CHECK (
        canonical_path IS NULL OR (
            canonical_path ~ '^/[a-z0-9/_-]+$'
            AND canonical_path NOT LIKE '//%'
            AND canonical_path NOT LIKE '%..%'
            AND canonical_path NOT LIKE '%\\%'
        )
    )
);
CREATE INDEX IF NOT EXISTS idx_seo_profiles_indexable
    ON seo_profiles (content_type, indexable, updated_at DESC);

CREATE TABLE IF NOT EXISTS slug_redirects (
    id UUID PRIMARY KEY,
    content_type VARCHAR(24) NOT NULL,
    content_id UUID NOT NULL,
    old_slug VARCHAR(255) NOT NULL,
    new_slug VARCHAR(255) NOT NULL,
    http_status SMALLINT NOT NULL DEFAULT 308,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT slug_redirects_type_check CHECK (content_type IN ('news', 'announcement', 'knowledge')),
    CONSTRAINT slug_redirects_status_check CHECK (http_status IN (301, 308)),
    CONSTRAINT slug_redirects_old_slug_check CHECK (old_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT slug_redirects_new_slug_check CHECK (new_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT slug_redirects_no_self_loop CHECK (old_slug <> new_slug),
    CONSTRAINT slug_redirects_old_slug_unique UNIQUE (content_type, old_slug)
);
CREATE INDEX IF NOT EXISTS idx_slug_redirects_content
    ON slug_redirects (content_type, content_id, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_historical_slug_reuse()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM slug_redirects
        WHERE content_type = TG_ARGV[0]
          AND old_slug = NEW.slug
          AND content_id <> NEW.id
    ) THEN
        RAISE EXCEPTION 'slug is reserved by published history'
            USING ERRCODE = '23505';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS news_historical_slug_guard ON news;
CREATE TRIGGER news_historical_slug_guard
BEFORE INSERT OR UPDATE OF slug ON news
FOR EACH ROW EXECUTE FUNCTION prevent_historical_slug_reuse('news');

DROP TRIGGER IF EXISTS announcement_historical_slug_guard ON announcements;
CREATE TRIGGER announcement_historical_slug_guard
BEFORE INSERT OR UPDATE OF slug ON announcements
FOR EACH ROW EXECUTE FUNCTION prevent_historical_slug_reuse('announcement');

DROP TRIGGER IF EXISTS knowledge_historical_slug_guard ON knowledge_articles;
CREATE TRIGGER knowledge_historical_slug_guard
BEFORE INSERT OR UPDATE OF slug ON knowledge_articles
FOR EACH ROW EXECUTE FUNCTION prevent_historical_slug_reuse('knowledge');
