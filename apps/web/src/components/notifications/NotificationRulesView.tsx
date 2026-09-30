import React, { useState } from "react";
import { trpc } from "../../utils/trpc";
import { Bell, BellOff, CheckCircle2, Loader2 } from "lucide-react";
import { NotificationEventType } from "@proofscale/shared";

interface NotificationRulesViewProps {
  organizationId?: string | null;
}

const EVENT_LABELS: { type: NotificationEventType; label: string; help: string; defaultOn: boolean }[] = [
  { type: "run.completed", label: "Run completed", help: "Every finished assessment (opt-in; can be noisy).", defaultOn: false },
  { type: "run.failed", label: "Run failed", help: "Execution errors and timeouts.", defaultOn: true },
  { type: "run.cancelled", label: "Run cancelled", help: "Someone cancelled a run.", defaultOn: false },
  { type: "run.timed_out", label: "Run timed out", help: "Runs that exceeded their execution window.", defaultOn: true },
  { type: "policy.failed", label: "Policy failed", help: "A readiness policy evaluated as fail.", defaultOn: true },
  { type: "policy.warning", label: "Policy warning", help: "A readiness policy evaluated with warnings.", defaultOn: true },
  { type: "schedule.failed", label: "Schedule failed", help: "A scheduled assessment could not start.", defaultOn: true },
  { type: "schedule.paused_due_to_error", label: "Schedule auto-paused", help: "A schedule was paused after repeated errors.", defaultOn: true }
];

export function NotificationRulesView({ organizationId }: NotificationRulesViewProps) {
  const utils = trpc.useUtils();
  const [feedback, setFeedback] = useState<string | null>(null);

  const rulesQuery = trpc.notificationRules.list.useQuery(
    { organizationId: organizationId || "" },
    { enabled: !!organizationId }
  );

  const upsertMutation = trpc.notificationRules.createOrUpdate.useMutation({
    onSuccess: () => {
      utils.notificationRules.list.invalidate();
      setFeedback("Preferences saved.");
      setTimeout(() => setFeedback(null), 2500);
    },
    onError: err => setFeedback(err.message || "Failed to save preference.")
  });

  const ruleFor = (eventType: string) =>
    (rulesQuery.data || []).find((r: any) => r.eventType === eventType && r.projectId === null);

  const handleToggle = (eventType: NotificationEventType, currentlyEnabled: boolean) => {
    if (!organizationId) return;
    upsertMutation.mutateAsync({
      organizationId,
      eventType,
      enabled: !currentlyEnabled,
      minimumSeverity: "info"
    } as any);
  };

  if (!organizationId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div>
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Bell className="w-4 h-4 text-signal-indigo" />
            <span>Readiness Notification Rules</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Choose which in-app events you receive. Policy failures and schedule failures are enabled by default;
            success notifications are opt-in to avoid noise.
          </p>
        </div>
        {feedback && (
          <span className="text-xs text-signal-teal flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {feedback}
          </span>
        )}
      </div>

      {rulesQuery.isLoading ? (
        <div className="flex items-center gap-2 text-xs text-text-muted py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading rules…
        </div>
      ) : (
        <div className="space-y-2">
          {EVENT_LABELS.map(({ type, label, help, defaultOn }) => {
            const rule = ruleFor(type);
            // No explicit rule → safe default.
            const enabled = rule ? rule.enabled : defaultOn;
            return (
              <div
                key={type}
                className="p-4 rounded-2xl bg-ink-950/50 border border-[var(--border)] flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${enabled ? "bg-signal-indigo/10 text-signal-indigo" : "bg-white/[0.04] text-text-faint"}`}>
                    {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">{label}</h4>
                    <p className="text-[11px] text-text-muted">{help}</p>
                    <p className="text-[10px] font-mono text-text-faint mt-1">
                      {rule ? `rule: ${enabled ? "on" : "off"}` : `default: ${defaultOn ? "on" : "off"}`}
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-text-muted hover:text-text-primary shrink-0">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => handleToggle(type, enabled)}
                    disabled={upsertMutation.isPending}
                    className="rounded border-[var(--border)] bg-ink-900 text-signal-indigo focus:ring-0 cursor-pointer"
                  />
                  <span>In-App</span>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
