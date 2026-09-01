import React, { useEffect, useState } from "react";
import { trpc } from "../utils/trpc";
import { FileText, Download, Share2, AlertTriangle, CheckCircle2, Copy, X, ShieldOff, Clock, ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { LoadingDots } from "./LoadingDots";

function scoreColor(score: number): string {
  if (score >= 90) return "#2FD4A6";
  if (score >= 75) return "#F0A63A";
  return "#F2586B";
}

/* Radial readiness gauge — teal→amber→rose arc matching the label thresholds. */
function RadialGauge({ score }: { score: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = scoreColor(score);
  return (
    <svg viewBox="0 0 140 140" className="w-32 h-32 sm:w-36 sm:h-36" aria-hidden="true">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text
        x="70"
        y="70"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#F3F5FA"
        fontSize="30"
        fontFamily="'IBM Plex Mono', monospace"
        fontWeight="700"
      >
        {score}
      </text>
    </svg>
  );
}

interface ReportDetailViewProps {
  runId: string;
  onBack?: () => void;
}

export function ReportDetailView({ runId, onBack }: ReportDetailViewProps) {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const reportQuery = trpc.reports.getReportByRunId.useQuery({ runId });
  const exportMarkdownQuery = trpc.reports.exportMarkdown.useQuery({ runId }, { enabled: false });
  const exportJsonQuery = trpc.reports.exportJson.useQuery({ runId }, { enabled: false });
  const createShareMutation = trpc.reports.createShareLink.useMutation();
  const revokeShareMutation = trpc.reports.revokeShareLink.useMutation();

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
      <div className="p-12 flex justify-center">
        <LoadingDots size="md" label="Loading readiness report..." />
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
          <RadialGauge score={run.score ?? 0} />
          <div className="text-center md:text-right">
            <span className="text-[10px] uppercase font-mono text-text-muted font-bold">Overall Score</span>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight" style={{ color: scoreColor(run.score ?? 0) }}>
              {run.score} <span className="text-lg text-text-faint">/ 100</span>
            </div>
            <div className="text-xs font-bold font-mono capitalize" style={{ color: scoreColor(run.score ?? 0) }}>{run.readinessLabel}</div>
          </div>
        </div>
      </div>

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

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-bold text-text-primary text-base">Public Report Link</h3>
              <button onClick={() => setShowShareModal(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Anyone with this cryptographic token-hashed link can view the read-only readiness report.
            </p>

            <div className="p-3 rounded-xl bg-ink-950 border border-white/[0.1] flex items-center justify-between">
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
