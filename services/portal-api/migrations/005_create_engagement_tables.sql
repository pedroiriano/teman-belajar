CREATE TABLE IF NOT EXISTS engagement_bookmarks (
    id UUID PRIMARY KEY,
    user_subject VARCHAR(255) NOT NULL,
    target_type VARCHAR(32) NOT NULL CHECK (target_type IN ('knowledge')),
    target_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_subject, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_bookmarks_user_created
    ON engagement_bookmarks(user_subject, created_at DESC);

CREATE TABLE IF NOT EXISTS engagement_ratings (
    id UUID PRIMARY KEY,
    user_subject VARCHAR(255) NOT NULL,
    target_type VARCHAR(32) NOT NULL CHECK (target_type IN ('knowledge')),
    target_id VARCHAR(255) NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_subject, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_ratings_target
    ON engagement_ratings(target_type, target_id);

CREATE TABLE IF NOT EXISTS engagement_recent_views (
    id UUID PRIMARY KEY,
    user_subject VARCHAR(255) NOT NULL,
    target_type VARCHAR(32) NOT NULL CHECK (target_type IN ('knowledge')),
    target_id VARCHAR(255) NOT NULL,
    first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    view_count BIGINT NOT NULL DEFAULT 1 CHECK (view_count > 0),
    UNIQUE (user_subject, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_recent_views_user_last_viewed
    ON engagement_recent_views(user_subject, last_viewed_at DESC);
