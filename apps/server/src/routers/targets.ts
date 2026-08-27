import { router, tenantProcedure, requireProjectPermission } from "../trpc.js";
import { CreateTargetSchema, sanitizeTargetUrl, validateTargetHostDns } from "@proofscale/shared";
import { targets } from "@proofscale/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const targetsRouter = router({
  listByProject: tenantProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(targets)
        .where(eq(targets.projectId, input.projectId));
    }),

  getById: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [target] = await ctx.db
        .select()
        .from(targets)
        .where(eq(targets.id, input.id));

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target endpoint not found." });
      }

      return target;
    }),

  create: requireProjectPermission("manageTargets")
    .input(CreateTargetSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Target URL Sanitization & Protocol Check
      const sanitization = sanitizeTargetUrl(input.baseUrl);
      if (!sanitization.isValid || !sanitization.normalizedUrl || !sanitization.allowedHost) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: sanitization.reason || "Invalid target URL format."
        });
      }

      // 2. SSRF & Network Boundary Guard Check (allow localhost in dev/testing mode)
      const allowPrivate = process.env.ALLOW_PRIVATE_TARGETS === "true" || process.env.NODE_ENV !== "production";
      const dnsCheck = await validateTargetHostDns(sanitization.allowedHost, { allowPrivateIPs: allowPrivate });

      if (!dnsCheck.isValid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: dnsCheck.reason || "Target URL violates SSRF security boundary."
        });
      }

      const targetId = `target_${crypto.randomUUID().slice(0, 8)}`;

      const [newTarget] = await ctx.db
        .insert(targets)
        .values({
          id: targetId,
          projectId: input.projectId,
          baseUrl: sanitization.normalizedUrl,
          healthUrl: input.healthUrl,
          environment: input.environment,
          authorizationStatus: "verified", // User explicit ownership acknowledgement
          allowedHost: sanitization.allowedHost
        })
        .returning();

      return newTarget;
    }),

  delete: requireProjectPermission("manageTargets")
    .input(z.object({ id: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(targets)
        .where(eq(targets.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target endpoint not found." });
      }

      await ctx.db.delete(targets).where(eq(targets.id, input.id));
      return { success: true, id: input.id };
    })
});
