-- Migration 028: Update default hero banners image_url to media library URLs.
-- Forward-only and additive data migration.

UPDATE hero_banners
SET image_url = '/api/v1/media/cd8bf0dc-43ea-471d-9889-d2c043b8d980/content',
    updated_at = NOW()
WHERE id = 'a1111111-1111-1111-1111-111111111111';

UPDATE hero_banners
SET image_url = '/api/v1/media/4813a236-694b-43a6-8798-3de3ac897ec7/content',
    updated_at = NOW()
WHERE id = 'a2222222-2222-2222-2222-222222222222';

UPDATE hero_banners
SET image_url = '/api/v1/media/a102e5d9-e913-4cdf-b97e-b2cb65ef5ea3/content',
    updated_at = NOW()
WHERE id = 'a3333333-3333-3333-3333-333333333333';
