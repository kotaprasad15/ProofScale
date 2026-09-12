import assert from "node:assert";
import { test, describe, beforeEach } from "node:test";
import { appRouter } from "../routers/index.js";
import { createContext } from "../context.js";
import { db, notifications, notificationPreferences, pushSubscriptions } from "@proofscale/db";
import { eq, and } from "drizzle-orm";
import { PresenceService } from "../services/presence/PresenceService.js";
import { NotificationFanOutService } from "../services/notifications/NotificationFanOutService.js";
import { RunLifecycleEvent } from "@proofscale/shared";

describe("RateCap Notification System Integration Tests", () => {
  const adminUserId = "usr_admin_01";
  const orgId = "org_default_01";
  const projectId = "proj_demo_01";

  const adminCaller = appRouter.createCaller(
    async () => createContext({
      req: {
        headers: {
          "x-user-id": adminUserId,
          "x-user-email": "lead@acme.dev",
          "x-organization-id": orgId
        }
      } as any,
      res: {} as any
    })
  );

  describe("1. Explicit Presence Tracking Service", () => {
    beforeEach(() => {
      PresenceService.clear();
    });

    test("isUserActivelyWatching returns false when no device has registered presence", () => {
      assert.strictEqual(PresenceService.isUserActivelyWatching("usr_unknown"), false);
    });

    test("isUserActivelyWatching returns true when at least one device reports visible: true", () => {
      PresenceService.updatePresence(adminUserId, "device_desktop", true);
      assert.strictEqual(PresenceService.isUserActivelyWatching(adminUserId), true);
    });

    test("isUserActivelyWatching returns false when all registered devices report visible: false", () => {
      PresenceService.updatePresence(adminUserId, "device_tab_1", false);
      PresenceService.updatePresence(adminUserId, "device_tab_2", false);
      assert.strictEqual(PresenceService.isUserActivelyWatching(adminUserId), false);
    });

    test("isUserActivelyWatching returns false when tab unloads via removePresence", () => {
      PresenceService.updatePresence(adminUserId, "device_desktop", true);
      assert.strictEqual(PresenceService.isUserActivelyWatching(adminUserId), true);
      PresenceService.removePresence(adminUserId, "device_desktop");
      assert.strictEqual(PresenceService.isUserActivelyWatching(adminUserId), false);
    });
  });

  describe("2. Security Alerts Preference Policy (Owner/Admin Immutability)", () => {
    test("Owner/Admin is forbidden from disabling security_alerts", async () => {
      await assert.rejects(
        async () => {
          await adminCaller.notifications.preferences.update({
            orgId,
            eventCategory: "security_alerts",
            inAppEnabled: false
          });
        },
        (err: any) => {
          assert.strictEqual(err.code, "FORBIDDEN");
          assert.match(err.message, /mandatory and cannot be disabled/);
          return true;
        }
      );
    });

    test("Owner/Admin can update run_results preferences without restriction", async () => {
      const res = await adminCaller.notifications.preferences.update({
        orgId,
        eventCategory: "run_results",
        inAppEnabled: true,
        pushEnabled: true,
        runResultFilter: "tier_change_only"
      });
      assert.strictEqual(res.success, true);

      const prefs = await adminCaller.notifications.preferences.get({ orgId });
      const runResultPref = prefs.run_results;
      assert.ok(runResultPref);
      assert.strictEqual(runResultPref.runResultFilter, "tier_change_only");
    });
  });

  describe("3. Web Push & Subscription Handling", () => {
    test("getVapidPublicKey returns a non-empty string", async () => {
      const { publicKey } = await adminCaller.notifications.getVapidPublicKey();
      assert.ok(publicKey && publicKey.length > 20);
    });

    test("pushSubscribe registers and updates device subscription", async () => {
      const fakeEndpoint = "https://fcm.googleapis.com/fcm/send/test_endpoint_01";
      const res = await adminCaller.notifications.pushSubscribe({
        endpoint: fakeEndpoint,
        keys: {
          p256dh: "BM6hE8xOQ_fake_key_p256dh",
          auth: "auth123fake"
        }
      });
      assert.strictEqual(res.success, true);

      const [sub] = await db
        .select()
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, adminUserId),
            eq(pushSubscriptions.endpoint, fakeEndpoint)
          )
        );
      assert.ok(sub);
      assert.strictEqual(sub.isValid, true);
    });
  });

  describe("4. Notifications Inbox & Mark Read", () => {
    test("list returns unread count and inbox items, markRead marks them", async () => {
      // Direct insertion of test notification
      const testNotifId = `notif_test_${Date.now()}`;
      await db.insert(notifications).values({
        id: testNotifId,
        userId: adminUserId,
        orgId,
        eventType: "run.tier_changed",
        title: "Test Readiness Tier Drop",
        body: "Tier dropped to needs_investigation",
        severity: "warning",
        linkUrl: `/reports?runId=run_test_01`,
        isRead: false,
        createdAt: new Date()
      });

      // Verify list returns item
      const listBefore = await adminCaller.notifications.list({ orgId, isRead: false });
      assert.ok(listBefore.unreadCount >= 1);
      const found = listBefore.items.find(i => i.id === testNotifId);
      assert.ok(found);
      assert.strictEqual(found.isRead, false);

      // Mark single item read
      await adminCaller.notifications.markRead({ id: testNotifId });
      const [updated] = await db.select().from(notifications).where(eq(notifications.id, testNotifId));
      assert.strictEqual(updated.isRead, true);

      // Mark all read
      const markAllResult = await adminCaller.notifications.markRead({ orgId, all: true });
      assert.strictEqual(markAllResult.success, true);
      const listAfter = await adminCaller.notifications.list({ orgId, isRead: false });
      assert.strictEqual(listAfter.unreadCount, 0);
    });
  });

  describe("5. Fan-Out & Dual Event Tier Shift Handling", () => {
    test("Tier drop event produces warning/critical notification in eligible user inbox", async () => {
      // Emulate tier drop event
      const tierDropEvent: RunLifecycleEvent = {
        eventId: `evt_${Date.now()}`,
        eventType: "run.tier_changed",
        occurredAt: new Date().toISOString(),
        orgId,
        projectId,
        targetId: "tgt_demo_01",
        runId: `run_fanout_${Date.now()}`,
        payload: {
          targetName: "Payment Gateway",
          scenario: "baseline",
          score: 42,
          tier: "needs_investigation",
          previousTier: "ready",
          errorRate: 0.08
        }
      };

      await NotificationFanOutService.handleRunLifecycleEvent(tierDropEvent);

      const listRes = await adminCaller.notifications.list({ orgId });
      const matching = listRes.items.find(n => n.linkUrl?.includes(tierDropEvent.runId));
      assert.ok(matching, "Notification should be generated for admin user");
      assert.strictEqual(matching.severity, "warning");
      assert.match(matching.title, /Readiness Tier Changed/);
      assert.match(matching.body, /Tier shifted from 'ready' to 'needs_investigation'/);
    });
  });
});
