CREATE TABLE IF NOT EXISTS knowledge_articles (
    id UUID PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    category_id UUID,
    published_revision_no INT,
    current_revision_no INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    last_reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS knowledge_revisions (
    id UUID PRIMARY KEY,
    article_id UUID NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    revision_no INT NOT NULL,
    body TEXT NOT NULL,
    author_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (article_id, revision_no)
);

CREATE TABLE IF NOT EXISTS knowledge_related_articles (
    article_id_1 UUID NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    article_id_2 UUID NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id_1, article_id_2),
    CHECK (article_id_1 != article_id_2)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category ON knowledge_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_status ON knowledge_articles(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_revisions_article ON knowledge_revisions(article_id);
