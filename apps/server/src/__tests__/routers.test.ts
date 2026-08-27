import assert from "node:assert";
import { test, describe } from "node:test";
import { appRouter } from "../routers/index.js";
import { createContext } from "../context.js";
import { db } from "@proofscale/db";

describe("ProofScale Control Plane API Routers", () => {
  const mockReq = {
    headers: {
      "x-user-id": "usr_admin_01",
      "x-user-email": "lead@acme.dev",
      "x-organization-id": "org_default_01"
    }
  } as any;

  const mockRes = {} as any;
  const caller = appRouter.createCaller(async () => createContext({ req: mockReq, res: mockRes }));

  test("system.health returns ok status and scoring version", async () => {
    const res = await caller.system.health();
    assert.strictEqual(res.status, "ok");
    assert.strictEqual(res.scoringVersion, "mvp-1");
  });

  test("system.presets returns defined load test presets", async () => {
    const presets = await caller.system.presets();
    assert.ok(presets.smoke);
    assert.ok(presets.baseline);
    assert.ok(presets.ramp);
    assert.strictEqual(presets.smoke.loadProfile.virtualUsers, 2);
  });

  test("organizations.list returns seeded default organization", async () => {
    const orgs = await caller.organizations.list();
    assert.ok(orgs.length > 0);
    assert.strictEqual(orgs[0].name, "Acme Engineering Corp");
  });

  test("projects.list returns project scoped to active org", async () => {
    const projs = await caller.projects.list();
    assert.ok(projs.length > 0);
    assert.strictEqual(projs[0].name, "Payment Gateway API");
  });

  test("targets.listByProject returns verified target URL", async () => {
    const targets = await caller.targets.listByProject({ projectId: "proj_demo_01" });
    assert.ok(targets.length > 0);
    assert.match(targets[0].baseUrl, /^https?:\/\//);
    assert.strictEqual(targets[0].authorizationStatus, "verified");
  });

  test("testPlans.listByProject returns test plans", async () => {
    const plans = await caller.testPlans.listByProject({ projectId: "proj_demo_01" });
    assert.ok(plans.length > 0);
    const smokePlan = plans.find(p => p.id === "plan_smoke_01") || plans[0];
    assert.ok(smokePlan.profile);
    assert.ok(smokePlan.scenarios.length > 0);
  });
});
