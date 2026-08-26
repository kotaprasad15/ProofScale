import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "./utils/trpc";
import { Layout } from "./components/Layout";
import { HomeView } from "./components/HomeView";
import { LoginView } from "./components/LoginView";
import { OnboardingView } from "./components/OnboardingView";
import { OrganizationSettingsView } from "./components/OrganizationSettingsView";
import { TargetRegistrationView } from "./components/TargetRegistrationView";
import { TestPlanBuilderView } from "./components/TestPlanBuilderView";
import { LiveRunMonitorView } from "./components/LiveRunMonitorView";
import { ReportDetailView } from "./components/ReportDetailView";
import { RunComparisonView } from "./components/RunComparisonView";
import { PointWave } from "./components/PointWave";
import { LoadingDots } from "./components/LoadingDots";
import { CustomCursor } from "./components/CustomCursor";
import { Shield, Play, Target, CheckCircle2, FileText, AlertTriangle, Users, LogOut, ArrowRight, Gauge, Activity, Server, Lock } from "lucide-react";

interface SessionUser {
  id: string;
  email: string;
  organizationId?: string;
}

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
    <div className="ps-view max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-cardborder shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-ink tracking-tight">Application Readiness Dashboard</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-soft text-brand">
              Active Workspace
            </span>
          </div>
          <p className="text-sm text-ink-muted max-w-2xl">
            {isTester
              ? "Execute approved test scenarios, monitor load validation checks, and inspect empirical report evidence."
              : "Define authorized test scenarios, configure load presets, manage members, and generate evidence-backed reports."}
          </p>
        </div>

        {!isTester && (
          <button
            onClick={() => onNavigate("plans")}
            className="px-5 py-3 bg-brand hover:bg-brand-hover text-white font-bold text-sm rounded-xl transition shadow-brand flex items-center space-x-2 shrink-0 self-start md:self-auto"
          >
            <Play className="h-4 w-4" />
            <span>New Test Plan</span>
          </button>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-cardborder shadow-soft space-y-2">
          <span className="text-xs text-ink-muted font-bold uppercase tracking-wider">Engine Status</span>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="text-lg font-bold text-ink">
              {healthQuery.data?.status === "ok" ? "Operational" : "Connecting..."}
            </span>
          </div>
          <p className="text-[11px] font-mono text-ink-muted">Port 3001 · Engine v1</p>
        </div>

        <div
          className="p-5 rounded-2xl bg-white border border-cardborder shadow-soft space-y-2 cursor-pointer hover:border-brand/40 transition"
          onClick={() => onNavigate(isTester ? "runs" : "targets")}
        >
          <span className="text-xs text-ink-muted font-bold uppercase tracking-wider">Registered Targets</span>
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-brand" />
            <span className="text-lg font-bold text-ink">1 Verified Target</span>
          </div>
          <p className="text-[11px] font-mono text-ink-muted truncate">Staging API (/v2/checkout)</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-cardborder shadow-soft space-y-2">
          <span className="text-xs text-ink-muted font-bold uppercase tracking-wider">Active Projects</span>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <span className="text-lg font-bold text-ink">
              {projectsQuery.data?.length || 1} Project
            </span>
          </div>
          <p className="text-[11px] font-mono text-ink-muted">Staging Environment</p>
        </div>

        <div
          className="p-5 rounded-2xl bg-white border border-cardborder shadow-soft space-y-2 cursor-pointer hover:border-brand/40 transition"
          onClick={() => onNavigate("reports")}
        >
          <span className="text-xs text-ink-muted font-bold uppercase tracking-wider">Latest Readiness Score</span>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            <span className="text-lg font-bold text-emerald-600 font-mono">100 / 100</span>
          </div>
          <p className="text-[11px] font-semibold text-success flex items-center">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Passes SLA Thresholds
          </p>
        </div>
      </div>

      {/* Projects Overview List */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-cardborder shadow-soft space-y-4">
        <div className="flex items-center justify-between border-b border-cardborder pb-4">
          <div>
            <h3 className="text-lg font-bold text-ink">Projects in Active Organization</h3>
            <p className="text-xs text-ink-muted">Configured targets, active test scenarios, and run archives</p>
          </div>
          <span className="text-xs font-mono font-bold text-ink-muted px-2.5 py-1 rounded-full bg-surface-muted border border-cardborder">
            {projectsQuery.data?.length || 1} Total
          </span>
        </div>

        {projectsQuery.isLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingDots size="sm" label="Loading projects..." />
          </div>
        ) : (
          <div className="divide-y divide-cardborder">
            {projectsQuery.data?.map(proj => (
              <div key={proj.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-ink text-sm">{proj.name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-soft text-brand font-mono">
                      {proj.environment}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">{proj.description}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onNavigate(isTester ? "runs" : "plans")}
                    className="px-3.5 py-2 bg-surface-muted hover:bg-slate-200 text-ink text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
                  >
                    <span>{isTester ? "View Runs" : "Configure Plans"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assessment Disclaimer Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-xs text-amber-900 leading-relaxed">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-950 block mb-0.5">Platform Assessment Disclaimer</strong>
          ProofScale provides conditional readiness scores based on synthetic load test envelopes. Results reflect observed metrics under specific test parameters and do not serve as a legal guarantee or warranty of live user capacity.
        </div>
      </div>
    </div>
  );
}

function MainApp({
  currentUser,
  onLogout
}: {
  currentUser: SessionUser;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState("projects");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(currentUser.organizationId || null);
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
      <div className="min-h-screen bg-canvas flex items-center justify-center font-sans">
        <LoadingDots size="lg" label="Resolving user session & permissions..." />
      </div>
    );
  }

  // If user requires onboarding, show Onboarding View
  if (meQuery.data?.user?.onboardingStatus === "required" || meQuery.data?.organizations.length === 0) {
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
      userEmail={authData?.user?.email || currentUser.email}
      onSelectOrg={handleSelectOrg}
      onLogout={onLogout}
    >
      {activeTab === "projects" && <DashboardOverview onNavigate={setActiveTab} isTester={isTester} />}
      {activeTab === "targets" && <TargetRegistrationView projectId={projectId} />}
      {activeTab === "plans" && <TestPlanBuilderView projectId={projectId} onPlanCreated={() => setActiveTab("runs")} />}
      {activeTab === "runs" && <LiveRunMonitorView projectId={projectId} onSelectRun={handleSelectRun} />}
      {activeTab === "organization" && <OrganizationSettingsView organizationId={selectedOrgId || authData?.activeOrganizationId || "org_default_01"} />}
      {activeTab === "reports" && (
        selectedRunId ? (
          <ReportDetailView runId={selectedRunId} onBack={() => setSelectedRunId(null)} />
        ) : (
          <RunComparisonView projectId={projectId} />
        )
      )}
      {activeTab === "settings" && (
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-white border border-cardborder shadow-soft space-y-6">
          <div className="flex items-center justify-between border-b border-cardborder pb-4">
            <div>
              <h2 className="text-xl font-bold text-ink">Account & System Settings</h2>
              <p className="text-xs text-ink-muted">Manage Control Plane settings, user profile, and active session.</p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-danger text-xs font-bold rounded-xl border border-red-200 transition flex items-center space-x-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-surface-muted border border-cardborder text-xs text-ink space-y-3 font-medium">
            <div>Authenticated User: <span className="font-mono text-brand font-bold">{authData?.user?.email}</span></div>
            <div>Display Name: <span className="text-ink font-semibold">{authData?.user?.displayName || "Not set"}</span></div>
            <div>Active Organization: <span className="font-mono text-brand font-bold">{authData?.organizations.find(o => o.id === (selectedOrgId || authData?.activeOrganizationId))?.name || "None"}</span></div>
            <div>Organization Role: <span className="font-mono text-purple-600 uppercase font-bold">{authData?.orgRole || "Member"}</span></div>
            <div>Scoring Engine: <span className="font-mono text-brand">mvp-1 (Deterministic)</span></div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export function App() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() => {
    const saved = localStorage.getItem("ps_session_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [publicView, setPublicView] = useState<"home" | "signin" | "signup">("home");

  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient, setTrpcClient] = useState(() =>
    createTrpcClient(currentUser)
  );

  function createTrpcClient(user: SessionUser | null) {
    return trpc.createClient({
      links: [
        httpBatchLink({
          url: "/trpc",
          headers() {
            if (!user) return {};
            return {
              "x-user-id": user.id,
              "x-user-email": user.email,
              ...(user.organizationId ? { "x-organization-id": user.organizationId } : {})
            };
          }
        })
      ]
    });
  }

  const handleLogin = (user: SessionUser) => {
    localStorage.setItem("ps_session_user", JSON.stringify(user));
    setCurrentUser(user);
    setTrpcClient(createTrpcClient(user));
  };

  const handleLogout = () => {
    localStorage.removeItem("ps_session_user");
    setCurrentUser(null);
    setPublicView("home");
    setTrpcClient(createTrpcClient(null));
  };

  // If not logged in, render Public Homepage or Login/Signup
  if (!currentUser) {
    if (publicView === "home") {
      return (
        <>
          <CustomCursor />
          <HomeView
            onSignIn={() => setPublicView("signin")}
            onSignUp={() => setPublicView("signup")}
          />
        </>
      );
    }

    return (
      <>
        <CustomCursor />
        <LoginView
          initialMode={publicView === "signup" ? "signup" : "signin"}
          onBackToHome={() => setPublicView("home")}
          onLogin={handleLogin}
        />
      </>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <CustomCursor />
        <MainApp currentUser={currentUser} onLogout={handleLogout} />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

