import { db, notifications, notificationPreferences, pushSubscriptions, notificationDeliveries, organizationMembers, projectMembers } from "@proofscale/db";
import { eq, and } from "drizzle-orm";
import { RunLifecycleEvent, NotificationCategory, NotificationSeverity } from "@proofscale/shared";
import { PresenceService } from "../presence/PresenceService.js";
import { RealtimeNotificationManager } from "./RealtimeNotificationManager.js";
import { WebPushService } from "./WebPushService.js";
import crypto from "node:crypto";

export class NotificationFanOutService {
  /**
   * Main Fan-out handler for RunLifecycleEvent.
   */
  static async handleRunLifecycleEvent(event: RunLifecycleEvent): Promise<void> {
    // 1. Resolve users with access to the project/organization
    const eligibleUsers = await this.resolveEligibleUsers(event.orgId, event.projectId);

    // Prepare notification content
    const { title, body, severity } = this.formatNotificationContent(event);
    const linkUrl = `/reports?runId=${event.runId}`;

    // 2. Iterate through users and evaluate preferences
    for (const user of eligibleUsers) {
      try {
        await this.deliverToUser(user, event, { title, body, severity, linkUrl });
      } catch (err: any) {
        console.error(`Failed to process notification for user ${user.id}:`, err);
      }
    }
  }

  /**
   * Delivers notification to a single user according to preferences and presence.
   */
  private static async deliverToUser(
    user: { id: string; role: string },
    event: RunLifecycleEvent,
    content: { title: string; body: string; severity: NotificationSeverity; linkUrl: string }
  ): Promise<void> {
    // Load preferences for 'run_results' (or default)
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, user.id),
          eq(notificationPreferences.orgId, event.orgId),
          eq(notificationPreferences.eventCategory, "run_results")
        )
      );

    const inAppEnabled = prefs ? prefs.inAppEnabled : true;
    const pushEnabled = prefs ? prefs.pushEnabled : true;
    const runResultFilter = prefs?.runResultFilter || "all";

    // Filter check
    if (runResultFilter === "tier_change_only" && event.eventType !== "run.tier_changed") {
      return;
    }
    if (runResultFilter === "failures_only" && !["run.failed", "run.aborted"].includes(event.eventType) && (event.payload.score === undefined || event.payload.score >= 50)) {
      return;
    }

    const notificationId = `notif_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date();

    // 3. Insert durable inbox record if inAppEnabled
    if (inAppEnabled) {
      await db.insert(notifications).values({
        id: notificationId,
        userId: user.id,
        orgId: event.orgId,
        eventType: event.eventType,
        title: content.title,
        body: content.body,
        severity: content.severity,
        linkUrl: content.linkUrl,
        isRead: false,
        createdAt: now
      });

      // Record delivery
      await db.insert(notificationDeliveries).values({
        id: `nd_${crypto.randomUUID().slice(0, 8)}`,
        notificationId,
        channel: "in_app",
        status: "sent",
        attemptedAt: now
      });

      // 4. Emit live SSE toast event for active sessions
      RealtimeNotificationManager.sendToUser(user.id, {
        id: notificationId,
        eventType: event.eventType,
        title: content.title,
        body: content.body,
        severity: content.severity,
        linkUrl: content.linkUrl,
        createdAt: now.toISOString(),
        metadata: event.payload
      });
    }

    // 5. Presence check & Web Push Delivery
    const isActivelyWatching = PresenceService.isUserActivelyWatching(user.id);

    if (pushEnabled && !isActivelyWatching) {
      const subscriptions = await db
        .select()
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, user.id),
            eq(pushSubscriptions.isValid, true)
          )
        );

      for (const sub of subscriptions) {
        const result = await WebPushService.sendPushNotification(
          {
            endpoint: sub.endpoint,
            p256dhKey: sub.p256dhKey,
            authKey: sub.authKey
          },
          {
            title: content.title,
            body: content.body,
            linkUrl: content.linkUrl,
            severity: content.severity,
            tag: `run-${event.runId}`
          }
        );

        // If 410/404 Gone, mark subscription invalid immediately
        if (result.isInvalid) {
          await db
            .update(pushSubscriptions)
            .set({ isValid: false })
            .where(eq(pushSubscriptions.id, sub.id));
        }

        // Record delivery result
        if (inAppEnabled) {
          await db.insert(notificationDeliveries).values({
            id: `nd_${crypto.randomUUID().slice(0, 8)}`,
            notificationId,
            channel: "push",
            status: result.success ? "sent" : (result.isInvalid ? "failed" : "failed"),
            errorDetail: result.error || null,
            attemptedAt: new Date()
          });
        }
      }
    }
  }

  /**
   * Resolves members of the organization who have access to the target project.
   */
  private static async resolveEligibleUsers(orgId: string, projectId: string): Promise<{ id: string; role: string }[]> {
    const orgMems = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.status, "active")
        )
      );

    const eligible: { id: string; role: string }[] = [];

    for (const mem of orgMems) {
      if (["owner", "admin"].includes(mem.role)) {
        eligible.push({ id: mem.userId, role: mem.role });
      } else {
        // Check project membership for members / testers
        const [projMem] = await db
          .select()
          .from(projectMembers)
          .where(
            and(
              eq(projectMembers.projectId, projectId),
              eq(projectMembers.userId, mem.userId),
              eq(projectMembers.status, "active")
            )
          );

        if (projMem || mem.role === "member") {
          eligible.push({ id: mem.userId, role: mem.role });
        }
      }
    }

    return eligible;
  }

  /**
   * Builds human-readable titles, bodies and severity ratings based on event payload.
   */
  private static formatNotificationContent(event: RunLifecycleEvent): {
    title: string;
    body: string;
    severity: NotificationSeverity;
  } {
    const { payload } = event;

    if (event.eventType === "run.tier_changed") {
      const prev = payload.previousTier || "Initial";
      const curr = payload.tier || "unknown";
      const isDrop = curr === "not_ready" || (curr === "needs_investigation" && prev === "ready");

      return {
        title: `Readiness Tier Changed: ${payload.targetName}`,
        body: `Tier shifted from '${prev}' to '${curr}' during ${payload.scenario} load run. Score: ${payload.score ?? 0}/100.`,
        severity: isDrop ? (curr === "not_ready" ? "critical" : "warning") : "info"
      };
    }

    if (event.eventType === "run.completed") {
      const score = payload.score ?? 0;
      const severity: NotificationSeverity = score >= 75 ? "info" : (score >= 50 ? "warning" : "critical");

      return {
        title: `Test Run Completed: ${payload.targetName}`,
        body: `${payload.scenario} check completed. Readiness score: ${score}/100 (${payload.tier || "evaluated"}).`,
        severity
      };
    }

    if (event.eventType === "run.failed") {
      return {
        title: `Test Run Failed: ${payload.targetName}`,
        body: `Execution error encountered: ${payload.failureReason || "Endpoint unreachable or connection reset"}.`,
        severity: "critical"
      };
    }

    // run.aborted
    return {
      title: `Test Run Aborted: ${payload.targetName}`,
      body: `Run execution cancelled: ${payload.failureReason || "User aborted"}.`,
      severity: "warning"
    };
  }
}
