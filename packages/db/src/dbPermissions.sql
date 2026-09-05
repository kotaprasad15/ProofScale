-- =============================================================================
-- ProofScale / Ratecap Least-Privilege Database Role Configuration
-- Requirement 20: Restrict database permissions using least privilege
-- =============================================================================

-- =============================================================================
-- PART 1: PostgreSQL / Supabase Roles & Grants
-- =============================================================================

-- 1. Create dedicated application runtime user (cannot alter schemas or drop tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ratecap_app') THEN
    CREATE ROLE ratecap_app WITH LOGIN PASSWORD 'CHANGE_IN_PRODUCTION_SECURE_PASSWORD';
  END IF;
END
$$;

-- 2. Create migration/DBA user (used strictly during deployments / CI migrations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ratecap_migrator') THEN
    CREATE ROLE ratecap_migrator WITH LOGIN PASSWORD 'CHANGE_IN_PRODUCTION_MIGRATOR_PASSWORD';
  END IF;
END
$$;

-- 3. Restrict Public Schema Access
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ratecap_app;
GRANT USAGE, CREATE ON SCHEMA public TO ratecap_migrator;

-- 4. Grant Least-Privilege Data Manipulation (DML ONLY) to ratecap_app
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ratecap_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ratecap_app;

-- Ensure future tables created by migrations automatically grant DML to runtime role
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ratecap_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ratecap_app;

-- 5. Revoke dangerous DDL and administrative privileges from runtime role
REVOKE CREATE ON SCHEMA public FROM ratecap_app;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM ratecap_app;
REVOKE TRIGGER ON ALL TABLES IN SCHEMA public FROM ratecap_app;

-- 6. Grant Full DDL and DML to migration role (ratecap_migrator)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ratecap_migrator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ratecap_migrator;

-- =============================================================================
-- PART 2: SQLite File Permissions & Runtime Isolation
-- =============================================================================

-- SQLite runs in-process, meaning OS filesystem permissions enforce access boundaries.
-- Production deployment guidelines:
-- 1. Restrict SQLite database file permissions to the application execution user:
--    chmod 600 proofscale.sqlite proofscale.sqlite-wal proofscale.sqlite-shm
--    chown ratecap:ratecap proofscale.sqlite*
-- 2. Prohibit direct web/HTTP directory access: SQLite files must never reside in
--    public static file root directories.
-- 3. In SQLite connections, disable loading extensions and attachment of external files:
--    PRAGMA trusted_schema = OFF;
--    PRAGMA cell_size_check = ON;
