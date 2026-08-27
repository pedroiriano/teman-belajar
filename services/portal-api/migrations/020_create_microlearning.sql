-- TASK-014: Portal-owned editorial microlearning. This is additive and forward-only.
CREATE TABLE microlearning_items (
    id UUID PRIMARY KEY,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    format VARCHAR(16) NOT NULL,
    duration_minutes SMALLINT NOT NULL,
    video_url VARCHAR(2048),
    featured_media_id UUID REFERENCES media_assets(id) ON DELETE RESTRICT,
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    version BIGINT NOT NULL DEFAULT 1,
    seo_title VARCHAR(70) NOT NULL DEFAULT '',
    seo_description VARCHAR(160) NOT NULL DEFAULT '',
    indexable BOOLEAN NOT NULL DEFAULT TRUE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(255),
    CONSTRAINT microlearning_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT microlearning_format_check CHECK (format IN ('article', 'video', 'quick')),
    CONSTRAINT microlearning_duration_check CHECK (duration_minutes BETWEEN 3 AND 15),
    CONSTRAINT microlearning_status_check CHECK (status IN ('draft', 'in_review', 'approved', 'published', 'archived')),
    CONSTRAINT microlearning_video_check CHECK (
        (format = 'video' AND video_url IS NOT NULL AND video_url ~ '^https://') OR
        (format <> 'video' AND video_url IS NULL)
    )
);

CREATE INDEX idx_microlearning_public
    ON microlearning_items (status, published_at DESC, title);
CREATE INDEX idx_microlearning_admin
    ON microlearning_items (status, updated_at DESC);

CREATE TABLE microlearning_related (
    item_id UUID NOT NULL REFERENCES microlearning_items(id) ON DELETE CASCADE,
    related_item_id UUID NOT NULL REFERENCES microlearning_items(id) ON DELETE CASCADE,
    sort_order SMALLINT NOT NULL,
    PRIMARY KEY (item_id, related_item_id),
    CONSTRAINT microlearning_related_not_self CHECK (item_id <> related_item_id),
    CONSTRAINT microlearning_related_sort_check CHECK (sort_order BETWEEN 1 AND 100)
);

CREATE TABLE microlearning_progress (
    user_subject VARCHAR(255) NOT NULL,
    item_id UUID NOT NULL REFERENCES microlearning_items(id) ON DELETE CASCADE,
    progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    position_seconds INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_subject, item_id),
    CONSTRAINT microlearning_progress_percent_check CHECK (progress_percent BETWEEN 0 AND 100),
    CONSTRAINT microlearning_position_check CHECK (position_seconds >= 0)
);

CREATE INDEX idx_microlearning_progress_user
    ON microlearning_progress (user_subject, updated_at DESC);

ALTER TABLE engagement_bookmarks
    DROP CONSTRAINT IF EXISTS engagement_bookmarks_target_type_check;
ALTER TABLE engagement_bookmarks
    ADD CONSTRAINT engagement_bookmarks_target_type_check
    CHECK (target_type IN ('knowledge', 'microlearning'));
