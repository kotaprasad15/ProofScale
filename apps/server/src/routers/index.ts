import { router } from "../trpc.js";
import { systemRouter } from "./system.js";
import { authRouter } from "./auth.js";
import { organizationsRouter } from "./organizations.js";
import { projectsRouter } from "./projects.js";
import { targetsRouter } from "./targets.js";
import { testPlansRouter } from "./testPlans.js";
import { runsRouter } from "./runs.js";
import { reportsRouter } from "./reports.js";
import { invitationsRouter } from "./invitations.js";
import { accessRequestsRouter } from "./accessRequests.js";
import { billingRouter } from "./billing.js";
import { aiRouter } from "./ai.js";
import { adminRouter } from "./admin.js";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  organizations: organizationsRouter,
  projects: projectsRouter,
  targets: targetsRouter,
  testPlans: testPlansRouter,
  runs: runsRouter,
  reports: reportsRouter,
  invitations: invitationsRouter,
  accessRequests: accessRequestsRouter,
  billing: billingRouter,
  ai: aiRouter,
  admin: adminRouter
});

export type AppRouter = typeof appRouter;
