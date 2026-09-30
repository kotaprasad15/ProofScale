import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Shield,
  ShieldCheck,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
  RotateCcw,
  Globe,
  Layers,
  Clock,
  Zap,
  Activity
} from "lucide-react";
import { TestPlan, TestRequest, TEST_EXEC_LIMITS, PlanEnvironment } from "@proofscale/shared";
import { LoadingDots } from "./LoadingDots";
import { testExecApi } from "../utils/api";

interface TestPlanBuilderViewProps {
  projectId: string;
  initialPlanId?: string;
  onPlanCreated?: (planId: string) => void;
  onLaunchRun?: (runId: string) => void;
}

/** Local editable form state for one request row. */
interface RequestDraft {
  id: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query: string; // "key=value" pairs, one per line
  headers: string; // "Name: value" pairs, one per line
  body: string; // optional JSON body
  enabled: boolean;
}

function newRequestDraft(index: number): RequestDraft {
  return {
    id: `req_${Math.random().toString(36).slice(2, 10)}`,
    name: `Request ${index + 1}`,
    method: "GET",
    path: "/api/v1/resource",
    query: "",
    headers: "",
    body: "",
    enabled: true
  };
}

/** Parses "Key: value" lines into a header/query record. Returns error text on malformed lines. */
function parsePairs(text: string): { record: Record<string, string> | null; error: string | null } {
  if (!text.trim()) return { record: undefined, error: null };
  const record: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    const eqIdx = trimmed.indexOf("=");
    const sep = idx > 0 && (eqIdx < 0 || idx < eqIdx) ? ":" : "=";
    if (sep === ":" ? idx <= 0 : eqIdx <= 0) {
      return { record: null, error: `Invalid line: '${trimmed.slice(0, 40)}' (expected "Name: value")` };
    }
    const k = trimmed.slice(0, trimmed.indexOf(sep)).trim();
    const v = trimmed.slice(trimmed.indexOf(sep) + 1).trim();
    if (!k) return { record: null, error: `Missing name in line: '${trimmed.slice(0, 40)}'` };
    record[k] = v;
  }
  return { record, error: null };
}

export function TestPlanBuilderView({
  projectId,
  initialPlanId,
  onPlanCreated,
  onLaunchRun
}: TestPlanBuilderViewProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPlanStatus, setEditingPlanStatus] = useState<string>("draft");
  const [planToDelete, setPlanToDelete] = useState<{ id: string; name: string } | null>(null);
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Form state
  const [name, setName] = useState("Checkout API Baseline Check");
  const [targetBaseUrl, setTargetBaseUrl] = useState("https://");
  const [environment, setEnvironment] = useState<PlanEnvironment>("staging");
  const [requests, setRequests] = useState<RequestDraft[]>([
    { ...newRequestDraft(0), name: "List Products", path: "/api/v1/products" },
    { ...newRequestDraft(1), name: "Place Order", method: "POST", path: "/api/v1/orders", body: '{ "total": 299 }' }
  ]);
  const [virtualUsers, setVirtualUsers] = useState(5);
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [maxRequestsPerSecond, setMaxRequestsPerSecond] = useState(50);
  const [requestTimeoutMs, setRequestTimeoutMs] = useState(5000);
  const [p95LatencyMs, setP95LatencyMs] = useState(1500);
  const [maxErrorRatePercent, setMaxErrorRatePercent] = useState(2);
  const [minRps, setMinRps] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPlans = React.useCallback(async () => {
    try {
      const { plans } = await testExecApi.listPlans(projectId);
      setPlans((plans || []).filter(p => p.status !== "archived"));
    } catch {
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Auto-load plan into editing state when initialPlanId is passed
  useEffect(() => {
    if (initialPlanId && plans.length > 0) {
      const plan = plans.find(p => p.id === initialPlanId);
      if (plan) handleStartEdit(plan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlanId, plans]);

  const updateRequest = (index: number, patch: Partial<RequestDraft>) => {
    setRequests(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const moveRequest = (index: number, dir: -1 | 1) => {
    setRequests(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleStartEdit = (plan: TestPlan) => {
    setEditingPlanId(plan.id);
    setEditingPlanStatus(plan.status);
    setName(plan.name);
    setTargetBaseUrl(plan.targetBaseUrl);
    setEnvironment(plan.environment);
    setRequests(
      plan.requests.map((r, i) => ({
        id: r.id || newRequestDraft(i).id,
        name: r.name,
        method: r.method,
        path: r.path,
        query: Object.entries(r.query || {})
          .map(([k, v]) => `${k}=${v}`)
          .join("\n"),
        headers: Object.entries(r.headers || {})
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n"),
        body: r.body !== undefined && r.body !== null ? (typeof r.body === "string" ? r.body : JSON.stringify(r.body, null, 2)) : "",
        enabled: r.enabled
      }))
    );
    setVirtualUsers(plan.virtualUsers);
    setDurationSeconds(plan.durationSeconds);
    setMaxRequestsPerSecond(plan.maxRequestsPerSecond);
    setRequestTimeoutMs(plan.requestTimeoutMs);
    setP95LatencyMs(plan.thresholds.p95LatencyMs ?? 1500);
    setMaxErrorRatePercent(plan.thresholds.maxErrorRatePercent ?? 2);
    setMinRps(plan.thresholds.minRequestsPerSecond !== undefined ? String(plan.thresholds.minRequestsPerSecond) : "");
    setErrorMsg(null);
    setSuccessMsg(`Loaded plan '${plan.name}' (status: ${plan.status}).`);
    setActiveStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingPlanId(null);
    setEditingPlanStatus("draft");
    setErrorMsg(null);
    setSuccessMsg(null);
    setActiveStep(0);
  };

  /** Builds the API payload from form state; returns { payload, error }. */
  const buildPayload = () => {
    if (!name.trim() || name.trim().length < 2) return { error: "Plan name must be at least 2 characters." };
    if (!targetBaseUrl.trim()) return { error: "Target base URL is required." };

    const parsedRequests: TestRequest[] = [];
    for (let i = 0; i < requests.length; i++) {
      const r = requests[i];
      if (!r.path.startsWith("/")) {
        return { error: `Request ${i + 1}: path must start with '/' (e.g. /api/v1/resource).` };
      }
      const query = parsePairs(r.query);
      if (query.error) return { error: `Request ${i + 1} query: ${query.error}` };
      const headers = parsePairs(r.headers);
      if (headers.error) return { error: `Request ${i + 1} headers: ${headers.error}` };
      if (r.headers.toLowerCase().includes("authorization") || r.headers.toLowerCase().includes("cookie")) {
        return { error: `Request ${i + 1}: Authorization/Cookie headers are not allowed in test plans (security policy).` };
      }

      let body: unknown = undefined;
      if (r.body.trim()) {
        try {
          body = JSON.parse(r.body);
        } catch {
          return { error: `Request ${i + 1}: body must be valid JSON.` };
        }
      }

      parsedRequests.push({
        id: r.id,
        name: r.name.trim() || `Request ${i + 1}`,
        method: r.method,
        path: r.path.trim(),
        headers: headers.record,
        query: query.record,
        body,
        enabled: r.enabled
      });
    }

    return {
      payload: {
        projectId,
        name: name.trim(),
        targetBaseUrl: targetBaseUrl.trim(),
        environment,
        durationSeconds,
        virtualUsers,
        maxRequestsPerSecond,
        requestTimeoutMs,
        requests: parsedRequests,
        thresholds: {
          p95LatencyMs,
          maxErrorRatePercent,
          ...(minRps.trim() ? { minRequestsPerSecond: parseFloat(minRps) } : {})
        }
      }
    };
  };

  const handleSave = async (): Promise<string | null> => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const built = buildPayload();
    if ("error" in built && built.error) {
      setErrorMsg(built.error);
      return null;
    }
    const payload = (built as any).payload;

    setSaving(true);
    try {
      if (editingPlanId) {
        const { plan } = await testExecApi.updatePlan(editingPlanId, payload);
        setSuccessMsg(`Plan '${plan.name}' saved (status: ${plan.status}). Approve it before running.`);
        setEditingPlanStatus(plan.status);
        return plan.id;
      } else {
        const { plan } = await testExecApi.createPlan(payload);
        setSuccessMsg(`Plan '${plan.name}' created as draft. Approve it to enable runs.`);
        setEditingPlanId(plan.id);
        setEditingPlanStatus(plan.status);
        return plan.id;
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save test plan.");
      return null;
    } finally {
      setSaving(false);
      loadPlans();
    }
  };

  const handleApprove = async () => {
    if (!editingPlanId) return;
    setErrorMsg(null);
    try {
      const { plan } = await testExecApi.approvePlan(editingPlanId);
      setEditingPlanStatus(plan.status);
      setSuccessMsg(`Plan '${plan.name}' approved. You can now start runs.`);
      loadPlans();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to approve plan.");
    }
  };

  const handleStartRun = async () => {
    setErrorMsg(null);
    const savedId = editingPlanId || (await handleSave());
    if (!savedId) return;

    // Ensure approved before running.
    if (editingPlanStatus !== "approved") {
      try {
        await testExecApi.approvePlan(savedId);
      } catch (err: any) {
        setErrorMsg(`Plan must be approved before running: ${err?.message || "approval failed"}`);
        return;
      }
    }

    const needsConfirm = environment === "production";
    let confirmed = needsConfirm
      ? window.confirm(
          "PRODUCTION TEST CONFIRMATION\n\nYou are about to execute real load against a PRODUCTION target. This generates server-side traffic and may impact users.\n\nProceed?"
        )
      : true;
    if (needsConfirm && !confirmed) {
      setErrorMsg("Production run cancelled: explicit confirmation is required.");
      return;
    }

    try {
      const { runId } = await testExecApi.startRun(savedId, needsConfirm);
      setSuccessMsg(`Run '${runId}' queued. Track live progress in Test Execution.`);
      if (onLaunchRun) onLaunchRun(runId);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to start test run.");
    }
  };

  const handleRunExistingPlan = async (plan: TestPlan) => {
    setErrorMsg(null);
    if (plan.status !== "approved") {
      setErrorMsg(`Plan '${plan.name}' is ${plan.status}. Only approved plans can run.`);
      return;
    }
    const needsConfirm = plan.environment === "production";
    if (needsConfirm && !window.confirm(`Execute a PRODUCTION test run against ${plan.targetBaseUrl}?`)) return;
    try {
      const { runId } = await testExecApi.startRun(plan.id, needsConfirm);
      setSuccessMsg(`Run '${runId}' queued.`);
      if (onLaunchRun) onLaunchRun(runId);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to start run.");
    }
  };

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;
    setErrorMsg(null);
    try {
      // Archive (not hard delete) to preserve run history linkage.
      await testExecApi.updatePlan(planToDelete.id, { archive: true });
      setSuccessMsg(`Plan '${planToDelete.name}' archived.`);
      setPlanToDelete(null);
      loadPlans();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to archive plan.");
      setPlanToDelete(null);
    }
  };

  const enabledCount = requests.filter(r => r.enabled).length;

  const stepsList = [
    { label: "1. Configure", subtitle: "Name, target & environment" },
    { label: "2. Requests", subtitle: "Ordered HTTP sequence" },
    { label: "3. Workload & SLA", subtitle: "VUs, rate, duration" },
    { label: "4. Review & Run", subtitle: "Approve & dispatch" }
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-signal-amber-soft text-signal-amber border-signal-amber/30",
      approved: "bg-signal-teal-soft text-signal-teal border-signal-teal/30",
      archived: "bg-white/[0.06] text-text-muted border-white/[0.08]"
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${map[status] || map.draft}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Validation Test Plans</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--white-fill-sm)] text-text-muted border border-[var(--border)]">
              {plans.length} Configured
            </span>
          </div>
          <p className="text-sm text-text-muted">
            Save ordered HTTP request sequences, define the workload envelope, and declare SLA thresholds. All traffic is
            generated by the ProofScale backend worker — never your browser.
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

        {/* STEP 1: CONFIGURE */}
        {activeStep === 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Plan Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Checkout Service Baseline"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] focus:border-signal-indigo text-xs font-medium text-text-primary outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Environment *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["staging", "production"] as PlanEnvironment[]).map(env => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setEnvironment(env)}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer capitalize ${
                        environment === env
                          ? env === "production"
                            ? "bg-signal-rose/10 border-signal-rose text-signal-rose"
                            : "bg-signal-indigo/10 border-signal-indigo text-signal-indigo"
                          : "bg-[var(--white-fill-sm)] border-[var(--border)] text-text-muted"
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                Target Base URL * (must be pre-authorized)
              </label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-signal-indigo shrink-0" />
                <input
                  type="text"
                  value={targetBaseUrl}
                  onChange={e => setTargetBaseUrl(e.target.value)}
                  placeholder="https://staging-api.yourcompany.com"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] focus:border-signal-indigo text-xs font-mono text-text-primary outline-none transition"
                />
              </div>
              <p className="text-[11px] font-mono text-text-faint mt-1.5">
                Remote targets must use HTTPS. Plain HTTP is allowed only for localhost development. Embedded
                credentials and private network IPs are rejected (SSRF protection).
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setActiveStep(1)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-signal-indigo hover:bg-signal-indigo-hover text-white transition cursor-pointer flex items-center gap-2"
              >
                <span>Continue to Requests</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REQUEST SEQUENCE */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Request Sequence</h3>
                <p className="text-xs text-text-muted">
                  Requests execute in the saved order, repeated by every virtual user until the duration ends
                  ({enabledCount} of {requests.length} enabled)
                </p>
              </div>
              <button
                onClick={() => setRequests([...requests, newRequestDraft(requests.length)])}
                disabled={requests.length >= TEST_EXEC_LIMITS.MAX_REQUESTS_PER_PLAN}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--white-fill-sm)] hover:bg-[var(--white-fill-md)] text-signal-indigo border border-signal-indigo/30 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Request ({requests.length}/{TEST_EXEC_LIMITS.MAX_REQUESTS_PER_PLAN})</span>
              </button>
            </div>

            <div className="space-y-3">
              {requests.map((req, idx) => (
                <div
                  key={req.id}
                  className={`p-4 rounded-xl bg-[var(--white-fill-sm)] border space-y-3 ${
                    req.enabled ? "border-[var(--border)]" : "border-[var(--border)] opacity-55"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-faint w-6">{idx + 1}.</span>
                    <input
                      type="text"
                      value={req.name}
                      onChange={e => updateRequest(idx, { name: e.target.value })}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-ink-900 border border-[var(--border)] text-xs font-semibold text-text-primary outline-none"
                      placeholder="Request name"
                    />
                    <select
                      value={req.method}
                      onChange={e => updateRequest(idx, { method: e.target.value as any })}
                      className="px-2.5 py-1.5 rounded-lg bg-ink-900 border border-[var(--border)] text-xs font-mono text-text-primary outline-none cursor-pointer"
                    >
                      {["GET", "POST", "PUT", "PATCH", "DELETE"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => updateRequest(idx, { enabled: !req.enabled })}
                      title={req.enabled ? "Disable request" : "Enable request"}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        req.enabled
                          ? "bg-signal-teal-soft text-signal-teal border-signal-teal/30"
                          : "bg-[var(--white-fill-sm)] text-text-muted border-[var(--border)]"
                      }`}
                    >
                      {req.enabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRequest(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-[var(--white-fill-sm)] border border-[var(--border)] text-text-muted transition cursor-pointer disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRequest(idx, 1)}
                      disabled={idx === requests.length - 1}
                      className="p-1.5 rounded-lg bg-[var(--white-fill-sm)] border border-[var(--border)] text-text-muted transition cursor-pointer disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (requests.length <= 1) {
                          setErrorMsg("A test plan must contain at least one request.");
                          return;
                        }
                        setRequests(requests.filter((_, i) => i !== idx));
                      }}
                      className="p-1.5 rounded-lg text-text-muted hover:text-signal-rose hover:bg-signal-rose/10 transition cursor-pointer"
                      title="Remove request"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pl-8">
                    <input
                      type="text"
                      value={req.path}
                      onChange={e => updateRequest(idx, { path: e.target.value })}
                      placeholder="/api/v1/resource"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-ink-900 border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-8">
                    <div>
                      <label className="block text-[10px] font-mono text-text-faint uppercase mb-1">
                        Query params (one per line: key=value)
                      </label>
                      <textarea
                        value={req.query}
                        onChange={e => updateRequest(idx, { query: e.target.value })}
                        rows={2}
                        placeholder={"page=1\nlimit=50"}
                        className="w-full px-3 py-1.5 rounded-lg bg-ink-900 border border-[var(--border)] text-xs font-mono text-text-primary outline-none resize-y"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-text-faint uppercase mb-1">
                        Headers (one per line: Name: value) — no Authorization/Cookie
                      </label>
                      <textarea
                        value={req.headers}
                        onChange={e => updateRequest(idx, { headers: e.target.value })}
                        rows={2}
                        placeholder={"X-Correlation-Id: proofscale"}
                        className="w-full px-3 py-1.5 rounded-lg bg-ink-900 border border-[var(--border)] text-xs font-mono text-text-primary outline-none resize-y"
                      />
                    </div>
                  </div>

                  {["POST", "PUT", "PATCH"].includes(req.method) && (
                    <div className="pl-8">
                      <label className="block text-[10px] font-mono text-text-faint uppercase mb-1">
                        JSON Body (optional, max 64KB)
                      </label>
                      <textarea
                        value={req.body}
                        onChange={e => updateRequest(idx, { body: e.target.value })}
                        rows={3}
                        placeholder='{ "total": 299 }'
                        className="w-full px-3 py-1.5 rounded-lg bg-ink-900 border border-[var(--border)] text-xs font-mono text-text-primary outline-none resize-y"
                      />
                    </div>
                  )}
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
                <span>Continue to Workload & SLA</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: WORKLOAD & SLA */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Virtual Users</label>
                <input
                  type="number"
                  min={1}
                  max={TEST_EXEC_LIMITS.MAX_VIRTUAL_USERS}
                  value={virtualUsers}
                  onChange={e => setVirtualUsers(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                />
                <p className="text-[11px] font-mono text-text-faint mt-1">Max {TEST_EXEC_LIMITS.MAX_VIRTUAL_USERS}</p>
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Duration (s)</label>
                <input
                  type="number"
                  min={5}
                  max={TEST_EXEC_LIMITS.MAX_DURATION_SECONDS}
                  value={durationSeconds}
                  onChange={e => setDurationSeconds(parseInt(e.target.value, 10) || 5)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                />
                <p className="text-[11px] font-mono text-text-faint mt-1">Max {TEST_EXEC_LIMITS.MAX_DURATION_SECONDS}s</p>
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Max Requests/sec</label>
                <input
                  type="number"
                  min={1}
                  max={TEST_EXEC_LIMITS.MAX_REQUESTS_PER_SECOND}
                  value={maxRequestsPerSecond}
                  onChange={e => setMaxRequestsPerSecond(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                />
                <p className="text-[11px] font-mono text-text-faint mt-1">Max {TEST_EXEC_LIMITS.MAX_REQUESTS_PER_SECOND} RPS</p>
              </div>
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Timeout (ms)</label>
                <input
                  type="number"
                  min={250}
                  max={TEST_EXEC_LIMITS.MAX_REQUEST_TIMEOUT_MS}
                  step={250}
                  value={requestTimeoutMs}
                  onChange={e => setRequestTimeoutMs(parseInt(e.target.value, 10) || 5000)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                />
                <p className="text-[11px] font-mono text-text-faint mt-1">
                  {(TEST_EXEC_LIMITS.MIN_REQUEST_TIMEOUT_MS / 1000).toFixed(2)}–{TEST_EXEC_LIMITS.MAX_REQUEST_TIMEOUT_MS / 1000}s
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--white-fill-sm)] border border-[var(--border)] space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-text-primary flex items-center gap-2">
                <Shield className="w-4 h-4 text-signal-indigo" />
                <span>SLA Thresholds (evaluated against real measured results)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Max p95 Latency (ms)</label>
                  <input
                    type="number"
                    min={10}
                    value={p95LatencyMs}
                    onChange={e => setP95LatencyMs(parseInt(e.target.value, 10) || 500)}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Max Error Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={maxErrorRatePercent}
                    onChange={e => setMaxErrorRatePercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Min RPS (optional)</label>
                  <input
                    type="number"
                    min={0}
                    value={minRps}
                    onChange={e => setMinRps(e.target.value)}
                    placeholder="not evaluated"
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-[var(--border)] text-xs font-mono text-text-primary outline-none"
                  />
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
                <h3 className="font-semibold text-text-primary text-sm">Execution Specification</h3>
                {editingPlanId ? statusBadge(editingPlanStatus) : statusBadge("draft")}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <span className="text-text-faint text-[10px] uppercase block">Virtual Users</span>
                  <span className="font-bold text-text-primary">{virtualUsers} VUs</span>
                </div>
                <div>
                  <span className="text-text-faint text-[10px] uppercase block">Duration</span>
                  <span className="font-bold text-text-primary">{durationSeconds}s</span>
                </div>
                <div>
                  <span className="text-text-faint text-[10px] uppercase block">Rate Cap</span>
                  <span className="font-bold text-text-primary flex items-center gap-1">
                    <Zap className="w-3 h-3 text-signal-amber" /> {maxRequestsPerSecond} RPS
                  </span>
                </div>
                <div>
                  <span className="text-text-faint text-[10px] uppercase block">SLA p95 Cap</span>
                  <span className="font-bold text-signal-teal">&le; {p95LatencyMs}ms</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)] space-y-1.5">
                <div>
                  <span className="text-text-faint text-[10px] uppercase font-mono block">Target ({environment}):</span>
                  <span className="text-xs font-mono font-bold text-signal-indigo break-all">{targetBaseUrl}</span>
                </div>
                <div>
                  <span className="text-text-faint text-[10px] uppercase font-mono block">
                    Request sequence ({requests.length}):
                  </span>
                  <div className="text-[11px] font-mono text-text-muted space-y-0.5 mt-1">
                    {requests.map((r, i) => (
                      <div key={r.id} className={r.enabled ? "" : "line-through opacity-50"}>
                        {i + 1}. {r.method} {r.path} {!r.enabled && "(disabled)"}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-ink-950 border border-[var(--border)] text-[11px] font-mono text-text-muted">
                Traffic is generated by the ProofScale backend worker, not your browser. Results are computed from
                recorded samples against the thresholds above — no demo values.
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
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--white-fill-sm)] hover:bg-[var(--white-fill-md)] text-text-primary border border-[var(--border)] transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingPlanId ? "Update Plan" : "Save Plan"}
                </button>

                {editingPlanId && editingPlanStatus !== "approved" && (
                  <button
                    type="button"
                    onClick={handleApprove}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-signal-teal-soft hover:bg-signal-teal/20 text-signal-teal border border-signal-teal/30 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Approve Plan</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleStartRun}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-signal-indigo hover:bg-signal-indigo-hover text-white transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Save & Start Run</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Existing Plans List */}
      <div className="rounded-2xl bg-ink-900 border border-[var(--border)] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Layers className="w-4 h-4 text-signal-indigo" />
            <span>Configured Test Plans in Project</span>
          </h3>
          <span className="text-xs font-mono text-text-muted px-2.5 py-0.5 rounded-full bg-[var(--white-fill-sm)] border border-[var(--border)]">
            {plans.length} Total
          </span>
        </div>

        {plansLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingDots size="sm" label="Loading test plans..." />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-xs text-text-muted font-mono py-8 text-center">
            No test plans configured yet. Use the builder above to save your first plan.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {plans.map(plan => (
              <div key={plan.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-semibold text-xs text-text-primary">{plan.name}</span>
                    {statusBadge(plan.status)}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase border ${
                        plan.environment === "production"
                          ? "bg-signal-rose-soft text-signal-rose border-signal-rose/30"
                          : "bg-white/[0.06] text-text-muted border-white/[0.08]"
                      }`}
                    >
                      {plan.environment}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted font-mono truncate">
                    {plan.targetBaseUrl} · {plan.virtualUsers} VUs · {plan.durationSeconds}s ·{" "}
                    {plan.maxRequestsPerSecond} RPS max · p95 &lt; {plan.thresholds.p95LatencyMs ?? "—"}ms
                  </p>
                  <p className="text-[11px] text-text-faint font-mono truncate">
                    {plan.requests.map((r, i) => `${i + 1}. ${r.method} ${r.path}`).join("  →  ")}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
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
                    onClick={() => handleRunExistingPlan(plan)}
                    disabled={plan.status !== "approved"}
                    title={plan.status !== "approved" ? "Only approved plans can run" : "Start run"}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-signal-indigo hover:bg-signal-indigo-hover text-white transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
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
            onClick={e => e.stopPropagation()}
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
              <button onClick={() => setPlanToDelete(null)} className="text-text-muted hover:text-text-primary p-1 rounded-lg">
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
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-signal-rose hover:bg-signal-rose/90 text-white transition cursor-pointer"
              >
                Remove Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
