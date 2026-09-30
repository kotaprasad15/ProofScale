import { Router, Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  projects,
  projectMembers,
  organizationMembers,
  testPlans,
  testRuns,
  runEvents,
  auditEvents,
  users,
  sessions
} from "@proofscale/db";
import {
  TestPlan,
  TestRequest,
  validateTestPlan,
  validateTargetUrl,
  requiresProductionConfirmation,
  TEST_EXEC_LIMITS,
  redactPlanForLogging,
  KillSwitch
} from "@proofscale/shared";
import { drizzleRepositories } from "@proofscale/db";

/**
 * REST endpoints for server-side test execution.
 *
 *   POST   /api/test-plans                create a plan (draft)
 *   GET    /api/test-plans/:planId        fetch a plan
 *   PUT    /api/test-plans/:planId        update a draft plan
 *   POST   /api/test-plans/:planId/approve approve a plan (owner/admin/editor)
 *   POST   /api/test-runs                 { testPlanId } -> 202 queued
 *   GET    /api/test-runs/:runId          status/progress or full result
 *   POST   /api/test-runs/:runId/cancel   cancel a running run
 *
 * Security model:
 *  - authenticated user required (session cookie or dev x-user-id)
 *  - org membership + project membership verified server-side
 *  - plan is ALWAYS loaded server-side; the browser only sends { testPlanId }
 *  - full safety validation runs before any run is queued
 *  - production runs require explicit `confirmProduction: true`
 */

// ---------------------------------------------------------------------
// Auth & permission helpers (mirror createContext resolution rules)
// ---------------------------------------------------------------------

interface AuthContext {
  userId: string;
  email: string;
  orgRole: string | null;
  projectRole: string | null;
  permissions: {
    editTestPlans: boolean;
    createRuns: boolean;
    cancelAnyRun: boolean;
    cancelOwnRuns: boolean;
  };
}

async function resolveAuth(req: Request): Promise<AuthContext | null> {
  const headerUserId = req.headers["x-user-id"];
  let userId: string | null = typeof headerUserId === "string" ? headerUserId : null;

  if (!userId && req.headers.cookie) {
    // Session cookie auth: resolve through the sessions table.
    try {
      const { SessionSecurity } = await import("@proofscale/shared");
      const cookies = Object.fromEntries(
        req.headers.cookie.split(";").map(c => {
          const [k, ...v] = c.trim().split("=");
          return [k, decodeURIComponent(v.join("="))];
        })
      );
      const token = cookies[SessionSecurity.COOKIE_NAME];
      if (token) {
        const hash = SessionSecurity.hashSessionToken(token);
        const [sess] = await db.select().from(sessions).where(eq(sessions.sessionTokenHash, hash));
        if (sess && !sess.revokedAt && sess.expiresAt > new Date()) {
          userId = sess.userId;
        }
      }
    } catch {
      return null;
    }
  }

  if (!userId) return null;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;

  // Active org: header override or user default.
  const headerOrg = typeof req.headers["x-organization-id"] === "string" ? req.headers["x-organization-id"] : null;
  const orgId = headerOrg || user.lastWorkspaceId;
  if (!orgId) return { userId, email: user.email, orgRole: null, projectRole: null, permissions: emptyPerms() };

  const [orgMember] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.status, "active")
      )
    );

  const headerProject = typeof req.headers["x-project-id"] === "string" ? req.headers["x-project-id"] : null;
  let projectRole: string | null = null;
  if (headerProject) {
    const [pm] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, headerProject),
          eq(projectMembers.userId, userId),
          eq(projectMembers.status, "active")
        )
      );
    projectRole = pm?.role || null;
  }

  // Mirror evaluatePermissions() capability matrix (subset needed here).
  const isOrgOwner = orgMember?.role === "owner";
  const isOrgAdmin = orgMember?.role === "admin";
  const isOrgTester = orgMember?.role === "tester";
  const isProjOwner = projectRole === "owner";
  const isProjEditor = projectRole === "editor";
  const isProjTester = projectRole === "tester";

  return {
    userId,
    email: user.email,
    orgRole: orgMember?.role || null,
    projectRole,
    permissions: {
      editTestPlans: isOrgOwner || isOrgAdmin || isProjOwner || isProjEditor,
      createRuns:
        isOrgOwner || isOrgAdmin || isProjOwner || isProjEditor || isProjTester || (isOrgTester && !!projectRole),
      cancelAnyRun: isOrgOwner || isOrgAdmin || isProjOwner || isProjEditor,
      cancelOwnRuns:
        isOrgOwner || isOrgAdmin || isProjOwner || isProjEditor || isProjTester || (isOrgTester && !!projectRole)
    }
  };
}

function emptyPerms() {
  return { editTestPlans: false, createRuns: false, cancelAnyRun: false, cancelOwnRuns: false };
}

function requireAuth(auth: AuthContext | null, res: Response): auth is AuthContext {
  if (!auth) {
    res.status(401).json({ error: "Authentication required." });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------
// Zod input schemas
// ---------------------------------------------------------------------

const requestSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().min(1).max(500),
  headers: z.record(z.string().max(1000)).optional(),
  query: z.record(z.string().max(500)).optional(),
  body: z.unknown().optional(),
  enabled: z.boolean()
});

const createPlanSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(2).max(100),
  targetBaseUrl: z.string().url(),
  environment: z.enum(["staging", "production"]),
  durationSeconds: z.number().int().min(5).max(TEST_EXEC_LIMITS.MAX_DURATION_SECONDS),
  virtualUsers: z.number().int().min(1).max(TEST_EXEC_LIMITS.MAX_VIRTUAL_USERS),
  maxRequestsPerSecond: z.number().int().min(1).max(TEST_EXEC_LIMITS.MAX_REQUESTS_PER_SECOND),
  requestTimeoutMs: z
    .number()
    .int()
    .min(TEST_EXEC_LIMITS.MIN_REQUEST_TIMEOUT_MS)
    .max(TEST_EXEC_LIMITS.MAX_REQUEST_TIMEOUT_MS),
  requests: z.array(requestSchema).min(1).max(TEST_EXEC_LIMITS.MAX_REQUESTS_PER_PLAN),
  thresholds: z
    .object({
      p95LatencyMs: z.number().min(0).optional(),
      p99LatencyMs: z.number().min(0).optional(),
      maxErrorRatePercent: z.number().min(0).max(100).optional(),
      minRequestsPerSecond: z.number().min(0).optional()
    })
    .default({})
});

const updatePlanSchema = createPlanSchema.omit({ projectId: true }).partial().extend({
  restoreDraft: z.boolean().optional(),
  archive: z.boolean().optional()
});

const createRunSchema = z.object({
  testPlanId: z.string().min(1),
  confirmProduction: z.boolean().optional()
});

// ---------------------------------------------------------------------
// Audit helper
// ---------------------------------------------------------------------

async function audit(params: {
  actorUserId: string;
  organizationId?: string | null;
  projectId?: string | null;
  action: string;
  subject: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditEvents).values({
    id: `audit_${crypto.randomUUID().slice(0, 8)}`,
    actorUserId: params.actorUserId,
    organizationId: params.organizationId || null,
    projectId: params.projectId || null,
    action: params.action,
    subject: params.subject,
    metadataJson: params.metadata ? JSON.stringify(params.metadata) : null
  });
}

async function logRunEvent(runId: string, eventType: string, message: string) {
  await db.insert(runEvents).values({
    id: `evt_${crypto.randomUUID().slice(0, 8)}`,
    runId,
    eventType,
    message
  });
}

// ---------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------

export function createTestExecutionRouter(): Router {
  const router = Router();

  // ---------------------------------------------------------------
  // Test plans
  // ---------------------------------------------------------------

  router.post("/api/test-plans", async (req: Request, res: Response) => {
    const auth = await resolveAuth(req);
    if (!requireAuth(auth, res)) return;

    const parsed = createPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid test plan payload.", details: parsed.error.flatten() });
    }
    const input = parsed.data;

    // Project must belong to the user's active org.
    const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
    if (!project) return res.status(404).json({ error: "Project not found." });
    if (auth.orgRole === null) return res.status(403).json({ error: "Organization membership required." });

    // Safety validation (pure).
    const planId = `plan_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const nowIso = new Date().toISOString();
    const spec: TestPlan = {
      id: planId,
      projectId: input.projectId,
      name: input.name,
      targetBaseUrl: input.targetBaseUrl,
      environment: input.environment,
      durationSeconds: input.durationSeconds,
      virtualUsers: input.virtualUsers,
      maxRequestsPerSecond: input.maxRequestsPerSecond,
      requestTimeoutMs: input.requestTimeoutMs,
      requests: input.requests as TestRequest[],
      thresholds: input.thresholds,
      status: "draft",
      createdBy: auth.userId,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const validation = validateTestPlan(spec);
    if (!validation.valid) {
      return res.status(400).json({ error: "Test plan failed safety validation.", issues: validation.issues });
    }

    await drizzleRepositories.testPlans.create({ id: planId, projectId: input.projectId, name: input.name, spec });
    await audit({
      actorUserId: auth.userId,
      organizationId: project.organizationId,
      projectId: project.id,
      action: "test_plan.created",
      subject: planId,
      metadata: { name: input.name, environment: input.environment }
    });

    return res.status(201).json({ plan: spec });
  });

  router.get("/api/test-plans/:planId", async (req: Request, res: Response) => {
    const auth = await resolveAuth(req);
    if (!requireAuth(auth, res)) return;

    const plan = await drizzleRepositories.testPlans.getById(String(req.params.planId));
    if (!plan) return res.status(404).json({ error: "Test plan not found." });

    const [project] = await db.select().from(projects).where(eq(projects.id, plan.projectId));
    if (!project) return res.status(404).json({ error: "Plan project not found." });
    const [viewerMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, project.organizationId),
          eq(organizationMembers.userId, auth.userId),
          eq(organizationMembers.status, "active")
        )
      );
    if (!viewerMember) {
      return res.status(403).json({ error: "Not authorized to access this test plan." });
    }

    return res.json({ plan });
  });

  router.put("/api/test-plans/:planId", async (req: Request, res: Response) => {
    const auth = await resolveAuth(req);
    if (!requireAuth(auth, res)) return;
    if (!auth.permissions.editTestPlans) {
      return res.status(403).json({ error: "Insufficient permissions: 'editTestPlans' required." });
    }

    const existing = await drizzleRepositories.testPlans.getById(String(req.params.planId));
    if (!existing) return res.status(404).json({ error: "Test plan not found." });

    // Testers may only run approved plans, never modify restricted settings.
    if (existing.status === "archived") {
      return res.status(400).json({ error: "Archived plans cannot be modified." });
    }

    const parsed = updatePlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid update payload.", details: parsed.error.flatten() });
    }
    const input = parsed.data;

    const merged: TestPlan = {
      ...existing,
      name: input.name ?? existing.name,
      targetBaseUrl: input.targetBaseUrl ?? existing.targetBaseUrl,
      environment: input.environment ?? existing.environment,
      durationSeconds: input.durationSeconds ?? existing.durationSeconds,
      virtualUsers: input.virtualUsers ?? existing.virtualUsers,
      maxRequestsPerSecond: input.maxRequestsPerSecond ?? existing.maxRequestsPerSecond,
      requestTimeoutMs: input.requestTimeoutMs ?? existing.requestTimeoutMs,
      requests: (input.requests as TestRequest[] | undefined) ?? existing.requests,
      thresholds: input.thresholds ?? existing.thresholds,
      // Archiving wins; otherwise any spec edit resets approval back to draft.
      status: input.archive
        ? "archived"
        : input.restoreDraft || specChanged(existing, input)
        ? "draft"
        : existing.status,
      updatedAt: new Date().toISOString()
    };

    const validation = validateTestPlan(merged);
    if (!validation.valid) {
      return res.status(400).json({ error: "Test plan failed safety validation.", issues: validation.issues });
    }

    const updated = await drizzleRepositories.testPlans.update(merged.id, {
      spec: merged,
      planStatus: merged.status,
      name: merged.name
    });
    if (merged.status === "archived") {
      await audit({ actorUserId: auth.userId, projectId: merged.projectId, action: "test_plan.archived", subject: merged.id });
    }

    await audit({
      actorUserId: auth.userId,
      projectId: merged.projectId,
      action: "test_plan.updated",
      subject: merged.id,
      metadata: { status: merged.status }
    });

    return res.json({ plan: updated });
  });

  router.post("/api/test-plans/:planId/approve", async (req: Request, res: Response) => {
    const auth = await resolveAuth(req);
    if (!requireAuth(auth, res)) return;
    if (!auth.permissions.editTestPlans) {
      return res.status(403).json({ error: "Insufficient permissions: approval requires 'editTestPlans'." });
    }

    const plan = await drizzleRepositories.testPlans.getById(String(req.params.planId));
    if (!plan) return res.status(404).json({ error: "Test plan not found." });
    if (plan.status === "archived") return res.status(400).json({ error: "Archived plans cannot be approved." });

    const validation = validateTestPlan(plan);
    if (!validation.valid) {
      return res.status(400).json({ error: "Plan must pass safety validation before approval.", issues: validation.issues });
    }

    const updated = await drizzleRepositories.testPlans.update(plan.id, {
      planStatus: "approved",
      approvedBy: auth.userId,
      spec: { ...plan, status: "approved", updatedAt: new Date().toISOString() }
    });

    await audit({
      actorUserId: auth.userId,
      projectId: plan.projectId,
      action: "test_plan.approved",
      subject: plan.id
    });

    return res.json({ plan: updated });
  });

  // ---------------------------------------------------------------
  // Test runs
  // ---------------------------------------------------------------

  router.post("/api/test-runs", async (req: Request, res: Response) => {
    const auth = await resolveAuth(req);
    if (!requireAuth(auth, res)) return;
    if (!auth.permissions.createRuns) {
      return res.status(403).json({ error: "Insufficient permissions: 'createRuns' required." });
    }

    if (KillSwitch.isActivated()) {
      return res.status(503).json({ error: "Global kill switch is active; run creation is disabled." });
    }

    const parsed = createRunSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Body must be { testPlanId: string }.", details: parsed.error.flatten() });
    }
    const { testPlanId, confirmProduction } = parsed.data;

    // Load the plan SERVER-SIDE. Never trust a plan posted from the browser.
    const plan = await drizzleRepositories.testPlans.getById(String(testPlanId));
    if (!plan) return res.status(404).json({ error: "Test plan not found." });

    // Org + project authorization.
    const [project] = await db.select().from(projects).where(eq(projects.id, plan.projectId));
    if (!project) return res.status(404).json({ error: "Plan project not found." });
    const [orgMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, project.organizationId),
          eq(organizationMembers.userId, auth.userId),
          eq(organizationMembers.status, "active")
        )
      );
    if (!orgMember) return res.status(403).json({ error: "You do not belong to this plan's organization." });

    // Approved plans only.
    if (plan.status !== "approved") {
      return res.status(400).json({ error: `Plan must be approved before running (current status: ${plan.status}).` });
    }

    // Safety validation (full envelope).
    const validation = validateTestPlan(plan);
    if (!validation.valid) {
      return res.status(400).json({ error: "Plan failed safety validation.", issues: validation.issues });
    }

    // Production confirmation flow.
    if (requiresProductionConfirmation(plan.environment) && !confirmProduction) {
      return res.status(428).json({
        error: "Production targets require explicit confirmation.",
        code: "PRODUCTION_CONFIRMATION_REQUIRED"
      });
    }

    // DNS/SSRF re-check at queue time (mirror of runs router policy).
    try {
      const { sanitizeTargetUrl, validateTargetHostDns } = await import("@proofscale/shared");
      const sanitized = sanitizeTargetUrl(plan.targetBaseUrl);
      if (!sanitized.isValid || !sanitized.allowedHost) {
        return res.status(400).json({ error: sanitized.reason || "Invalid target URL." });
      }
      const allowPrivate = process.env.ALLOW_PRIVATE_TARGETS === "true" || process.env.NODE_ENV !== "production";
      const dnsCheck = await validateTargetHostDns(sanitized.allowedHost, { allowPrivateIPs: allowPrivate });
      if (!dnsCheck.isValid) {
        return res.status(400).json({ error: dnsCheck.reason || "Target failed SSRF safety check." });
      }
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || "Target validation failed." });
    }

    // Optional per-organization concurrency quota: at most N concurrently
    // running server_side runs per org (development default 3).
    const quota = parseInt(process.env.MAX_CONCURRENT_RUNS_PER_ORG || "3", 10);
    const orgProjectIds = (
      await db.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, project.organizationId))
    ).map(p => p.id);
    const allOrgRuns = (
      await Promise.all(orgProjectIds.map(pid => drizzleRepositories.testRuns.listByProject(pid, 100)))
    ).flat();
    const activeRuns = allOrgRuns.filter(r => ["queued", "starting", "running", "cancelling"].includes(r.status));
    if (activeRuns.length >= quota) {
      return res.status(429).json({ error: `Organization run quota reached (${quota} concurrent).` });
    }

    const runId = `run_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await drizzleRepositories.testRuns.create({
      id: runId,
      testPlanId: plan.id,
      projectId: plan.projectId,
      organizationId: project.organizationId,
      targetBaseUrl: plan.targetBaseUrl,
      environment: plan.environment,
      requestedByUserId: auth.userId,
      envelope: plan
    });
    await logRunEvent(runId, "queued", `Run queued by ${auth.email} against ${plan.targetBaseUrl} (${plan.environment})`);
    await audit({
      actorUserId: auth.userId,
      organizationId: project.organizationId,
      projectId: plan.projectId,
      action: "test_run.started",
      subject: runId,
      metadata: { testPlanId: plan.id, environment: plan.environment }
    });

    // 202 Accepted: the worker picks it up; the HTTP response never blocks.
    return res.status(202).json({ runId, status: "queued" });
  });

  router.get("/api/test-runs/:runId", async (req: Request, res: Response) => {
    const auth = await resolveAuth(req);
    if (!requireAuth(auth, res)) return;

    const run = await drizzleRepositories.testRuns.getById(String(req.params.runId));
    if (!run) return res.status(404).json({ error: "Test run not found." });

    const [project] = await db.select().from(projects).where(eq(projects.id, run.projectId));
    const [orgMember] = project
      ? await db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, project.organizationId),
              eq(organizationMembers.userId, auth.userId),
              eq(organizationMembers.status, "active")
            )
          )
      : [];
    if (!orgMember) return res.status(403).json({ error: "Not authorized to view this run." });

    if (run.result) {
      return res.json({
        runId: run.id,
        status: run.status,
        envelope: run.envelope,
        result: run.result
      });
    }

    return res.json({
      runId: run.id,
      status: run.status,
      progress:
        run.progress ||
        {
          elapsedSeconds: 0,
          durationSeconds: run.envelope?.durationSeconds ?? 0,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          currentRps: 0
        },
      envelope: run.envelope
    });
  });

  router.post("/api/test-runs/:runId/cancel", async (req: Request, res: Response) => {
    const auth = await resolveAuth(req);
    if (!requireAuth(auth, res)) return;

    const run = await drizzleRepositories.testRuns.getById(String(req.params.runId));
    if (!run) return res.status(404).json({ error: "Test run not found." });

    const canCancel = auth.permissions.cancelAnyRun || (auth.permissions.cancelOwnRuns && run.requestedByUserId === auth.userId);
    if (!canCancel) {
      return res.status(403).json({ error: "Insufficient permissions to cancel this run." });
    }

    if (["cancelled", "completed", "failed"].includes(run.status)) {
      return res.status(400).json({ error: `Run already finished (${run.status}).` });
    }

    const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 250) : "Cancelled by user";

    if (["queued", "starting"].includes(run.status)) {
      await drizzleRepositories.testRuns.update(run.id, {
        status: "cancelled",
        cancelReason: reason,
        finishedAt: new Date()
      });
    } else {
      // running/cancelling: flip the persisted status. The worker engine polls
      // the run row (see testRunOrchestrator) and stops issuing requests.
      // Cross-process in-memory signals are unnecessary because the engine's
      // cancellation check reads the DB status each loop iteration.
      await drizzleRepositories.testRuns.update(run.id, { status: "cancelling", cancelReason: reason });
    }

    await logRunEvent(run.id, "cancelled", `Run cancelled by ${auth.email}: ${reason}`);
    await audit({ actorUserId: auth.userId, projectId: run.projectId, action: "test_run.cancelled", subject: run.id });

    return res.json({ runId: run.id, status: "cancelling", reason });
  });

  // List saved test plans for a project.
  router.get("/api/projects/:projectId/test-plans", async (req: Request, res: Response) => {
    const auth = await resolveAuth(req);
    if (!requireAuth(auth, res)) return;

    const [project] = await db.select().from(projects).where(eq(projects.id, String(req.params.projectId)));
    if (!project) return res.status(404).json({ error: "Project not found." });
    const [orgMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, project.organizationId),
          eq(organizationMembers.userId, auth.userId),
          eq(organizationMembers.status, "active")
        )
      );
    if (!orgMember) return res.status(403).json({ error: "Not authorized." });

    const plans = await drizzleRepositories.testPlans.listByProject(String(req.params.projectId));
    return res.json({ plans });
  });

  // List runs for a project (used by the runs monitor UI).
  router.get("/api/projects/:projectId/test-runs", async (req: Request, res: Response) => {
    const auth = await resolveAuth(req);
    if (!requireAuth(auth, res)) return;

    const [project] = await db.select().from(projects).where(eq(projects.id, String(req.params.projectId)));
    if (!project) return res.status(404).json({ error: "Project not found." });
    const [orgMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, project.organizationId),
          eq(organizationMembers.userId, auth.userId),
          eq(organizationMembers.status, "active")
        )
      );
    if (!orgMember) return res.status(403).json({ error: "Not authorized." });

    const runs = await drizzleRepositories.testRuns.listByProject(String(req.params.projectId), 50);
    return res.json({ runs });
  });

  return router;
}

function specChanged(existing: TestPlan, input: Partial<z.infer<typeof createPlanSchema>>): boolean {
  return (
    input.targetBaseUrl !== undefined ||
    input.environment !== undefined ||
    input.requests !== undefined ||
    input.durationSeconds !== undefined ||
    input.virtualUsers !== undefined ||
    input.maxRequestsPerSecond !== undefined ||
    input.requestTimeoutMs !== undefined ||
    input.thresholds !== undefined
  );
}

// Unused import guard: keep the redaction helper visible for future logs.
void redactPlanForLogging;
