ALTER TABLE analytics.learning_daily
ADD COLUMN IF NOT EXISTS eligible_enrolments INT NOT NULL DEFAULT 0;
