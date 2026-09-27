import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { appRouter } from "../routers/index.js";
import { db } from "@proofscale/db";
import { TRPCError } from "@trpc/server";

describe("Policies & Baselines Routers", () => {
  it("should enforce authorization on createDraft", async () => {
    // We construct a caller without editTestPlans permission
    const ctx = {
      db,
      user: { id: "usr_2", email: "test@example.com", role: "tester", lastWorkspaceId: "org_1" },
      session: null,
      projectPermissions: ["viewReports"] // no editTestPlans
    };
    const caller = appRouter.createCaller(ctx as any);

    try {
      await caller.policies.createDraft({
        projectId: "proj_1",
        testPlanId: "plan_1",
        name: "Test Draft",
        minimumScore: 90
      });
      assert.fail("Should have thrown forbidden error");
    } catch (err: any) {
      assert.equal(err.code, "FORBIDDEN");
    }
  });

  it("should enforce authorization on promote baseline", async () => {
    const ctx = {
      db,
      user: { id: "usr_2", email: "test@example.com", role: "tester", lastWorkspaceId: "org_1" },
      session: null,
      projectPermissions: ["viewReports"]
    };
    const caller = appRouter.createCaller(ctx as any);

    try {
      await caller.baselines.promote({ runId: "run_1" });
      assert.fail("Should have thrown forbidden error");
    } catch (err: any) {
      assert.equal(err.code, "FORBIDDEN");
    }
  });
});
