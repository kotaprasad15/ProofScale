import React, { useState, useEffect } from "react";
import { trpc } from "../utils/trpc";
import {
  Plus,
  Trash2,
  Edit3,
  Shield,
  Zap,
  Flame,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  X,
  RotateCcw,
  Globe,
  Sliders,
  Layers,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Activity
} from "lucide-react";
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

export function TestPlanBuilderView({
  projectId,
  initialPlanId,
  onPlanCreated,
  onLaunchRun
}: TestPlanBuilderViewProps) {
  // Stepper state
  const [activeStep, setActiveStep] = useState<number>(0);

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
      const plan = testPlansQuery.data.find((p) => p.id === initialPlanId);
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
      {
        name: `Endpoint Step ${scenarios.length + 1}`,
        method: "GET",
        path: "/api/v1/resource",
        weight: 1
      }
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

    if (plan.scenarios && Array.isArray(plan.scenarios) && plan.scenarios.length > 0) {
      setScenarios(
        plan.scenarios.map((s: any) => ({
          name: s.name || `Step`,
          method: s.method || "GET",
          path: s.path || "/",
          weight: Number(s.weight) || 1
        }))
      );
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
    setSuccessMsg(`Loaded plan '${plan.name}'. You can edit any parameters below.`);
    setActiveStep(0);
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
    setActiveStep(0);
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
        setSuccessMsg(`Test plan '${name}' updated successfully.`);
        setEditingPlanId(null);
      } else {
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
        setSuccessMsg(`Test plan '${name}' saved successfully.`);
      }

      testPlansQuery.refetch();

      if (executeNow && savedPlanId && effectiveTargetId) {
        const run = await createRunMutation.mutateAsync({
          planId: savedPlanId,
          targetId: effectiveTargetId
        });
        if (onLaunchRun) {
          onLaunchRun(run.id);
        }
      } else if (savedPlanId && onPlanCreated) {
        onPlanCreated(savedPlanId);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save test plan.");
    }
  };

  const handleRunExistingPlan = async (planId: string) => {
    if (!effectiveTargetId) {
      setErrorMsg("Please register a target endpoint before running this plan.");
      return;
    }

    setErrorMsg(null);
    try {
      const run = await createRunMutation.mutateAsync({
        planId,
        targetId: effectiveTargetId
      });
      if (onLaunchRun) {
        onLaunchRun(run.id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to launch test run.");
    }
  };

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      await deletePlanMutation.mutateAsync({
        id: planToDelete.id,
        projectId
      });
      setSuccessMsg(`Plan '${planToDelete.name}' removed.`);
      setPlanToDelete(null);
      testPlansQuery.refetch();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to remove test plan.");
      setPlanToDelete(null);
    }
  };

  const stepsList = [
    { label: "1. Configure", subtitle: "Name, target & profile" },
    { label: "2. Scenarios", subtitle: "Endpoints & routes" },
    { label: "3. Envelope & SLA", subtitle: "VUs, duration & limits" },
    { label: "4. Review & Run", subtitle: "Dry-run & dispatch" }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Validation Test Plans
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--white-fill-sm)] text-text-muted border border-[var(--border)]">
              {testPlansQuery.data?.length || 0} Configured
            </span>
          </div>
          <p className="text-sm text-text-muted">
            Define bounded load profiles, configure endpoint call sequences, and declare strict SLA thresholds.
          </p>
        </div>

        {editingPlanId && (
          <button
            onClick={handleCancelEdit}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--white-fill-sm)] hover:bg-[var(--white-fill-md)] text-text-muted border border-[var(--border)] transition cursor-pointer flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancel Edit</span>
          </button>
        )}
      </div>

      {/* Stepped Plan Builder */}
      <div className="rounded-2xl bg-ink-900 border border-[var(--border)] p-6 sm:p-8 space-y-6">
        {/* Stepper Header Navigation */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 border-b border-[var(--border)] pb-6">
          {stepsList.map((step, idx) => (
            <button
              key={step.label}
              onClick={() => setActiveStep(idx)}
              className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                activeStep === idx
                  ? "bg-signal-indigo/10 border-signal-indigo/30 text-signal-indigo shadow-xs"
                  : idx < activeStep
                  ? "bg-[var(--white-fill-sm)] border-signal-teal/30 text-signal-teal"
                  : "bg-[var(--white-fill-sm)] border-[var(--border)] text-text-faint"
              }`}
            >
              <div className="text-xs font-semibold">{step.label}</div>
              <div className="text-[10px] font-mono text-text-muted">{step.subtitle}</div>
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-signal-rose/10 border border-signal-rose/30 text-xs text-signal-rose flex items-center gap-2 font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-signal-teal/10 border border-signal-teal/30 text-xs text-signal-teal flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: CONFIGURE & PRESETS */}
        {activeStep === 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Plan Identifier / Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Checkout Service Peak Bounded Load"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] focus:border-signal-indigo text-xs font-medium text-text-primary outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Target Destination Endpoint *
                </label>
                <select
                  value={effectiveTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] focus:border-signal-indigo text-xs font-mono text-text-primary outline-none transition cursor-pointer"
                >
                  {targetsList.map((t) => (
                    <option key={t.id} value={t.id} className="bg-ink-900 text-text-primary">
                      {t.baseUrl} ({t.environment})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Profile Presets Grid */}
            <div className="space-y-3">
              <label className="block text-xs font-mono text-text-muted uppercase">
                Select Load Profile Preset
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { key: "smoke", label: "Smoke Check", icon: Shield, desc: "Fast baseline probe · 5 VUs · 30s" },
                  { key: "load", label: "Sustained Load", icon: Zap, desc: "Nominal SLA check · 25 VUs · 60s" },
                  { key: "stress", label: "Stress Test", icon: Flame, desc: "Burst limit search · 50 VUs · 90s" },
                  { key: "spike", label: "Spike Spike", icon: Activity, desc: "Step capacity test · 75 VUs · 45s" }
                ].map((p) => {
                  const Icon = p.icon;
                  const isSelected = selectedProfile === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleApplyPreset(p.key as TestProfile)}
                      className={`p-4 rounded-xl text-left border transition cursor-pointer ${
                        isSelected
                          ? "bg-signal-indigo/10 border-signal-indigo text-signal-indigo shadow-xs"
                          : "bg-[var(--white-fill-sm)] border-[var(--border)] hover:border-[var(--border-strong)] text-text-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-xs text-text-primary">{p.label}</span>
                        <Icon className={`w-4 h-4 ${isSelected ? "text-signal-indigo" : "text-text-muted"}`} />
                      </div>
                      <p className="text-[11px] font-mono text-text-muted leading-relaxed">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setActiveStep(1)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-signal-indigo hover:bg-signal-indigo-hover text-white transition cursor-pointer flex items-center gap-2"
              >
                <span>Continue to Scenarios</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SCENARIOS / ENDPOINTS */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Endpoint Call Sequence</h3>
                <p className="text-xs text-text-muted">Define the relative frequency and HTTP paths visited during execution</p>
              </div>
              <button
                onClick={handleAddStep}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--white-fill-sm)] hover:bg-[var(--white-fill-md)] text-signal-indigo border border-signal-indigo/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Endpoint</span>
              </button>
            </div>

            <div className="space-y-3">
              {scenarios.map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-mono text-text-faint uppercase mb-1">Step Name</label>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => {
                        const next = [...scenarios];
                        next[idx].name = e.target.value;
                        setScenarios(next);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-ink-900 border border-[var(--border)] text-xs text-text-primary outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-mono text-text-faint uppercase mb-1">Method</label>
                    <select
                      value={step.method}
                      onChange={(e) => {
                        const next = [...scenarios];
                        next[idx].method = e.target.value as any;
                        setScenarios(next);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-ink-900 border border-[var(--border)] text-xs font-mono text-text-primary outline-none cursor-pointer"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-mono text-text-faint uppercase mb-1">Path Route</label>
                    <input
                      type="text"
                      value={step.path}
                      onChange={(e) => {
                        const next = [...scenarios];
                        next[idx].path = e.target.value;
                        setScenarios(next);
                      }}
                      placeholder="/api/v1/resource"
                      className="w-full px-3 py-1.5 rounded-lg bg-ink-900 border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-mono text-text-faint uppercase mb-1">Weight</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={step.weight}
                      onChange={(e) => {
                        const next = [...scenarios];
                        next[idx].weight = parseInt(e.target.value, 10) || 1;
                        setScenarios(next);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg bg-ink-900 border border-[var(--border)] text-xs font-mono text-text-primary text-center outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      className="p-2 rounded-lg text-text-muted hover:text-signal-rose hover:bg-signal-rose/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setActiveStep(0)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--white-fill-sm)] text-text-muted hover:text-text-primary border border-[var(--border)] transition cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setActiveStep(2)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-signal-indigo hover:bg-signal-indigo-hover text-white transition cursor-pointer flex items-center gap-2"
              >
                <span>Continue to Envelope & SLA</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ENVELOPE & SLA THRESHOLDS */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Virtual Users (VUs)
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={virtualUsers}
                  onChange={(e) => setVirtualUsers(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                />
                <p className="text-[11px] font-mono text-text-faint mt-1">Simulated concurrent threads</p>
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Duration (Seconds)
                </label>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(parseInt(e.target.value, 10) || 10)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                />
                <p className="text-[11px] font-mono text-text-faint mt-1">Total run execution length</p>
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Ramp-Up Curve (Seconds)
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={rampUpSeconds}
                  onChange={(e) => setRampUpSeconds(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                />
                <p className="text-[11px] font-mono text-text-faint mt-1">Linear acceleration window</p>
              </div>
            </div>

            {/* Strict Threshold Constraints */}
            <div className="p-5 rounded-2xl bg-[var(--white-fill-sm)] border border-[var(--border)] space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-text-primary flex items-center gap-2">
                <Shield className="w-4 h-4 text-signal-indigo" />
                <span>SLA Threshold Pass / Fail Constraints</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                    Max Acceptable p95 Latency (ms)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={10000}
                    value={maxP95Ms}
                    onChange={(e) => setMaxP95Ms(parseInt(e.target.value, 10) || 500)}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                  />
                  <p className="text-[11px] font-mono text-text-faint mt-1">Runs exceeding this p95 mark fail readiness</p>
                </div>

                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                    Max Acceptable Error Rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={maxErrorRate}
                    onChange={(e) => setMaxErrorRate(parseFloat(e.target.value) || 0.01)}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                  />
                  <p className="text-[11px] font-mono text-text-faint mt-1">e.g. 0.01 = 1.00% max 5xx or timeout allowance</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setActiveStep(1)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--white-fill-sm)] text-text-muted hover:text-text-primary border border-[var(--border)] transition cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setActiveStep(3)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-signal-indigo hover:bg-signal-indigo-hover text-white transition cursor-pointer flex items-center gap-2"
              >
                <span>Review & Dispatch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & DISPATCH */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--white-fill-sm)] border border-[var(--border)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 className="font-semibold text-text-primary text-sm">Validation Execution Specification</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono uppercase bg-signal-indigo/10 text-signal-indigo border border-signal-indigo/20">
                  {selectedProfile}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <span className="text-text-faint text-[10px] uppercase block">Virtual Users</span>
                  <span className="font-bold text-text-primary">{virtualUsers} VUs</span>
                </div>
                <div>
                  <span className="text-text-faint text-[10px] uppercase block">Duration</span>
                  <span className="font-bold text-text-primary">{durationSeconds}s ({rampUpSeconds}s ramp)</span>
                </div>
                <div>
                  <span className="text-text-faint text-[10px] uppercase block">SLA p95 Cap</span>
                  <span className="font-bold text-signal-teal">&le; {maxP95Ms}ms</span>
                </div>
                <div>
                  <span className="text-text-faint text-[10px] uppercase block">Error Budget</span>
                  <span className="font-bold text-signal-teal">&le; {(maxErrorRate * 100).toFixed(2)}%</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)]">
                <span className="text-text-faint text-[10px] uppercase font-mono block mb-1">
                  Target Destination:
                </span>
                <span className="text-xs font-mono font-bold text-signal-indigo">
                  {targetsList.find((t) => t.id === effectiveTargetId)?.baseUrl || "None Selected"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setActiveStep(2)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--white-fill-sm)] text-text-muted hover:text-text-primary border border-[var(--border)] transition cursor-pointer"
              >
                Back
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--white-fill-sm)] hover:bg-[var(--white-fill-md)] text-text-primary border border-[var(--border)] transition cursor-pointer"
                >
                  {editingPlanId ? "Update Plan" : "Save Plan Only"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={createRunMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-signal-indigo hover:bg-signal-indigo-hover text-white transition cursor-pointer flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{editingPlanId ? "Save & Run Test" : "Dispatch Test Run Now"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Existing Plans Table */}
      <div className="rounded-2xl bg-ink-900 border border-[var(--border)] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Layers className="w-4 h-4 text-signal-indigo" />
            <span>Configured Test Plans in Project</span>
          </h3>
          <span className="text-xs font-mono text-text-muted px-2.5 py-0.5 rounded-full bg-[var(--white-fill-sm)] border border-[var(--border)]">
            {testPlansQuery.data?.length || 0} Total
          </span>
        </div>

        {testPlansQuery.isLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingDots size="sm" label="Loading test plans..." />
          </div>
        ) : testPlansQuery.data?.length === 0 ? (
          <div className="text-xs text-text-muted font-mono py-8 text-center">
            No test plans configured yet. Use the builder above to save your first plan.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {testPlansQuery.data?.map((plan) => (
              <div
                key={plan.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-xs text-text-primary">{plan.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-signal-indigo/10 text-signal-indigo border border-signal-indigo/20">
                      {plan.profile}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted font-mono">
                    {plan.loadProfile?.virtualUsers || 10} VUs · {plan.loadProfile?.durationSeconds || 60}s · {plan.scenarios?.length || 1} route(s) · p95 &lt; {plan.thresholds?.maxP95Ms || 1500}ms
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(plan)}
                    className="p-2 rounded-xl bg-[var(--white-fill-sm)] hover:bg-[var(--white-fill-md)] text-text-muted hover:text-text-primary border border-[var(--border)] transition cursor-pointer"
                    title="Edit Plan"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setPlanToDelete({ id: plan.id, name: plan.name })}
                    className="p-2 rounded-xl bg-[var(--white-fill-sm)] hover:bg-signal-rose/10 hover:text-signal-rose hover:border-signal-rose/30 text-text-muted border border-[var(--border)] transition cursor-pointer"
                    title="Remove Plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleRunExistingPlan(plan.id)}
                    disabled={createRunMutation.isPending}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-signal-indigo hover:bg-signal-indigo-hover text-white transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Run</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Deletion Modal */}
      {planToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setPlanToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-ink-900 border border-signal-rose/30 p-6 space-y-5 shadow-2xl text-text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-signal-rose/10 border border-signal-rose/25 flex items-center justify-center text-signal-rose shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary text-base">Remove Test Plan?</h3>
                  <p className="text-xs text-text-muted">Historical run reports will be preserved.</p>
                </div>
              </div>
              <button
                onClick={() => setPlanToDelete(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-ink-950 border border-[var(--border)] text-xs font-mono font-semibold text-text-primary">
              {planToDelete.name}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setPlanToDelete(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[var(--white-fill-sm)] hover:bg-[var(--white-fill-md)] text-text-primary border border-[var(--border)] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeletePlan}
                disabled={deletePlanMutation.isPending}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-signal-rose hover:bg-signal-rose/90 text-white transition cursor-pointer"
              >
                {deletePlanMutation.isPending ? "Removing..." : "Remove Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
