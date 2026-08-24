-- Migration 012: Create Event Inbox and Outbox tables
-- Part of TASK-011: Moodle Event Inbox (ADR-011)

CREATE SCHEMA IF NOT EXISTS integration;

-- Event Inbox: receives and deduplicates external Moodle events
CREATE TABLE integration.event_inbox (
    id              BIGSERIAL       PRIMARY KEY,
    event_id        TEXT            NOT NULL,
    event_type      TEXT            NOT NULL,
    source          TEXT            NOT NULL,
    subject_id      TEXT            NOT NULL,
    occurred_at     TIMESTAMPTZ     NOT NULL,
    schema_version  TEXT            NOT NULL,
    payload         JSONB           NOT NULL DEFAULT '{}',
    fingerprint     TEXT            NOT NULL,
    status          TEXT            NOT NULL DEFAULT 'pending',
    attempts        INTEGER         NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ,
    error_category  TEXT,
    received_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT event_inbox_event_id_unique UNIQUE (event_id),
    CONSTRAINT event_inbox_status_check CHECK (status IN ('pending', 'processing', 'processed', 'dead_letter')),
    CONSTRAINT event_inbox_attempts_check CHECK (attempts >= 0)
);

-- Work acquisition index: pending events ready for processing
CREATE INDEX idx_event_inbox_work_queue
    ON integration.event_inbox (next_attempt_at)
    WHERE status IN ('pending', 'processing');

-- Dead-letter reconciliation index
CREATE INDEX idx_event_inbox_dead_letter
    ON integration.event_inbox (created_at)
    WHERE status = 'dead_letter';

-- Event Outbox: reliable internal publication after successful inbox processing
CREATE TABLE integration.event_outbox (
    id              BIGSERIAL       PRIMARY KEY,
    inbox_event_id  BIGINT          NOT NULL REFERENCES integration.event_inbox(id),
    event_type      TEXT            NOT NULL,
    payload         JSONB           NOT NULL DEFAULT '{}',
    published       BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT event_outbox_inbox_unique UNIQUE (inbox_event_id)
);

-- Unpublished outbox entries for future relay/polling
CREATE INDEX idx_event_outbox_unpublished
    ON integration.event_outbox (created_at)
    WHERE published = FALSE;
