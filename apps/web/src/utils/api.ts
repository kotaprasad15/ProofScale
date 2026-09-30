import { TestPlan, TestRun, TestRunResult, RunProgress } from "@proofscale/shared";

/**
 * REST client for the server-side test execution endpoints.
 * The browser never generates test traffic; it only manages plans and runs.
 */

function authHeaders(): Record<string, string> {
  const saved = localStorage.getItem("ps_session_user");
  const user = saved ? JSON.parse(saved) : null;
  if (!user) return {};
  return {
    "Content-Type": "application/json",
    "x-user-id": user.id,
    "x-user-email": user.email || "",
    ...(user.organizationId ? { "x-organization-id": user.organizationId } : {})
  };
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      if (body?.issues?.length) {
        message += ": " + body.issues.map((i: any) => `${i.field} — ${i.message}`).join("; ");
      }
    } catch {}
    const err = new Error(message) as Error & { status?: number; code?: string };
    err.status = res.status;
    try {
      const body = await res.clone().json().catch(() => null);
      err.code = body?.code;
    } catch {}
    throw err;
  }
  return res.json() as Promise<T>;
}

const base = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}` : "";

export const testExecApi = {
  // ---- Test plans ----
  async listPlans(projectId: string) {
    const res = await fetch(`${base}/api/projects/${encodeURIComponent(projectId)}/test-plans`, {
      headers: authHeaders()
    });
    return handle<{ plans: TestPlan[] }>(res);
  },

  async createPlan(payload: Omit<TestPlan, "id" | "status" | "createdBy" | "createdAt" | "updatedAt"> & { projectId: string }) {
    const res = await fetch(`${base}/api/test-plans`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return handle<{ plan: TestPlan }>(res);
  },

  async getPlan(planId: string) {
    const res = await fetch(`${base}/api/test-plans/${encodeURIComponent(planId)}`, {
      headers: authHeaders()
    });
    return handle<{ plan: TestPlan }>(res);
  },

  async updatePlan(planId: string, payload: Record<string, unknown>) {
    const res = await fetch(`${base}/api/test-plans/${encodeURIComponent(planId)}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return handle<{ plan: TestPlan }>(res);
  },

  async approvePlan(planId: string) {
    const res = await fetch(`${base}/api/test-plans/${encodeURIComponent(planId)}/approve`, {
      method: "POST",
      headers: authHeaders()
    });
    return handle<{ plan: TestPlan }>(res);
  },

  // ---- Test runs ----
  async startRun(testPlanId: string, confirmProduction = false) {
    const res = await fetch(`${base}/api/test-runs`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ testPlanId, confirmProduction })
    });
    return handle<{ runId: string; status: string }>(res);
  },

  async getRun(runId: string): Promise<{
    runId: string;
    status: string;
    progress?: RunProgress;
    envelope?: TestPlan | null;
    result?: TestRunResult;
  }> {
    const res = await fetch(`${base}/api/test-runs/${encodeURIComponent(runId)}`, {
      headers: authHeaders()
    });
    return handle(res);
  },

  async cancelRun(runId: string, reason = "Cancelled by user via dashboard") {
    const res = await fetch(`${base}/api/test-runs/${encodeURIComponent(runId)}/cancel`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ reason })
    });
    return handle<{ runId: string; status: string }>(res);
  },

  async listRuns(projectId: string): Promise<{ runs: TestRun[] }> {
    const res = await fetch(`${base}/api/projects/${encodeURIComponent(projectId)}/test-runs`, {
      headers: authHeaders()
    });
    return handle(res);
  }
};
