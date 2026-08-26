import React from "react";
import { ArrowRight, CheckCircle2, ClipboardCheck, Gauge, LockKeyhole, ShieldCheck, Sparkles, UsersRound, Activity, Zap, FileText } from "lucide-react";
import { PublicNav } from "./PublicNav";
import { PointWave } from "./PointWave";
import { WorkspaceButton } from "./AnimatedButtons";
import { MetricPreview } from "./MetricPreview";
import { Scrollytelling } from "./Scrollytelling";
import { PublicFooter } from "./PublicFooter";

const rolePaths = [
  {
    icon: ShieldCheck,
    role: "Organization owner",
    copy: "Create projects, set organization guardrails, and turn assessments into client-ready proof.",
    action: "Create an organization"
  },
  {
    icon: ClipboardCheck,
    role: "Project owner",
    copy: "Define targets and test plans for one product surface without inheriting organization-wide settings.",
    action: "Join or manage a project"
  },
  {
    icon: Gauge,
    role: "Tester",
    copy: "Run approved assessments and read the evidence without changing the safety envelope.",
    action: "Request tester access"
  }
];

interface HomeViewProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onQuickLogin?: (role: "owner" | "tester") => void;
}

export function HomeView({ onSignIn, onSignUp, onQuickLogin }: HomeViewProps) {
  return (
    <main className="home-page">
      {/* Navigation */}
      <PublicNav onSignIn={onSignIn} onSignUp={onSignUp} />

      {/* Hero Section */}
      <section className="hero">
        <PointWave className="hero-wave" />
        <div className="hero-layout">
          <div className="hero-copy">
            <span className="hero-kicker">
              <ShieldCheck size={15} /> Deterministic application readiness
            </span>
            <h1>
              Know what your application can handle—<em>before your users do.</em>
            </h1>
            <p>
              Run controlled, authorized performance checks and turn real measurements into an evidence-backed readiness report your team and stakeholders can understand.
            </p>
            <div className="hero-ctas">
              <WorkspaceButton onClick={onSignUp} />
              <a href="#how-it-works" className="ghost-button">
                <Sparkles size={17} /> See how it works
              </a>
            </div>
            <div className="hero-proof">
              <span>
                <CheckCircle2 size={16} /> Authorized testing only
              </span>
              <span>
                <CheckCircle2 size={16} /> Bounded safety caps
              </span>
              <span>
                <CheckCircle2 size={16} /> Deterministic math
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <MetricPreview />
            <span className="hero-orbit orbit-one" />
            <span className="hero-orbit orbit-two" />
          </div>
        </div>
      </section>

      {/* Value Strip */}
      <section className="value-strip">
        <p>
          ProofScale replaces uncertain launch conversations with <b>observed behavior under a declared workload.</b>
        </p>
        <div>
          <span>Reliability</span>
          <i />
          <span>Latency</span>
          <i />
          <span>Capacity behavior</span>
          <i />
          <span>Stability</span>
        </div>
      </section>

      {/* Scrollytelling Section */}
      <Scrollytelling />

      {/* Methodology Section */}
      <section className="method-section" id="methodology">
        <div className="method-image">
          <div className="method-card-art bg-gradient-to-br from-[#F5F3FF] to-[#EAE6FE] p-7 border border-[#DFDBF6] flex flex-col justify-between relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6957E8] font-bold">
                Readiness Evaluation Matrix · v1.4
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-[#129B78] border border-[#BCE8DA] shadow-sm">
                Pass · High Confidence
              </span>
            </div>

            <div className="space-y-3 my-4">
              <div className="p-3.5 bg-white/90 rounded-xl border border-white/80 shadow-sm flex items-center justify-between">
                <span className="text-xs font-bold text-ink">Reliability &amp; Error Rate</span>
                <span className="text-xs font-mono font-bold text-[#129B78]">0.00% (Weight 30%)</span>
              </div>
              <div className="p-3.5 bg-white/90 rounded-xl border border-white/80 shadow-sm flex items-center justify-between">
                <span className="text-xs font-bold text-ink">SLA Latency Percentiles</span>
                <span className="text-xs font-mono font-bold text-[#6957E8]">p95: 380ms (Weight 25%)</span>
              </div>
              <div className="p-3.5 bg-white/90 rounded-xl border border-white/80 shadow-sm flex items-center justify-between">
                <span className="text-xs font-bold text-ink">Capacity Envelope Behavior</span>
                <span className="text-xs font-mono font-bold text-ink">482 RPS (Weight 20%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#7A7D8D] font-mono pt-2 border-t border-[#DFDBF6]">
              <span>Sample: 28,920 reqs</span>
              <span>Audit Hash: #0x4f88e2</span>
            </div>
          </div>
          <span className="image-caption">Evidence, not a black box</span>
        </div>

        <div className="method-copy">
          <span className="eyebrow">Methodology made visible</span>
          <h2>A score should be understandable, not just impressive.</h2>
          <p>
            ProofScale keeps the workload, thresholds, target, run conditions, and confidence context next to the number. The result is easier to compare, share, and defend.
          </p>
          <div className="weight-list">
            <span>
              <b>30%</b> Reliability
            </span>
            <span>
              <b>25%</b> Latency
            </span>
            <span>
              <b>20%</b> Capacity behavior
            </span>
            <span>
              <b>15%</b> Stability
            </span>
            <span>
              <b>10%</b> Readiness hygiene
            </span>
          </div>
          <button
            type="button"
            onClick={onSignUp}
            className="text-link bg-transparent border-0 font-bold cursor-pointer p-0"
          >
            Explore a workspace <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Role Pathways Section */}
      <section className="role-section" id="role-pathways">
        <div className="role-heading">
          <span className="eyebrow">Access that reflects the work</span>
          <h2>One product. Three clear pathways.</h2>
          <p>
            Account identity is separate from organization and project permissions, so each person sees the context and actions they are actually allowed to use.
          </p>
        </div>

        <div className="role-path-grid">
          {rolePaths.map(({ icon: Icon, role, copy, action }) => (
            <article className="role-path-card" key={role}>
              <span className="role-icon">
                <Icon size={21} />
              </span>
              <span className="eyebrow">{role}</span>
              <h3>{role}</h3>
              <p>{copy}</p>
              <button
                type="button"
                onClick={onSignUp}
                className="inline-flex items-center gap-1.5 mt-5 text-[11px] font-bold text-brand hover:gap-2.5 transition-all bg-transparent border-0 cursor-pointer p-0"
              >
                {action} <ArrowRight size={16} />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Safety Guardrails Section */}
      <section className="safety-section" id="safety">
        <div className="safety-content">
          <span className="eyebrow">Safety guardrails</span>
          <h2>Designed for authorized measurement, not indiscriminate traffic.</h2>
          <p>
            Target validation, constrained plans, audit trails, role-aware access, and report limitations are built into the workflow from the first click.
          </p>
          <div className="safety-list">
            <span>
              <LockKeyhole size={17} /> Target validation and hard caps
            </span>
            <span>
              <UsersRound size={17} /> Organization and project scoped access
            </span>
            <span>
              <ShieldCheck size={17} /> Conditional assessment language
            </span>
          </div>
          <WorkspaceButton onClick={onSignUp}>
            Run a bounded assessment
          </WorkspaceButton>
        </div>

        <div className="safety-image p-8 flex flex-col justify-center items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6957E8] to-[#4D3AC7] flex items-center justify-center text-white shadow-xl shadow-brand/20">
            <ShieldCheck size={44} />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-ink">SSRF &amp; Host Guard Enforced</h4>
            <p className="text-xs text-[#727586] max-w-xs">
              Cryptographic DNS handshake &amp; RFC 1918 private loopback blocking on all target endpoints.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta">
        <PointWave className="cta-wave" tone="ink" />
        <div>
          <span className="eyebrow">Make the next release measurable</span>
          <h2>Start with the conditions your team can explain.</h2>
        </div>
        <div className="final-actions">
          <WorkspaceButton onClick={onSignUp} />
          <button
            type="button"
            onClick={onSignIn}
            className="sign-in-link bg-transparent border-0 font-bold cursor-pointer"
          >
            Sign in
          </button>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter onSignIn={onSignIn} onSignUp={onSignUp} />
    </main>
  );
}
