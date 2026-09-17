-- Migration 031: Create training program enrollments table
-- Manages learner enrollment applications and administrative confirmations

CREATE TABLE IF NOT EXISTS training_program_enrollments (
    id UUID PRIMARY KEY,
    user_subject VARCHAR(255) NOT NULL,
    user_name VARCHAR(200) NOT NULL,
    user_email VARCHAR(200) NOT NULL,
    program_slug VARCHAR(160) NOT NULL,
    program_title VARCHAR(200) NOT NULL,
    cohort_id UUID REFERENCES training_program_cohorts(id) ON DELETE SET NULL,
    cohort_label VARCHAR(160) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    notes TEXT,
    rejection_reason TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    confirmed_by VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_enrollment_status CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_tp_enrollments_user
    ON training_program_enrollments (user_subject, program_slug);

CREATE INDEX IF NOT EXISTS idx_tp_enrollments_status
    ON training_program_enrollments (status, applied_at DESC);
