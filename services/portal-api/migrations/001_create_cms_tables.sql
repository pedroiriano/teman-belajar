CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    domain VARCHAR(50) NOT NULL,
    slug VARCHAR(220) NOT NULL,
    name VARCHAR(220) NOT NULL
);

CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY,
    slug VARCHAR(220) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    excerpt VARCHAR(500),
    body TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    category_id UUID REFERENCES categories(id),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at);
CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug);

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY,
    slug VARCHAR(220) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_start_at ON announcements(start_at);
CREATE INDEX IF NOT EXISTS idx_announcements_end_at ON announcements(end_at);
CREATE INDEX IF NOT EXISTS idx_announcements_slug ON announcements(slug);
