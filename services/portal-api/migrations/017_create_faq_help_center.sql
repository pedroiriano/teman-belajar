-- TASK-017: governed FAQ CMS and public Help Center.
-- Forward-only. FAQ text remains plain text; media bytes stay owned by MinIO.

CREATE TABLE faq_categories (
    id UUID PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    sort_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    CONSTRAINT faq_categories_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT faq_categories_status_check CHECK (status IN ('active', 'archived')),
    CONSTRAINT faq_categories_sort_check CHECK (sort_order BETWEEN 0 AND 10000)
);

CREATE UNIQUE INDEX uq_faq_categories_normalized_name
    ON faq_categories (lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));
CREATE INDEX idx_faq_categories_public_order
    ON faq_categories (status, sort_order, name);

CREATE TABLE faq_items (
    id UUID PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES faq_categories(id) ON DELETE RESTRICT,
    slug VARCHAR(160) NOT NULL UNIQUE,
    question VARCHAR(300) NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    media_asset_id UUID REFERENCES media_assets(id) ON DELETE RESTRICT,
    media_alt VARCHAR(255),
    seo_title VARCHAR(200),
    meta_description VARCHAR(500),
    indexable BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 1,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    CONSTRAINT faq_items_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT faq_items_status_check CHECK (status IN ('draft', 'in_review', 'approved', 'published', 'archived')),
    CONSTRAINT faq_items_sort_check CHECK (sort_order BETWEEN 0 AND 10000),
    CONSTRAINT faq_items_media_alt_check CHECK (
        (media_asset_id IS NULL AND media_alt IS NULL) OR
        (media_asset_id IS NOT NULL AND media_alt IS NOT NULL AND length(btrim(media_alt)) > 0)
    )
);

CREATE INDEX idx_faq_items_public
    ON faq_items (category_id, status, sort_order, published_at DESC);
CREATE INDEX idx_faq_items_admin
    ON faq_items (status, updated_at DESC);

-- Preserve the four formerly hard-coded FAQ entries as governed published data.
INSERT INTO faq_categories (id, slug, name, description, sort_order)
VALUES ('17000000-0000-4000-8000-000000000001', 'memulai', 'Memulai', 'Jawaban dasar untuk mulai menggunakan Teman Belajar.', 10);

INSERT INTO faq_items (id, category_id, slug, question, answer, sort_order, status, seo_title, meta_description, published_at)
VALUES
('17000000-0000-4000-8000-000000000011', '17000000-0000-4000-8000-000000000001', 'apa-yang-dapat-ditemukan', 'Apa yang dapat ditemukan di Teman Belajar?', 'Teman Belajar menyatukan kelas formal, artikel pengetahuan, berita, dan pengumuman organisasi dalam pengalaman yang konsisten.', 10, 'published', 'Apa yang tersedia di Teman Belajar?', 'Pelajari jenis pembelajaran dan informasi yang tersedia di Teman Belajar.', NOW()),
('17000000-0000-4000-8000-000000000012', '17000000-0000-4000-8000-000000000001', 'lokasi-kelas-formal', 'Di mana kelas formal saya dipelajari?', 'Kelas formal tetap dikelola oleh Moodle. Teman Belajar menyediakan pengalaman penemuan dan ringkasan pembelajaran, lalu mengarahkan Anda dengan SSO yang aman.', 20, 'published', 'Lokasi kelas formal Teman Belajar', 'Ketahui hubungan Portal Teman Belajar dengan pembelajaran formal di Moodle.', NOW()),
('17000000-0000-4000-8000-000000000013', '17000000-0000-4000-8000-000000000001', 'kualitas-artikel', 'Bagaimana kualitas artikel dijaga?', 'Artikel melewati alur draft, review, persetujuan, publikasi, dan arsip. Konten publik berasal dari revisi yang telah disetujui.', 30, 'published', 'Workflow kualitas artikel', 'Pelajari proses editorial yang menjaga kualitas artikel Teman Belajar.', NOW()),
('17000000-0000-4000-8000-000000000014', '17000000-0000-4000-8000-000000000001', 'tema-terang-dan-gelap', 'Apakah tema terang dan gelap tersedia?', 'Ya. Pilihan tema tersimpan di perangkat dan dapat diubah kapan saja melalui kontrol pada header.', 40, 'published', 'Tema terang dan gelap', 'Cara menggunakan pilihan tema terang dan gelap di Teman Belajar.', NOW());
