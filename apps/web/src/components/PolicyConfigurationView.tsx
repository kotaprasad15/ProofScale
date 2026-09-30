import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { Shield, Plus, CheckCircle2, AlertTriangle, Play, RefreshCcw } from "lucide-react";
import { LoadingDots } from "./LoadingDots";
import { ReadinessPolicy } from "@proofscale/shared";

interface PolicyConfigurationViewProps {
  projectId: string;
  testPlanId: string;
}

export function PolicyConfigurationView({ projectId, testPlanId }: PolicyConfigurationViewProps) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [minScore, setMinScore] = useState<number>(80);
  const [maxP95, setMaxP95] = useState<number>(500);
  const [maxError, setMaxError] = useState<number>(1);
  const [failOnHardCap, setFailOnHardCap] = useState<boolean>(true);

  const policiesQuery = trpc.policies.list.useQuery({ projectId, testPlanId });
  const activePolicyQuery = trpc.policies.getActive.useQuery({ testPlanId });
  
  const createDraftMutation = trpc.policies.createDraft.useMutation();
  const activateMutation = trpc.policies.activateVersion.useMutation();

  const handleCreateDraft = async () => {
    try {
      await createDraftMutation.mutateAsync({
        projectId,
        testPlanId,
        name: draftName || "New Policy",
        minimumScore: minScore,
        maximumP95Ms: maxP95,
        maximumErrorRatePercent: maxError,
        failOnHardCap
      });
      setIsDrafting(false);
      setDraftName("");
      policiesQuery.refetch();
    } catch (err: any) {
      alert("Failed to create draft: " + err.message);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateMutation.mutateAsync({ id, testPlanId });
      policiesQuery.refetch();
      activePolicyQuery.refetch();
    } catch (err: any) {
      alert("Failed to activate: " + err.message);
    }
  };

  if (policiesQuery.isLoading) return <LoadingDots size="sm" />;

  const policies = policiesQuery.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Shield className="w-4 h-4 text-signal-indigo" />
          <span>Readiness Policies</span>
        </h3>
        <button
          onClick={() => setIsDrafting(!isDrafting)}
          className="text-xs font-semibold px-3 py-1 bg-signal-indigo/10 text-signal-indigo rounded-lg"
        >
          {isDrafting ? "Cancel Draft" : "New Policy"}
        </button>
      </div>

      {isDrafting && (
        <div className="p-4 rounded-xl border border-signal-indigo/20 bg-signal-indigo/5 space-y-3 text-xs">
          <div>
            <label className="block mb-1 font-mono text-text-muted">Policy Name</label>
            <input 
              value={draftName} 
              onChange={e => setDraftName(e.target.value)}
              className="w-full p-2 rounded-lg bg-ink-900 border border-[var(--border)] text-text-primary"
              placeholder="e.g. Strict Production Policy"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block mb-1 font-mono text-text-muted">Min Score</label>
              <input 
                type="number"
                value={minScore} 
                onChange={e => setMinScore(Number(e.target.value))}
                className="w-full p-2 rounded-lg bg-ink-900 border border-[var(--border)] text-text-primary"
              />
            </div>
            <div>
              <label className="block mb-1 font-mono text-text-muted">Max p95 (ms)</label>
              <input 
                type="number"
                value={maxP95} 
                onChange={e => setMaxP95(Number(e.target.value))}
                className="w-full p-2 rounded-lg bg-ink-900 border border-[var(--border)] text-text-primary"
              />
            </div>
            <div>
              <label className="block mb-1 font-mono text-text-muted">Max Error Rate (%)</label>
              <input 
                type="number"
                value={maxError} 
                onChange={e => setMaxError(Number(e.target.value))}
                className="w-full p-2 rounded-lg bg-ink-900 border border-[var(--border)] text-text-primary"
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input 
                type="checkbox"
                checked={failOnHardCap} 
                onChange={e => setFailOnHardCap(e.target.checked)}
              />
              <span className="font-mono text-text-muted">Fail on Hard Cap</span>
            </div>
          </div>
          <button 
            onClick={handleCreateDraft}
            className="w-full mt-2 py-2 bg-signal-indigo text-white rounded-lg font-semibold"
          >
            Save Draft
          </button>
        </div>
      )}

      {policies.length === 0 && !isDrafting ? (
        <div className="text-xs text-text-muted">No policies configured for this plan.</div>
      ) : (
        <div className="space-y-2">
          {policies.map(p => (
            <div key={p.id} className={`p-3 rounded-xl border ${p.status === "active" ? "border-signal-teal bg-signal-teal/5" : "border-[var(--border)] bg-ink-900"} flex items-center justify-between`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-primary">{p.name} (v{p.version})</span>
                  {p.status === "active" && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-mono bg-signal-teal text-white">Active</span>
                  )}
                  {p.status === "draft" && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-mono bg-text-muted text-ink-900">Draft</span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-text-muted mt-1">
                  Min Score: {p.minimumScore ?? "N/A"} | p95: {p.maximumP95Ms ?? "N/A"}ms | Error: {p.maximumErrorRatePercent ?? "N/A"}%
                </div>
              </div>
              {p.status === "draft" && (
                <button 
                  onClick={() => handleActivate(p.id)}
                  className="px-3 py-1.5 bg-signal-indigo/20 text-signal-indigo rounded-lg text-xs font-semibold"
                >
                  Activate
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
