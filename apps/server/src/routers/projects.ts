import { router, tenantProcedure } from "../trpc.js";
import { CreateProjectSchema, UpdateProjectSchema } from "@proofscale/shared";
import { projects } from "@proofscale/db";
import { eq, and } from "drizzle-orm";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const projectsRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(projects)
      .where(eq(projects.organizationId, ctx.organizationId));
  }),

  getById: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [proj] = await ctx.db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.id), eq(projects.organizationId, ctx.organizationId)));

      if (!proj) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      }

      return proj;
    }),

  create: tenantProcedure
    .input(CreateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const projectId = `proj_${crypto.randomUUID().slice(0, 8)}`;

      const [newProj] = await ctx.db
        .insert(projects)
        .values({
          id: projectId,
          organizationId: ctx.organizationId,
          name: input.name,
          description: input.description,
          environment: input.environment
        })
        .returning();

      return newProj;
    })
});
