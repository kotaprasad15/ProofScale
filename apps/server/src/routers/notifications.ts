import { router, protectedProcedure, publicProcedure } from "../trpc.js";
import {
  NotificationQuerySchema,
  NotificationMarkReadSchema,
  UpdateNotificationPreferencesSchema,
  PushSubscriptionInputSchema
} from "@proofscale/shared";
import {
  notifications,
  notificationPreferences,
  pushSubscriptions,
  organizationMembers
} from "@proofscale/db";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import crypto from "node:crypto";
import { WebPushService } from "../services/notifications/WebPushService.js";

export const notificationsRouter = router({
  /**
   * Returns paginated list of notifications for the authenticated user and active org.
   */
  list: protectedProcedure
    .input(NotificationQuerySchema)
    .query(async ({ ctx, input }) => {
      const orgId = input.orgId || ctx.organizationId;
      const limit = input.limit || 30;

      const conditions = [
        eq(notifications.userId, ctx.user.id)
      ];

      if (orgId) {
        conditions.push(eq(notifications.orgId, orgId));
      }

      if (input.isRead !== undefined) {
        conditions.push(eq(notifications.isRead, input.isRead));
      }

      const items = await ctx.db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);

      // Query unread count
      const unreadItems = await ctx.db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, ctx.user.id),
            orgId ? eq(notifications.orgId, orgId) : undefined as any,
            eq(notifications.isRead, false)
          )
        );

      return {
        items,
        unreadCount: unreadItems.length
      };
    }),

  /**
   * Marks a single notification or all user notifications in the workspace as read.
   */
  markRead: protectedProcedure
    .input(NotificationMarkReadSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = input.orgId || ctx.organizationId;

      if (input.all) {
        const conditions = [
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false)
        ];
        if (orgId) {
          conditions.push(eq(notifications.orgId, orgId));
        }

        await ctx.db
          .update(notifications)
          .set({ isRead: true })
          .where(and(...conditions));

        return { success: true };
      }

      if (input.id) {
        await ctx.db
          .update(notifications)
          .set({ isRead: true })
          .where(
            and(
              eq(notifications.id, input.id),
              eq(notifications.userId, ctx.user.id)
            )
          );

        return { success: true };
      }

      return { success: false };
    }),

  /**
   * Retrieves notification preferences for the user within the specified organization.
   */
  preferences: router({
    get: protectedProcedure
      .input(z.object({ orgId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const orgId = input.orgId || ctx.organizationId;
        if (!orgId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Organization ID is required." });
        }

        const existingPrefs = await ctx.db
          .select()
          .from(notificationPreferences)
          .where(
            and(
              eq(notificationPreferences.userId, ctx.user.id),
              eq(notificationPreferences.orgId, orgId)
            )
          );

        const categories = ["run_results", "team_activity", "security_alerts"] as const;
        const result: Record<string, any> = {};

        for (const cat of categories) {
          const found = existingPrefs.find((p) => p.eventCategory === cat);
          if (found) {
            result[cat] = found;
          } else {
            // Default baseline
            result[cat] = {
              orgId,
              eventCategory: cat,
              inAppEnabled: true,
              pushEnabled: true,
              emailEnabled: false,
              runResultFilter: cat === "run_results" ? "all" : null
            };
          }
        }

        return result;
      }),

    update: protectedProcedure
      .input(UpdateNotificationPreferencesSchema)
      .mutation(async ({ ctx, input }) => {
        const orgId = input.orgId || ctx.organizationId;
        if (!orgId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Organization ID is required." });
        }

        // Security Alerts Rule: Non-optional for Owner/Admin
        if (input.eventCategory === "security_alerts") {
          const [membership] = await ctx.db
            .select()
            .from(organizationMembers)
            .where(
              and(
                eq(organizationMembers.organizationId, orgId),
                eq(organizationMembers.userId, ctx.user.id)
              )
            );

          const role = membership?.role || ctx.orgRole;
          if (["owner", "admin"].includes(role)) {
            if (input.inAppEnabled === false || input.pushEnabled === false) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Security alerts are mandatory and cannot be disabled by Organization Owners or Administrators."
              });
            }
          }
        }

        const [existing] = await ctx.db
          .select()
          .from(notificationPreferences)
          .where(
            and(
              eq(notificationPreferences.userId, ctx.user.id),
              eq(notificationPreferences.orgId, orgId),
              eq(notificationPreferences.eventCategory, input.eventCategory)
            )
          );

        const now = new Date();

        if (existing) {
          await ctx.db
            .update(notificationPreferences)
            .set({
              inAppEnabled: input.inAppEnabled !== undefined ? input.inAppEnabled : existing.inAppEnabled,
              pushEnabled: input.pushEnabled !== undefined ? input.pushEnabled : existing.pushEnabled,
              emailEnabled: input.emailEnabled !== undefined ? input.emailEnabled : existing.emailEnabled,
              runResultFilter: input.runResultFilter !== undefined ? input.runResultFilter : existing.runResultFilter,
              updatedAt: now
            })
            .where(eq(notificationPreferences.id, existing.id));
        } else {
          await ctx.db.insert(notificationPreferences).values({
            id: `np_${crypto.randomUUID().slice(0, 8)}`,
            userId: ctx.user.id,
            orgId,
            eventCategory: input.eventCategory,
            inAppEnabled: input.inAppEnabled !== undefined ? input.inAppEnabled : true,
            pushEnabled: input.pushEnabled !== undefined ? input.pushEnabled : true,
            emailEnabled: input.emailEnabled !== undefined ? input.emailEnabled : false,
            runResultFilter: input.runResultFilter || "all",
            createdAt: now,
            updatedAt: now
          });
        }

        return { success: true };
      })
  }),

  /**
   * Registers browser Web Push subscription for this device.
   */
  pushSubscribe: protectedProcedure
    .input(PushSubscriptionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      const [existing] = await ctx.db
        .select()
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, ctx.user.id),
            eq(pushSubscriptions.endpoint, input.endpoint)
          )
        );

      if (existing) {
        await ctx.db
          .update(pushSubscriptions)
          .set({
            p256dhKey: input.keys.p256dh,
            authKey: input.keys.auth,
            userAgent: input.userAgent || ctx.req?.headers?.["user-agent"] || null,
            isValid: true,
            lastSeenAt: now
          })
          .where(eq(pushSubscriptions.id, existing.id));
      } else {
        await ctx.db.insert(pushSubscriptions).values({
          id: `ps_${crypto.randomUUID().slice(0, 8)}`,
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dhKey: input.keys.p256dh,
          authKey: input.keys.auth,
          userAgent: input.userAgent || ctx.req?.headers?.["user-agent"] || null,
          isValid: true,
          createdAt: now,
          lastSeenAt: now
        });
      }

      return { success: true };
    }),

  /**
   * Invalidates web push subscription when user revokes browser permission.
   */
  pushUnsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(pushSubscriptions)
        .set({ isValid: false })
        .where(
          and(
            eq(pushSubscriptions.userId, ctx.user.id),
            eq(pushSubscriptions.endpoint, input.endpoint)
          )
        );

      return { success: true };
    }),

  /**
   * Returns VAPID public key for web push subscription.
   */
  getVapidPublicKey: publicProcedure.query(() => {
    return {
      publicKey: WebPushService.getPublicKey()
    };
  })
});
