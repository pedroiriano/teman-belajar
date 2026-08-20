UPDATE search_events
SET raw_query = NULL
WHERE raw_query IS NOT NULL;
