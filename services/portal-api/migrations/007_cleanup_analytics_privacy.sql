UPDATE analytics.events SET metadata = metadata - 'query' - 'raw_query' - 'q' WHERE metadata ?| array['query', 'raw_query', 'q'];
ALTER TABLE analytics.events ALTER COLUMN visitor_id DROP NOT NULL;
DELETE FROM analytics.events WHERE url LIKE '%<script>%';
DELETE FROM analytics.page_daily WHERE path ILIKE '%script%';
