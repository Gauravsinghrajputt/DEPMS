-- Run on first container start
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create read-only reporting user (optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'depms_readonly') THEN
    CREATE ROLE depms_readonly LOGIN PASSWORD 'readonly_pass_change_me';
    GRANT CONNECT ON DATABASE depms TO depms_readonly;
    GRANT USAGE ON SCHEMA public TO depms_readonly;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO depms_readonly;
  END IF;
END
$$;
