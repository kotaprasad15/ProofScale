import React, { useState, useEffect, useMemo } from "react";
import { trpc } from "../utils/trpc";
import {
  CalendarClock,
  Plus,
  Pause,
  Play,
  XCircle,
  History,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Globe,
  Pencil,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { LoadingDots } from "./LoadingDots";
import { SCHEDULING_POLICY } from "@proofscale/shared";

interface SchedulesViewProps {
  projectId: string;
  onSelectRun?: (runId: string) => void;
}

const STATUS_LABELS: Record<string, { label: string; icon: any; tone: string }> = {
  active: { label: "Active", icon: Play, tone: "text-signal-teal" },
  paused: { label: "Paused", icon: Pause, tone: "text-signal-amber" },
  completed: { label: "Completed", icon: CheckCircle2, tone: "text-signal-indigo" },
  cancelled: { label: "Cancelled", icon: XCircle, tone: "text-signal-rose" },
  invalid: { label: "Invalid", icon: ShieldAlert, tone: "text-signal-rose" }
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] || STATUS_LABELS.invalid;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono border ${cfg.tone}`}>
      <Icon className="w-3 h-3" />
      <span>{cfg.label}</span>
    </span>
  );
}

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney"
];

const CRON_PRESETS = [
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Every 6 hours", cron: "0 */6 * * *" },
  { label: "Daily at 09:00", cron: "0 9 * * *" },
  { label: "Weekdays at 09:00", cron: "0 9 * * 1-5" },
  { label: "Weekly (Mon 09:00)", cron: "0 9 * * 1" }
];

export function SchedulesView({ projectId, onSelectRun }: SchedulesViewProps) {
  const utils = trpc.useUtils();
  const [showBuilder, setShowBuilder] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // ---- Builder state ----
  const [name, setName] = useState("Daily Staging Readiness Check");
  const [testPlanId, setTestPlanId] = useState("");
  const [scheduleType, setScheduleType] = useState<"one_time" | "recurring">("recurring");
  const [cron, setCron] = useState("0 9 * * 1-5");
  const [runAtLocal, setRunAtLocal] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [description, setDescription] = useState("");
  const [confirming, setConfirming] = useState(false);

  const plansQuery = trpc.testPlans.listByProject.useQuery({ projectId });
  const schedulesQuery = trpc.schedules.list.useQuery({ projectId });

  const previewQuery = trpc.schedules.previewNextRun.useQuery(
    {
      scheduleType,
      cronExpression: scheduleType === "recurring" ? cron : undefined,
      runAt:
        scheduleType === "one_time" && runAtLocal
          ? new Date(runAtLocal).toISOString()
          : undefined,
      timezone
    },
    { enabled: showBuilder }
  );

  const approvedPlans = useMemo(
    () => (plansQuery.data || []).filter((p: any) => !p.planStatus || p.planStatus === "approved"),
    [plansQuery.data]
  );

  useEffect(() => {
    if (!testPlanId && approvedPlans.length > 0) {
      setTestPlanId(approvedPlans[0].id);
    }
  }, [approvedPlans, testPlanId]);

  const selectedPlan = useMemo(
    () => (plansQuery.data || []).find((p: any) => p.id === testPlanId),
    [plansQuery.data, testPlanId]
  );

  const createMutation = trpc.schedules.create.useMutation({
    onSuccess: () => {
      utils.schedules.list.invalidate();
      setFeedback({ text: "Schedule created. It will claim occurrences automatically.", type: "success" });
      setShowBuilder(false);
      setConfirming(false);
      setTimeout(() => setFeedback(null), 5000);
    },
    onError: (err) => {
      setFeedback({ text: err.message || "Failed to create schedule.", type: "error" });
      setConfirming(false);
    }
  });

  const pauseMutation = trpc.schedules.pause.useMutation({
    onSuccess: () => utils.schedules.list.invalidate()
  });
  const resumeMutation = trpc.schedules.resume.useMutation({
    onSuccess: () => utils.schedules.list.invalidate()
  });
  const cancelMutation = trpc.schedules.cancel.useMutation({
    onSuccess: () => utils.schedules.list.invalidate()
  });

  const handleCreate = async () => {
    setConfirming(true);
    await createMutation.mutateAsync({
      projectId,
      testPlanId,
      name,
      description: description || undefined,
      scheduleType,
      cronExpression: scheduleType === "recurring" ? cron : undefined,
      runAt: scheduleType === "one_time" && runAtLocal ? new Date(runAtLocal).toISOString() : undefined,
      timezone
    } as any);
  };

  const handlePause = async (id: string, version: number) => {
    await pauseMutation.mutateAsync({ id, expectedVersion: version } as any);
  };
  const handleResume = async (id: string, version: number) => {
    await resumeMutation.mutateAsync({ id, expectedVersion: version } as any);
  };
  const handleCancel = async (schedule: any) => {
    const ok = window.confirm(
      `Cancel schedule "${schedule.name}"?\n\nFuture occurrences will never run. Runs already created are NOT cancelled — cancel those individually in Test Execution.`
    );
    if (!ok) return;
    await cancelMutation.mutateAsync({ id: schedule.id, expectedVersion: schedule.version } as any);
  };

  const summary = previewQuery.data;
  const canSubmit = name.trim().length > 0 && testPlanId && (scheduleType === "recurring" ? cron.trim() : runAtLocal);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-3">
            <CalendarClock className="w-6 h-6 text-signal-indigo" />
            <span>Assessment Schedules</span>
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Run approved assessments automatically on a durable server-side schedule. Schedules inherit the test plan's
            safety limits — they never define workload themselves.
          </p>
        </div>
        <button
          onClick={() => setShowBuilder(s => !s)}
          className="btn-solid-primary text-xs py-2 px-4 cursor-pointer flex items-center gap-1.5"
        >
          {showBuilder ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{showBuilder ? "Close Builder" : "New Schedule"}</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 font-mono ${
            feedback.type === "success"
              ? "bg-signal-teal-soft border-signal-teal/30 text-signal-teal"
              : "bg-signal-rose-soft border-signal-rose/30 text-signal-rose"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Builder */}
      {showBuilder && (
        <div className="glass-panel p-6 sm:p-8 space-y-6">
          <h3 className="text-base font-semibold text-text-primary">Create Schedule</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Schedule Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Daily Staging Readiness Check"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] focus:border-signal-indigo text-xs font-medium text-text-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                Approved Test Plan * (workload is inherited, not editable here)
              </label>
              <select
                value={testPlanId}
                onChange={e => setTestPlanId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs font-mono text-text-primary outline-none cursor-pointer"
              >
                {approvedPlans.length === 0 && <option value="">No approved plans</option>}
                {approvedPlans.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Schedule Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["recurring", "one_time"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setScheduleType(t)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      scheduleType === t
                        ? "bg-signal-indigo/10 border-signal-indigo text-signal-indigo"
                        : "bg-[var(--white-fill-sm)] border-[var(--border)] text-text-muted"
                    }`}
                  >
                    {t === "recurring" ? "Recurring" : "One-time"}
                  </button>
                ))}
              </div>
            </div>

            {scheduleType === "recurring" ? (
              <>
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Recurrence Preset</label>
                  <select
                    value={CRON_PRESETS.some(p => p.cron === cron) ? cron : "custom"}
                    onChange={e => {
                      if (e.target.value !== "custom") setCron(e.target.value);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs font-mono text-text-primary outline-none cursor-pointer"
                  >
                    {CRON_PRESETS.map(p => (
                      <option key={p.cron} value={p.cron}>
                        {p.label}
                      </option>
                    ))}
                    <option value="custom">Custom cron…</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Cron (5 fields)</label>
                  <input
                    value={cron}
                    onChange={e => setCron(e.target.value)}
                    placeholder="0 9 * * 1-5"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Date & Time *</label>
                <input
                  type="datetime-local"
                  value={runAtLocal}
                  onChange={e => setRunAtLocal(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Timezone</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs font-mono text-text-primary outline-none cursor-pointer"
              >
                {COMMON_TIMEZONES.includes(timezone) ? null : <option value={timezone}>{timezone}</option>}
                {COMMON_TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Description (optional)</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this schedule validate?"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs text-text-primary outline-none"
            />
          </div>

          {/* Next-run preview */}
          <div className="p-4 rounded-xl bg-ink-950 border border-[var(--border)] space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-text-muted uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              Next Run Preview
              {previewQuery.isFetching && <Loader2 className="w-3 h-3 animate-spin" />}
            </div>
            {previewQuery.data ? (
              <>
                <p className="text-sm text-text-primary font-medium">
                  {summary?.scheduleDescription || "—"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-text-faint">Local ({summary?.timezone}): </span>
                    <span className="text-signal-teal font-bold">{summary?.nextRunAtLocal || "—"}</span>
                  </div>
                  <div>
                    <span className="text-text-faint">UTC: </span>
                    <span className="text-signal-indigo font-bold">
                      {summary?.nextRunAtUtc ? new Date(summary.nextRunAtUtc).toISOString().slice(0, 16).replace("T", " ") : "—"}
                    </span>
                  </div>
                </div>
                {(summary?.limitations || []).map((lim, i) => (
                  <p key={i} className="text-[11px] text-signal-amber font-mono">
                    ⚠ {lim}
                  </p>
                ))}
              </>
            ) : (
              <p className="text-xs text-text-muted font-mono">Choose a schedule type to preview…</p>
            )}
          </div>

          {/* Confirmation summary */}
          {confirming && (
            <div className="p-5 rounded-2xl bg-[var(--white-fill-sm)] border border-signal-indigo/30 space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-text-primary">
                Confirm Before Saving
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-text-faint text-[10px] uppercase block">Target Plan</span>
                  <span className="font-bold text-text-primary">{selectedPlan?.name || "—"}</span>
                </div>
                <div>
                  <span className="text-text-faint text-[10px] uppercase block">Max VUs</span>
                  <span className="font-bold text-text-primary">{selectedPlan?.loadProfile?.virtualUsers ?? "—"}</span>
                </div>
                <div>
                  <span className="text-text-faint text-[10px] uppercase block">Duration</span>
                  <span className="font-bold text-text-primary">{selectedPlan?.loadProfile?.durationSeconds ?? "—"}s</span>
                </div>
                <div>
                  <span className="text-text-faint text-[10px] uppercase block">Next Run</span>
                  <span className="font-bold text-signal-teal">{summary?.nextRunAtLocal || "—"}</span>
                </div>
              </div>
              <p className="text-[11px] text-text-muted">
                The schedule uses the test plan's existing safety limits and policy. Safety limits, target
                authorization, and the kill switch are re-checked at every execution.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button onClick={() => setConfirming(c => !c)} disabled={!canSubmit} className="btn-glass-secondary text-xs py-2 px-3 cursor-pointer disabled:opacity-40">
              Review Summary
            </button>
            <button
              onClick={handleCreate}
              disabled={!canSubmit || createMutation.isPending}
              className="btn-solid-primary text-xs py-2 px-4 cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
            >
              {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarClock className="w-3.5 h-3.5" />}
              <span>Create Schedule</span>
            </button>
          </div>
        </div>
      )}

      {/* Schedules list */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h3 className="text-base font-semibold text-text-primary">Configured Schedules</h3>
          <span className="text-xs font-mono text-text-muted">{schedulesQuery.data?.length || 0} total</span>
        </div>

        {schedulesQuery.isLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingDots size="sm" label="Loading schedules..." />
          </div>
        ) : !schedulesQuery.data?.length ? (
          <div className="p-10 text-center space-y-2">
            <CalendarClock className="w-8 h-8 mx-auto text-text-faint" />
            <p className="text-sm text-text-muted font-mono">No schedules configured yet.</p>
            <p className="text-xs text-text-faint">
              Create one to run an approved plan automatically — for example, every weekday at 09:00.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {schedulesQuery.data.map((s: any) => (
              <div key={s.id} className="py-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-text-primary text-sm">{s.name}</h4>
                      <StatusPill status={s.status} />
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/[0.06] text-text-muted border border-white/[0.08]">
                        {s.scheduleType === "recurring" ? "Recurring" : "One-time"}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted font-mono truncate">
                      {s.planName} · {s.scheduleDescription}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono text-text-faint">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {s.timezone}
                      </span>
                      <span>
                        Next: <strong className="text-signal-teal">{s.nextRunAtLocal || "—"}</strong>
                      </span>
                      <span>
                        Last: <strong className="text-text-muted">{s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : "never"}</strong>
                        {s.lastRunStatus ? ` (${s.lastRunStatus})` : ""}
                      </span>
                      <span>
                        Runs: {s.runCount}
                        {s.maxRuns ? `/${s.maxRuns}` : ""}
                      </span>
                    </div>
                    {s.lastError && (
                      <p className="text-[11px] text-signal-rose font-mono">⚠ {s.lastError}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {s.status === "active" && (
                      <button
                        onClick={() => handlePause(s.id, s.version)}
                        disabled={pauseMutation.isPending}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-signal-amber-soft text-signal-amber border border-signal-amber/30 hover:bg-signal-amber/20 transition cursor-pointer flex items-center gap-1"
                      >
                        <Pause className="w-3 h-3" /> Pause
                      </button>
                    )}
                    {s.status === "paused" && (
                      <button
                        onClick={() => handleResume(s.id, s.version)}
                        disabled={resumeMutation.isPending}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-signal-teal-soft text-signal-teal border border-signal-teal/30 hover:bg-signal-teal/20 transition cursor-pointer flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" /> Resume
                      </button>
                    )}
                    {["active", "paused", "invalid"].includes(s.status) && (
                      <button
                        onClick={() => handleCancel(s)}
                        disabled={cancelMutation.isPending}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-signal-rose-soft text-signal-rose border border-signal-rose/30 hover:bg-signal-rose/20 transition cursor-pointer flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" /> Cancel
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedHistory(expandedHistory === s.id ? null : s.id)}
                      className="p-2 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-text-muted hover:text-text-primary transition cursor-pointer"
                      title="View history"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline execution history */}
                {expandedHistory === s.id && (
                  <ScheduleHistory scheduleId={s.id} onSelectRun={onSelectRun} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleHistory({ scheduleId, onSelectRun }: { scheduleId: string; onSelectRun?: (runId: string) => void }) {
  const historyQuery = trpc.schedules.getHistory.useQuery({ scheduleId, limit: 10 });

  if (historyQuery.isLoading) {
    return <LoadingDots size="sm" label="Loading history..." />;
  }

  const items = historyQuery.data?.items || [];
  if (items.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-ink-950 border border-[var(--border)] text-xs text-text-muted font-mono">
        No occurrences claimed yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-left min-w-[720px]">
        <thead>
          <tr className="bg-ink-950 text-[10px] uppercase font-bold text-text-muted font-mono tracking-wider">
            <th className="py-2.5 px-3">Scheduled For</th>
            <th className="py-2.5 px-3">Claim</th>
            <th className="py-2.5 px-3">Run</th>
            <th className="py-2.5 px-3">Run Status</th>
            <th className="py-2.5 px-3">Policy</th>
            <th className="py-2.5 px-3">Failure</th>
            <th className="py-2.5 px-3 text-right">Report</th>
          </tr>
        </thead>
        <tbody className="text-xs divide-y divide-white/[0.04]">
          {items.map(item => (
            <tr key={item.id} className="font-mono">
              <td className="py-2.5 px-3 text-text-primary">{new Date(item.scheduledFor).toLocaleString()}</td>
              <td className="py-2.5 px-3">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    item.status === "failed"
                      ? "bg-signal-rose-soft text-signal-rose"
                      : item.status === "skipped"
                      ? "bg-signal-amber-soft text-signal-amber"
                      : item.status === "run_created" || item.status === "completed"
                      ? "bg-signal-teal-soft text-signal-teal"
                      : "bg-white/[0.06] text-text-muted"
                  }`}
                >
                  {item.status.replace("_", " ")}
                </span>
              </td>
              <td className="py-2.5 px-3 text-signal-indigo">{item.runId || "—"}</td>
              <td className="py-2.5 px-3 text-text-muted">{item.runStatus || "—"}</td>
              <td className="py-2.5 px-3">
                {item.policyResult ? (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.policyResult === "pass"
                        ? "bg-signal-teal-soft text-signal-teal"
                        : item.policyResult === "fail"
                        ? "bg-signal-rose-soft text-signal-rose"
                        : "bg-signal-amber-soft text-signal-amber"
                    }`}
                  >
                    {item.policyResult}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2.5 px-3 text-signal-rose">
                {item.failureCode ? (
                  <span title={item.failureMessage || ""}>{item.failureCode}</span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2.5 px-3 text-right">
                {item.runId && onSelectRun && (
                  <button
                    onClick={() => onSelectRun(item.runId!)}
                    className="text-signal-indigo hover:underline cursor-pointer"
                  >
                    View
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
