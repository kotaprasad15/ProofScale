import React from "react";
import { ShieldCheck, Lock, Radio, Share2, AlertTriangle, ArrowRight } from "lucide-react";
import { MaskedReveal } from "./MaskedReveal";

const GUARDRAILS = [
  {
    icon: ShieldCheck,
    tag: "CONTROL 01",
    title: "SSRF & Private IP Guard",
    desc: "Workers automatically reject loopback 127.0.0.1, RFC 1918 private subnets (10.x, 172.16.x, 192.168.x), and cloud instance metadata (169.254.169.254).",
    spec: "ENFORCED AT SOCKET LEVEL"
  },
  {
    icon: Lock,
    tag: "CONTROL 02",
    title: "Domain Verification",
    desc: "Mandatory cryptographic DNS TXT token challenge or HTTP verification handshake required before any traffic can be directed at external hosts.",
    spec: "PREVENTS UNAUTHORIZED TARGETS"
  },
  {
    icon: Radio,
    tag: "CONTROL 03",
    title: "Emergency Kill Switch",
    desc: "Global and per-run emergency abort trigger. Terminates all runner processes and closes socket connections within 0ms without data loss.",
    spec: "ZERO-LATENCY ABORT PROTOCOL"
  },
  {
    icon: Share2,
    tag: "CONTROL 04",
    title: "Token-Hashed Sharing",
    desc: "Public evidence reports are accessed strictly via unguessable SHA-256 tokens with configurable expiry windows and instant one-click revocation.",
    spec: "CRYPTO AUDIT INTEGRITY"
  }
];

export function SafetyGuardrails() {
  return (
    <section id="safety" className="py-24 sm:py-36 px-6 sm:px-12 relative z-10 border-t border-[var(--border)] bg-[var(--color-surface)]/20">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[11px] font-medium tracking-wider text-signal-rose bg-signal-rose-soft border border-signal-rose/25 uppercase">
              <AlertTriangle className="w-3.5 h-3.5" />
              HARD SAFETY GUARDRAILS
            </div>
            <MaskedReveal>
              <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-text-primary tracking-tight leading-[1.05]">
                Engineered for authorized measurement.
              </h2>
            </MaskedReveal>
            <p className="text-text-muted text-lg leading-relaxed font-sans">
              Brutalist, physical safety boundaries built into the runtime. Not a policy document — enforced code.
            </p>
          </div>

          <div className="font-mono text-xs text-text-muted hidden md:flex items-center gap-2 shrink-0 pb-2">
            <span>DRAG / SCROLL SNAP</span>
            <ArrowRight className="w-4 h-4 text-signal-indigo" />
          </div>
        </div>

        {/* Horizontal Scroll-Snap Brutalist Row */}
        <div className="safety-scroll-row pt-4">
          {GUARDRAILS.map((g) => {
            const Icon = g.icon;
            return (
              <div
                key={g.title}
                className="safety-snap-card brutalist-card p-8 flex flex-col justify-between space-y-8 select-none"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-[var(--white-fill-sm)] border border-[var(--border)] flex items-center justify-center text-text-primary">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-[10px] font-bold tracking-widest text-signal-rose uppercase">
                      {g.tag}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display font-bold text-2xl text-text-primary tracking-tight">
                      {g.title}
                    </h3>
                    <p className="text-text-muted text-xs sm:text-sm leading-relaxed font-sans">
                      {g.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border)] font-mono text-[10px] text-text-faint uppercase tracking-wider font-bold">
                  {g.spec}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
