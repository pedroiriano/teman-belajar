CREATE TABLE IF NOT EXISTS analytics.worker_state (
    singleton_id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (singleton_id = 1),
    last_rollup_success_at TIMESTAMP WITH TIME ZONE,
    last_moodle_sync_success_at TIMESTAMP WITH TIME ZONE,
    last_cleanup_success_at TIMESTAMP WITH TIME ZONE
);

INSERT INTO analytics.worker_state (singleton_id)
VALUES (1)
ON CONFLICT (singleton_id) DO NOTHING;

-- Trusted auth events do not have an anonymous browser visitor identifier.
ALTER TABLE analytics.events ALTER COLUMN visitor_id DROP NOT NULL;
