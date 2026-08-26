import { sqliteDb } from "./client.js";

export function runMigrations() {
  console.log("⚡ Running automatic database table initialization...");

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      onboarding_status TEXT NOT NULL DEFAULT 'completed',
      last_workspace_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL DEFAULT 'default-org',
      owner_user_id TEXT NOT NULL DEFAULT 'usr_admin_01',
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'active',
      invited_by_user_id TEXT,
      joined_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      owner_user_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      environment TEXT NOT NULL DEFAULT 'staging',
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'tester',
      status TEXT NOT NULL DEFAULT 'active',
      invited_by_user_id TEXT,
      joined_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      project_id TEXT,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      token_hash TEXT NOT NULL UNIQUE,
      invited_by_user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      accepted_at INTEGER,
      revoked_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS access_requests (
      id TEXT PRIMARY KEY,
      organization_id TEXT,
      project_id TEXT,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by_user_id TEXT,
      reviewed_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      organization_id TEXT,
      project_id TEXT,
      action TEXT NOT NULL,
      subject TEXT NOT NULL,
      metadata_json TEXT,
      ip_address TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS targets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      base_url TEXT NOT NULL,
      health_url TEXT,
      environment TEXT NOT NULL DEFAULT 'staging',
      authorization_status TEXT NOT NULL DEFAULT 'unverified',
      allowed_host TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_plans (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      profile TEXT NOT NULL DEFAULT 'smoke',
      scenarios_json TEXT NOT NULL,
      load_profile_json TEXT NOT NULL,
      thresholds_json TEXT NOT NULL,
      scoring_version TEXT NOT NULL DEFAULT 'mvp-1',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES test_plans(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
      target_version_label TEXT NOT NULL DEFAULT 'v1.0.0',
      status TEXT NOT NULL DEFAULT 'queued',
      score INTEGER,
      confidence TEXT,
      readiness_label TEXT,
      score_breakdown_json TEXT,
      summary_metrics_json TEXT,
      error_message TEXT,
      region TEXT NOT NULL DEFAULT 'local-us-east',
      lease_worker_id TEXT,
      lease_expires_at INTEGER,
      lease_heartbeat_at INTEGER,
      started_at INTEGER,
      finished_at INTEGER,
      requested_by_user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS run_events (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata_json TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      evidence TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'raw_runner_output',
      object_key TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      checksum TEXT NOT NULL,
      retention_until INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report_shares (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_by_user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `);

  // Column backfill/alter migrations for existing SQLite records
  try { sqliteDb.exec("ALTER TABLE organizations ADD COLUMN slug TEXT NOT NULL DEFAULT 'default-org';"); } catch {}
  try { sqliteDb.exec("ALTER TABLE organizations ADD COLUMN owner_user_id TEXT NOT NULL DEFAULT 'usr_admin_01';"); } catch {}
  try { sqliteDb.exec("ALTER TABLE organizations ADD COLUMN status TEXT NOT NULL DEFAULT 'active';"); } catch {}
  try { sqliteDb.exec("ALTER TABLE organization_members ADD COLUMN status TEXT NOT NULL DEFAULT 'active';"); } catch {}
  try { sqliteDb.exec("ALTER TABLE organization_members ADD COLUMN invited_by_user_id TEXT;"); } catch {}
  try { sqliteDb.exec("ALTER TABLE organization_members ADD COLUMN joined_at INTEGER;"); } catch {}
  try { sqliteDb.exec("ALTER TABLE projects ADD COLUMN owner_user_id TEXT;"); } catch {}
  try { sqliteDb.exec("ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'active';"); } catch {}

  console.log("✅ Database tables verified and initialized successfully.");
}

if (process.argv[1]?.includes("migrate")) {
  runMigrations();
}
