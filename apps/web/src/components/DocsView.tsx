import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { HomeNavbar } from "./HomeView";
import { MinimalFooter } from "./home/MinimalFooter";
import { ThemeProvider } from "./home/ThemeContext";
import { AuroraBackground } from "../motion/AuroraBackground";
import { Reveal, SPRING } from "../motion";
import { Shield, Play, Target, CheckCircle2, FileText, AlertTriangle, Users, BookOpen } from "lucide-react";

interface DocsViewProps {
  onSignIn: () => void;
  onSignUp: () => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
  onLogout?: () => void;
  userEmail?: string;
  onGoHome: () => void;
  onNavigate: (path: string) => void;
}

const SECTIONS = [
  { id: "docs-intro", title: "A. Introduction" },
  { id: "docs-getting-started", title: "B. Getting Started" },
  { id: "docs-roles", title: "C. User Roles & Permissions" },
  { id: "docs-navigation", title: "D. Workspace Navigation" },
  { id: "docs-parameters", title: "E. Assessment Parameters" },
  { id: "docs-metrics", title: "F. Workspace Metrics & Score" },
  { id: "docs-plans-runs", title: "G. Test Plans & Test Runs" },
  { id: "docs-reports", title: "H. Reports & Evidence" },
  { id: "docs-safety", title: "I. Safety Guardrails" },
  { id: "docs-methodology", title: "J. Methodology" },
  { id: "docs-troubleshooting", title: "K. Troubleshooting" },
];

/** Accepts old (#safety) and new (#docs-safety) deep links. */
function resolveSectionId(hash: string): string | null {
  if (!hash) return null;
  const raw = decodeURIComponent(hash.replace(/^#/, ""));
  if (SECTIONS.some((s) => s.id === raw)) return raw;
  const legacy = SECTIONS.find((s) => s.id === `docs-${raw}`);
  return legacy ? legacy.id : null;
}

/**
 * Scroll-spy via IntersectionObserver. The entry nearest the top of the
 * viewport with positive ratio wins; recomputed on every intersection change.
 */
function useScrollSpy(sectionIds: string[]): string {
  const [active, setActive] = useState(sectionIds[0]);

  useEffect(() => {
    const ratios = new Map<string, number>();
    const compute = () => {
      let best: string | null = null;
      let bestTop = Infinity;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        // Section is "active" once its top is above 40% of the viewport;
        // among those, the closest to the top wins.
        if (rect.top <= window.innerHeight * 0.4 && rect.bottom > 0) {
          if (rect.top < bestTop) {
            bestTop = rect.top;
            best = id;
          }
        }
      }
      if (best) setActive(best);
      else if (window.scrollY < 80) setActive(sectionIds[0]);
    };
    compute();

    const observer = new IntersectionObserver(() => compute(), {
      rootMargin: "-15% 0px -50% 0px",
      threshold: [0, 0.1, 0.25, 0.5],
    });
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [sectionIds]);

  return active;
}

export function DocsView(props: DocsViewProps) {
  const sectionIds = useMemo(() => SECTIONS.map((s) => s.id), []);
  const activeSection = useScrollSpy(sectionIds);
  const [mobileOpen, setMobileOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // Reading progress across the docs content column
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });

  // Smooth-scroll to a section and sync the URL hash (shareable + back button)
  const goTo = (id: string, push = true) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (push) {
      history.pushState(null, "", `#${id}`);
    }
    setMobileOpen(false);
  };

  // Deep-link support on mount and on browser back/forward
  useEffect(() => {
    const target = resolveSectionId(window.location.hash);
    if (target) {
      // Wait a frame so layout/sticky offsets settle before jumping
      requestAnimationFrame(() => goTo(target, false));
    }
    const onPop = () => {
      const t = resolveSectionId(window.location.hash);
      if (t) goTo(t, false);
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onPop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeProvider>
      <div className="min-h-screen text-[var(--text-1)] relative overflow-x-hidden transition-colors duration-300">
        <AuroraBackground />
        <HomeNavbar {...props} />

        {/* Reading progress bar (top of viewport, below navbar) */}
        <motion.div
          className="fixed top-14 left-0 right-0 h-[3px] z-30 origin-left pointer-events-none"
          style={{
            scaleX: progress,
            background: "linear-gradient(90deg, var(--accent), var(--accent-2), var(--mint))",
            boxShadow: "0 0 10px color-mix(in srgb, var(--accent) 60%, transparent)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto w-full max-w-[1360px] px-6 sm:px-10 lg:px-14">
          <div className="flex flex-col lg:flex-row gap-0 lg:gap-10 pt-24 pb-24">
            {/* ===================== Sidebar (desktop) ===================== */}
            <aside
              className="hidden lg:block w-72 shrink-0"
              style={{
                position: "sticky",
                top: "88px",
                height: "calc(100vh - 88px)",
              }}
              aria-label="Documentation navigation"
            >
              <div
                className="h-full flex flex-col overflow-hidden"
                style={{
                  borderRight: "1px solid var(--glass-border)",
                  background: "var(--surface)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  borderRadius: "0 16px 16px 0",
                }}
              >
                <div
                  className="flex items-center gap-2 px-5 py-4 shrink-0 font-mono text-xs font-bold uppercase tracking-wider"
                  style={{ borderBottom: "1px solid var(--border)", color: "var(--text-1)" }}
                >
                  <BookOpen className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  Documentation
                </div>

                {/* Internal scroll for long lists */}
                <nav className="flex-1 overflow-y-auto py-3 pr-1 docs-nav-scroll">
                  <ul className="space-y-0.5">
                    {SECTIONS.map((section) => {
                      const isActive = activeSection === section.id;
                      return (
                        <li key={section.id} className="relative">
                          {isActive && (
                            <motion.span
                              layoutId="docs-active-pill"
                              className="absolute inset-y-0 left-0 w-full rounded-lg"
                              style={{
                                background: "var(--accent-soft)",
                                borderLeft: "2px solid var(--accent)",
                              }}
                              transition={SPRING.layout}
                            />
                          )}
                          <button
                            onClick={() => goTo(section.id)}
                            aria-current={isActive ? "true" : undefined}
                            className={`relative z-10 w-full text-left px-5 py-2 text-xs font-mono transition-colors cursor-pointer ${
                              isActive
                                ? "font-semibold"
                                : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                            }`}
                            style={isActive ? { color: "var(--accent)" } : undefined}
                          >
                            {section.title}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>
            </aside>

            {/* ===================== Main content ===================== */}
            <div className="flex-1 min-w-0" ref={contentRef}>
              {/* Mobile: sticky "On this page" dropdown */}
              <div className="lg:hidden sticky top-[72px] z-30 mb-8">
                <div className="glass rounded-xl overflow-hidden" style={{ background: "var(--glass-strong)" }}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium cursor-pointer"
                    onClick={() => setMobileOpen((v) => !v)}
                    aria-expanded={mobileOpen}
                    aria-controls="docs-mobile-toc"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" style={{ color: "var(--accent)" }} />
                      On this page
                      <span className="font-mono text-xs text-[var(--text-3)] truncate max-w-[180px]">
                        {SECTIONS.find((s) => s.id === activeSection)?.title}
                      </span>
                    </span>
                    <motion.span animate={{ rotate: mobileOpen ? 180 : 0 }} transition={SPRING.toggle}>
                      <ChevronDown className="w-4 h-4 text-[var(--text-2)]" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {mobileOpen && (
                      <motion.nav
                        id="docs-mobile-toc"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-y-auto"
                        style={{ maxHeight: "50vh", borderTop: "1px solid var(--border)" }}
                        aria-label="On this page"
                      >
                        <ul className="py-2">
                          {SECTIONS.map((section) => (
                            <li key={section.id}>
                              <button
                                onClick={() => goTo(section.id)}
                                className={`w-full text-left px-4 py-2.5 text-xs font-mono transition-colors cursor-pointer ${
                                  activeSection === section.id
                                    ? "font-semibold"
                                    : "text-[var(--text-2)]"
                                }`}
                                style={
                                  activeSection === section.id
                                    ? { color: "var(--accent)", background: "var(--accent-soft)" }
                                    : undefined
                                }
                              >
                                {section.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </motion.nav>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <main className="space-y-20 font-sans max-w-3xl">
                {/* A. Introduction */}
                <section id="docs-intro" className="space-y-6">
                  <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-[var(--text-1)]">
                    Platform Documentation
                  </h1>
                  <p className="text-lg text-[var(--text-2)] leading-relaxed">
                    RateCap is a readiness and safety platform designed to help engineering teams
                    run controlled, authorized performance assessments and convert observed
                    application behavior into evidence-backed reports.
                  </p>
                  <div className="glass-panel p-6 sm:p-8 space-y-4">
                    <h3 className="text-xl font-bold font-display text-[var(--text-1)]">The RateCap Philosophy</h3>
                    <p className="text-sm text-[var(--text-2)] leading-relaxed">
                      We believe that performance claims must be backed by evidence. RateCap solves the problem of undocumented, unrepeatable load testing by treating load generation as a structured, defensive exercise. Controlled assessments produce evidence-backed readiness insights. Note that all results are conditional on the declared test envelope and do not constitute an absolute guarantee of application stability outside of those parameters.
                    </p>
                  </div>
                </section>

                {/* B. Getting Started */}
                <section id="docs-getting-started" className="space-y-6">
                  <h2 className="text-2xl font-bold font-display text-[var(--text-1)] pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    B. Getting Started
                  </h2>
                  <ol className="list-decimal list-inside space-y-4 text-sm text-[var(--text-2)] leading-relaxed">
                    <li><strong className="text-[var(--text-1)]">Create an account</strong> using your organizational email.</li>
                    <li><strong className="text-[var(--text-1)]">Create an organization</strong> to isolate your team's environments.</li>
                    <li><strong className="text-[var(--text-1)]">Define a workspace handle</strong> for readable URL routing.</li>
                    <li><strong className="text-[var(--text-1)]">Create a first project</strong> to group related targets.</li>
                    <li><strong className="text-[var(--text-1)]">Select an environment</strong> (Staging or Production). <em>Note: Production assessments require additional safety consideration and explicit authorization.</em></li>
                    <li><strong className="text-[var(--text-1)]">Start with a conservative smoke or baseline plan</strong> before applying aggressive load.</li>
                    <li><strong className="text-[var(--text-1)]">Review the workspace</strong> and configure necessary guardrails.</li>
                    <li><strong className="text-[var(--text-1)]">Invite relevant team members</strong> via email or shareable link.</li>
                    <li><strong className="text-[var(--text-1)]">Run an approved assessment</strong> to generate empirical data.</li>
                    <li><strong className="text-[var(--text-1)]">Review the resulting report</strong> to analyze readiness and identify bottlenecks.</li>
                  </ol>
                </section>

                {/* C. User Roles & Permissions */}
                <section id="docs-roles" className="space-y-6">
                  <h2 className="text-2xl font-bold font-display text-[var(--text-1)] pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    C. User Roles & Permissions
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-panel p-6 space-y-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--danger-soft)" }}>
                        <Shield className="w-4 h-4" style={{ color: "var(--danger)" }} />
                      </div>
                      <h3 className="font-bold text-[var(--text-1)]">Organization Owner</h3>
                      <ul className="text-xs text-[var(--text-2)] space-y-2 list-disc list-inside">
                        <li>Create projects</li>
                        <li>Manage organization membership</li>
                        <li>Invite members</li>
                        <li>Configure organization-level guardrails</li>
                        <li>Review organization health</li>
                        <li>Access relevant settings</li>
                        <li>Review permitted assessments</li>
                      </ul>
                    </div>

                    <div className="glass-panel p-6 space-y-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--success-soft)" }}>
                        <Users className="w-4 h-4" style={{ color: "var(--success)" }} />
                      </div>
                      <h3 className="font-bold text-[var(--text-1)]">Project Owner</h3>
                      <ul className="text-xs text-[var(--text-2)] space-y-2 list-disc list-inside">
                        <li>Manage a project</li>
                        <li>Define targets</li>
                        <li>Create and update test plans</li>
                        <li>Configure project-level assessment details</li>
                        <li>Review test runs and reports</li>
                        <li>Manage project members where applicable</li>
                      </ul>
                    </div>

                    <div className="glass-panel p-6 space-y-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--warning-soft)" }}>
                        <Play className="w-4 h-4" style={{ color: "var(--warning)" }} />
                      </div>
                      <h3 className="font-bold text-[var(--text-1)]">Tester</h3>
                      <ul className="text-xs text-[var(--text-2)] space-y-2 list-disc list-inside">
                        <li>Run approved assessment plans</li>
                        <li>View permitted test runs</li>
                        <li>Review reports and evidence</li>
                        <li>Work within the assigned safety envelope</li>
                        <li><em>Cannot modify restricted targets, permissions, or safety settings</em></li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* D. Workspace Navigation */}
                <section id="docs-navigation" className="space-y-6">
                  <h2 className="text-2xl font-bold font-display text-[var(--text-1)] pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    D. Workspace Navigation
                  </h2>
                  <div className="space-y-6 text-sm">
                    {[
                      { label: "Overview", desc: "A high-level summary of the active project, recent activity, and aggregate score. All roles can access it." },
                      { label: "Projects", desc: "Allows selection of active assessment boundaries. Owners can create or configure projects." },
                      { label: "Targets", desc: "Defines the exact endpoint (URL) being assessed. Requires authorization before testing. Owners manage targets." },
                      { label: "Test plans", desc: "The predefined, bounded parameters for a workload. Owners construct plans; Testers use them." },
                      { label: "Test runs", desc: "Live and historical execution records of Test Plans. All roles can view progress and history." },
                      { label: "Reports", desc: "The final, immutable evidence artifacts generated after a Test Run completes. Used for compliance and sharing." },
                      { label: "People", desc: "Manages identity and access. Org Owners invite and manage roles here." },
                      { label: "Settings", desc: "Manages global application state, Kill Switch, and integrations. Restricted to Owners." }
                    ].map(nav => (
                      <div key={nav.label} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                        <span className="font-mono text-xs font-bold shrink-0 w-32" style={{ color: "var(--accent)" }}>{nav.label}</span>
                        <span className="text-[var(--text-2)]">{nav.desc}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-3)] p-4 glass-panel rounded-xl mt-4">
                    <strong>Additional interface elements:</strong> The Workspace Switcher allows navigating between multiple Organizations. The Current User Role Indicator shows your permission level. Notifications alert you of completed runs or system events. Engine Status shows worker health. The Account Menu provides sign-out and profile access.
                  </p>
                </section>

                {/* E. Assessment Parameters */}
                <section id="docs-parameters" className="space-y-6">
                  <h2 className="text-2xl font-bold font-display text-[var(--text-1)] pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    E. Assessment Parameters
                  </h2>
                  <p className="text-sm text-[var(--text-2)] mb-4">
                    Every assessment is defined by a rigorous set of parameters to ensure repeatability. Actual results depend strictly on the selected target, environment, plan, and runner configuration.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {[
                      { term: "Target", def: "The verified URL endpoint being tested." },
                      { term: "Environment", def: "The context of the target (e.g., Staging, Production)." },
                      { term: "Workload", def: "The aggressive behavior definition of the assessment." },
                      { term: "Virtual Users (VUs)", def: "Concurrent agents executing requests (e.g., 25 VUs)." },
                      { term: "Duration", def: "The total length of the assessment (e.g., 60 seconds)." },
                      { term: "Ramp behavior", def: "How VUs are introduced over time (e.g., Bounded ramp)." },
                      { term: "Baseline", def: "A previously approved run used as a standard for comparison." },
                      { term: "Threshold", def: "Pass/fail criteria for the assessment." },
                      { term: "p95 latency", def: "The latency below which 95% of requests complete (e.g., p95 below 500 ms)." },
                      { term: "Throughput (RPS)", def: "Requests Per Second successfully processed." },
                      { term: "Signal quality", def: "The statistical validity of the collected metrics." },
                      { term: "Observed requests", def: "The total number of requests successfully tracked." },
                      { term: "Runner configuration", def: "The geographic and network configuration of the execution engine." },
                      { term: "Request mix", def: "The ratio of read/write or specific endpoint calls during the test." },
                      { term: "Test profile", def: "The overarching intent of the test (e.g., Smoke, Stress, Soak)." },
                      { term: "Safety caps", def: "Hard limits that immediately halt execution if exceeded." },
                      { term: "Authorized scope", def: "The explicitly permitted domain boundaries." }
                    ].map(param => (
                      <div key={param.term} className="glass-panel p-4 rounded-xl">
                        <span className="block font-bold text-[var(--text-1)] mb-1">{param.term}</span>
                        <span className="text-[var(--text-2)] text-xs leading-relaxed">{param.def}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* F. Workspace Metrics */}
                <section id="docs-metrics" className="space-y-6">
                  <h2 className="text-2xl font-bold font-display text-[var(--text-1)] pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    F. Workspace Metrics & Score
                  </h2>
                  <div className="space-y-4 text-sm text-[var(--text-2)]">
                    <p>
                      The <strong style={{ color: "var(--success)" }}>Latest Assessment Score</strong> is a deterministically calculated metric (0-100) reflecting observed behavior.
                      <em> It is not an unconditional guarantee of application performance, but represents observed behavior under a specific declared test envelope.</em>
                    </p>
                    <div className="glass-panel p-6 rounded-xl space-y-4">
                      <h4 className="font-bold text-[var(--text-1)] uppercase tracking-wider text-xs">Score Methodology Weighting</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between items-center"><span className="text-[var(--text-2)]">Reliability</span><span className="font-mono" style={{ color: "var(--accent)" }}>30%</span></li>
                        <li className="flex justify-between items-center"><span className="text-[var(--text-2)]">Latency</span><span className="font-mono" style={{ color: "var(--accent)" }}>25%</span></li>
                        <li className="flex justify-between items-center"><span className="text-[var(--text-2)]">Capacity behavior</span><span className="font-mono" style={{ color: "var(--accent)" }}>20%</span></li>
                        <li className="flex justify-between items-center"><span className="text-[var(--text-2)]">Stability</span><span className="font-mono" style={{ color: "var(--accent)" }}>15%</span></li>
                        <li className="flex justify-between items-center"><span className="text-[var(--text-2)]">Readiness hygiene</span><span className="font-mono" style={{ color: "var(--accent)" }}>10%</span></li>
                      </ul>
                    </div>
                    <p>
                      Additional metrics include <strong>p95 latency</strong>, <strong>Throughput</strong>, <strong>Signal quality</strong>, <strong>Observed request count</strong>, and <strong>Comparison with the previous run</strong> (deltas), which are measured against defined <strong>Threshold statuses</strong>.
                    </p>
                  </div>
                </section>

                {/* G. Test Plans & Test Runs */}
                <section id="docs-plans-runs" className="space-y-6">
                  <h2 className="text-2xl font-bold font-display text-[var(--text-1)] pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    G. Test Plans & Test Runs
                  </h2>
                  <div className="space-y-4 text-sm text-[var(--text-2)] leading-relaxed">
                    <p>
                      A <strong>Test Plan</strong> defines the "what" and "how". It represents the bounded, reviewable parameters for an assessment. Plans are attached to Targets and Projects. An approved plan ensures that Testers cannot arbitrarily DDOS targets, but execute within an authorized safety envelope.
                    </p>
                    <p>
                      A <strong>Test Run</strong> is the active execution of a Test Plan. It captures realtime data. Users should always begin with a conservative <em>baseline</em> or <em>smoke plan</em> to verify runner connectivity and basic target health.
                    </p>
                    <p>
                      Runs are compared over time to detect regressions. Note that changes to the <em>request mix</em> or <em>workload</em> between plans will fundamentally alter the comparability of two runs.
                    </p>
                  </div>
                </section>

                {/* H. Reports & Evidence */}
                <section id="docs-reports" className="space-y-6">
                  <h2 className="text-2xl font-bold font-display text-[var(--text-1)] pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    H. Reports & Evidence
                  </h2>
                  <p className="text-sm text-[var(--text-2)] leading-relaxed">
                    Reports are designed to make technical findings understandable to engineering teams, stakeholders, and clients. Expect the following components in a report:
                  </p>
                  <ul className="grid grid-cols-2 gap-3 text-xs text-[var(--text-2)] font-mono list-disc list-inside p-6 rounded-xl border" style={{ background: "var(--field)", borderColor: "var(--border)" }}>
                    <li>Assessment score</li>
                    <li>Test envelope</li>
                    <li>Target and environment</li>
                    <li>Workload details</li>
                    <li>Thresholds</li>
                    <li>Latency observations</li>
                    <li>Throughput observations</li>
                    <li>Stability signals</li>
                    <li>Confidence context</li>
                    <li>Limitations & conditions</li>
                    <li>Timeline & comparison context</li>
                  </ul>
                </section>

                {/* I. Safety Guardrails */}
                <section id="docs-safety" className="space-y-6">
                  <h2 className="text-2xl font-bold font-display text-[var(--text-1)] pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    I. Safety Guardrails
                  </h2>
                  <div className="glass-panel p-6 space-y-3" style={{ borderLeft: "4px solid var(--danger)" }}>
                    <h3 className="font-bold text-[var(--text-1)] flex items-center gap-2">
                      <Shield className="w-4 h-4" style={{ color: "var(--danger)" }} />
                      Platform Safety Principles
                    </h3>
                    <p className="text-sm text-[var(--text-2)] leading-relaxed">
                      RateCap enforces strict safety boundaries to prevent infrastructure harm. We mandate:
                    </p>
                    <ul className="text-xs text-[var(--text-2)] space-y-2 list-disc list-inside pl-4">
                      <li>Authorized testing only (target domain ownership verification).</li>
                      <li>Bounded workload caps to prevent runaway concurrency.</li>
                      <li>Restricted production testing (requires secondary authorization).</li>
                      <li>Organization- and project-scoped access boundaries.</li>
                      <li>Role-aware permissions enforcing the principle of least privilege.</li>
                      <li>Execution limited to approved test plans.</li>
                      <li>Immutable audit trails for accountability.</li>
                      <li>Clear report limitations and conditional interpretation of results.</li>
                    </ul>
                  </div>
                </section>

                {/* J. Methodology */}
                <section id="docs-methodology" className="space-y-6">
                  <h2 className="text-2xl font-bold font-display text-[var(--text-1)] pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    J. Methodology
                  </h2>
                  <p className="text-sm text-[var(--text-2)] leading-relaxed">
                    RateCap intentionally couples the aggregate score alongside contextual metadata: the workload, thresholds, target, run conditions, test profile, runner configuration, and confidence context.
                  </p>
                  <p className="text-sm text-[var(--text-2)] leading-relaxed">
                    A score devoid of context is misleading. By presenting the precise constraints and parameters alongside the outcome, results can be compared, shared, and defended responsibly across engineering teams and executive stakeholders.
                  </p>
                </section>

                {/* K. Troubleshooting */}
                <section id="docs-troubleshooting" className="space-y-6">
                  <h2 className="text-2xl font-bold font-display text-[var(--text-1)] pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    K. Troubleshooting & Best Practices
                  </h2>
                  <div className="space-y-4 text-sm text-[var(--text-2)]">
                    <ul className="space-y-3">
                      <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--success)" }} /> <span>Start with staging where possible before targeting production environments.</span></li>
                      <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--success)" }} /> <span>Begin with a conservative test plan to validate runner connectivity.</span></li>
                      <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--success)" }} /> <span>Validate the target ownership explicitly before running an assessment.</span></li>
                      <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--success)" }} /> <span>Declare realistic thresholds reflecting actual SLA constraints.</span></li>
                      <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--success)" }} /> <span>Avoid comparing runs with different envelopes without providing context.</span></li>
                      <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--success)" }} /> <span>Review all warnings and limitations appended to reports.</span></li>
                      <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--success)" }} /> <span>Confirm authorization and use role permissions intentionally.</span></li>
                      <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--success)" }} /> <span>Treat scores as conditional evidence rather than absolute guarantees.</span></li>
                    </ul>
                  </div>
                </section>
              </main>
            </div>
          </div>
        </div>

        <MinimalFooter onSignIn={props.onSignIn} />
      </div>
    </ThemeProvider>
  );
}
