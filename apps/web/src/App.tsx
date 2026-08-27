import React, { useState, useEffect, useCallback } from "react";
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
import { LoadingDots } from "./components/LoadingDots";
import { Shield, Play, Target, CheckCircle2, FileText, AlertTriangle, Users, LogOut, ArrowRight, Activity, Home } from "lucide-react";

interface SessionUser {
  id: string;
  email: string;
  organizationId?: string;
}

interface RouteState {
  path: string;
  tab: string;
  runId: string | null;
  planId: string | null;
}

function parseLocationToRoute(): RouteState {
  const pathname = window.location.pathname || "/";
  const searchParams = new URLSearchParams(window.location.search);
  const runId = searchParams.get("runId");
  const planId = searchParams.get("planId");

  if (pathname === "/" || pathname === "/home") {
    return { path: "/home", tab: "projects", runId: null, planId: null };
  }
  if (pathname === "/signin") {
    return { path: "/signin", tab: "projects", runId: null, planId: null };
  }
  if (pathname === "/signup") {
    return { path: "/signup", tab: "projects", runId: null, planId: null };
  }

  const cleanTab = pathname.replace("/", "");
  const validTabs = ["projects", "targets", "plans", "runs", "reports", "organization", "settings"];
  const tab = cleanTab === "dashboard" || !validTabs.includes(cleanTab) ? "projects" : cleanTab;

  return {
    path: pathname,
    tab,
    runId,
    planId
  };
}

function DashboardOverview({
  projectId,
  onNavigate,
  isTester
}: {
  projectId: string;
  onNavigate: (tab: string) => void;
  isTester: boolean;
}) {
  const healthQuery = trpc.system.health.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();
  const targetsQuery = trpc.targets.listByProject.useQuery({ projectId });
  const runsQuery = trpc.runs.listByProject.useQuery({ projectId });

  const completedRuns = runsQuery.data?.filter(r => r.status === "completed") || [];
  const latestRun = completedRuns[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Application Readiness Dashboard</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-signal-indigo-soft text-signal-indigo border border-signal-indigo/30">
              Active Workspace
            </span>
          </div>
          <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
            {isTester
              ? "Execute approved test scenarios, monitor real-time worker telemetry, and inspect empirical report evidence."
              : "Define authorized test scenarios, configure load presets, manage members, and generate evidence-backed reports."}
          </p>
        </div>

        {!isTester && (
          <button
            onClick={() => onNavigate("plans")}
            className="btn-solid-primary shrink-0 cursor-pointer"
          >
            <Play className="h-4 w-4" />
            <span>New Test Plan</span>
          </button>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 space-y-2">
          <span className="text-[10px] text-text-muted font-mono font-bold uppercase tracking-wider block">Engine Status</span>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-signal-teal" />
            <span className="text-lg font-bold text-text-primary">
              {healthQuery.data?.status === "ok" ? "Operational" : "Connecting..."}
            </span>
          </div>
          <p className="text-[11px] font-mono text-text-muted">Port 3001 · Engine v1</p>
        </div>

        <div
          className="glass-panel p-5 space-y-2 cursor-pointer hover:border-signal-indigo/40 transition"
          onClick={() => onNavigate(isTester ? "runs" : "targets")}
        >
          <span className="text-[10px] text-text-muted font-mono font-bold uppercase tracking-wider block">Registered Targets</span>
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-signal-indigo" />
            <span className="text-lg font-bold text-text-primary">
              {targetsQuery.data?.length || 0} Target{targetsQuery.data?.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-[11px] font-mono text-text-muted truncate">
            {targetsQuery.data?.[0]?.baseUrl || "Configure target URL"}
          </p>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <span className="text-[10px] text-text-muted font-mono font-bold uppercase tracking-wider block">Active Projects</span>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-purple-400" />
            <span className="text-lg font-bold text-text-primary">
              {projectsQuery.data?.length || 1} Project
            </span>
          </div>
          <p className="text-[11px] font-mono text-text-muted">Staging Environment</p>
        </div>

        <div
          className="glass-panel p-5 space-y-2 cursor-pointer hover:border-signal-teal/40 transition"
          onClick={() => onNavigate("reports")}
        >
          <span className="text-[10px] text-text-muted font-mono font-bold uppercase tracking-wider block">Latest Readiness Score</span>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-signal-teal" />
            <span className="text-lg font-bold text-signal-teal font-mono">
              {latestRun?.score !== undefined && latestRun?.score !== null ? `${latestRun.score} / 100` : "100 / 100"}
            </span>
          </div>
          <p className="text-[11px] font-semibold text-signal-teal flex items-center">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {latestRun?.readinessLabel ? `Status: ${latestRun.readinessLabel}` : "Passes SLA Thresholds"}
          </p>
        </div>
      </div>

      {/* Projects Overview List */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Projects in Active Organization</h3>
            <p className="text-xs text-text-muted">Configured targets, active test scenarios, and run archives</p>
          </div>
          <span className="text-xs font-mono font-bold text-text-muted px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
            {projectsQuery.data?.length || 1} Total
          </span>
        </div>

        {projectsQuery.isLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingDots size="sm" label="Loading projects..." />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {projectsQuery.data?.map(proj => (
              <div key={proj.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-text-primary text-sm">{proj.name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-signal-indigo-soft text-signal-indigo font-mono border border-signal-indigo/30">
                      {proj.environment}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">{proj.description}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onNavigate(isTester ? "runs" : "plans")}
                    className="btn-glass-secondary text-xs py-2 px-3.5 cursor-pointer"
                  >
                    <span>{isTester ? "View Runs" : "Configure Plans"}</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assessment Disclaimer Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-signal-amber-soft border border-signal-amber/30 flex items-start space-x-3 text-xs text-signal-amber leading-relaxed font-mono">
        <AlertTriangle className="h-5 w-5 text-signal-amber shrink-0 mt-0.5" />
        <div>
          <strong className="text-text-primary block mb-0.5 uppercase tracking-wide">Platform Assessment Disclaimer</strong>
          Ratecap provides conditional readiness scores based on synthetic load test envelopes. Results reflect observed metrics under specific test parameters and do not serve as a legal guarantee or warranty of live user capacity.
        </div>
      </div>
    </div>
  );
}

function MainApp({
  currentUser,
  route,
  onNavigate,
  onLogout,
  onGoHome
}: {
  currentUser: SessionUser;
  route: RouteState;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  onGoHome: () => void;
}) {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(currentUser.organizationId || null);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false
  });
  const projectsQuery = trpc.projects.list.useQuery();
  const selectWorkspaceMutation = trpc.auth.selectWorkspace.useMutation();

  const handleSelectRun = (runId: string) => {
    onNavigate(`/reports?runId=${runId}`);
  };

  const handleBackFromReport = () => {
    onNavigate("/reports");
  };

  const handleTabChange = (tab: string) => {
    onNavigate(`/${tab}`);
  };

  const handleSelectOrg = async (orgId: string) => {
    setSelectedOrgId(orgId);
    await selectWorkspaceMutation.mutateAsync({ organizationId: orgId });
    meQuery.refetch();
    projectsQuery.refetch();
  };

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen bg-ink-950 text-text-primary flex flex-col items-center justify-center font-sans space-y-4">
        <LoadingDots size="lg" label="Resolving user session & permissions..." />
      </div>
    );
  }

  if (meQuery.isError) {
    return (
      <div className="min-h-screen bg-ink-950 text-text-primary flex flex-col items-center justify-center p-6 font-sans">
        <div className="glass-panel max-w-md w-full p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-signal-rose-soft border border-signal-rose/30 flex items-center justify-center text-signal-rose mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Unable to Resolve Session</h2>
          <p className="text-xs text-text-muted leading-relaxed">
            {meQuery.error?.message || "There was a problem communicating with the Ratecap API server."}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => meQuery.refetch()}
              className="btn-solid-primary flex-1 justify-center cursor-pointer"
            >
              Retry Session
            </button>
            <button
              onClick={onLogout}
              className="btn-glass-secondary flex-1 justify-center cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const authData = meQuery.data;
  const isFirstTime = authData?.user?.onboardingStatus === "required" || (authData?.organizations && authData.organizations.length === 0);

  if (isFirstTime) {
    return <OnboardingView onComplete={() => meQuery.refetch()} />;
  }

  const isTester = authData?.orgRole === "tester" || authData?.projectRole === "tester";
  const activeTab = route.tab;

  // Dynamically resolve active project ID
  const projectId = authData?.activeProjectId || authData?.projects?.[0]?.id || projectsQuery.data?.[0]?.id || "proj_demo_01";

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      organizations={authData?.organizations || []}
      activeOrgId={selectedOrgId || authData?.activeOrganizationId}
      orgRole={authData?.orgRole}
      permissions={authData?.permissions}
      userEmail={authData?.user?.email || currentUser.email}
      onSelectOrg={handleSelectOrg}
      onLogout={onLogout}
      onGoHome={onGoHome}
    >
      {activeTab === "projects" && <DashboardOverview projectId={projectId} onNavigate={handleTabChange} isTester={isTester} />}
      {activeTab === "targets" && <TargetRegistrationView projectId={projectId} />}
      {activeTab === "plans" && (
        <TestPlanBuilderView
          projectId={projectId}
          initialPlanId={route.planId || undefined}
          onPlanCreated={() => onNavigate("/runs")}
          onLaunchRun={() => onNavigate("/runs")}
        />
      )}
      {activeTab === "runs" && (
        <LiveRunMonitorView
          projectId={projectId}
          onSelectRun={handleSelectRun}
          onNavigateToBuilder={(planId) => onNavigate(planId ? `/plans?planId=${planId}` : "/plans")}
        />
      )}
      {activeTab === "organization" && <OrganizationSettingsView organizationId={selectedOrgId || authData?.activeOrganizationId || "org_default_01"} />}
      {activeTab === "reports" && (
        route.runId ? (
          <ReportDetailView runId={route.runId} onBack={handleBackFromReport} />
        ) : (
          <RunComparisonView projectId={projectId} />
        )
      )}
      {activeTab === "settings" && (
        <div className="max-w-4xl mx-auto glass-panel p-6 sm:p-8 space-y-6 pb-12">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Account & System Settings</h2>
              <p className="text-xs text-text-muted mt-0.5">Manage Control Plane settings, user profile, and active session.</p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 h-9 bg-signal-rose-soft hover:bg-signal-rose/20 text-signal-rose text-xs font-semibold rounded-xl border border-signal-rose/30 transition inline-flex items-center space-x-1.5 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-ink-950/80 border border-white/[0.06] text-xs space-y-3 font-mono">
            <div className="flex justify-between py-1 border-b border-white/[0.04]">
              <span className="text-text-muted">Authenticated User:</span>
              <span className="text-signal-indigo font-bold">{authData?.user?.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/[0.04]">
              <span className="text-text-muted">Display Name:</span>
              <span className="text-text-primary font-medium">{authData?.user?.displayName || "Not set"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/[0.04]">
              <span className="text-text-muted">Active Organization:</span>
              <span className="text-signal-indigo font-bold">
                {authData?.organizations?.find(o => o.id === (selectedOrgId || authData?.activeOrganizationId))?.name || "None"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/[0.04]">
              <span className="text-text-muted">Organization Role:</span>
              <span className="text-purple-300 font-bold uppercase">{authData?.orgRole || "Member"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-muted">Scoring Engine:</span>
              <span className="text-signal-teal font-bold">mvp-1 (Deterministic)</span>
            </div>
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

  const [route, setRoute] = useState<RouteState>(() => parseLocationToRoute());

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1
      }
    }
  }));

  const [trpcClient] = useState(() =>
  trpc.createClient({
    links: [
      httpBatchLink({
        url: import.meta.env.VITE_API_URL
          ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/trpc`
          : "/trpc",
        headers() {
          const saved = localStorage.getItem("ps_session_user");
          const user = saved ? JSON.parse(saved) : null;
          if (!user) return {};
          return {
            "x-user-id": user.id,
            "x-user-email": user.email,
            ...(user.organizationId ? { "x-organization-id": user.organizationId } : {})
          };
        }
      })
    ]
  })
);

  // Browser Back / Forward button support (popstate listener)
  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseLocationToRoute());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = useCallback((newPath: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState(null, "", newPath);
    } else {
      window.history.pushState(null, "", newPath);
    }
    setRoute(parseLocationToRoute());
  }, []);

  const handleLogin = (user: SessionUser) => {
    localStorage.setItem("ps_session_user", JSON.stringify(user));
    setCurrentUser(user);
    queryClient.invalidateQueries();
    navigateTo("/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("ps_session_user");
    setCurrentUser(null);
    queryClient.clear();
    navigateTo("/home");
  };

  const isPublicRoute = route.path === "/home" || route.path === "/" || route.path === "/signin" || route.path === "/signup";

  if (!currentUser || isPublicRoute) {
    if (route.path === "/signin" || route.path === "/signup") {
      return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <LoginView
              initialMode={route.path === "/signup" ? "signup" : "signin"}
              onBackToHome={() => navigateTo("/home")}
              onLogin={handleLogin}
            />
          </QueryClientProvider>
        </trpc.Provider>
      );
    }

    // Default to Landing Homepage
    return (
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <HomeView
            onSignIn={() => navigateTo("/signin")}
            onSignUp={() => navigateTo("/signup")}
            isLoggedIn={!!currentUser}
            onGoToDashboard={() => navigateTo("/dashboard")}
          />
        </QueryClientProvider>
      </trpc.Provider>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <MainApp
          currentUser={currentUser}
          route={route}
          onNavigate={navigateTo}
          onLogout={handleLogout}
          onGoHome={() => navigateTo("/home")}
        />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
