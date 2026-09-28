import React, { useState, useEffect } from "react";
import { HomeNavbar } from "./HomeView";
import { MinimalFooter } from "./home/MinimalFooter";
import { SceneBackground } from "./home/SceneBackground";
import { ThemeProvider } from "./home/ThemeContext";
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
  { id: "intro", title: "A. Introduction" },
  { id: "getting-started", title: "B. Getting Started" },
  { id: "roles", title: "C. User Roles & Permissions" },
  { id: "navigation", title: "D. Workspace Navigation" },
  { id: "parameters", title: "E. Assessment Parameters" },
  { id: "metrics", title: "F. Workspace Metrics & Score" },
  { id: "plans-runs", title: "G. Test Plans & Test Runs" },
  { id: "reports", title: "H. Reports & Evidence" },
  { id: "safety", title: "I. Safety Guardrails" },
  { id: "methodology", title: "J. Methodology" },
  { id: "troubleshooting", title: "K. Troubleshooting" }
];

export function DocsView(props: DocsViewProps) {
  const [activeSection, setActiveSection] = useState("intro");

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = SECTIONS.map(s => document.getElementById(s.id));
      const scrollPosition = window.scrollY + 100;
      
      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i];
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(SECTIONS[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
    }
  };

  return (
    <ThemeProvider>
      <div className="bg-[var(--color-bg)] min-h-screen text-text-primary relative overflow-x-hidden transition-colors duration-300">
        <SceneBackground />
        
        <HomeNavbar {...props} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 pt-32 pb-24 flex flex-col md:flex-row gap-12">
          
          {/* Table of Contents - Sidebar */}
          <aside className="w-full md:w-64 shrink-0 font-mono text-xs">
            <div className="sticky top-24 glass-panel p-6 space-y-4">
              <div className="flex items-center gap-2 text-text-primary mb-4 pb-4 border-b border-white/[0.08]">
                <BookOpen className="w-4 h-4 text-signal-indigo" />
                <span className="font-bold uppercase tracking-wider">Documentation</span>
              </div>
              <ul className="space-y-3">
                {SECTIONS.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => scrollTo(section.id)}
                      className={`text-left w-full transition-colors ${
                        activeSection === section.id
                          ? "text-signal-indigo font-bold"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-24 font-sans max-w-3xl">
            
            {/* A. Introduction */}
            <section id="intro" className="space-y-6">
              <h1 className="text-3xl md:text-5xl font-black font-raleway tracking-tight text-text-primary">
                Platform Documentation
              </h1>
              <p className="text-lg text-text-muted leading-relaxed">
                ProofScale is a readiness and safety platform designed to help engineering teams run controlled, authorized performance assessments and convert observed application behavior into evidence-backed reports.
              </p>
              <div className="glass-panel p-6 sm:p-8 space-y-4">
                <h3 className="text-xl font-bold font-raleway text-text-primary">The ProofScale Philosophy</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  We believe that performance claims must be backed by evidence. ProofScale solves the problem of undocumented, unrepeatable load testing by treating load generation as a structured, defensive exercise. Controlled assessments produce evidence-backed readiness insights. Note that all results are conditional on the declared test envelope and do not constitute an absolute guarantee of application stability outside of those parameters.
                </p>
              </div>
            </section>

            {/* B. Getting Started */}
            <section id="getting-started" className="space-y-6">
              <h2 className="text-2xl font-bold font-raleway text-text-primary border-b border-white/[0.08] pb-4">
                B. Getting Started
              </h2>
              <ol className="list-decimal list-inside space-y-4 text-sm text-text-muted leading-relaxed">
                <li><strong className="text-text-primary">Create an account</strong> using your organizational email.</li>
                <li><strong className="text-text-primary">Create an organization</strong> to isolate your team's environments.</li>
                <li><strong className="text-text-primary">Define a workspace handle</strong> for readable URL routing.</li>
                <li><strong className="text-text-primary">Create a first project</strong> to group related targets.</li>
                <li><strong className="text-text-primary">Select an environment</strong> (Staging or Production). <em>Note: Production assessments require additional safety consideration and explicit authorization.</em></li>
                <li><strong className="text-text-primary">Start with a conservative smoke or baseline plan</strong> before applying aggressive load.</li>
                <li><strong className="text-text-primary">Review the workspace</strong> and configure necessary guardrails.</li>
                <li><strong className="text-text-primary">Invite relevant team members</strong> via email or shareable link.</li>
                <li><strong className="text-text-primary">Run an approved assessment</strong> to generate empirical data.</li>
                <li><strong className="text-text-primary">Review the resulting report</strong> to analyze readiness and identify bottlenecks.</li>
              </ol>
            </section>

            {/* C. User Roles & Permissions */}
            <section id="roles" className="space-y-6">
              <h2 className="text-2xl font-bold font-raleway text-text-primary border-b border-white/[0.08] pb-4">
                C. User Roles & Permissions
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 space-y-4">
                  <div className="w-8 h-8 rounded-lg bg-signal-rose-soft flex items-center justify-center">
                    <Shield className="w-4 h-4 text-signal-rose" />
                  </div>
                  <h3 className="font-bold text-text-primary">Organization Owner</h3>
                  <ul className="text-xs text-text-muted space-y-2 list-disc list-inside">
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
                  <div className="w-8 h-8 rounded-lg bg-signal-teal-soft flex items-center justify-center">
                    <Users className="w-4 h-4 text-signal-teal" />
                  </div>
                  <h3 className="font-bold text-text-primary">Project Owner</h3>
                  <ul className="text-xs text-text-muted space-y-2 list-disc list-inside">
                    <li>Manage a project</li>
                    <li>Define targets</li>
                    <li>Create and update test plans</li>
                    <li>Configure project-level assessment details</li>
                    <li>Review test runs and reports</li>
                    <li>Manage project members where applicable</li>
                  </ul>
                </div>

                <div className="glass-panel p-6 space-y-4">
                  <div className="w-8 h-8 rounded-lg bg-signal-amber-soft flex items-center justify-center">
                    <Play className="w-4 h-4 text-signal-amber" />
                  </div>
                  <h3 className="font-bold text-text-primary">Tester</h3>
                  <ul className="text-xs text-text-muted space-y-2 list-disc list-inside">
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
            <section id="navigation" className="space-y-6">
              <h2 className="text-2xl font-bold font-raleway text-text-primary border-b border-white/[0.08] pb-4">
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
                    <span className="font-mono text-xs font-bold text-signal-indigo shrink-0 w-32">{nav.label}</span>
                    <span className="text-text-muted">{nav.desc}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-faint p-4 glass-panel rounded-xl mt-4">
                <strong>Additional interface elements:</strong> The Workspace Switcher allows navigating between multiple Organizations. The Current User Role Indicator shows your permission level. Notifications alert you of completed runs or system events. Engine Status shows worker health. The Account Menu provides sign-out and profile access.
              </p>
            </section>

            {/* E. Assessment Parameters */}
            <section id="parameters" className="space-y-6">
              <h2 className="text-2xl font-bold font-raleway text-text-primary border-b border-white/[0.08] pb-4">
                E. Assessment Parameters
              </h2>
              <p className="text-sm text-text-muted mb-4">
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
                    <span className="block font-bold text-text-primary mb-1">{param.term}</span>
                    <span className="text-text-muted text-xs leading-relaxed">{param.def}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* F. Workspace Metrics */}
            <section id="metrics" className="space-y-6">
              <h2 className="text-2xl font-bold font-raleway text-text-primary border-b border-white/[0.08] pb-4">
                F. Workspace Metrics & Score
              </h2>
              <div className="space-y-4 text-sm text-text-muted">
                <p>
                  The <strong className="text-signal-teal">Latest Assessment Score</strong> is a deterministically calculated metric (0-100) reflecting observed behavior. 
                  <em> It is not an unconditional guarantee of application performance, but represents observed behavior under a specific declared test envelope.</em>
                </p>
                <div className="glass-panel p-6 rounded-xl space-y-4">
                  <h4 className="font-bold text-text-primary uppercase tracking-wider text-xs">Score Methodology Weighting</h4>
                  <ul className="space-y-2">
                    <li className="flex justify-between items-center"><span className="text-text-muted">Reliability</span><span className="font-mono text-signal-indigo">30%</span></li>
                    <li className="flex justify-between items-center"><span className="text-text-muted">Latency</span><span className="font-mono text-signal-indigo">25%</span></li>
                    <li className="flex justify-between items-center"><span className="text-text-muted">Capacity behavior</span><span className="font-mono text-signal-indigo">20%</span></li>
                    <li className="flex justify-between items-center"><span className="text-text-muted">Stability</span><span className="font-mono text-signal-indigo">15%</span></li>
                    <li className="flex justify-between items-center"><span className="text-text-muted">Readiness hygiene</span><span className="font-mono text-signal-indigo">10%</span></li>
                  </ul>
                </div>
                <p>
                  Additional metrics include <strong>p95 latency</strong>, <strong>Throughput</strong>, <strong>Signal quality</strong>, <strong>Observed request count</strong>, and <strong>Comparison with the previous run</strong> (deltas), which are measured against defined <strong>Threshold statuses</strong>.
                </p>
              </div>
            </section>

            {/* G. Test Plans & Test Runs */}
            <section id="plans-runs" className="space-y-6">
              <h2 className="text-2xl font-bold font-raleway text-text-primary border-b border-white/[0.08] pb-4">
                G. Test Plans & Test Runs
              </h2>
              <div className="space-y-4 text-sm text-text-muted leading-relaxed">
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
            <section id="reports" className="space-y-6">
              <h2 className="text-2xl font-bold font-raleway text-text-primary border-b border-white/[0.08] pb-4">
                H. Reports & Evidence
              </h2>
              <p className="text-sm text-text-muted leading-relaxed">
                Reports are designed to make technical findings understandable to engineering teams, stakeholders, and clients. Expect the following components in a report:
              </p>
              <ul className="grid grid-cols-2 gap-3 text-xs text-text-muted font-mono list-disc list-inside bg-ink-950/50 p-6 rounded-xl border border-white/[0.04]">
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
            <section id="safety" className="space-y-6">
              <h2 className="text-2xl font-bold font-raleway text-text-primary border-b border-white/[0.08] pb-4">
                I. Safety Guardrails
              </h2>
              <div className="glass-panel border-l-4 border-l-signal-rose p-6 space-y-3">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                  <Shield className="w-4 h-4 text-signal-rose" /> 
                  Platform Safety Principles
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  ProofScale enforces strict safety boundaries to prevent infrastructure harm. We mandate:
                </p>
                <ul className="text-xs text-text-muted space-y-2 list-disc list-inside pl-4">
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
            <section id="methodology" className="space-y-6">
              <h2 className="text-2xl font-bold font-raleway text-text-primary border-b border-white/[0.08] pb-4">
                J. Methodology
              </h2>
              <p className="text-sm text-text-muted leading-relaxed">
                ProofScale intentionally couples the aggregate score alongside contextual metadata: the workload, thresholds, target, run conditions, test profile, runner configuration, and confidence context.
              </p>
              <p className="text-sm text-text-muted leading-relaxed">
                A score devoid of context is misleading. By presenting the precise constraints and parameters alongside the outcome, results can be compared, shared, and defended responsibly across engineering teams and executive stakeholders.
              </p>
            </section>

            {/* K. Troubleshooting */}
            <section id="troubleshooting" className="space-y-6">
              <h2 className="text-2xl font-bold font-raleway text-text-primary border-b border-white/[0.08] pb-4">
                K. Troubleshooting & Best Practices
              </h2>
              <div className="space-y-4 text-sm text-text-muted">
                <ul className="space-y-3">
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-signal-teal shrink-0" /> <span>Start with staging where possible before targeting production environments.</span></li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-signal-teal shrink-0" /> <span>Begin with a conservative test plan to validate runner connectivity.</span></li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-signal-teal shrink-0" /> <span>Validate the target ownership explicitly before running an assessment.</span></li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-signal-teal shrink-0" /> <span>Declare realistic thresholds reflecting actual SLA constraints.</span></li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-signal-teal shrink-0" /> <span>Avoid comparing runs with different envelopes without providing context.</span></li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-signal-teal shrink-0" /> <span>Review all warnings and limitations appended to reports.</span></li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-signal-teal shrink-0" /> <span>Confirm authorization and use role permissions intentionally.</span></li>
                  <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-signal-teal shrink-0" /> <span>Treat scores as conditional evidence rather than absolute guarantees.</span></li>
                </ul>
              </div>
            </section>

          </main>
        </div>

        <MinimalFooter onSignIn={props.onSignIn} />
      </div>
    </ThemeProvider>
  );
}
