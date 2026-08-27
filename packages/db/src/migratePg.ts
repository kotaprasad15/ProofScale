import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export async function runPgMigrations(connectionUrl?: string) {
  const url = connectionUrl || process.env.DATABASE_URL;
  if (!url || (!url.startsWith("postgres://") && !url.startsWith("postgresql://"))) {
    console.log("ℹ️ No PostgreSQL DATABASE_URL detected; skipping PostgreSQL DDL migrations.");
    return;
  }

  const cleanUrl = url.replace(/\[|\]/g, "").trim();
  console.log("⚡ Connecting to Supabase PostgreSQL for automated schema migration & hardening...");

  const client = new pg.Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(" Connected to Supabase PostgreSQL. Running table DDL initialization, RLS activation, and FK indexes...");

    // 1. Core Tables DDL
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT,
        role TEXT NOT NULL DEFAULT 'member',
        onboarding_status TEXT NOT NULL DEFAULT 'completed',
        last_workspace_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL DEFAULT 'default-org',
        owner_id TEXT NOT NULL DEFAULT 'usr_admin_01',
        owner_user_id TEXT NOT NULL DEFAULT 'usr_admin_01',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS organization_members (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        status TEXT NOT NULL DEFAULT 'active',
        invited_by_user_id TEXT,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        owner_user_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        environment TEXT NOT NULL DEFAULT 'staging',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS project_members (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'tester',
        status TEXT NOT NULL DEFAULT 'active',
        invited_by_user_id TEXT,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id TEXT,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        token_hash TEXT NOT NULL UNIQUE,
        invited_by_user_id TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS targets (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        base_url TEXT NOT NULL,
        health_url TEXT,
        environment TEXT NOT NULL DEFAULT 'staging',
        authorization_status TEXT NOT NULL DEFAULT 'unverified',
        allowed_host TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        lease_expires_at TIMESTAMPTZ,
        lease_heartbeat_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        requested_by_user_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS run_events (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata_json TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
        severity TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        evidence TEXT NOT NULL,
        recommendation TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'raw_runner_output',
        object_key TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        retention_until TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS report_shares (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        created_by_user_id TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Enable Row Level Security (RLS) on ALL tables and apply scoped service_role policies
    const tables = [
      "users",
      "organizations",
      "organization_members",
      "projects",
      "project_members",
      "invitations",
      "access_requests",
      "audit_events",
      "targets",
      "test_plans",
      "test_runs",
      "run_events",
      "findings",
      "artifacts",
      "report_shares"
    ];

    for (const table of tables) {
      await client.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
      
      // Clean up old permissive policies
      await client.query(`
        DROP POLICY IF EXISTS "Allow service and app access" ON public.${table};
        DROP POLICY IF EXISTS "Allow all actions for service role and app" ON public.${table};
        DROP POLICY IF EXISTS "service_role_access" ON public.${table};
      `);

      // Create policy restricted explicitly to service_role (bypasses RLS warnings on Supabase PostgREST)
      await client.query(`
        CREATE POLICY "service_role_access" ON public.${table}
          TO service_role
          USING (true)
          WITH CHECK (true);
      `);
    }

    // Public read-only policy for public report sharing links (SELECT is safe and permitted by Supabase linter)
    await client.query(`
      DROP POLICY IF EXISTS "public_read_shares" ON public.report_shares;
      CREATE POLICY "public_read_shares" ON public.report_shares
        FOR SELECT
        TO anon, authenticated
        USING (true);
    `);

    // 3. Create Indexes on ALL Foreign Keys (Resolves Supabase Performance Linter)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON public.organization_members(organization_id);
      CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id);
      CREATE INDEX IF NOT EXISTS idx_projects_owner_user_id ON public.projects(owner_user_id);
      
      CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_invitations_organization_id ON public.invitations(organization_id);
      CREATE INDEX IF NOT EXISTS idx_invitations_project_id ON public.invitations(project_id);
      
      CREATE INDEX IF NOT EXISTS idx_access_requests_organization_id ON public.access_requests(organization_id);
      CREATE INDEX IF NOT EXISTS idx_access_requests_project_id ON public.access_requests(project_id);
      CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON public.access_requests(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_audit_events_actor_user_id ON public.audit_events(actor_user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_organization_id ON public.audit_events(organization_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_project_id ON public.audit_events(project_id);
      
      CREATE INDEX IF NOT EXISTS idx_targets_project_id ON public.targets(project_id);
      
      CREATE INDEX IF NOT EXISTS idx_test_plans_project_id ON public.test_plans(project_id);
      
      CREATE INDEX IF NOT EXISTS idx_test_runs_plan_id ON public.test_runs(plan_id);
      CREATE INDEX IF NOT EXISTS idx_test_runs_target_id ON public.test_runs(target_id);
      CREATE INDEX IF NOT EXISTS idx_test_runs_status ON public.test_runs(status);
      
      CREATE INDEX IF NOT EXISTS idx_run_events_run_id ON public.run_events(run_id);
      
      CREATE INDEX IF NOT EXISTS idx_findings_run_id ON public.findings(run_id);
      
      CREATE INDEX IF NOT EXISTS idx_artifacts_run_id ON public.artifacts(run_id);
      
      CREATE INDEX IF NOT EXISTS idx_report_shares_run_id ON public.report_shares(run_id);
    `);

    console.log("✅ Scoped RLS policies and FK indexes updated successfully on Supabase!");
    await client.end();
  } catch (err: any) {
    console.error("❌ PostgreSQL hardening failed:", err.message);
    throw err;
  }
}

if (process.argv[1]?.includes("migratePg")) {
  runPgMigrations();
}
