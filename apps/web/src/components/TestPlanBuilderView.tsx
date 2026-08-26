import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { PlaySquare, Plus, Trash2, Shield, Zap, Flame, Clock } from "lucide-react";
import { TestProfile, PresetDefinitions } from "@proofscale/shared";

interface TestPlanBuilderViewProps {
  projectId: string;
  onPlanCreated?: (planId: string) => void;
}

export function TestPlanBuilderView({ projectId, onPlanCreated }: TestPlanBuilderViewProps) {
  const [name, setName] = useState("Checkout API Performance Check");
  const [selectedProfile, setSelectedProfile] = useState<TestProfile>("smoke");
  const [scenarios, setScenarios] = useState([
    { name: "Health Check", method: "GET" as const, path: "/health", weight: 1 },
    { name: "List Products", method: "GET" as const, path: "/api/v1/products", weight: 2 }
  ]);

  const [virtualUsers, setVirtualUsers] = useState(10);
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [rampUpSeconds, setRampUpSeconds] = useState(10);
  const [maxP95Ms, setMaxP95Ms] = useState(1500);
  const [maxErrorRate, setMaxErrorRate] = useState(0.01);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const testPlansQuery = trpc.testPlans.listByProject.useQuery({ projectId });
  const createPlanMutation = trpc.testPlans.create.useMutation();

  const handleApplyPreset = (profileKey: TestProfile) => {
    setSelectedProfile(profileKey);
    const preset = PresetDefinitions[profileKey];
    setVirtualUsers(preset.loadProfile.virtualUsers);
    setDurationSeconds(preset.loadProfile.durationSeconds);
    setRampUpSeconds(preset.loadProfile.rampUpSeconds || 5);
    setMaxP95Ms(preset.thresholds.maxP95Ms || 1500);
    setMaxErrorRate(preset.thresholds.maxErrorRate ?? 0.01);
  };

  const handleAddStep = () => {
    setScenarios([...scenarios, { name: `Step ${scenarios.length + 1}`, method: "GET", path: "/api/v1/orders", weight: 1 }]);
  };

  const handleRemoveStep = (index: number) => {
    if (scenarios.length <= 1) return;
    setScenarios(scenarios.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const created = await createPlanMutation.mutateAsync({
        projectId,
        name,
        profile: selectedProfile,
        scenarios,
        loadProfile: {
          virtualUsers,
          durationSeconds,
          rampUpSeconds,
          timeoutMs: 5000
        },
        thresholds: {
          maxP95Ms,
          maxP99Ms: maxP95Ms * 2,
          maxErrorRate
        }
      });

      testPlansQuery.refetch();
      onPlanCreated?.(created.id);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create test plan.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">Test Plan Builder</h2>
        <p className="text-xs text-text-muted mt-1">
          Configure structured, authorized HTTP workload scenarios, bounded load presets, and SLA thresholds.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-signal-rose-soft border border-signal-rose/30 text-xs text-signal-rose">
          {errorMsg}
        </div>
      )}

      {/* Preset Selector Grid */}
      <div className="space-y-3">
        <span className="text-xs font-mono text-text-muted uppercase">1-Click Test Profile Presets</span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { id: "smoke", label: "Smoke", icon: Shield, desc: "2 VUs · 10s" },
            { id: "baseline", label: "Baseline", icon: Zap, desc: "25 VUs · 60s" },
            { id: "ramp", label: "Ramp-Up", icon: Clock, desc: "50 VUs · 120s" },
            { id: "spike", label: "Spike", icon: Flame, desc: "100 VUs · 30s" },
            { id: "soak", label: "Short Soak", icon: PlaySquare, desc: "30 VUs · 300s" }
          ].map(preset => {
            const Icon = preset.icon;
            const isSelected = selectedProfile === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id as TestProfile)}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                  isSelected
                    ? "bg-signal-indigo-soft border-signal-indigo text-white shadow-lg shadow-signal-indigo/20"
                    : "bg-ink-900/80 border-white/[0.08] text-text-muted hover:text-text-primary hover:border-white/[0.2]"
                }`}
              >
                <Icon className={`h-4 w-4 mb-2 ${isSelected ? "text-signal-indigo" : "text-text-muted"}`} />
                <div className="font-bold text-xs text-text-primary">{preset.label}</div>
                <div className="text-[10px] text-text-faint font-mono">{preset.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-8 space-y-6">
        <div>
          <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Test Plan Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/[0.1] text-sm text-text-primary focus:outline-none focus:border-signal-indigo"
          />
        </div>

        {/* Scenarios Step Builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-text-muted uppercase">HTTP Request Scenarios</span>
            <button
              type="button"
              onClick={handleAddStep}
              className="text-xs font-semibold text-signal-indigo hover:text-indigo-400 inline-flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Step</span>
            </button>
          </div>

          <div className="space-y-2">
            {scenarios.map((sc, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-ink-950/80 border border-white/[0.06] flex items-center space-x-3">
                <input
                  type="text"
                  value={sc.name}
                  onChange={e => {
                    const copy = [...scenarios];
                    copy[idx].name = e.target.value;
                    setScenarios(copy);
                  }}
                  placeholder="Step Name"
                  className="w-1/3 px-3 py-1.5 rounded-lg bg-ink-900 border border-white/[0.1] text-xs text-text-primary"
                />
                <select
                  value={sc.method}
                  onChange={e => {
                    const copy = [...scenarios];
                    copy[idx].method = e.target.value as any;
                    setScenarios(copy);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-ink-900 border border-white/[0.1] text-xs text-text-primary font-mono"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="text"
                  value={sc.path}
                  onChange={e => {
                    const copy = [...scenarios];
                    copy[idx].path = e.target.value;
                    setScenarios(copy);
                  }}
                  placeholder="/path"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-ink-900 border border-white/[0.1] text-xs text-text-primary font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveStep(idx)}
                  className="text-text-muted hover:text-signal-rose p-1 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Load Envelope Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Concurrency (Virtual Users)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={virtualUsers}
              onChange={e => setVirtualUsers(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl bg-ink-900 border border-white/[0.1] text-xs text-text-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Duration (Seconds)</label>
            <input
              type="number"
              min={5}
              max={600}
              value={durationSeconds}
              onChange={e => setDurationSeconds(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl bg-ink-900 border border-white/[0.1] text-xs text-text-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">SLA p95 Latency Ceiling (ms)</label>
            <input
              type="number"
              min={10}
              max={10000}
              value={maxP95Ms}
              onChange={e => setMaxP95Ms(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl bg-ink-900 border border-white/[0.1] text-xs text-text-primary font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={createPlanMutation.isPending}
          className="btn-solid-primary cursor-pointer"
        >
          {createPlanMutation.isPending ? "Compiling Test Plan..." : "Save Test Plan"}
        </button>
      </form>
    </div>
  );
}
