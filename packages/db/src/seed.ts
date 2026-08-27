import { db, sqliteDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { users, organizations, organizationMembers, projects, projectMembers, targets, testPlans } from "./schema/index.js";
import { PresetDefinitions } from "@proofscale/shared";

async function seed() {
  console.log("🌱 Initializing schema & Seeding ProofScale local database with RBAC fixture data...");

  // 1. Ensure all tables exist
  runMigrations();

  const defaultOrgId = "org_default_01";
  const defaultUserId = "usr_admin_01";
  const defaultTesterId = "usr_tester_01";
  const defaultProjectId = "proj_demo_01";
  const defaultTargetId = "target_fixture_01";
  const defaultPlanId = "plan_smoke_01";

  // 2. Seed Default Users
  await db.insert(users).values({
    id: defaultUserId,
    email: "lead@acme.dev",
    displayName: "Alex Rivera (Org Owner)",
    role: "admin",
    onboardingStatus: "completed",
    lastWorkspaceId: defaultOrgId
  }).onConflictDoNothing();

  await db.insert(users).values({
    id: defaultTesterId,
    email: "qa.tester@acme.dev",
    displayName: "Sam Taylor (Tester)",
    role: "member",
    onboardingStatus: "completed",
    lastWorkspaceId: defaultOrgId
  }).onConflictDoNothing();

  // 3. Seed Default Organization
  await db.insert(organizations).values({
    id: defaultOrgId,
    name: "Acme Engineering Corp",
    slug: "acme-engineering",
    ownerId: defaultUserId,
    ownerUserId: defaultUserId,
    status: "active"
  }).onConflictDoNothing();

  // 4. Seed Organization Memberships
  await db.insert(organizationMembers).values({
    id: "mem_admin_01",
    organizationId: defaultOrgId,
    userId: defaultUserId,
    userEmail: "lead@acme.dev",
    role: "owner",
    status: "active"
  }).onConflictDoNothing();

  await db.insert(organizationMembers).values({
    id: "mem_tester_01",
    organizationId: defaultOrgId,
    userId: defaultTesterId,
    userEmail: "qa.tester@acme.dev",
    role: "tester",
    status: "active"
  }).onConflictDoNothing();

  // 5. Seed Demo Project
  await db.insert(projects).values({
    id: defaultProjectId,
    organizationId: defaultOrgId,
    ownerUserId: defaultUserId,
    name: "Payment Gateway API",
    description: "Production readiness load validation for Checkout API v2",
    environment: "staging",
    status: "active"
  }).onConflictDoNothing();

  // 6. Seed Project Memberships
  await db.insert(projectMembers).values({
    id: "pmem_admin_01",
    projectId: defaultProjectId,
    userId: defaultUserId,
    role: "owner",
    status: "active"
  }).onConflictDoNothing();

  await db.insert(projectMembers).values({
    id: "pmem_tester_01",
    projectId: defaultProjectId,
    userId: defaultTesterId,
    role: "tester",
    status: "active"
  }).onConflictDoNothing();

  // 7. Seed Target Endpoint (guarantee target_fixture_01 exists)
  try {
    sqliteDb.prepare("INSERT OR REPLACE INTO targets (id, project_id, base_url, health_url, environment, authorization_status, allowed_host, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      defaultTargetId,
      defaultProjectId,
      "http://localhost:4000",
      "http://localhost:4000/health",
      "staging",
      "verified",
      "localhost:4000",
      Date.now(),
      Date.now()
    );
  } catch (e: any) {
    console.error("Target insert warning:", e.message);
  }

  // 8. Seed Default Smoke Test Plan
  const smokePreset = PresetDefinitions.smoke;
  try {
    sqliteDb.prepare("INSERT OR REPLACE INTO test_plans (id, project_id, name, version, profile, scenarios_json, load_profile_json, thresholds_json, scoring_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      defaultPlanId,
      defaultProjectId,
      "Checkout API Smoke Check",
      1,
      "smoke",
      JSON.stringify([
        { name: "Health Check", method: "GET", path: "/health", weight: 1 },
        { name: "List Products", method: "GET", path: "/api/v1/products", weight: 2 }
      ]),
      JSON.stringify(smokePreset.loadProfile),
      JSON.stringify(smokePreset.thresholds),
      "mvp-1",
      Date.now(),
      Date.now()
    );
  } catch (e: any) {
    console.error("Test plan insert warning:", e.message);
  }

  console.log("✅ Database schema initialization and RBAC seeding completed successfully!");
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
