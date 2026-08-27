-- TASK-013: Portal-owned training program composition.
-- Moodle remains authoritative for course, enrolment, and completion state.

CREATE TABLE training_programs (
    id UUID PRIMARY KEY,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    audience VARCHAR(500),
    eligibility_text VARCHAR(1000),
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    version BIGINT NOT NULL DEFAULT 1,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    CONSTRAINT training_programs_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT training_programs_status_check CHECK (status IN ('draft', 'in_review', 'approved', 'published', 'archived'))
);

CREATE INDEX idx_training_programs_public
    ON training_programs (status, published_at DESC, title);
CREATE INDEX idx_training_programs_admin
    ON training_programs (status, updated_at DESC);

CREATE TABLE training_program_courses (
    program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    moodle_course_id BIGINT NOT NULL,
    sort_order INTEGER NOT NULL,
    required BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (program_id, moodle_course_id),
    CONSTRAINT training_program_courses_moodle_id_check CHECK (moodle_course_id > 1),
    CONSTRAINT training_program_courses_sort_check CHECK (sort_order BETWEEN 0 AND 10000),
    UNIQUE (program_id, sort_order)
);

CREATE INDEX idx_training_program_courses_external
    ON training_program_courses (moodle_course_id);

CREATE TABLE training_program_cohorts (
    id UUID PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    label VARCHAR(160) NOT NULL,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    enrollment_opens_at TIMESTAMPTZ,
    enrollment_closes_at TIMESTAMPTZ,
    status VARCHAR(16) NOT NULL DEFAULT 'scheduled',
    sort_order INTEGER NOT NULL,
    CONSTRAINT training_program_cohorts_status_check CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    CONSTRAINT training_program_cohorts_sort_check CHECK (sort_order BETWEEN 0 AND 10000),
    CONSTRAINT training_program_cohorts_schedule_check CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),
    CONSTRAINT training_program_cohorts_enrollment_check CHECK (enrollment_opens_at IS NULL OR enrollment_closes_at IS NULL OR enrollment_opens_at < enrollment_closes_at),
    UNIQUE (program_id, sort_order)
);

CREATE INDEX idx_training_program_cohorts_schedule
    ON training_program_cohorts (program_id, status, starts_at);
