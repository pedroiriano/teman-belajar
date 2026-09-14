-- Migration 029: Create training program ratings and reviews table
-- Allows learners to rate (1-5 stars) and write reviews for training programs,
-- with moderation status and fast aggregate queries.

CREATE TABLE IF NOT EXISTS training_program_reviews (
    id UUID PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    program_slug VARCHAR(160) NOT NULL,
    moodle_course_id BIGINT,
    user_subject VARCHAR(255) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(200) NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'flagged')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_training_program_reviews_program_user UNIQUE (program_id, user_subject)
);

CREATE INDEX IF NOT EXISTS idx_training_reviews_public
    ON training_program_reviews (program_slug, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_reviews_admin
    ON training_program_reviews (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_reviews_user
    ON training_program_reviews (user_subject, created_at DESC);
