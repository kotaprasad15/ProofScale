import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "./utils/trpc";
import { Layout } from "./components/Layout";
import { OnboardingView } from "./components/OnboardingView";
import { OrganizationSettingsView } from "./components/OrganizationSettingsView";
import { TargetRegistrationView } from "./components/TargetRegistrationView";
import { TestPlanBuilderView } from "./components/TestPlanBuilderView";
import { LiveRunMonitorView } from "./components/LiveRunMonitorView";
import { ReportDetailView } from "./components/ReportDetailView";
import { RunComparisonView } from "./components/RunComparisonView";
import { Shield, Play, Target, CheckCircle2, FileText, AlertTriangle, Users, Lock } from "lucide-react";

function DashboardOverview({
  onNavigate,
  isTester
}: {
  onNavigate: (tab: string) => void;
  isTester: boolean;
}) {
  const healthQuery = trpc.system.health.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-indigo-500/20 shadow-xl flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Application Readiness Dashboard</h2>
          <p className="text-sm text-slate-400">
            {isTester
              ? "Execute approved test scenarios, monitor load validation checks, and inspect empirical report evidence."
              : "Define authorized test scenarios, configure load presets, manage members, and generate evidence-backed reports."}
          </p>
        </div>

        {!isTester && (
          <button
            onClick={() => onNavigate("plans")}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
          >
            <Play className="h-4 w-4" />
            <span>New Test Plan</span>
          </button>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-medium">System Status</span>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="text-lg font-bold text-white">
              {healthQuery.data?.status === "ok" ? "Operational" : "Connecting..."}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">API Port 3001 | Engine v1</p>
        </div>

        <div
          className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 cursor-pointer hover:border-slate-700"
          onClick={() => onNavigate(isTester ? "runs" : "targets")}
        >
          <span className="text-xs text-slate-400 font-medium">Registered Targets</span>
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-indigo-400" />
            <span className="text-lg font-bold text-white">1 Verified Endpoint</span>
          </div>
          <p className="text-[11px] text-slate-500">http://localhost:4000</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Active Projects</span>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-purple-400" />
            <span className="text-lg font-bold text-white">
              {projectsQuery.data?.length || 1} Project
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Staging Environment</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 cursor-pointer hover:border-slate-700" onClick={() => onNavigate("reports")}>
          <span className="text-xs text-slate-400 font-medium">Latest Readiness Score</span>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-amber-400" />
            <span className="text-lg font-bold text-amber-400">100 / 100</span>
          </div>
          <p className="text-[11px] text-slate-500">Ready</p>
        </div>
      </div>

      {/* Projects Overview List */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-lg font-bold text-white">Projects in Active Organization</h3>

        {projectsQuery.isLoading ? (
          <div className="p-4 text-sm text-slate-400">Loading projects...</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {projectsQuery.data?.map(proj => (
              <div key={proj.id} className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-200">{proj.name}</h4>
                  <p className="text-xs text-slate-400">{proj.description}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-mono">
                    {proj.environment}
                  </span>
                  <button
                    onClick={() => onNavigate(isTester ? "runs" : "plans")}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
                  >
                    {isTester ? "View Runs" : "View Test Plans"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assessment Disclaimer Notice */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-3 text-xs text-amber-300/90">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-300 block mb-0.5">Assessment Platform Disclaimer</span>
          ProofScale provides conditional readiness scores based on synthetic load test envelopes. Results reflect observed metrics under specific test parameters and do not serve as a legal guarantee or warranty of live user capacity.
        </div>
      </div>
    </div>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState("projects");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("org_default_01");
  const projectId = "proj_demo_01";

  const meQuery = trpc.auth.me.useQuery();
  const selectWorkspaceMutation = trpc.auth.selectWorkspace.useMutation();

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    setActiveTab("reports");
  };

  const handleSelectOrg = async (orgId: string) => {
    setSelectedOrgId(orgId);
    await selectWorkspaceMutation.mutateAsync({ organizationId: orgId });
    meQuery.refetch();
  };

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sm text-slate-400">
        Resolving user session & permissions...
      </div>
    );
  }

  // Redirect first-time users to Onboarding
  if (meQuery.data?.user?.onboardingStatus === "required") {
    return <OnboardingView onComplete={() => meQuery.refetch()} />;
  }

  const authData = meQuery.data;
  const isTester = authData?.orgRole === "tester" || authData?.projectRole === "tester";

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={tab => { setSelectedRunId(null); setActiveTab(tab); }}
      organizations={authData?.organizations || []}
      activeOrgId={selectedOrgId || authData?.activeOrganizationId}
      orgRole={authData?.orgRole}
      permissions={authData?.permissions}
      userEmail={authData?.user?.email || "lead@acme.dev"}
      onSelectOrg={handleSelectOrg}
    >
      {activeTab === "projects" && <DashboardOverview onNavigate={setActiveTab} isTester={isTester} />}
      {activeTab === "targets" && <TargetRegistrationView projectId={projectId} />}
      {activeTab === "plans" && <TestPlanBuilderView projectId={projectId} onPlanCreated={() => setActiveTab("runs")} />}
      {activeTab === "runs" && <LiveRunMonitorView projectId={projectId} onSelectRun={handleSelectRun} />}
      {activeTab === "organization" && <OrganizationSettingsView organizationId={selectedOrgId || "org_default_01"} />}
      {activeTab === "reports" && (
        selectedRunId ? (
          <ReportDetailView runId={selectedRunId} onBack={() => setSelectedRunId(null)} />
        ) : (
          <RunComparisonView projectId={projectId} />
        )
      )}
      {activeTab === "settings" && (
        <div className="max-w-4xl mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-xl font-bold text-white">System Settings</h2>
          <p className="text-xs text-slate-400">Manage Control Plane settings, user profile, and session information.</p>
          <div className="p-4 rounded-xl bg-slate-800/60 text-xs text-slate-300 space-y-2">
            <div>Authenticated User: <span className="font-mono text-indigo-400">{authData?.user?.email}</span></div>
            <div>Active Organization: <span className="font-mono text-indigo-400">{authData?.organizations.find(o => o.id === selectedOrgId)?.name || "Acme Engineering Corp"}</span></div>
            <div>Organization Role: <span className="font-mono text-purple-400 uppercase font-bold">{authData?.orgRole || "Member"}</span></div>
            <div>Scoring Engine: <span className="font-mono text-indigo-400">mvp-1</span></div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/trpc",
          headers() {
            return {
              "x-user-id": "usr_admin_01",
              "x-user-email": "lead@acme.dev",
              "x-organization-id": "org_default_01"
            };
          }
        })
      ]
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MainApp />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
