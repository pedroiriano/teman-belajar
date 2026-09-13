-- Migration 027: Create hero_banners table and seed initial 3 hero banners.
-- This migration is additive and forward-only.

CREATE TABLE IF NOT EXISTS hero_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(1024) NOT NULL,
    cta_label VARCHAR(100) NOT NULL DEFAULT '',
    cta_href VARCHAR(1024) NOT NULL DEFAULT '',
    align VARCHAR(20) NOT NULL DEFAULT 'left' CHECK (align IN ('left', 'center', 'right')),
    sort_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'system',
    updated_by VARCHAR(255) DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_hero_banners_active_sort
    ON hero_banners (is_active, sort_order ASC);

-- Seed initial 3 active banners from Web Publik Hero Banner
INSERT INTO hero_banners (id, title, description, image_url, cta_label, cta_href, align, sort_order, is_active, created_by, updated_by)
VALUES
    (
        'a1111111-1111-1111-1111-111111111111',
        'Bangun Kompetensi untuk Masa Depan',
        'Temukan pembelajaran terarah untuk mengembangkan keahlian, memperluas wawasan, dan mencapai tujuan profesional Anda.',
        '/techwind/hero/bg01.jpg',
        'Jelajahi Katalog',
        '/catalog',
        'left',
        1,
        TRUE,
        'system',
        'system'
    ),
    (
        'a2222222-2222-2222-2222-222222222222',
        'Belajar Singkat, Berdampak Nyata',
        'Akses materi singkat, webinar, dan kelas praktis yang dapat diterapkan langsung dalam pekerjaan sehari-hari.',
        '/techwind/hero/bg02.jpg',
        'Lihat Pembelajaran Singkat',
        '/microlearning',
        'center',
        2,
        TRUE,
        'system',
        'system'
    ),
    (
        'a3333333-3333-3333-3333-333333333333',
        'Susun Jalur Belajar Anda',
        'Ikuti rangkaian pembelajaran bertahap untuk membangun kompetensi yang relevan dengan peran dan tujuan karier.',
        '/techwind/hero/bg03.jpg',
        'Jelajahi Jalur Belajar',
        '/learning-paths',
        'right',
        3,
        TRUE,
        'system',
        'system'
    )
ON CONFLICT (id) DO NOTHING;
