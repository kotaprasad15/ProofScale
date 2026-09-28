import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";
import { LoadingDots } from "./LoadingDots";
import { ArrowRight, Activity, AlertTriangle, Calendar, Filter, X, ChevronRight } from "lucide-react";
import { StatusChip, readinessTone } from "./ui/StatusChip";

interface HistoryViewProps {
  projectId: string;
  onSelectRun: (runId: string) => void;
}

export function HistoryView({ projectId, onSelectRun }: HistoryViewProps) {
  const [testPlanId, setTestPlanId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  
  // Queries
  const plansQuery = trpc.testPlans.list.useQuery({ projectId });
  const targetsQuery = trpc.targets.list.useQuery({ projectId });
  
  const historyQuery = trpc.telemetry.getProjectHistory.useQuery(
    { projectId, testPlanId: testPlanId || undefined, targetId: targetId || undefined },
    { enabled: !!projectId }
  );

  const [cursor, setCursor] = useState<{ id: string; sortFieldValue: any } | undefined>();
  const listQuery = trpc.runs.list.useQuery(
    { projectId, testPlanId: testPlanId || undefined, targetId: targetId || undefined, limit: 10, cursor },
    { enabled: !!projectId, keepPreviousData: true }
  );

  if (historyQuery.isLoading || !historyQuery.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingDots size="md" label="Loading historical trends..." />
      </div>
    );
  }

  const { points, baseline, policy, limitations } = historyQuery.data;

  // Chart Formatting
  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const chartData = points.map(p => ({
    ...p,
    formattedTime: formatTimestamp(p.timestamp as any)
  }));

  const latest = points.length > 0 ? points[points.length - 1] : null;
  const previous = points.length > 1 ? points[points.length - 2] : null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-end justify-between border-b border-white/[0.08] pb-4">
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="space-y-1">
            <label className="text-xs text-text-muted font-bold uppercase tracking-wider">Test Plan</label>
            <select
              value={testPlanId}
              onChange={(e) => setTestPlanId(e.target.value)}
              className="w-full sm:w-48 bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text-primary focus:border-signal-indigo outline-none"
            >
              <option value="">All Plans</option>
              {plansQuery.data?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs text-text-muted font-bold uppercase tracking-wider">Target</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full sm:w-48 bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text-primary focus:border-signal-indigo outline-none"
            >
              <option value="">All Targets</option>
              {targetsQuery.data?.map(t => (
                <option key={t.id} value={t.id}>{t.baseUrl}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-xs text-text-muted">
          {limitations.map((msg, i) => <div key={i} className="text-signal-amber">{msg}</div>)}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 space-y-1">
          <h4 className="text-xs font-semibold text-text-muted uppercase">Latest Score</h4>
          <div className="text-2xl font-bold text-text-primary font-mono">{latest?.score ?? "N/A"}</div>
          {latest && previous && latest.score !== null && previous.score !== null && (
            <div className={`text-[10px] font-bold ${latest.score >= previous.score ? "text-signal-teal" : "text-signal-rose"}`}>
              {latest.score >= previous.score ? "↑" : "↓"} {Math.abs(latest.score - previous.score)} vs previous
            </div>
          )}
        </div>
        <div className="glass-panel p-5 space-y-1">
          <h4 className="text-xs font-semibold text-text-muted uppercase">Latest p95</h4>
          <div className="text-2xl font-bold text-text-primary font-mono">{latest?.p95Ms ? `${latest.p95Ms} ms` : "N/A"}</div>
        </div>
        <div className="glass-panel p-5 space-y-1">
          <h4 className="text-xs font-semibold text-text-muted uppercase">Latest Throughput</h4>
          <div className="text-2xl font-bold text-text-primary font-mono">{latest?.throughputRps ? `${latest.throughputRps.toFixed(1)} req/s` : "N/A"}</div>
        </div>
        <div className="glass-panel p-5 space-y-1">
          <h4 className="text-xs font-semibold text-text-muted uppercase">Policy Result</h4>
          <div className="text-lg font-bold text-text-primary font-mono uppercase truncate" style={{ color: latest?.policyResult === "pass" ? "#2FD4A6" : latest?.policyResult === "fail" ? "#F2586B" : "#F0A63A" }}>
            {latest?.policyResult || "None"}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      {points.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Readiness Score Trend</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} onClick={(data) => data?.activePayload?.[0]?.payload?.runId && onSelectRun(data.activePayload[0].payload.runId)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3143" vertical={false} />
                  <XAxis dataKey="formattedTime" stroke="#8D96AC" fontSize={11} tickMargin={8} />
                  <YAxis stroke="#8D96AC" fontSize={11} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#10151F", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
                    labelStyle={{ color: "#8D96AC", fontSize: "12px", marginBottom: "4px" }}
                    itemStyle={{ color: "#F3F5FA", fontSize: "14px", fontWeight: "bold" }}
                  />
                  {baseline?.score && (
                    <ReferenceLine y={baseline.score} stroke="#F0A63A" strokeDasharray="3 3" label={{ position: 'top', value: 'Baseline', fill: '#F0A63A', fontSize: 10 }} />
                  )}
                  <Line type="monotone" dataKey="score" stroke="#5B5FEF" strokeWidth={3} dot={{ fill: '#5B5FEF', r: 4 }} activeDot={{ r: 6, cursor: "pointer" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-text-muted">Overall deterministic readiness score out of 100 over time.</p>
          </div>

          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Latency p95 Trend (ms)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} onClick={(data) => data?.activePayload?.[0]?.payload?.runId && onSelectRun(data.activePayload[0].payload.runId)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3143" vertical={false} />
                  <XAxis dataKey="formattedTime" stroke="#8D96AC" fontSize={11} tickMargin={8} />
                  <YAxis stroke="#8D96AC" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#10151F", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
                  />
                  {baseline?.p95Ms && (
                    <ReferenceLine y={baseline.p95Ms} stroke="#F0A63A" strokeDasharray="3 3" />
                  )}
                  <Line type="monotone" dataKey="p95Ms" stroke="#2FD4A6" strokeWidth={3} dot={{ fill: '#2FD4A6', r: 4 }} activeDot={{ r: 6, cursor: "pointer" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-text-muted">95th percentile response time. Lower is better.</p>
          </div>
          
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Throughput Trend (req/s)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} onClick={(data) => data?.activePayload?.[0]?.payload?.runId && onSelectRun(data.activePayload[0].payload.runId)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3143" vertical={false} />
                  <XAxis dataKey="formattedTime" stroke="#8D96AC" fontSize={11} tickMargin={8} />
                  <YAxis stroke="#8D96AC" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#10151F", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
                  />
                  {baseline?.throughputRps && (
                    <ReferenceLine y={baseline.throughputRps} stroke="#F0A63A" strokeDasharray="3 3" />
                  )}
                  <Line type="monotone" dataKey="throughputRps" stroke="#F0A63A" strokeWidth={3} dot={{ fill: '#F0A63A', r: 4 }} activeDot={{ r: 6, cursor: "pointer" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Error Rate Trend (%)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} onClick={(data) => data?.activePayload?.[0]?.payload?.runId && onSelectRun(data.activePayload[0].payload.runId)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3143" vertical={false} />
                  <XAxis dataKey="formattedTime" stroke="#8D96AC" fontSize={11} tickMargin={8} />
                  <YAxis stroke="#8D96AC" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#10151F", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
                  />
                  {baseline?.errorRatePercent && (
                    <ReferenceLine y={baseline.errorRatePercent} stroke="#F0A63A" strokeDasharray="3 3" />
                  )}
                  <Line type="stepAfter" dataKey="errorRatePercent" stroke="#F2586B" strokeWidth={3} dot={{ fill: '#F2586B', r: 4 }} activeDot={{ r: 6, cursor: "pointer" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 text-center text-text-muted font-mono text-sm">
          No completed runs match the selected filters.
        </div>
      )}

      {/* Linked Run Explorer */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bold text-text-primary">Run Explorer</h3>
        {listQuery.isLoading ? (
          <div className="py-8"><LoadingDots size="sm" /></div>
        ) : !listQuery.data?.items.length ? (
          <div className="py-8 text-center text-sm text-text-muted">No runs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/[0.08] text-[10px] uppercase font-bold text-text-muted font-mono tracking-wider">
                  <th className="py-3 px-2">Run ID</th>
                  <th className="py-3 px-2">Target</th>
                  <th className="py-3 px-2">Score</th>
                  <th className="py-3 px-2">Policy Result</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/[0.04]">
                {listQuery.data.items.map(run => (
                  <tr key={run.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => onSelectRun(run.id)}>
                    <td className="py-3 px-2 font-mono text-signal-indigo">{run.shortId}</td>
                    <td className="py-3 px-2">
                      <div className="text-text-primary truncate max-w-[200px]" title={run.targetName}>{run.targetName}</div>
                      <div className="text-[10px] text-text-muted font-mono mt-0.5">{run.environment} · {run.targetVersionLabel}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-text-primary font-mono">{run.score ?? "--"}</div>
                      <div className="text-[10px] text-text-muted uppercase">{run.regressionStatus || "none"}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold" style={{ backgroundColor: run.policyResult === "pass" ? "#2FD4A622" : run.policyResult === "fail" ? "#F2586B22" : run.policyResult === "warn" ? "#F0A63A22" : "#8D96AC22", color: run.policyResult === "pass" ? "#2FD4A6" : run.policyResult === "fail" ? "#F2586B" : run.policyResult === "warn" ? "#F0A63A" : "#8D96AC" }}>
                        {run.policyResult || "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <StatusChip status={run.status as any} />
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button className="p-2 text-text-muted hover:text-text-primary hover:bg-white/[0.05] rounded-lg transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {listQuery.data.nextCursor && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setCursor(listQuery.data.nextCursor as any)}
                  className="btn-glass-secondary py-2 px-4 text-xs cursor-pointer"
                >
                  Load Next Page
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
