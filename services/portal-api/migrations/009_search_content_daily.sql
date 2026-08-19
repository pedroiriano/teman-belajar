CREATE TABLE IF NOT EXISTS analytics.search_daily (
    date DATE NOT NULL,
    total_searches INTEGER NOT NULL DEFAULT 0,
    zero_results INTEGER NOT NULL DEFAULT 0,
    result_clicks INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (date)
);

CREATE TABLE IF NOT EXISTS analytics.content_daily (
    date DATE NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (date, content_type, target_id)
);
