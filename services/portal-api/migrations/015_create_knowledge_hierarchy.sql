CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id UUID PRIMARY KEY,
    parent_id UUID REFERENCES knowledge_nodes(id) ON DELETE RESTRICT,
    node_type VARCHAR(32) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(1000),
    sort_order INT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    CONSTRAINT knowledge_nodes_type_check CHECK (
        node_type IN ('collection', 'aspect', 'indicator', 'sub_indicator', 'topic', 'section')
    ),
    CONSTRAINT knowledge_nodes_status_check CHECK (status IN ('active', 'archived')),
    CONSTRAINT knowledge_nodes_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT knowledge_nodes_sort_order_check CHECK (sort_order BETWEEN 1 AND 10000),
    CONSTRAINT knowledge_nodes_version_check CHECK (version >= 1),
    CONSTRAINT knowledge_nodes_not_self_parent CHECK (parent_id IS NULL OR parent_id <> id),
    CONSTRAINT knowledge_nodes_sibling_slug_unique
        UNIQUE NULLS NOT DISTINCT (parent_id, slug) DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT knowledge_nodes_sibling_order_unique
        UNIQUE NULLS NOT DISTINCT (parent_id, sort_order) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_parent
    ON knowledge_nodes(parent_id, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_status
    ON knowledge_nodes(status);

CREATE TABLE IF NOT EXISTS knowledge_article_nodes (
    article_id UUID PRIMARY KEY REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_knowledge_article_nodes_node
    ON knowledge_article_nodes(node_id, article_id);

CREATE OR REPLACE FUNCTION validate_knowledge_node_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    parent_depth INT := 0;
    subtree_height INT := 1;
    contains_self BOOLEAN := FALSE;
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_id, 1 AS depth
            FROM knowledge_nodes
            WHERE id = NEW.parent_id
            UNION ALL
            SELECT n.id, n.parent_id, a.depth + 1
            FROM knowledge_nodes n
            JOIN ancestors a ON n.id = a.parent_id
            WHERE a.depth < 9
        )
        SELECT COALESCE(MAX(depth), 0), COALESCE(BOOL_OR(id = NEW.id), FALSE)
        INTO parent_depth, contains_self
        FROM ancestors;

        IF parent_depth = 0 THEN
            RAISE EXCEPTION 'knowledge parent does not exist' USING ERRCODE = '23503';
        END IF;
        IF contains_self THEN
            RAISE EXCEPTION 'knowledge hierarchy cycle is not allowed' USING ERRCODE = '23514';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        WITH RECURSIVE descendants AS (
            SELECT id, 1 AS depth
            FROM knowledge_nodes
            WHERE id = NEW.id
            UNION ALL
            SELECT n.id, d.depth + 1
            FROM knowledge_nodes n
            JOIN descendants d ON n.parent_id = d.id
            WHERE d.depth < 9
        )
        SELECT COALESCE(MAX(depth), 1) INTO subtree_height FROM descendants;
    END IF;

    IF parent_depth + subtree_height > 8 THEN
        RAISE EXCEPTION 'knowledge hierarchy depth exceeds eight' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS knowledge_nodes_validate_hierarchy ON knowledge_nodes;
CREATE TRIGGER knowledge_nodes_validate_hierarchy
BEFORE INSERT OR UPDATE OF parent_id ON knowledge_nodes
FOR EACH ROW EXECUTE FUNCTION validate_knowledge_node_hierarchy();
