CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.events (
    id UUID PRIMARY KEY,
    visitor_id UUID NOT NULL,
    actor_id UUID,
    event_type VARCHAR(100) NOT NULL,
    url VARCHAR(2048),
    referrer VARCHAR(2048),
    user_agent VARCHAR(1024),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor ON analytics.events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created ON analytics.events(event_type, created_at);

CREATE TABLE IF NOT EXISTS analytics.page_daily (
    date DATE NOT NULL,
    path VARCHAR(1024) NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (date, path)
);

CREATE TABLE IF NOT EXISTS analytics.learning_daily (
    date DATE NOT NULL,
    active_learners INTEGER NOT NULL DEFAULT 0,
    completions INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (date)
);

CREATE TABLE IF NOT EXISTS analytics.sso_daily (
    date DATE NOT NULL,
    successful_logins INTEGER NOT NULL DEFAULT 0,
    failed_logins INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (date)
);

