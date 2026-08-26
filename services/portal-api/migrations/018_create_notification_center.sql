CREATE SCHEMA IF NOT EXISTS notification;

-- CREATE IF NOT EXISTS safely adopts the identical pre-release local schema
-- produced by the recovered, formerly uncommitted TASK-021 implementation.
-- Released environments still receive the complete canonical definition below.
CREATE TABLE IF NOT EXISTS notification.inbox (
    id UUID PRIMARY KEY,
    user_subject UUID NOT NULL,
    audience TEXT NOT NULL CHECK (audience IN ('portal', 'admin')),
    event_id TEXT NOT NULL CHECK (char_length(event_id) BETWEEN 1 AND 128),
    schema_version TEXT NOT NULL CHECK (schema_version = '1.0'),
    source TEXT NOT NULL CHECK (source ~ '^[a-z][a-z0-9._-]{1,63}$'),
    event_type TEXT NOT NULL CHECK (event_type IN ('learning.reminder', 'learning.course_updated', 'learning.course_completed', 'content.workflow', 'system.notice')),
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
    deep_link TEXT NOT NULL CHECK (char_length(deep_link) BETWEEN 1 AND 512),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
    available_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > available_at),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notification_inbox_delivery_unique UNIQUE (user_subject, audience, event_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_inbox_user_feed
    ON notification.inbox (user_subject, audience, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notification_inbox_scheduled
    ON notification.inbox (available_at, expires_at)
    WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS notification.preferences (
    user_subject UUID NOT NULL,
    audience TEXT NOT NULL CHECK (audience IN ('portal', 'admin')),
    event_type TEXT NOT NULL CHECK (event_type IN ('learning.reminder', 'learning.course_updated', 'learning.course_completed', 'content.workflow', 'system.notice')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_subject, audience, event_type)
);
