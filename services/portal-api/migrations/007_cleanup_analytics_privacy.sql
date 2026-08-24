DO $$
BEGIN
   IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'search_events') THEN
      EXECUTE 'UPDATE search_events SET raw_query = NULL WHERE raw_query IS NOT NULL';
   END IF;
END $$;
