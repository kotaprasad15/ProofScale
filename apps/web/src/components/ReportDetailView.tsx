import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { FileText, Download, Share2, AlertTriangle, CheckCircle2, Copy, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ReportDetailViewProps {
  runId: string;
  onBack?: () => void;
}

export function ReportDetailView({ runId, onBack }: ReportDetailViewProps) {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const reportQuery = trpc.reports.getReportByRunId.useQuery({ runId });
  const exportMarkdownQuery = trpc.reports.exportMarkdown.useQuery({ runId }, { enabled: false });
  const exportJsonQuery = trpc.reports.exportJson.useQuery({ runId }, { enabled: false });
  const createShareMutation = trpc.reports.createShareLink.useMutation();

  if (reportQuery.isLoading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading readiness report...</div>;
  }

  const reportData = reportQuery.data;
  if (!reportData) {
    return <div className="p-8 text-center text-sm text-red-400">Report not found.</div>;
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
      a.download = `proofscale_report_${run.id}.md`;
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
      a.download = `proofscale_report_${run.id}.json`;
      a.click();
    }
  };

  const handleGenerateShare = async () => {
    try {
      const res = await createShareMutation.mutateAsync({ runId, expiresInDays: 30 });
      setShareToken(res.rawToken);
      setShowShareModal(true);
    } catch (err: any) {
      alert(err?.message || "Failed to generate share link.");
    }
  };

  const handleCopyShareLink = () => {
    const fullUrl = `${window.location.origin}/report/public?token=${shareToken}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const latencyChartData = metrics ? [
    { name: "p50 (Median)", value: metrics.p50Ms, color: "#6366f1" },
    { name: "p95 (Target)", value: metrics.p95Ms, color: metrics.p95Ms > (plan.thresholds.maxP95Ms || 2000) ? "#ef4444" : "#10b981" },
    { name: "p99 (Max)", value: metrics.p99Ms, color: "#f59e0b" }
  ] : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          {onBack && (
            <button onClick={onBack} className="text-xs text-indigo-400 hover:underline mb-2 block">
              ← Back to Run History
            </button>
          )}
          <h2 className="text-2xl font-bold text-white tracking-tight">Application Readiness Report</h2>
          <p className="text-xs text-slate-400 mt-1">
            Target: <span className="font-mono text-slate-200">{target.baseUrl}</span> | Plan: <span className="text-slate-200">{plan.name}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadMarkdown}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition flex items-center space-x-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Markdown</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition flex items-center space-x-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleGenerateShare}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share Report</span>
          </button>
        </div>
      </div>

      {/* Score Banner Card */}
      {sb && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className={`h-24 w-24 rounded-2xl flex flex-col items-center justify-center border ${
              sb.overallScore >= 90 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
              sb.overallScore >= 75 ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" :
              sb.overallScore >= 50 ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
              "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              <span className="text-3xl font-black">{sb.overallScore}</span>
              <span className="text-[10px] uppercase font-semibold text-slate-400">/ 100</span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Readiness Assessment</span>
              <h3 className="text-xl font-bold text-white">{sb.label}</h3>
              <p className="text-xs text-slate-400">
                Confidence Grade: <strong className="uppercase text-slate-200">{sb.confidence}</strong> | Scoring Version: <code className="text-indigo-400">{sb.scoringVersion}</code>
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-1 text-right">
            <div>Virtual Users: <strong className="text-slate-200">{plan.loadProfile.virtualUsers} VUs</strong></div>
            <div>Duration: <strong className="text-slate-200">{plan.loadProfile.durationSeconds}s</strong></div>
            <div>Region: <strong className="text-slate-200">{run.region}</strong></div>
          </div>
        </div>
      )}

      {/* Category Score Breakdown */}
      {sb && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {Object.entries(sb.categories).map(([catKey, cat]: [string, any]) => (
            <div key={catKey} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">{catKey}</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">{cat.score} <span className="text-xs text-slate-500 font-normal">/ 100</span></span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${cat.passed ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                  {cat.passed ? "PASS" : "FAIL"}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate">{cat.notes || `Weight: ${(cat.weight * 100)}%`}</p>
            </div>
          ))}
        </div>
      )}

      {/* Latency Percentiles Visualization */}
      {metrics && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            <span>Response Latency Distribution (ms)</span>
          </h3>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyChartData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} unit="ms" />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc" }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {latencyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Prioritized Findings List */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <span>Prioritized Findings & Remediation</span>
        </h3>

        {findings.length === 0 ? (
          <div className="text-xs text-slate-500">No findings generated.</div>
        ) : (
          <div className="space-y-3">
            {findings.map((f, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      f.severity === "critical" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                      f.severity === "high" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                      "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    }`}>
                      {f.severity}
                    </span>
                    <span className="font-semibold text-sm text-slate-200">{f.title}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono capitalize">{f.category}</span>
                </div>

                <p className="text-xs text-slate-400"><strong>Evidence:</strong> {f.evidence}</p>
                <p className="text-xs text-indigo-300/90"><strong>Action:</strong> {f.recommendation}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Link Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Share Readiness Report</h3>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              A secure, token-hashed read-only link has been generated. Anyone with this link can view the report evidence for 30 days.
            </p>

            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between">
              <span className="text-xs font-mono text-indigo-300 truncate mr-2">
                {window.location.origin}/report/public?token={shareToken}
              </span>
              <button
                onClick={handleCopyShareLink}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shrink-0 flex items-center space-x-1"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
