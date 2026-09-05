import type Database from "better-sqlite3";
import { sqliteDb } from "./client.js";

export function runMigrations(customDb?: Database.Database) {
  const targetDb = customDb || sqliteDb;
  console.log("⚡ Running automatic database table initialization...");

  targetDb.exec(`
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
      owner_id TEXT NOT NULL DEFAULT 'usr_admin_01',
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
      authorization_status TEXT NOT NULL DEFAULT 'verified',
      allowed_host TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT 0
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
      safety_limits_json TEXT,
      scoring_version TEXT NOT NULL DEFAULT 'mvp-1',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token_hash TEXT NOT NULL UNIQUE,
      csrf_token TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      created_at INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      ip_address TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS processed_webhooks (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      processed_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_usage_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      requests_count INTEGER NOT NULL DEFAULT 1,
      window_start INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // Column backfill/alter migrations for existing SQLite records
  try { targetDb.exec("ALTER TABLE users ADD COLUMN password_hash TEXT;"); } catch {}
  try { targetDb.exec("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;"); } catch {}
  try { targetDb.exec("ALTER TABLE users ADD COLUMN locked_until INTEGER;"); } catch {}
  try { targetDb.exec("ALTER TABLE organizations ADD COLUMN slug TEXT NOT NULL DEFAULT 'default-org';"); } catch {}
  try { targetDb.exec("ALTER TABLE organizations ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'usr_admin_01';"); } catch {}
  try { targetDb.exec("ALTER TABLE organizations ADD COLUMN owner_user_id TEXT NOT NULL DEFAULT 'usr_admin_01';"); } catch {}
  try { targetDb.exec("ALTER TABLE organizations ADD COLUMN status TEXT NOT NULL DEFAULT 'active';"); } catch {}
  try { targetDb.exec("ALTER TABLE organization_members ADD COLUMN status TEXT NOT NULL DEFAULT 'active';"); } catch {}
  try { targetDb.exec("ALTER TABLE organization_members ADD COLUMN invited_by_user_id TEXT;"); } catch {}
  try { targetDb.exec("ALTER TABLE organization_members ADD COLUMN joined_at INTEGER;"); } catch {}
  try { targetDb.exec("ALTER TABLE projects ADD COLUMN owner_user_id TEXT;"); } catch {}
  try { targetDb.exec("ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'active';"); } catch {}
  try { targetDb.exec("ALTER TABLE targets ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;"); } catch {}
  try { targetDb.exec("ALTER TABLE test_plans ADD COLUMN safety_limits_json TEXT;"); } catch {}
  try { targetDb.exec("ALTER TABLE test_plans ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;"); } catch {}


  // Auto-seed default baseline workspace if no users exist
  try {
    const userCount = targetDb.prepare("SELECT count(*) as count FROM users").get() as { count: number };
    if (!userCount || userCount.count === 0) {
      const defaultOrgId = "org_default_01";
      const defaultUserId = "usr_admin_01";
      const defaultTesterId = "usr_tester_01";
      const defaultProjectId = "proj_demo_01";
      const defaultTargetId = "target_fixture_01";
      const defaultPlanId = "plan_smoke_01";
      const now = Date.now();

      targetDb.prepare(`
        INSERT OR IGNORE INTO users (id, email, display_name, role, onboarding_status, last_workspace_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(defaultUserId, "lead@acme.dev", "Alex Rivera (Org Owner)", "admin", "completed", defaultOrgId, now, now);

      targetDb.prepare(`
        INSERT OR IGNORE INTO users (id, email, display_name, role, onboarding_status, last_workspace_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(defaultTesterId, "qa.tester@acme.dev", "Sam Taylor (Tester)", "member", "completed", defaultOrgId, now, now);

      targetDb.prepare(`
        INSERT OR IGNORE INTO organizations (id, name, slug, owner_user_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(defaultOrgId, "Acme Engineering Corp", "acme-engineering", defaultUserId, "active", now, now);

      targetDb.prepare(`
        INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, user_email, role, status, invited_by_user_id, joined_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run("mem_admin_01", defaultOrgId, defaultUserId, "lead@acme.dev", "owner", "active", null, now, now);

      targetDb.prepare(`
        INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, user_email, role, status, invited_by_user_id, joined_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run("mem_tester_01", defaultOrgId, defaultTesterId, "qa.tester@acme.dev", "tester", "active", null, now, now);

      targetDb.prepare(`
        INSERT OR IGNORE INTO projects (id, organization_id, owner_user_id, name, description, environment, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(defaultProjectId, defaultOrgId, defaultUserId, "Payment Gateway API", "Production readiness load validation for Checkout API v2", "staging", "active", now, now);

      targetDb.prepare(`
        INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, status, invited_by_user_id, joined_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run("pmem_admin_01", defaultProjectId, defaultUserId, "owner", "active", null, now, now);

      targetDb.prepare(`
        INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, status, invited_by_user_id, joined_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run("pmem_tester_01", defaultProjectId, defaultTesterId, "tester", "active", null, now, now);

      targetDb.prepare(`
        INSERT OR IGNORE INTO targets (id, project_id, base_url, health_url, environment, authorization_status, allowed_host, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(defaultTargetId, defaultProjectId, "http://localhost:4000", "http://localhost:4000/health", "staging", "verified", "localhost:4000", now);

      console.log("🌱 Auto-seeded initial default workspace and admin users.");
    }
  } catch (seedErr: any) {
    console.warn("⚠️ Auto-seed note:", seedErr.message);
  }

  console.log("✅ Database tables verified and initialized successfully.");
}

if (process.argv[1]?.includes("migrate")) {
  runMigrations();
}
