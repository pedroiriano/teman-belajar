-- 026_create_cms_revisions_and_batch_operations.sql
-- Migration to persist news revisions, announcement revisions, and editorial recommendation pins.

-- 1. News Revisions
CREATE TABLE IF NOT EXISTS news_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    revision_no INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    excerpt VARCHAR(500),
    body TEXT NOT NULL,
    author_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (news_id, revision_no)
);

CREATE INDEX IF NOT EXISTS idx_news_revisions_news ON news_revisions(news_id, revision_no DESC);

-- 2. Announcement Revisions
CREATE TABLE IF NOT EXISTS announcement_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    revision_no INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    author_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (announcement_id, revision_no)
);

CREATE INDEX IF NOT EXISTS idx_announcement_revisions_ann ON announcement_revisions(announcement_id, revision_no DESC);

-- 3. Editorial Recommendation Pins (Curation for Personalization & Recommendation)
CREATE TABLE IF NOT EXISTS editorial_recommendation_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(32) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    pinned BOOLEAN NOT NULL DEFAULT true,
    weight INT NOT NULL DEFAULT 100,
    pinned_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rec_pins_lookup ON editorial_recommendation_pins(target_type, pinned, weight DESC);

-- 4. Backfill existing records as initial revisions
INSERT INTO news_revisions (id, news_id, revision_no, title, excerpt, body, author_id, created_at)
SELECT gen_random_uuid(), id, COALESCE(version, 1)::INT, title, excerpt, body, created_by, created_at
FROM news
ON CONFLICT (news_id, revision_no) DO NOTHING;

INSERT INTO announcement_revisions (id, announcement_id, revision_no, title, body, author_id, created_at)
SELECT gen_random_uuid(), id, COALESCE(version, 1)::INT, title, body, created_by, created_at
FROM announcements
ON CONFLICT (announcement_id, revision_no) DO NOTHING;
