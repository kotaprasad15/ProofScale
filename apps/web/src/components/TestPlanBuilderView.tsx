import React, { useState, useEffect } from "react";
import { trpc } from "../utils/trpc";
import { Plus, Trash2, Edit3, Shield, Zap, Flame, Clock, Play, CheckCircle2, AlertTriangle, ArrowRight, X, RotateCcw, Globe, Sliders, Layers } from "lucide-react";
import { TestProfile, PresetDefinitions } from "@proofscale/shared";
import { LoadingDots } from "./LoadingDots";

interface ScenarioItem {
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  weight: number;
}

interface TestPlanBuilderViewProps {
  projectId: string;
  initialPlanId?: string;
  onPlanCreated?: (planId: string) => void;
  onLaunchRun?: (runId: string) => void;
}

export function TestPlanBuilderView({ projectId, initialPlanId, onPlanCreated, onLaunchRun }: TestPlanBuilderViewProps) {
  // Editing state
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Deletion confirmation modal state
  const [planToDelete, setPlanToDelete] = useState<{ id: string; name: string } | null>(null);

  // Form Fields
  const [name, setName] = useState("Checkout API Performance Check");
  const [selectedProfile, setSelectedProfile] = useState<TestProfile>("smoke");
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([
    { name: "Health Check", method: "GET", path: "/health", weight: 1 },
    { name: "List Products", method: "GET", path: "/api/v1/products", weight: 2 }
  ]);

  const [virtualUsers, setVirtualUsers] = useState(10);
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [rampUpSeconds, setRampUpSeconds] = useState(10);
  const [maxP95Ms, setMaxP95Ms] = useState(1500);
  const [maxErrorRate, setMaxErrorRate] = useState(0.01);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const testPlansQuery = trpc.testPlans.listByProject.useQuery({ projectId });
  const targetsQuery = trpc.targets.listByProject.useQuery({ projectId });
  
  const createPlanMutation = trpc.testPlans.create.useMutation();
  const updatePlanMutation = trpc.testPlans.update.useMutation();
  const deletePlanMutation = trpc.testPlans.delete.useMutation();
  const createRunMutation = trpc.runs.create.useMutation();

  // Auto-load plan into editing state when initialPlanId is passed
  useEffect(() => {
    if (initialPlanId && testPlansQuery.data) {
      const plan = testPlansQuery.data.find(p => p.id === initialPlanId);
      if (plan) {
        handleStartEdit(plan);
      }
    }
  }, [initialPlanId, testPlansQuery.data]);

  // Initialize selectedTargetId when targets load
  const targetsList = targetsQuery.data || [];
  const effectiveTargetId = selectedTargetId || (targetsList.length > 0 ? targetsList[0].id : "");

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
    setScenarios([
      ...scenarios,
      { name: `Endpoint Step ${scenarios.length + 1}`, method: "GET", path: "/api/v1/resource", weight: 1 }
    ]);
  };

  const handleRemoveStep = (index: number) => {
    if (scenarios.length <= 1) {
      setErrorMsg("A test plan must contain at least one endpoint scenario step.");
      return;
    }
    setScenarios(scenarios.filter((_, idx) => idx !== index));
  };

  const handleStartEdit = (plan: any) => {
    setEditingPlanId(plan.id);
    setName(plan.name);
    setSelectedProfile(plan.profile || "smoke");
    
    // Load all saved scenarios & endpoints
    if (plan.scenarios && Array.isArray(plan.scenarios) && plan.scenarios.length > 0) {
      setScenarios(plan.scenarios.map((s: any) => ({
        name: s.name || `Step`,
        method: s.method || "GET",
        path: s.path || "/",
        weight: Number(s.weight) || 1
      })));
    }

    if (plan.loadProfile) {
      setVirtualUsers(plan.loadProfile.virtualUsers || 10);
      setDurationSeconds(plan.loadProfile.durationSeconds || 60);
      setRampUpSeconds(plan.loadProfile.rampUpSeconds || 10);
    }
    if (plan.thresholds) {
      setMaxP95Ms(plan.thresholds.maxP95Ms || 1500);
      setMaxErrorRate(plan.thresholds.maxErrorRate ?? 0.01);
    }
    setErrorMsg(null);
    setSuccessMsg(`Loaded plan '${plan.name}' with ${plan.scenarios?.length || 0} saved endpoint(s). You can now edit any endpoint below.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingPlanId(null);
    setName("Checkout API Performance Check");
    setSelectedProfile("smoke");
    setScenarios([
      { name: "Health Check", method: "GET", path: "/health", weight: 1 },
      { name: "List Products", method: "GET", path: "/api/v1/products", weight: 2 }
    ]);
    setVirtualUsers(10);
    setDurationSeconds(60);
    setRampUpSeconds(10);
    setMaxP95Ms(1500);
    setMaxErrorRate(0.01);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (executeNow: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate scenarios
    for (let i = 0; i < scenarios.length; i++) {
      const step = scenarios[i];
      if (!step.path || !step.path.startsWith("/")) {
        setErrorMsg(`Endpoint Step ${i + 1} path must start with '/' (e.g. /api/v1/resource)`);
        return;
      }
    }

    if (executeNow && !effectiveTargetId) {
      setErrorMsg("Please register and select a target endpoint before launching a live test run.");
      return;
    }

    try {
      let savedPlanId = editingPlanId;

      if (editingPlanId) {
        // Update existing plan with all modified endpoints
        await updatePlanMutation.mutateAsync({
          id: editingPlanId,
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
        setSuccessMsg(`Test plan '${name}' and all its ${scenarios.length} endpoint(s) were successfully updated.`);
        setEditingPlanId(null);
      } else {
        // Create new plan
        const createdPlan = await createPlanMutation.mutateAsync({
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
        savedPlanId = createdPlan.id;
        setSuccessMsg(`Test plan '${name}' with ${scenarios.length} endpoint(s) saved successfully.`);
      }

      testPlansQuery.refetch();

      if (executeNow && effectiveTargetId && savedPlanId) {
        const newRun = await createRunMutation.mutateAsync({
          planId: savedPlanId,
          targetId: effectiveTargetId
        });
        onLaunchRun?.(newRun.id);
      } else if (!editingPlanId && savedPlanId) {
        onPlanCreated?.(savedPlanId);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save or update test plan.");
    }
  };

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;
    setErrorMsg(null);
    try {
      await deletePlanMutation.mutateAsync({
        id: planToDelete.id,
        projectId
      });
      setSuccessMsg(`Test plan '${planToDelete.name}' was removed successfully.`);
      setPlanToDelete(null);
      if (editingPlanId === planToDelete.id) {
        handleCancelEdit();
      }
      testPlansQuery.refetch();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to remove test plan.");
      setPlanToDelete(null);
    }
  };

  const handleRunExistingPlan = async (planId: string) => {
    if (!effectiveTargetId) {
      setErrorMsg("Please register at least one target endpoint to run this test plan.");
      return;
    }

    try {
      const newRun = await createRunMutation.mutateAsync({
        planId,
        targetId: effectiveTargetId
      });
      onLaunchRun?.(newRun.id);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to launch test run.");
    }
  };

  const getMethodBadgeStyle = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "POST":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "PUT":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "DELETE":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      default:
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">
              {editingPlanId ? "Edit Test Plan" : "Test Plan Builder & Execution"}
            </h2>
            {editingPlanId && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-signal-indigo-soft text-signal-indigo border border-signal-indigo/30">
                Edit Mode Active
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">
            {editingPlanId
              ? "Modify workload parameters, add/edit target HTTP endpoints, and update SLA thresholds."
              : "Configure structured, authorized HTTP workload scenarios, bounded load presets, and launch live execution runs."}
          </p>
        </div>

        {editingPlanId && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="btn-glass-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Cancel Edit</span>
          </button>
        )}
      </div>

      {/* Edit Mode Alert Banner */}
      {editingPlanId && (
        <div className="p-4 rounded-xl bg-signal-indigo-soft border border-signal-indigo/30 text-xs text-signal-indigo flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Edit3 className="h-4 w-4 shrink-0" />
            <span>
              Loaded saved test plan: <strong>{name}</strong>. All <strong>{scenarios.length} saved endpoint(s)</strong> are loaded below for modification.
            </span>
          </div>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="text-xs underline font-semibold cursor-pointer shrink-0 ml-3"
          >
            Exit &amp; Create New
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-signal-rose-soft border border-signal-rose/30 text-xs text-signal-rose flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-signal-teal-soft border border-signal-teal/30 text-xs text-signal-teal flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Preset Selector Grid */}
      <div className="space-y-3">
        <span className="text-xs font-mono text-text-muted uppercase">1-Click Test Profile Presets</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: "smoke", label: "Smoke", icon: Shield, desc: "2 VUs · 30s" },
            { id: "baseline", label: "Baseline", icon: Zap, desc: "10 VUs · 120s" },
            { id: "spike", label: "Stress", icon: Flame, desc: "50 VUs · 60s" },
            { id: "short_soak", label: "Soak", icon: Clock, desc: "15 VUs · 600s" }
          ].map(preset => {
            const Icon = preset.icon;
            const isSelected = selectedProfile === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id as TestProfile)}
                className={`p-3.5 rounded-2xl text-left transition cursor-pointer ${
                  isSelected
                    ? "bg-signal-indigo-soft border-2 border-signal-indigo text-signal-indigo shadow-md shadow-signal-indigo/15"
                    : "bg-[var(--color-surface)] border-2 border-[var(--border)] hover:border-signal-indigo/50 text-text-muted hover:text-text-primary hover:bg-[var(--white-fill-sm)]"
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
      <div className="glass-panel p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Test Plan Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g. Checkout API Smoke Check"
              className="field-input"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Target Endpoint to Test *</label>
            <select
              value={effectiveTargetId}
              onChange={e => setSelectedTargetId(e.target.value)}
              className="field-input field-input--mono cursor-pointer"
            >
              {targetsList.length === 0 ? (
                <option value="">No targets registered yet</option>
              ) : (
                targetsList.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.baseUrl} ({t.environment})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Scenarios Step & Endpoints Builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <div>
              <span className="text-xs font-mono text-text-muted uppercase font-bold">
                HTTP Request Endpoints ({scenarios.length} {scenarios.length === 1 ? "Endpoint" : "Endpoints"})
              </span>
              <p className="text-[11px] text-text-muted mt-0.5">
                Configure the HTTP paths and methods to benchmark for this test plan
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddStep}
              className="btn-glass-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Endpoint</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {scenarios.map((sc, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--border)] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              >
                {/* Step Index & Name */}
                <div className="w-full sm:w-1/3 min-w-0">
                  <label className="block text-[10px] font-mono text-text-muted uppercase mb-1">
                    Step {idx + 1} Name:
                  </label>
                  <input
                    type="text"
                    value={sc.name}
                    onChange={e => {
                      const copy = [...scenarios];
                      copy[idx].name = e.target.value;
                      setScenarios(copy);
                    }}
                    placeholder={`e.g. Get Products`}
                    className="field-input py-1.5 text-xs"
                  />
                </div>

                {/* HTTP Method */}
                <div className="w-full sm:w-28">
                  <label className="block text-[10px] font-mono text-text-muted uppercase mb-1">Method:</label>
                  <select
                    value={sc.method}
                    onChange={e => {
                      const copy = [...scenarios];
                      copy[idx].method = e.target.value as any;
                      setScenarios(copy);
                    }}
                    className={`field-input py-1.5 text-xs font-mono font-bold cursor-pointer ${getMethodBadgeStyle(
                      sc.method
                    )}`}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                {/* Endpoint Path */}
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-mono text-text-muted uppercase mb-1">
                    Path (starts with /):
                  </label>
                  <input
                    type="text"
                    value={sc.path}
                    onChange={e => {
                      const copy = [...scenarios];
                      copy[idx].path = e.target.value;
                      setScenarios(copy);
                    }}
                    placeholder="/api/v1/resource"
                    className="field-input field-input--mono py-1.5 text-xs"
                  />
                </div>

                {/* Traffic Weight */}
                <div className="w-full sm:w-20">
                  <label className="block text-[10px] font-mono text-text-muted uppercase mb-1">Weight:</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={sc.weight}
                    onChange={e => {
                      const copy = [...scenarios];
                      copy[idx].weight = Number(e.target.value) || 1;
                      setScenarios(copy);
                    }}
                    className="field-input field-input--mono py-1.5 text-xs"
                  />
                </div>

                {/* Remove Step Button */}
                <div className="sm:self-end pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="p-2 rounded-lg text-text-muted hover:text-signal-rose hover:bg-signal-rose-soft border border-transparent hover:border-signal-rose/30 transition cursor-pointer"
                    title="Remove this endpoint"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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
              className="field-input field-input--mono"
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
              className="field-input field-input--mono"
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
              className="field-input field-input--mono"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={createPlanMutation.isPending || updatePlanMutation.isPending || createRunMutation.isPending}
            className="btn-solid-primary flex-1 justify-center cursor-pointer py-3"
          >
            <Play className="h-4 w-4" />
            <span>
              {createRunMutation.isPending
                ? "Launching Test Execution..."
                : editingPlanId
                ? "Update Plan & Launch Run Now"
                : "Save & Launch Test Run Now"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
            className="btn-glass-secondary flex-1 justify-center cursor-pointer py-3"
          >
            <span>{editingPlanId ? "Update Plan Only" : "Save Plan Only"}</span>
          </button>
        </div>
      </div>

      {/* Saved Test Plans List */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Saved Test Plans ({testPlansQuery.data?.length || 0})</h3>
            <p className="text-xs text-text-muted">Click the pencil icon on any plan to load and edit its saved endpoints</p>
          </div>
          <span className="text-xs font-mono text-text-muted">Edit, Remove &amp; Run</span>
        </div>

        {testPlansQuery.isLoading ? (
          <div className="p-6 flex justify-center">
            <LoadingDots size="sm" label="Loading test plans..." />
          </div>
        ) : testPlansQuery.data?.length === 0 ? (
          <div className="text-xs text-text-muted font-mono py-6 text-center">
            No test plans created yet. Build and save your first test plan above.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {testPlansQuery.data?.map(plan => (
              <div key={plan.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-text-primary text-sm truncate">{plan.name}</h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-signal-indigo-soft text-signal-indigo border border-signal-indigo/30">
                      {plan.profile}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">v{plan.version}</span>
                  </div>

                  <div className="text-xs text-text-muted font-mono flex flex-wrap gap-2">
                    <span>{plan.loadProfile?.virtualUsers || 10} VUs</span>
                    <span>·</span>
                    <span>{plan.loadProfile?.durationSeconds || 60}s duration</span>
                    <span>·</span>
                    <span>p95 &lt; {plan.thresholds?.maxP95Ms || 1500}ms</span>
                  </div>

                  {plan.scenarios && plan.scenarios.length > 0 && (
                    <div className="text-[11px] text-signal-teal font-mono truncate">
                      Saved Endpoints: {plan.scenarios.map((s: any) => `${s.method} ${s.path}`).join(", ")}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
                  {/* Edit Plan Button */}
                  <button
                    type="button"
                    onClick={() => handleStartEdit(plan)}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-signal-indigo-soft hover:text-signal-indigo hover:border-signal-indigo/30 text-text-muted border border-white/[0.06] transition cursor-pointer flex items-center gap-1 text-xs"
                    title="Load and edit this test plan"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span className="hidden sm:inline font-semibold">Edit</span>
                  </button>

                  {/* Remove Plan Button */}
                  <button
                    type="button"
                    onClick={() => setPlanToDelete({ id: plan.id, name: plan.name })}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-signal-rose-soft hover:text-signal-rose hover:border-signal-rose/30 text-text-muted border border-white/[0.06] transition cursor-pointer"
                    title="Remove this test plan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {/* Execute Run Button */}
                  <button
                    type="button"
                    onClick={() => handleRunExistingPlan(plan.id)}
                    disabled={createRunMutation.isPending}
                    className="btn-solid-primary text-xs py-2 px-3.5 cursor-pointer flex items-center gap-1"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Run</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Plan Deletion Confirmation Modal */}
      {planToDelete && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPlanToDelete(null);
          }}
        >
          <div className="modal-panel--destructive max-w-md w-full p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-signal-rose-soft border border-signal-rose/30 flex items-center justify-center text-signal-rose shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary text-base">Remove Test Plan?</h3>
                  <p className="text-xs text-text-muted">This action cannot be undone.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-[var(--white-fill-sm)] transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-ink-950 border border-[var(--border)] text-xs font-mono text-text-primary font-semibold">
              {planToDelete.name}
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Are you sure you want to remove this test plan? Historical test run logs and reports will remain preserved in your archive.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="btn-glass-secondary flex-1 justify-center cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeletePlan}
                disabled={deletePlanMutation.isPending}
                className="btn-destructive flex-1"
              >
                {deletePlanMutation.isPending ? (
                  <span>Removing...</span>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Remove Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
