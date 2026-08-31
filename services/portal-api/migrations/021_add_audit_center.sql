ALTER TABLE audit_events
    ADD COLUMN IF NOT EXISTS module VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ip_masked VARCHAR(64),
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE audit_events
    ADD CONSTRAINT audit_events_ip_masked_policy
    CHECK (ip_masked IS NULL OR ip_masked ~ '^[0-9A-Fa-f:.]+/(24|48)$') NOT VALID;

CREATE INDEX IF NOT EXISTS idx_audit_events_cursor ON audit_events(occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_module_time ON audit_events((COALESCE(NULLIF(module, ''), target_type)), occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_action_time ON audit_events(action, occurred_at DESC);
