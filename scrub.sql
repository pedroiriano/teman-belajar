UPDATE analytics.events SET metadata = metadata - 'query' - 'raw_query' - 'q' WHERE metadata ?| array['query', 'raw_query', 'q'];
