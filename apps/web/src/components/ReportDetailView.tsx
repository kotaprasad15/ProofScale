import React, { useEffect, useState } from "react";
import { trpc } from "../utils/trpc";
import { FileText, Download, Share2, AlertTriangle, CheckCircle2, Copy, X, ShieldOff, Clock, ArrowLeft, Globe, ListOrdered, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ScoreRing, SkeletonPanel } from "../motion";
import { Skeleton } from "../motion/Skeleton";
import { Activity as _ActivityIcon } from "lucide-react";
import { TestRunResult, TestPlan, RunProgress } from "@proofscale/shared";
import { testExecApi } from "../utils/api";
const Activity = _ActivityIcon;

function scoreColor(score: number): string {
  if (score >= 90) return "#2FD4A6";
  if (score >= 75) return "#F0A63A";
  return "#F2586B";
}

/* Radial gauge replaced by the shared motion-layer ScoreRing (gradient + glow + draw animation). */
function RadialGauge({ score }: { score: number }) {
  return null;
}

interface ReportDetailViewProps {
  runId: string;
  onBack?: () => void;
}

/**
 * Server-side run report (v2 execution plane).
 * Renders the exact persisted TestRunResult for runs executed by the Node.js
 * worker, with the interpretation guardrail. Legacy k6 runs fall through to
 * the classic report sections below.
 */
function ServerSideRunReport({ runId }: { runId: string }) {
  const [data, setData] = useState<{
    status: string;
    result?: TestRunResult;
    envelope?: TestPlan | null;
    progress?: RunProgress | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    testExecApi
      .getRun(runId)
      .then(d => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        // Not a server-side run (or not authorized) — classic report handles it.
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  if (error || !data?.result) return null;
  const r = data.result;
  const env = data.envelope;

  return (
    <div className="glass-panel p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Server-Side Execution Report</h3>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            Executed by the ProofScale Node.js worker — all samples recorded server-side
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
            r.passed ? "bg-signal-teal-soft text-signal-teal" : "bg-signal-rose-soft text-signal-rose"
          }`}
        >
          {r.passed ? "Passed" : r.cancelled ? "Cancelled" : "Failed thresholds"}
        </span>
      </div>

r
      {/* Envelope provenance: exact conditions the results are valid for */}
      {env && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)]">
            <div className="text-[10px] uppercase text-text-faint flex items-center gap-1 mb-1">
              <Globe className="w-3 h-3" /> Target
            </div>
            <div className="text-text-primary font-semibold break-all">{r.targetBaseUrl}</div>
            <div className="text-[10px] text-text-muted mt-0.5 capitalize">{r.environment}</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)]">
            <div className="text-[10px] uppercase text-text-faint flex items-center gap-1 mb-1">
              <Users className="w-3 h-3" /> Workload
            </div>
            <div className="text-text-primary font-semibold">
              {env.virtualUsers} VUs · {env.durationSeconds}s
            </div>
            <div className="text-[10px] text-text-muted mt-0.5">≤ {env.maxRequestsPerSecond} RPS · {env.requestTimeoutMs}ms timeout</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] sm:col-span-2">
            <div className="text-[10px] uppercase text-text-faint flex items-center gap-1 mb-1">
              <ListOrdered className="w-3 h-3" /> Request sequence
            </div>
            <div className="text-text-primary">
              {env.requests.map((req, i) => (
                <div key={req.id} className={req.enabled ? "" : "line-through opacity-50"}>
                  {i + 1}. {req.method} {req.path}{!req.enabled && " (disabled)"}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Core metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
        {[
          { label: "Total Requests", value: r.totalRequests },
          { label: "Successful", value: r.successfulRequests },
          { label: "Failed", value: r.failedRequests },
          { label: "RPS", value: r.requestsPerSecond },
          { label: "Error Rate", value: `${r.errorRatePercent}%` },
          { label: "Duration", value: `${r.durationSeconds}s` }
        ].map(m => (
          <div key={m.label} className="p-3 rounded-xl bg-ink-950/80 border border-white/[0.06]">
            <div className="text-[10px] font-mono uppercase text-text-faint">{m.label}</div>
            <div className="text-lg font-mono font-bold text-text-primary tabular-nums">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Latency percentiles */}
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[
              { name: "p50", value: r.p50LatencyMs },
              { name: "p95", value: r.p95LatencyMs },
              { name: "p99", value: r.p99LatencyMs }
            ]}
          >
            <XAxis dataKey="name" stroke="#8D96AC" fontSize={11} />
            <YAxis stroke="#8D96AC" fontSize={11} />
            <Tooltip
              contentStyle={{ backgroundColor: "#10151F", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
              itemStyle={{ color: "#F3F5FA" }}
              formatter={(v: any) => [`${v} ms`, "latency"]}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              <Cell fill="#2FD4A6" />
              <Cell fill="#F0A63A" />
              <Cell fill="#F2586B" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Threshold checks */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-text-muted uppercase">Threshold Evaluation</h4>
        {([
          ["p95 latency", r.thresholdResults.p95Latency],
          ...(r.thresholdResults.p99Latency ? [["p99 latency", r.thresholdResults.p99Latency] as const] : []),
          ["error rate", r.thresholdResults.errorRate],
          ["requests/sec", r.thresholdResults.requestsPerSecond]
        ] as [string, { actual: number; limit?: number; passed: boolean }][]).map(([label, check]) => (
          <div
            key={label}
            className="p-3 rounded-lg bg-[var(--white-fill-sm)] border border-[var(--border)] flex justify-between items-center text-xs font-mono"
          >
            <span className="text-text-primary font-semibold capitalize">{label}</span>
            <span className="flex items-center gap-3">
              <span className="text-text-muted">
                actual <strong className="text-text-primary">{check.actual}</strong>
                {check.limit !== undefined && (
                  <>
                    {" "}
                    vs limit <strong className="text-text-primary">{check.limit}</strong>
                  </>
                )}
                {check.limit === undefined && <span className="text-text-faint"> (no limit configured)</span>}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                  check.passed ? "bg-signal-teal-soft text-signal-teal" : "bg-signal-rose-soft text-signal-rose"
                }`
                }
              >
                {check.passed ? "pass" : "fail"}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Interpretation guardrail */}
      <div className="p-4 rounded-xl bg-ink-950 border border-signal-amber/30 text-[11px] font-mono text-signal-amber leading-relaxed">
        ⚠ Interpretation guardrail: Results are valid only for the declared target, environment, workload, request
        sequence, thresholds, and runner configuration used during this assessment.
      </div>
    </div>
  );
}

export function ReportDetailView({ runId, onBack }: ReportDetailViewProps) {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const reportQuery = trpc.reports.getReportByRunId.useQuery({ runId });
  const timelineQuery = trpc.runs.getTimeline.useQuery({ runId });
  const exportMarkdownQuery = trpc.reports.exportMarkdown.useQuery({ runId }, { enabled: false });
  const exportJsonQuery = trpc.reports.exportJson.useQuery({ runId }, { enabled: false });
  const createShareMutation = trpc.reports.createShareLink.useMutation();
  const revokeShareMutation = trpc.reports.revokeShareLink.useMutation();
  const promoteBaselineMutation = trpc.baselines.promote.useMutation();

  // Live expiry countdown for the open share link
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const remainingMs = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : 0;
  const remainingH = Math.floor(remainingMs / 3_600_000);
  const remainingM = Math.floor((remainingMs % 3_600_000) / 60_000);
  const remainingS = Math.floor((remainingMs % 60_000) / 1000);

  if (reportQuery.isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <SkeletonPanel rows={2} label="Loading readiness report…" />
        <SkeletonPanel rows={3} label="Preparing metrics…" />
      </div>
    );
  }

  const reportData = reportQuery.data;
  if (!reportData) {
    return <div className="p-8 text-center text-sm text-signal-rose font-mono">Report not found.</div>;
  }

  const { run, plan, target, findings } = reportData;
  const sb = run.scoreBreakdown;
  const metrics = run.summaryMetrics;
  const policySnapshot = (run as any).policySnapshotJson ? JSON.parse((run as any).policySnapshotJson) : null;
  const isServerSideRun = (run as any).runKind === "server_side" || !metrics;

  const handleDownloadMarkdown = async () => {
    const res = await exportMarkdownQuery.refetch();
    if (res.data?.markdown) {
      const blob = new Blob([res.data.markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ratecap_report_${run.id}.md`;
      a.click();
    }
  };

  const handleDownloadJson = async () => {
    const res = await exportJsonQuery.refetch();
    if (res.data?.json) {
      const blob = new Blob([res.data.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ratecap_report_${run.id}.json`;
      a.click();
    }
  };

  const handleGenerateShare = async () => {
    try {
      const res = await createShareMutation.mutateAsync({ runId, expiresInDays: 3 });
      setShareToken(`${window.location.origin}/share/${res.rawToken}`);
      setShareId(res.shareId);
      setExpiresAt(res.expiresAt);
      setShowShareModal(true);
    } catch (err: any) {
      alert(err?.message || "Failed to create share link.");
    }
  };

  const handleRevokeShare = async () => {
    if (!shareId) return;
    try {
      await revokeShareMutation.mutateAsync({ shareId });
      setShareToken(null);
      setShareId(null);
      setExpiresAt(null);
      setShowShareModal(false);
    } catch (err: any) {
      alert(err?.message || "Failed to revoke share link.");
    }
  };

  const copyShareLink = () => {
    if (shareToken) {
      navigator.clipboard.writeText(shareToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const chartData = [
    { name: "p50", value: metrics?.latencyPercentiles?.p50 || 0 },
    { name: "p90", value: metrics?.latencyPercentiles?.p90 || 0 },
    { name: "p95", value: metrics?.latencyPercentiles?.p95 || 0 },
    { name: "p99", value: metrics?.latencyPercentiles?.p99 || 0 }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        {onBack && (
          <button
            onClick={onBack}
            className="btn-glass-secondary text-xs py-2 px-3.5 cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Comparison</span>
          </button>
        )}

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadMarkdown}
            className="btn-glass-secondary text-xs py-2 px-3 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Markdown</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="btn-glass-secondary text-xs py-2 px-3 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>JSON</span>
          </button>

          <button
            onClick={handleGenerateShare}
            className="btn-solid-primary text-xs py-2 px-3.5 cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share Report</span>
          </button>

          <button
            onClick={async () => {
              if (confirm("Are you sure you want to promote this run as the active baseline for this test plan?")) {
                try {
                  await promoteBaselineMutation.mutateAsync({ runId });
                  alert("Successfully promoted as baseline.");
                } catch (err: any) {
                  alert(err.message || "Failed to promote baseline.");
                }
              }
            }}
            disabled={promoteBaselineMutation.isPending}
            className="btn-glass-secondary text-xs py-2 px-3.5 cursor-pointer text-signal-amber hover:text-amber-400 border-signal-amber/30 hover:border-signal-amber"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Promote as Baseline</span>
          </button>
        </div>
      </div>

      {/* Score Banner HUD */}
      <div className="glass-panel p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-2">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">{plan.name}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-signal-indigo-soft text-signal-indigo border border-signal-indigo/30">
              {plan.profile}
            </span>
          </div>
          <p className="text-xs text-text-muted font-mono">
            Target: {target.baseUrl} · Evaluated with Scoring Engine: {plan.scoringVersion}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <ScoreRing score={run.score ?? 0} size={150} label="Readiness" />
          <div className="text-center md:text-right">
            <span className="text-[10px] uppercase font-mono text-[var(--text-2)] font-bold">Overall Score</span>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight" style={{ color: scoreColor(run.score ?? 0) }}>
              {run.score} <span className="text-lg text-[var(--text-3)]">/ 100</span>
            </div>
            <div className="text-xs font-bold font-mono capitalize" style={{ color: scoreColor(run.score ?? 0) }}>{run.readinessLabel}</div>
          </div>
        </div>
      </div>

      {policySnapshot && (
        <div className="glass-panel p-6 sm:p-8 space-y-6 border-l-4" style={{ borderColor: policySnapshot.result === "pass" ? "#2FD4A6" : policySnapshot.result === "fail" ? "#F2586B" : "#F0A63A" }}>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Policy Evaluation Result</h3>
            <div className="text-xs font-mono mt-1" style={{ color: policySnapshot.result === "pass" ? "#2FD4A6" : policySnapshot.result === "fail" ? "#F2586B" : "#F0A63A" }}>
              Status: {policySnapshot.result.toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-text-muted uppercase">Rule Results</h4>
              <div className="space-y-2">
                {policySnapshot.rules.map((rule: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-[var(--white-fill-sm)] border border-[var(--border)] flex justify-between items-center">
                    <div>
                      <div className="text-xs font-semibold text-text-primary">{rule.key}</div>
                      <div className="text-[10px] text-text-muted font-mono mt-1">{rule.message}</div>
                    </div>
                    <span className="text-[10px] uppercase font-mono font-bold px-2 py-1 rounded-full" style={{ backgroundColor: rule.status === "pass" ? "#2FD4A622" : rule.status === "fail" ? "#F2586B22" : "#8D96AC22", color: rule.status === "pass" ? "#2FD4A6" : rule.status === "fail" ? "#F2586B" : "#8D96AC" }}>
                      {rule.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-text-muted uppercase">Baseline Comparison</h4>
              {!policySnapshot.baselineComparison?.baselineRunId ? (
                <div className="p-4 text-xs font-mono text-text-muted rounded-lg bg-[var(--white-fill-sm)] border border-[var(--border)]">
                  No active baseline available during evaluation.
                </div>
              ) : (
                <div className="p-4 space-y-3 rounded-lg bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs font-mono">
                  <div className="flex justify-between pb-2 border-b border-[var(--border)]">
                    <span className="text-text-muted">Regression Status:</span>
                    <span className="font-bold" style={{ color: policySnapshot.baselineComparison.regressionStatus === "improved" ? "#2FD4A6" : policySnapshot.baselineComparison.regressionStatus === "regressed" ? "#F2586B" : "#F0A63A" }}>
                      {policySnapshot.baselineComparison.regressionStatus.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <div className="text-[10px] text-text-faint">Score Delta</div>
                      <div className="font-bold text-text-primary">{policySnapshot.baselineComparison.scoreDelta > 0 ? "+" : ""}{policySnapshot.baselineComparison.scoreDelta}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-faint">p95 Delta</div>
                      <div className="font-bold text-text-primary">{policySnapshot.baselineComparison.p95DeltaMs > 0 ? "+" : ""}{policySnapshot.baselineComparison.p95DeltaMs} ms</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-faint">Throughput Delta</div>
                      <div className="font-bold text-text-primary">{policySnapshot.baselineComparison.throughputDeltaRps > 0 ? "+" : ""}{policySnapshot.baselineComparison.throughputDeltaRps} req/s</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-faint">Error Delta</div>
                      <div className="font-bold text-text-primary">{policySnapshot.baselineComparison.errorRateDeltaPercent > 0 ? "+" : ""}{policySnapshot.baselineComparison.errorRateDeltaPercent}%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Server-side execution report (v2 worker runs) */}
      {isServerSideRun && <ServerSideRunReport runId={runId} />}


      {/* 5-Category Weighted Breakdown (mirrors the Methodology page) */}
      {sb && (
        <div className="glass-panel p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-sm font-semibold text-text-primary">Weighted Readiness Breakdown</h3>
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">Scoring engine v1.4</span>
          </div>
          {[
            { label: "Reliability & Errors", weight: "30%", score: sb.reliability, color: "#2FD4A6" },
            { label: "Latency Percentiles", weight: "25%", score: sb.latency, color: "#5B5FEF" },
            { label: "Capacity Behavior", weight: "20%", score: sb.capacityBehavior, color: "#8D96AC" },
            { label: "Stability & Jitter", weight: "15%", score: sb.stability, color: "#F0A63A" },
            { label: "Readiness Hygiene", weight: "10%", score: sb.hygiene, color: "#5C6478" }
          ].map(cat => (
            <div key={cat.label}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-sm font-semibold text-text-primary">
                  {cat.label} <span className="text-[10px] font-mono text-text-muted">({cat.weight})</span>
                </span>
                <span className="font-mono text-sm font-bold text-text-primary">{cat.score}</span>
              </div>
              <div className="weight-bar-track">
                <div
                  className="weight-bar-fill"
                  style={{
                    width: `${cat.score}%`,
                    background: `linear-gradient(90deg, ${cat.color}66, ${cat.color})`,
                    transition: "width 0.8s cubic-bezier(0.22, 1, 0.36, 1)"
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Latency & Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Response Time Distribution (ms)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#8D96AC" fontSize={11} />
                <YAxis stroke="#8D96AC" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#10151F", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
                  itemStyle={{ color: "#F3F5FA" }}
                />
                <Bar dataKey="value" fill="#5B5FEF" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 3 ? "#F2586B" : index === 2 ? "#F0A63A" : "#2FD4A6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">Observed Telemetry Summary</h3>
          <div className="divide-y divide-white/[0.06] text-xs font-mono">
            <div className="py-2.5 flex justify-between">
              <span className="text-text-muted">Total Requests:</span>
              <span className="text-text-primary font-bold">{metrics?.totalRequests || 0}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-text-muted">Error Rate:</span>
              <span className={`font-bold ${metrics?.errorRate > 0.05 ? "text-signal-rose" : "text-signal-teal"}`}>
                {((metrics?.errorRate || 0) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-text-muted">Sustained RPS:</span>
              <span className="text-text-primary font-bold">{metrics?.requestsPerSecond?.toFixed(1) || 0} req/s</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-text-muted">p95 Latency:</span>
              <span className="text-signal-indigo font-bold">{metrics?.latencyPercentiles?.p95 || 0} ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Automated Findings */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Automated Empirical Findings</h3>

        {findings.length === 0 ? (
          <div className="text-xs text-text-muted font-mono">No findings recorded.</div>
        ) : (
          <div className="space-y-3">
            {findings.map(f => (
              <div key={f.id} className="p-4 rounded-xl bg-ink-950/80 border border-white/[0.06] space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    (f.severity as string) === "critical" || (f.severity as string) === "high" ? "bg-signal-rose-soft text-signal-rose border border-signal-rose/30" :
                    (f.severity as string) === "warning" || (f.severity as string) === "medium" ? "bg-signal-amber-soft text-signal-amber border border-signal-amber/30" :
                    "bg-signal-teal-soft text-signal-teal border border-signal-teal/30"
                  }`}>
                    {f.severity}
                  </span>
                  <strong className="text-xs text-text-primary font-semibold">{f.title}</strong>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{f.evidence}</p>
                <div className="text-[11px] text-signal-indigo font-medium pt-1">
                  💡 Recommendation: {f.recommendation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run Timeline */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <Activity className="w-4 h-4 text-signal-indigo" />
          Run Execution Timeline
        </h3>

        {timelineQuery.isLoading ? (
          <div className="py-6 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-3/5" /></div>
        ) : !timelineQuery.data?.items.length ? (
          <div className="text-xs text-text-muted font-mono py-4">No lifecycle events recorded for this run.</div>
        ) : (
          <div className="space-y-0.5 border-l-2 border-white/[0.08] ml-2 pl-4 py-2 mt-4 relative">
            {timelineQuery.data.items.map((event, i) => (
              <div key={event.id} className="relative pb-5">
                <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-signal-indigo" />
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                  <span className="text-[10px] font-mono text-text-muted w-24 shrink-0">
                    {new Date(event.timestamp).toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-signal-indigo px-1.5 py-0.5 rounded bg-signal-indigo-soft mr-2 inline-block">
                      {event.eventType}
                    </span>
                    <span className="text-xs text-text-primary">{event.message}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShareModal(false);
          }}
        >
          <div className="modal-panel max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-text-primary text-base">Public Report Link</h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-[var(--white-fill-sm)] transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Anyone with this cryptographic token-hashed link can view the read-only readiness report.
            </p>

            <div className="p-3 rounded-xl bg-ink-950 border border-[var(--border)] flex items-center justify-between">
              <span className="text-xs font-mono text-signal-indigo truncate mr-2">{shareToken}</span>
              <button
                onClick={copyShareLink}
                className="px-3 py-1.5 bg-signal-indigo hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shrink-0 flex items-center space-x-1 cursor-pointer"
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-signal-amber" />
                Expires in
              </span>
              <span className="text-text-primary font-bold">
                {remainingH > 0 ? `${remainingH}h ` : ""}
                {remainingM}m {remainingS}s
              </span>
            </div>

            <button
              type="button"
              onClick={handleRevokeShare}
              disabled={revokeShareMutation.isPending}
              className="btn-destructive w-full"
            >
              <ShieldOff className="w-4 h-4" />
              <span>Revoke share link now</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
