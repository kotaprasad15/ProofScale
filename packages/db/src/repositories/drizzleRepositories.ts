import { db } from "../client.js";
import { testPlans, testRuns, projects } from "../schema/index.js";
import { eq, desc } from "drizzle-orm";
import {
  TestPlan,
  TestRun,
  RunProgress,
  TestRunResult,
  TestRunStatus
} from "@proofscale/shared";
import type {
  Repositories,
  TestPlanRepository,
  TestRunRepository,
  CreateTestPlanData,
  UpdateTestPlanData,
  CreateTestRunData,
  UpdateTestRunData
} from "./types.js";

/**
 * Drizzle-backed repository adapter (SQLite in development, Postgres in
 * production). This is the project's real persistence layer.
 *
 * Test plans are stored as a full JSON spec envelope plus queryable columns.
 * Test runs persist the exact envelope snapshot, live progress, and the final
 * computed result.
 */

type PlanRow = typeof testPlans.$inferSelect;
type RunRow = typeof testRuns.$inferSelect;

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function iso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function planRowToDomain(row: PlanRow): TestPlan | null {
  const spec = parseJson<TestPlan | null>(row.specJson, null);
  if (spec) {
    return {
      ...spec,
      status: row.planStatus as TestPlan["status"],
      updatedAt: iso(row.updatedAt)
    };
  }
  // Legacy k6-only row: synthesize a minimal spec so old data still lists.
  const scenarios = parseJson<any[]>(row.scenariosJson, []);
  const loadProfile = parseJson<any>(row.loadProfileJson, {});
  const thresholds = parseJson<any>(row.thresholdsJson, {});
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    targetBaseUrl: row.targetBaseUrl || "",
    environment: (row.planEnvironment as TestPlan["environment"]) || "staging",
    durationSeconds: loadProfile.durationSeconds ?? 60,
    virtualUsers: loadProfile.virtualUsers ?? 1,
    maxRequestsPerSecond: loadProfile.targetRps ?? 100,
    requestTimeoutMs: loadProfile.timeoutMs ?? 5000,
    requests: scenarios.map((s, i) => ({
      id: `req_${i + 1}`,
      name: s.name || `Request ${i + 1}`,
      method: s.method || "GET",
      path: s.path || "/",
      enabled: true
    })),
    thresholds: {
      p95LatencyMs: thresholds.maxP95Ms,
      p99LatencyMs: thresholds.maxP99Ms,
      maxErrorRatePercent: thresholds.maxErrorRate !== undefined ? thresholds.maxErrorRate * 100 : undefined
    },
    status: row.planStatus as TestPlan["status"],
    createdBy: row.createdBy || "unknown",
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt)
  };
}

function runRowToDomain(row: RunRow, planProjectId?: string): TestRun {
  return {
    id: row.id,
    testPlanId: row.planId,
    projectId: planProjectId || "",
    organizationId: "",
    targetBaseUrl: "",
    environment: "",
    status: row.status as TestRunStatus,
    requestedByUserId: row.requestedByUserId,
    requestedAt: iso(row.createdAt),
    startedAt: row.startedAt ? iso(row.startedAt) : null,
    finishedAt: row.finishedAt ? iso(row.finishedAt) : null,
    cancelReason: row.cancelReason ?? null,
    failureReason: row.errorMessage ?? null,
    envelope: parseJson<TestPlan | null>(row.envelopeJson, null),
    progress: parseJson<RunProgress | null>(row.progressJson, null),
    result: parseJson<TestRunResult | null>(row.resultJson, null)
  };
}

class DrizzleTestPlanRepository implements TestPlanRepository {
  async getById(id: string): Promise<TestPlan | null> {
    const [row] = await db.select().from(testPlans).where(eq(testPlans.id, id));
    return row ? planRowToDomain(row) : null;
  }

  async listByProject(projectId: string): Promise<TestPlan[]> {
    const rows = await db.select().from(testPlans).where(eq(testPlans.projectId, projectId));
    return rows
      .map(planRowToDomain)
      .filter((p): p is TestPlan => p !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(data: CreateTestPlanData): Promise<TestPlan> {
    const now = new Date();
    await db.insert(testPlans).values({
      id: data.id,
      projectId: data.projectId,
      name: data.name,
      specJson: JSON.stringify(data.spec),
      planStatus: data.spec.status,
      planEnvironment: data.spec.environment,
      targetBaseUrl: data.spec.targetBaseUrl,
      createdBy: data.spec.createdBy,
      specVersion: 1,
      scenariosJson: "[]",
      loadProfileJson: "{}",
      thresholdsJson: "{}",
      createdAt: now,
      updatedAt: now
    });
    return data.spec;
  }

  async update(id: string, update: UpdateTestPlanData): Promise<TestPlan> {
    const [row] = await db.select().from(testPlans).where(eq(testPlans.id, id));
    if (!row) throw new Error(`Test plan '${id}' not found.`);

    const now = new Date();
    const updateData: Partial<PlanRow> = { updatedAt: now };

    if (update.name !== undefined) updateData.name = update.name;
    if (update.spec !== undefined) {
      updateData.specJson = JSON.stringify(update.spec);
      updateData.planStatus = update.spec.status;
      updateData.planEnvironment = update.spec.environment;
      updateData.targetBaseUrl = update.spec.targetBaseUrl;
      updateData.specVersion = (row.specVersion || 0) + 1;
    }
    if (update.planStatus !== undefined) updateData.planStatus = update.planStatus;
    if (update.planStatus === "approved") {
      updateData.approvedBy = update.approvedBy || null;
      updateData.approvedAt = now;
    }

    await db.update(testPlans).set(updateData).where(eq(testPlans.id, id));
    const updated = await this.getById(id);
    return updated!;
  }
}

class DrizzleTestRunRepository implements TestRunRepository {
  async create(data: CreateTestRunData): Promise<TestRun> {
    const now = new Date();
    await db.insert(testRuns).values({
      id: data.id,
      planId: data.testPlanId,
      // The legacy schema requires a target row; server-side runs resolve or
      // create one. Runs store the real target in envelopeJson / resultJson.
      targetId: await resolveTargetId(data.projectId, data.targetBaseUrl, data.environment),
      status: "queued",
      requestedByUserId: data.requestedByUserId,
      envelopeJson: JSON.stringify(data.envelope),
      runKind: "server_side",
      createdAt: now,
      updatedAt: now
    });
    return (await this.getById(data.id))!;
  }

  async update(id: string, update: UpdateTestRunData): Promise<TestRun> {
    const updateData: Partial<RunRow> = { updatedAt: new Date() };
    if (update.status !== undefined) updateData.status = update.status as RunRow["status"];
    if (update.startedAt !== undefined) updateData.startedAt = update.startedAt;
    if (update.finishedAt !== undefined) updateData.finishedAt = update.finishedAt;
    if (update.progress !== undefined) updateData.progressJson = JSON.stringify(update.progress);
    if (update.result !== undefined) updateData.resultJson = JSON.stringify(update.result);
    if (update.cancelReason !== undefined) updateData.cancelReason = update.cancelReason;
    if (update.failureReason !== undefined) updateData.errorMessage = update.failureReason;
    if (update.workerId !== undefined) updateData.workerId = update.workerId;
    if (update.envelope !== undefined) updateData.envelopeJson = JSON.stringify(update.envelope);

    await db.update(testRuns).set(updateData).where(eq(testRuns.id, id));
    return (await this.getById(id))!;
  }

  async getById(id: string): Promise<TestRun | null> {
    const [row] = await db
      .select({ run: testRuns, projectId: projects.id })
      .from(testRuns)
      .innerJoin(testPlans, eq(testRuns.planId, testPlans.id))
      .innerJoin(projects, eq(testPlans.projectId, projects.id))
      .where(eq(testRuns.id, id));
    return row ? runRowToDomain(row.run, row.projectId) : null;
  }

  async listByProject(projectId: string, limit = 50): Promise<TestRun[]> {
    const rows = await db
      .select({ run: testRuns, projectId: projects.id })
      .from(testRuns)
      .innerJoin(testPlans, eq(testRuns.planId, testPlans.id))
      .innerJoin(projects, eq(testPlans.projectId, projects.id))
      .where(eq(testPlans.projectId, projectId))
      .orderBy(desc(testRuns.createdAt))
      .limit(limit);
    return rows.map(r => runRowToDomain(r.run, r.projectId));
  }
}

/**
 * Resolves (or creates) the targets row for a server-side run so the legacy
 * FK constraint on test_runs.target_id keeps holding. Hosts are derived from
 * the validated base URL.
 */
async function resolveTargetId(
  projectId: string,
  targetBaseUrl: string,
  environment: string
): Promise<string> {
  const { targets } = await import("../schema/index.js");
  const allowedHost = (() => {
    try {
      return new URL(targetBaseUrl).host;
    } catch {
      return "unknown";
    }
  })();

  const existing = await db.select().from(targets).where(eq(targets.projectId, projectId));
  const match = existing.find(t => t.baseUrl === targetBaseUrl);
  if (match) return match.id;

  const id = `target_${Math.random().toString(36).slice(2, 10)}`;
  await db.insert(targets).values({
    id,
    projectId,
    baseUrl: targetBaseUrl,
    healthUrl: null,
    environment: (["development", "staging", "production", "testing"].includes(environment)
      ? environment
      : "staging") as any,
    authorizationStatus: "verified",
    allowedHost
  });
  return id;
}

/** Singleton Drizzle-backed repositories (the development/production adapter). */
export const drizzleRepositories: Repositories = {
  testPlans: new DrizzleTestPlanRepository(),
  testRuns: new DrizzleTestRunRepository()
};
