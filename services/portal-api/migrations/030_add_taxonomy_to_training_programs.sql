-- Migration 030: Add taxonomy (category, level, tags) to training_programs
-- Forward-only and safe additive migration

ALTER TABLE training_programs
    ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'Umum',
    ADD COLUMN IF NOT EXISTS level VARCHAR(30) NOT NULL DEFAULT 'Menengah',
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'training_programs_level_check'
    ) THEN
        ALTER TABLE training_programs
            ADD CONSTRAINT training_programs_level_check
            CHECK (level IN ('Pemula', 'Menengah', 'Mahir'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_training_programs_category
    ON training_programs (category);

CREATE INDEX IF NOT EXISTS idx_training_programs_level
    ON training_programs (level);

CREATE INDEX IF NOT EXISTS idx_training_programs_tags
    ON training_programs USING GIN (tags);

-- Backfill initial seeded and published programs
UPDATE training_programs SET category = 'Cloud & DevOps', level = 'Mahir', tags = ARRAY['Cloud', 'AWS', 'DevOps', 'Arsitektur'] WHERE slug = 'arsitektur-cloud-enterprise';
UPDATE training_programs SET category = 'Software Engineering', level = 'Menengah', tags = ARRAY['Web', 'Fullstack', 'Next.js', 'Go'] WHERE slug = 'fullstack-modern-web';
UPDATE training_programs SET category = 'Data & AI', level = 'Menengah', tags = ARRAY['Data Science', 'AI', 'Machine Learning', 'Python'] WHERE slug = 'data-science-ai-enterprise';
UPDATE training_programs SET category = 'Keamanan Siber', level = 'Mahir', tags = ARRAY['Cybersecurity', 'Security', 'Defense', 'Incident Response'] WHERE slug = 'cybersecurity-incident-defense';
UPDATE training_programs SET category = 'UI/UX & Desain', level = 'Menengah', tags = ARRAY['UI', 'UX', 'Design System', 'Figma'] WHERE slug = 'ui-ux-design-system-mastery';
UPDATE training_programs SET category = 'Manajemen Proyek', level = 'Pemula', tags = ARRAY['Manajemen Proyek', 'Agile', 'Scrum', 'Product'] WHERE slug = 'manajemen-proyek-agile';
UPDATE training_programs SET category = 'Aplikasi Perkantoran', level = 'Pemula', tags = ARRAY['Office', 'Word', 'Excel', 'Administrasi', 'Sertifikasi'] WHERE slug = 'pelatihan-microsoft-office-tingkat-dasar';
