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

  const presetIcons = {
    smoke: Shield,
    baseline: Zap,
    ramp: Flame,
    spike: Flame,
    short_soak: Clock
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Test Plan Builder</h2>
        <p className="text-sm text-slate-400">
          Configure structured workload scenarios, apply safe performance presets, and set readiness thresholds.
        </p>
      </div>

      {/* Preset Selector Banner */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Safe Preset Profile</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.keys(PresetDefinitions) as TestProfile[]).map(key => {
            const preset = PresetDefinitions[key];
            const Icon = presetIcons[key];
            const isSelected = selectedProfile === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleApplyPreset(key)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "bg-indigo-600/20 border-indigo-500/50 ring-2 ring-indigo-500/30"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center space-x-2 mb-1.5">
                  <Icon className={`h-4 w-4 ${isSelected ? "text-indigo-400" : "text-slate-400"}`} />
                  <span className="font-semibold text-xs text-white capitalize">{key.replace("_", " ")}</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Plan Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
            <PlaySquare className="h-5 w-5 text-indigo-400" />
            <span>Configure Workload & Thresholds</span>
          </h3>
          <span className="text-xs font-mono text-indigo-400 uppercase bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
            {selectedProfile.replace("_", " ")} Preset
          </span>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Test Plan Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        {/* Scenario Steps Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300">Scenario Steps</label>
            <button
              type="button"
              onClick={handleAddStep}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Step</span>
            </button>
          </div>

          <div className="space-y-2">
            {scenarios.map((step, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center space-x-3">
                <select
                  value={step.method}
                  onChange={e => {
                    const next = [...scenarios];
                    next[idx].method = e.target.value as any;
                    setScenarios(next);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-semibold text-indigo-400"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>

                <input
                  type="text"
                  value={step.name}
                  onChange={e => {
                    const next = [...scenarios];
                    next[idx].name = e.target.value;
                    setScenarios(next);
                  }}
                  placeholder="Step Name"
                  className="w-1/3 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
                />

                <input
                  type="text"
                  value={step.path}
                  onChange={e => {
                    const next = [...scenarios];
                    next[idx].path = e.target.value;
                    setScenarios(next);
                  }}
                  placeholder="/path"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200"
                />

                <button
                  type="button"
                  onClick={() => handleRemoveStep(idx)}
                  className="text-slate-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Load Envelope & Thresholds Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Virtual Users (VUs)</label>
            <input
              type="number"
              value={virtualUsers}
              onChange={e => setVirtualUsers(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-slate-100"
              min={1}
              max={100}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Duration (Seconds)</label>
            <input
              type="number"
              value={durationSeconds}
              onChange={e => setDurationSeconds(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-slate-100"
              min={5}
              max={600}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Max p95 Latency (ms)</label>
            <input
              type="number"
              value={maxP95Ms}
              onChange={e => setMaxP95Ms(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Max Error Rate</label>
            <input
              type="number"
              step="0.005"
              value={maxErrorRate}
              onChange={e => setMaxErrorRate(parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono text-slate-100"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={createPlanMutation.isPending}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
        >
          <PlaySquare className="h-4 w-4" />
          <span>{createPlanMutation.isPending ? "Creating Plan..." : "Save Test Plan"}</span>
        </button>
      </form>
    </div>
  );
}
