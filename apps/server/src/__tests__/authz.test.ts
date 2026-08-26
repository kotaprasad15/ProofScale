import assert from "node:assert";
import { test, describe } from "node:test";
import { evaluatePermissions, canOrganization, canProject } from "@proofscale/shared";
import { appRouter } from "../routers/index.js";
import { createContext } from "../context.js";
import { db, users, organizations, organizationMembers, projectMembers, projects } from "@proofscale/db";
import { eq, and } from "drizzle-orm";

describe("Phase 7: Authentication, Onboarding & Dual-Scope RBAC", () => {
  describe("Pure Permission Matrix Evaluation", () => {
    test("Org Owner receives full organization & project administrative capabilities", () => {
      const perms = evaluatePermissions("owner", null);
      assert.strictEqual(perms.manageOrganization, true);
      assert.strictEqual(perms.manageMembers, true);
      assert.strictEqual(perms.createProject, true);
      assert.strictEqual(perms.manageTargets, true);
      assert.strictEqual(perms.editTestPlans, true);
      assert.strictEqual(perms.createRuns, true);
      assert.strictEqual(perms.cancelAnyRun, true);
    });

    test("Project Owner receives project management capabilities without organization administration", () => {
      const perms = evaluatePermissions("member", "owner");
      assert.strictEqual(perms.manageOrganization, false);
      assert.strictEqual(perms.manageMembers, false);
      assert.strictEqual(perms.createProject, false);
      assert.strictEqual(perms.manageTargets, true);
      assert.strictEqual(perms.editTestPlans, true);
      assert.strictEqual(perms.createRuns, true);
      assert.strictEqual(perms.manageProjectSettings, true);
    });

    test("Tester receives run execution and report viewing capabilities without modification rights", () => {
      const perms = evaluatePermissions("tester", "tester");
      assert.strictEqual(perms.manageOrganization, false);
      assert.strictEqual(perms.manageMembers, false);
      assert.strictEqual(perms.manageTargets, false);
      assert.strictEqual(perms.editTestPlans, false);
      assert.strictEqual(perms.createRuns, true);
      assert.strictEqual(perms.cancelOwnRuns, true);
      assert.strictEqual(perms.cancelAnyRun, false);
      assert.strictEqual(perms.viewReports, true);
    });

    test("Viewer receives read-only access", () => {
      const perms = evaluatePermissions("member", "viewer");
      assert.strictEqual(perms.createRuns, false);
      assert.strictEqual(perms.manageTargets, false);
      assert.strictEqual(perms.editTestPlans, false);
      assert.strictEqual(perms.viewReports, true);
      assert.strictEqual(perms.viewProject, true);
    });
  });

  describe("Onboarding & Organization Creation Flow", () => {
    const newUserId = `usr_new_${Date.now()}`;
    const newUserEmail = `developer_${Date.now()}@acme.dev`;

    test("new user gets onboarded and creates organization + project", async () => {
      const caller = appRouter.createCaller(
        async () => createContext({ req: { headers: { "x-user-id": newUserId, "x-user-email": newUserEmail } } })
      );

      const onboardResult = await caller.auth.createOrganizationOnboarding({
        name: "FinTech Innovations Inc",
        displayName: "FinTech Lead",
        initialProjectName: "Payments Core"
      });

      assert.ok(onboardResult.organizationId);
      assert.ok(onboardResult.projectId);

      // Verify user membership in DB is owner
      const [mem] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, onboardResult.organizationId),
            eq(organizationMembers.userId, newUserId)
          )
        );

      assert.ok(mem);
      assert.strictEqual(mem.role, "owner");
    });
  });

  describe("Invitation & Access Request Workflows", () => {
    const adminCaller = appRouter.createCaller(
      async () => createContext({ req: { headers: { "x-user-id": "usr_admin_01", "x-user-email": "lead@acme.dev", "x-organization-id": "org_default_01" } } })
    );

    const invitedEmail = `contractor_${Date.now()}@test.dev`;
    const invitedUserId = `usr_invited_${Date.now()}`;

    test("owner creates invitation, preview works, and invited user accepts", async () => {
      // 1. Owner creates invitation
      const inviteResult = await adminCaller.organizations.inviteMember({
        organizationId: "org_default_01",
        email: invitedEmail,
        role: "tester"
      });

      assert.ok(inviteResult.rawToken);
      assert.ok(inviteResult.inviteId);

      // 2. Public preview
      const preview = await adminCaller.invitations.preview({ token: inviteResult.rawToken });
      assert.strictEqual(preview.organizationName, "Acme Engineering Corp");
      assert.strictEqual(preview.role, "tester");

      // 3. Invited user accepts invitation
      const invitedCaller = appRouter.createCaller(
        async () => createContext({ req: { headers: { "x-user-id": invitedUserId, "x-user-email": invitedEmail } } })
      );

      const acceptRes = await invitedCaller.auth.acceptInvitation({ token: inviteResult.rawToken });
      assert.strictEqual(acceptRes.success, true);
      assert.strictEqual(acceptRes.organizationId, "org_default_01");

      // 4. Double acceptance must be rejected
      await assert.rejects(
        async () => {
          await invitedCaller.auth.acceptInvitation({ token: inviteResult.rawToken });
        },
        (err: any) => {
          assert.strictEqual(err.code, "FORBIDDEN");
          assert.match(err.message, /already been accepted/);
          return true;
        }
      );
    });

    test("tester can request access and admin can approve it", async () => {
      const reqUserId = `usr_req_${Date.now()}`;
      const reqUserEmail = `tester_${Date.now()}@qa.dev`;

      const reqCaller = appRouter.createCaller(
        async () => createContext({ req: { headers: { "x-user-id": reqUserId, "x-user-email": reqUserEmail } } })
      );

      const reqRes = await reqCaller.auth.requestTesterAccess({
        organizationId: "org_default_01",
        message: "Requesting access to run load tests for Staging QA"
      });

      assert.ok(reqRes.requestId);

      // Admin lists requests
      const pendingList = await adminCaller.accessRequests.listForReview();
      assert.ok(pendingList.some(r => r.id === reqRes.requestId));

      // Admin approves request
      const approveRes = await adminCaller.accessRequests.approve({
        requestId: reqRes.requestId,
        role: "tester"
      });

      assert.strictEqual(approveRes.success, true);
    });
  });

  describe("Role Capability & Mutation Boundary Enforcement", () => {
    test("Tester is forbidden from creating test plans or registering targets", async () => {
      const testerCaller = appRouter.createCaller(
        async () => createContext({
          req: {
            headers: {
              "x-user-id": "usr_tester_01",
              "x-user-email": "qa.tester@acme.dev",
              "x-organization-id": "org_default_01",
              "x-project-id": "proj_demo_01"
            }
          }
        })
      );

      // 1. Tester attempting to create target should fail
      await assert.rejects(
        async () => {
          await testerCaller.targets.create({
            projectId: "proj_demo_01",
            baseUrl: "http://localhost:4000",
            environment: "staging",
            authorizationAcknowledged: true
          });
        },
        (err: any) => {
          assert.strictEqual(err.code, "FORBIDDEN");
          assert.match(err.message, /manageTargets/);
          return true;
        }
      );

      // 2. Tester attempting to create test plan should fail
      await assert.rejects(
        async () => {
          await testerCaller.testPlans.create({
            projectId: "proj_demo_01",
            name: "Unauthorized Plan",
            profile: "smoke",
            scenarios: [{ name: "Health", method: "GET", path: "/health", weight: 1 }],
            loadProfile: { virtualUsers: 2, durationSeconds: 10, rampUpSeconds: 2, timeoutMs: 5000 },
            thresholds: { maxP95Ms: 1000, maxP99Ms: 2000, maxErrorRate: 0.01 }
          });
        },
        (err: any) => {
          assert.strictEqual(err.code, "FORBIDDEN");
          assert.match(err.message, /editTestPlans/);
          return true;
        }
      );

      // 3. Tester attempting to create run on existing plan MUST succeed
      const runRes = await testerCaller.runs.create({
        planId: "plan_smoke_01",
        targetId: "target_fixture_01"
      });

      assert.ok(runRes.id);
      assert.strictEqual(runRes.status, "queued");
    });
  });
});
