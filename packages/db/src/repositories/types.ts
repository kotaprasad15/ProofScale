import {
  TestPlan,
  TestRun,
  TestRunStatus,
  RunProgress,
  TestRunResult,
  PlanEnvironment
} from "@proofscale/shared";

/**
 * Repository abstractions for test plans and test runs.
 *
 * The worker depends only on these interfaces — never on Drizzle or the DB
 * client directly — so it can run as a separate process (or against a
 * different store) without code changes.
 *
 * NOTE: the only implementation today is the Drizzle adapter
 * (drizzleRepositories). This is the project's real persistence layer
 * (SQLite for local dev, Postgres/Supabase in production); it is not an
 * in-memory throwaway. For multi-instance production deployments, the
 * in-process executor should be replaced by an external job queue (see
 * db/README notes in server routes).
 */

export interface CreateTestPlanData {
  id: string;
  projectId: string;
  name: string;
  spec: TestPlan;
}

export interface UpdateTestPlanData {
  name?: string;
  spec?: TestPlan;
  planStatus?: "draft" | "approved" | "archived";
  approvedBy?: string;
}

export interface TestPlanRepository {
  getById(id: string): Promise<TestPlan | null>;
  listByProject(projectId: string): Promise<TestPlan[]>;
  create(data: CreateTestPlanData): Promise<TestPlan>;
  update(id: string, update: UpdateTestPlanData): Promise<TestPlan>;
}

export interface CreateTestRunData {
  id: string;
  testPlanId: string;
  projectId: string;
  organizationId: string;
  targetBaseUrl: string;
  environment: PlanEnvironment | string;
  requestedByUserId: string;
  envelope: TestPlan;
}

export interface UpdateTestRunData {
  status?: TestRunStatus;
  startedAt?: Date;
  finishedAt?: Date;
  progress?: RunProgress;
  result?: TestRunResult;
  cancelReason?: string;
  failureReason?: string;
  workerId?: string;
  envelope?: TestPlan;
}

export interface TestRunRepository {
  create(run: CreateTestRunData): Promise<TestRun>;
  update(id: string, update: UpdateTestRunData): Promise<TestRun>;
  getById(id: string): Promise<TestRun | null>;
  listByProject(projectId: string, limit?: number): Promise<TestRun[]>;
}

export interface Repositories {
  testPlans: TestPlanRepository;
  testRuns: TestRunRepository;
}
