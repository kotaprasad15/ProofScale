import { router, protectedProcedure } from "../trpc.js";
import {
  NotificationEventTypeEnum,
  NotificationRuleSeverityEnum
} from "@proofscale/shared";
import { notificationRules, organizationMembers, projectMembers, auditEvents } from "@proofscale/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * Phase 3: per-user notification rules.
 *
 * A rule is keyed by (user, org, project|null, eventType) and is upserted.
 * Membership in the org is mandatory; an optional projectId requires active
 * project membership so users cannot subscribe to inaccessible projects.
 */

const RuleInputSchema = z.object({
  organizationId: z.string().min(1),
  projectId: z.string().nullable().optional(),
  eventType: NotificationEventTypeEnum,
  enabled: z.boolean().optional(),
  minimumSeverity: NotificationRuleSeverityEnum.optional()
});

async function requireOrgMembership(ctx: any, organizationId: string) {
  const [mem] = await ctx.db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, ctx.user.id),
        eq(organizationMembers.status, "active")
      )
    );
  if (!mem) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this organization." });
  }
  return mem;
}

export const notificationRulesRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await requireOrgMembership(ctx, input.organizationId);
      return ctx.db
        .select()
        .from(notificationRules)
        .where(
          and(
            eq(notificationRules.userId, ctx.user.id),
            eq(notificationRules.organizationId, input.organizationId)
          )
        )
        .orderBy(desc(notificationRules.updatedAt));
    }),

  createOrUpdate: protectedProcedure
    .input(RuleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const mem = await requireOrgMembership(ctx, input.organizationId);

      if (input.projectId) {
        const [pm] = await ctx.db
          .select()
          .from(projectMembers)
          .where(
            and(
              eq(projectMembers.projectId, input.projectId),
              eq(projectMembers.userId, ctx.user.id),
              eq(projectMembers.status, "active")
            )
          );
        // Org owners/admins may target any project in their org; others need membership.
        if (!pm && !["owner", "admin"].includes(mem.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this project." });
        }
      }

      const [existing] = await ctx.db
        .select()
        .from(notificationRules)
        .where(
          and(
            eq(notificationRules.userId, ctx.user.id),
            eq(notificationRules.organizationId, input.organizationId),
            input.projectId ? eq(notificationRules.projectId, input.projectId) : isNull(notificationRules.projectId),
            eq(notificationRules.eventType, input.eventType)
          )
        );

      const now = new Date();
      if (existing) {
        await ctx.db
          .update(notificationRules)
          .set({
            enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
            minimumSeverity: input.minimumSeverity ?? existing.minimumSeverity,
            updatedAt: now
          })
          .where(eq(notificationRules.id, existing.id));
      } else {
        await ctx.db.insert(notificationRules).values({
          id: `rule_${crypto.randomUUID().slice(0, 12)}`,
          organizationId: input.organizationId,
          projectId: input.projectId || null,
          userId: ctx.user.id,
          eventType: input.eventType,
          enabled: input.enabled !== undefined ? input.enabled : true,
          minimumSeverity: input.minimumSeverity ?? "info",
          createdBy: ctx.user.id,
          createdAt: now,
          updatedAt: now
        });
      }

      await ctx.db.insert(auditEvents).values({
        id: `audit_${crypto.randomUUID().slice(0, 8)}`,
        actorUserId: ctx.user.id,
        organizationId: input.organizationId,
        projectId: input.projectId || null,
        action: "notification_rule.changed",
        subject: input.eventType,
        metadataJson: JSON.stringify({
          enabled: input.enabled,
          minimumSeverity: input.minimumSeverity
        })
      });

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [rule] = await ctx.db.select().from(notificationRules).where(eq(notificationRules.id, input.id));
      // Only the owner of the rule may delete it.
      if (!rule || rule.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Notification rule not found." });
      }

      await ctx.db.delete(notificationRules).where(eq(notificationRules.id, input.id));

      await ctx.db.insert(auditEvents).values({
        id: `audit_${crypto.randomUUID().slice(0, 8)}`,
        actorUserId: ctx.user.id,
        organizationId: rule.organizationId,
        projectId: rule.projectId,
        action: "notification_rule.deleted",
        subject: rule.eventType
      });

      return { success: true };
    })
});
