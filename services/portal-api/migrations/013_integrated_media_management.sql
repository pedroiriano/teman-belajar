-- TASK-004E: additive media-library evolution. Migration 004 remains immutable.
ALTER TABLE media_assets
    ADD COLUMN IF NOT EXISTS display_filename VARCHAR(255);

UPDATE media_assets
SET display_filename = original_filename
WHERE display_filename IS NULL AND original_filename IS NOT NULL;

WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY media_id, entity_type, entity_id, usage_role
               ORDER BY created_at ASC, id ASC
           ) AS row_number
    FROM media_usages
)
DELETE FROM media_usages
WHERE id IN (SELECT id FROM ranked WHERE row_number > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_media_usages_identity
    ON media_usages (media_id, entity_type, entity_id, usage_role);
