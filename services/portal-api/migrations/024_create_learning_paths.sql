-- TASK-016: versioned learning paths with stable learner version bindings.
CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY,
    slug VARCHAR(160) NOT NULL UNIQUE,
    row_version BIGINT NOT NULL DEFAULT 1 CHECK (row_version > 0),
    latest_version_number INT NOT NULL DEFAULT 1 CHECK (latest_version_number > 0),
    published_version_number INT,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_path_versions (
    id UUID PRIMARY KEY,
    path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE RESTRICT,
    version_number INT NOT NULL CHECK (version_number > 0),
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(1000) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('draft','in_review','approved','published','archived')),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL,
    UNIQUE (path_id, version_number)
);

CREATE TABLE IF NOT EXISTS learning_path_items (
    id UUID PRIMARY KEY,
    path_version_id UUID NOT NULL REFERENCES learning_path_versions(id) ON DELETE RESTRICT,
    item_key VARCHAR(80) NOT NULL,
    item_kind VARCHAR(32) NOT NULL CHECK (item_kind IN ('course','knowledge','microlearning','webinar')),
    source_ref VARCHAR(160) NOT NULL,
    label VARCHAR(200) NOT NULL,
    summary VARCHAR(1000),
    source_url VARCHAR(500),
    source_state VARCHAR(32) NOT NULL CHECK (source_state IN ('available','degraded','unavailable')),
    source_checked_at TIMESTAMPTZ NOT NULL,
    sort_order INT NOT NULL CHECK (sort_order BETWEEN 1 AND 1000),
    required BOOLEAN NOT NULL DEFAULT TRUE,
    milestone BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (path_version_id, item_key),
    UNIQUE (path_version_id, item_kind, source_ref),
    UNIQUE (path_version_id, sort_order)
);

CREATE TABLE IF NOT EXISTS learning_path_prerequisites (
    item_id UUID NOT NULL REFERENCES learning_path_items(id) ON DELETE RESTRICT,
    prerequisite_item_id UUID NOT NULL REFERENCES learning_path_items(id) ON DELETE RESTRICT,
    PRIMARY KEY (item_id, prerequisite_item_id),
    CHECK (item_id <> prerequisite_item_id)
);

CREATE TABLE IF NOT EXISTS learning_path_enrollments (
    id UUID PRIMARY KEY,
    path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE RESTRICT,
    path_version_id UUID NOT NULL REFERENCES learning_path_versions(id) ON DELETE RESTRICT,
    user_subject VARCHAR(255) NOT NULL,
    first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (path_id, user_subject)
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_public ON learning_paths (updated_at DESC, id) WHERE published_version_number IS NOT NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_learning_path_versions_path ON learning_path_versions (path_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_learning_path_items_version_order ON learning_path_items (path_version_id, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_learning_path_enrollments_user ON learning_path_enrollments (user_subject, last_viewed_at DESC);
