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
import { StatusChip, readinessTone } from "./components/ui/StatusChip";
import { KillSwitchView } from "./components/KillSwitchView";
import { DashboardOverview } from "./components/DashboardOverview";
import { ThemeProvider } from "./components/home/ThemeContext";
import { useNotifications } from "./hooks/useNotifications";
import { NotificationPreferencesView } from "./components/notifications/NotificationPreferencesView";
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

  // Real-time notifications, presence heartbeats, and web push hook
  const notifications = useNotifications(
    currentUser.id,
    selectedOrgId || authData?.activeOrganizationId || undefined
  );

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
      toasts={notifications.toasts}
      onDismissToast={notifications.dismissToast}
      onNavigate={onNavigate}
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

          {/* Notification & Push Preferences */}
          <div className="p-6 rounded-2xl bg-ink-950/80 border border-white/[0.06]">
            <NotificationPreferencesView
              orgId={selectedOrgId || authData?.activeOrganizationId}
              orgRole={authData?.orgRole}
              subscribeToWebPush={notifications.subscribeToWebPush}
              pushPermission={notifications.pushPermission}
              isPushSupported={notifications.isPushSupported}
              isSubscribingPush={notifications.isSubscribingPush}
            />
          </div>

          <KillSwitchView />
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
        <ThemeProvider>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <LoginView
                initialMode={route.path === "/signup" ? "signup" : "signin"}
                onBackToHome={() => navigateTo("/home")}
                onLogin={handleLogin}
              />
            </QueryClientProvider>
          </trpc.Provider>
        </ThemeProvider>
      );
    }

    // Default to Landing Homepage
    return (
      <ThemeProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <HomeView
              onSignIn={() => navigateTo("/signin")}
              onSignUp={() => navigateTo("/signup")}
              isLoggedIn={!!currentUser}
              onGoToDashboard={() => navigateTo("/dashboard")}
              onLogout={handleLogout}
              userEmail={currentUser?.email}
            />
          </QueryClientProvider>
        </trpc.Provider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}
