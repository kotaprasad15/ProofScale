import React, { useState } from "react";
import { trpc } from "../../utils/trpc";
import {
  Bell,
  ShieldAlert,
  Activity,
  Users,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Lock,
  Loader2
} from "lucide-react";

interface NotificationPreferencesViewProps {
  orgId?: string | null;
  orgRole?: string | null;
  subscribeToWebPush: () => Promise<{ success: boolean; error?: string }>;
  pushPermission: NotificationPermission;
  isPushSupported: boolean;
  isSubscribingPush: boolean;
}

export function NotificationPreferencesView({
  orgId,
  orgRole,
  subscribeToWebPush,
  pushPermission,
  isPushSupported,
  isSubscribingPush
}: NotificationPreferencesViewProps) {
  const utils = trpc.useUtils();
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const isOwnerOrAdmin = orgRole === "owner" || orgRole === "admin";

  const prefsQuery = trpc.notifications.preferences.get.useQuery(
    { orgId: orgId || "" },
    { enabled: !!orgId }
  );

  const updateMutation = trpc.notifications.preferences.update.useMutation({
    onSuccess: () => {
      utils.notifications.preferences.get.invalidate();
      setFeedbackMsg({ text: "Preferences updated successfully.", type: "success" });
      setTimeout(() => setFeedbackMsg(null), 3000);
    },
    onError: (err) => {
      setFeedbackMsg({ text: err.message || "Failed to update preference.", type: "error" });
    }
  });

  const handleToggle = async (
    category: "run_results" | "team_activity" | "security_alerts",
    field: "inAppEnabled" | "pushEnabled",
    currentValue: boolean
  ) => {
    if (!orgId) return;

    if (category === "security_alerts" && isOwnerOrAdmin) {
      setFeedbackMsg({
        text: "Security alerts are mandatory and cannot be disabled for organization owners or admins.",
        type: "error"
      });
      return;
    }

    await updateMutation.mutateAsync({
      orgId,
      eventCategory: category,
      [field]: !currentValue
    });
  };

  const handleFilterChange = async (filter: "all" | "tier_change_only" | "failures_only") => {
    if (!orgId) return;
    await updateMutation.mutateAsync({
      orgId,
      eventCategory: "run_results",
      runResultFilter: filter
    });
  };

  const prefs = prefsQuery.data || {};
  const runPrefs = prefs.run_results || { inAppEnabled: true, pushEnabled: true, runResultFilter: "all" };
  const teamPrefs = prefs.team_activity || { inAppEnabled: true, pushEnabled: true };
  const secPrefs = prefs.security_alerts || { inAppEnabled: true, pushEnabled: true };

  return (
    <div className="space-y-6">
      <div className="border-b border-white/[0.08] pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Bell className="w-4 h-4 text-signal-indigo" />
            <span>Notification & Push Preferences</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Configure how and when you receive test completions, tier shifts, and workspace security alerts.
          </p>
        </div>

        {feedbackMsg && (
          <div
            className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-medium animate-in fade-in duration-200 ${
              feedbackMsg.type === "success"
                ? "bg-signal-teal/10 border-signal-teal/20 text-signal-teal"
                : "bg-signal-rose/10 border-signal-rose/20 text-signal-rose"
            }`}
          >
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}
      </div>

      {/* Browser Web Push Activation Card */}
      <div className="p-4 rounded-2xl bg-ink-950/80 border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-signal-indigo/10 border border-signal-indigo/20 text-signal-indigo shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-text-primary">
                Browser Web Push (Service Worker)
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                  pushPermission === "granted"
                    ? "bg-signal-teal/10 text-signal-teal border border-signal-teal/20"
                    : pushPermission === "denied"
                    ? "bg-signal-rose/10 text-signal-rose border border-signal-rose/20"
                    : "bg-signal-amber/10 text-signal-amber border border-signal-amber/20"
                }`}
              >
                {pushPermission === "granted" ? "Active" : pushPermission === "denied" ? "Blocked" : "Not enabled"}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Receive instant desktop notifications for completed load runs and tier changes even when this tab is hidden or minimized.
            </p>
          </div>
        </div>

        <div>
          {pushPermission === "granted" ? (
            <div className="flex items-center gap-1.5 text-xs text-signal-teal font-medium px-3 py-1.5 rounded-xl bg-signal-teal/10 border border-signal-teal/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Push Enabled</span>
            </div>
          ) : pushPermission === "denied" ? (
            <span className="text-[11px] text-signal-rose font-mono">
              Blocked in browser settings
            </span>
          ) : (
            <button
              onClick={subscribeToWebPush}
              disabled={isSubscribingPush || !isPushSupported}
              className="px-3.5 py-1.5 rounded-xl bg-signal-indigo hover:bg-signal-indigo/90 text-white text-xs font-semibold shadow transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubscribingPush && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Enable Web Push</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Preferences List */}
      <div className="space-y-4">
        {/* Category 1: Run Results */}
        <div className="p-4 rounded-2xl bg-ink-950/50 border border-[var(--border)] space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-signal-teal" />
              <div>
                <h4 className="text-xs font-bold text-text-primary">
                  Load Run Lifecycle & Readiness Results
                </h4>
                <p className="text-[11px] text-text-muted">
                  Notifications when validation runs complete, fail, or trigger tier shifts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-text-primary">
                <input
                  type="checkbox"
                  checked={runPrefs.inAppEnabled}
                  onChange={() => handleToggle("run_results", "inAppEnabled", runPrefs.inAppEnabled)}
                  className="rounded border-[var(--border)] bg-ink-900 text-signal-indigo focus:ring-0 cursor-pointer"
                />
                <span>In-App</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-text-primary">
                <input
                  type="checkbox"
                  checked={runPrefs.pushEnabled}
                  onChange={() => handleToggle("run_results", "pushEnabled", runPrefs.pushEnabled)}
                  className="rounded border-[var(--border)] bg-ink-900 text-signal-indigo focus:ring-0 cursor-pointer"
                />
                <span>Push</span>
              </label>
            </div>
          </div>

          {/* Run filter dropdown */}
          <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs">
            <span className="text-text-muted">Delivery Filter:</span>
            <select
              value={runPrefs.runResultFilter || "all"}
              onChange={(e) => handleFilterChange(e.target.value as any)}
              className="bg-ink-900 border border-[var(--border)] rounded-lg px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-signal-indigo cursor-pointer"
            >
              <option value="all">All Run Results (Completions, Aborts, Shifts)</option>
              <option value="tier_change_only">Readiness Tier Shifts Only</option>
              <option value="failures_only">Failures, Aborts &amp; Score Drops (&lt; 50) Only</option>
            </select>
          </div>
        </div>

        {/* Category 2: Team Activity */}
        <div className="p-4 rounded-2xl bg-ink-950/50 border border-[var(--border)] flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-signal-indigo" />
            <div>
              <h4 className="text-xs font-bold text-text-primary">
                Team &amp; Workspace Activity
              </h4>
              <p className="text-[11px] text-text-muted">
                Member invitations, project permissions updates, and access requests.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-text-primary">
              <input
                type="checkbox"
                checked={teamPrefs.inAppEnabled}
                onChange={() => handleToggle("team_activity", "inAppEnabled", teamPrefs.inAppEnabled)}
                className="rounded border-[var(--border)] bg-ink-900 text-signal-indigo focus:ring-0 cursor-pointer"
              />
              <span>In-App</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-text-primary">
              <input
                type="checkbox"
                checked={teamPrefs.pushEnabled}
                onChange={() => handleToggle("team_activity", "pushEnabled", teamPrefs.pushEnabled)}
                className="rounded border-[var(--border)] bg-ink-900 text-signal-indigo focus:ring-0 cursor-pointer"
              />
              <span>Push</span>
            </label>
          </div>
        </div>

        {/* Category 3: Security Alerts (Owner/Admin Policy Lock) */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isOwnerOrAdmin
              ? "bg-signal-rose/[0.03] border-signal-rose/20"
              : "bg-ink-950/50 border-[var(--border)]"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-signal-rose shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-text-primary">
                  Security &amp; Policy Alerts
                </h4>
                {isOwnerOrAdmin && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-signal-rose/10 border border-signal-rose/20 text-signal-rose text-[10px] font-mono">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Mandatory for {orgRole === "owner" ? "Owner" : "Admin"}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Target domain verification notices, kill switch triggers, and RBAC boundary violations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <label
              className={`flex items-center gap-1.5 ${
                isOwnerOrAdmin ? "cursor-not-allowed text-text-faint" : "cursor-pointer text-text-muted hover:text-text-primary"
              }`}
            >
              <input
                type="checkbox"
                checked={isOwnerOrAdmin ? true : secPrefs.inAppEnabled}
                disabled={isOwnerOrAdmin}
                onChange={() => handleToggle("security_alerts", "inAppEnabled", secPrefs.inAppEnabled)}
                className="rounded border-[var(--border)] bg-ink-900 text-signal-indigo focus:ring-0 cursor-pointer disabled:opacity-50"
              />
              <span>In-App</span>
            </label>

            <label
              className={`flex items-center gap-1.5 ${
                isOwnerOrAdmin ? "cursor-not-allowed text-text-faint" : "cursor-pointer text-text-muted hover:text-text-primary"
              }`}
            >
              <input
                type="checkbox"
                checked={isOwnerOrAdmin ? true : secPrefs.pushEnabled}
                disabled={isOwnerOrAdmin}
                onChange={() => handleToggle("security_alerts", "pushEnabled", secPrefs.pushEnabled)}
                className="rounded border-[var(--border)] bg-ink-900 text-signal-indigo focus:ring-0 cursor-pointer disabled:opacity-50"
              />
              <span>Push</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
