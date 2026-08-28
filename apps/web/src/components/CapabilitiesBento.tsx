import React from "react";
import { Gauge, Boxes, ShieldCheck, SlidersHorizontal, Share2, Users, Lock, Zap, Power } from "lucide-react";
import { Eyebrow } from "./ui/Eyebrow";

/* =========================================================================
   Capabilities — a single Bento grid rhythm break on the marketing page.
   Two large cells (Deterministic engine, Sandboxed execution) + four small.
   Bento is a section-level rhythm break, never a full-page structure.
   ========================================================================= */

export function CapabilitiesBento() {
  return (
    <section id="capabilities" className="py-16 sm:py-28 relative border-t border-white/[0.06]">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-12 space-y-12">
        <div className="max-w-2xl space-y-4">
          <Eyebrow color="indigo">Capabilities at a glance</Eyebrow>
          <h2 className="type-h2 text-text-primary tracking-tight">
            A precise instrument, not a load-testing kitchen sink.
          </h2>
          <p className="type-caption">
            Six capabilities, one job: turn a declared workload into defensible readiness evidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Large A — Deterministic engine */}
          <div className="glass-panel p-8 md:col-span-2 md:row-span-2 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-signal-indigo-soft border border-signal-indigo/30 flex items-center justify-center text-signal-indigo">
                <Gauge className="w-6 h-6" />
              </div>
              <div>
                <h3 className="type-h3">Deterministic scoring engine</h3>
                <p className="type-caption mt-2">
                  Fixed, versioned weights — no vibes, no black box. Every score decomposes into five explainable signals.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 font-mono text-[10px] uppercase tracking-wider text-text-muted">
              {[
                ["Reliability", "30"],
                ["Latency", "25"],
                ["Capacity", "20"],
                ["Stability", "15"],
                ["Hygiene", "10"]
              ].map(([label, weight]) => (
                <div key={label} className="p-2 rounded-lg bg-ink-900/80 border border-white/[0.06] text-center">
                  <div className="type-data text-sm font-bold text-signal-teal">{weight}%</div>
                  <div className="mt-1 leading-tight">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Large B — Sandboxed execution */}
          <div className="glass-panel p-8 md:col-span-2 md:row-span-2 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-signal-teal-soft border border-signal-teal/30 flex items-center justify-center text-signal-teal">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <h3 className="type-h3">Sandboxed execution</h3>
                <p className="type-caption mt-2">
                  Load runs on isolated workers, claimed by atomic lease, filtered through the network guard, bounded by hard safety caps.
                </p>
              </div>
            </div>
            <ul className="space-y-2.5 font-mono text-xs text-text-muted">
              <li className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-signal-indigo shrink-0" />
                <span>Atomic execution lease — one worker, one run</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-signal-teal shrink-0" />
                <span>SSRF &amp; private-IP guard on every request</span>
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-signal-amber shrink-0" />
                <span>Hard caps: 100 VUs · 600s · 5% error ceiling</span>
              </li>
            </ul>
          </div>

          {/* Four small cells */}
          <div className="glass-panel p-5 space-y-2">
            <Users className="w-5 h-5 text-signal-indigo" />
            <h4 className="font-display font-semibold text-sm text-text-primary">Multi-tenant RBAC</h4>
            <p className="type-caption text-xs">Owner, Admin, Member &amp; Tester isolation.</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <Power className="w-5 h-5 text-signal-rose" />
            <h4 className="font-display font-semibold text-sm text-text-primary">Kill switch</h4>
            <p className="type-caption text-xs">Instant system-wide abort for every active run.</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <Share2 className="w-5 h-5 text-signal-amber" />
            <h4 className="font-display font-semibold text-sm text-text-primary">Hashed share links</h4>
            <p className="type-caption text-xs">SHA-256 links, 7-day expiry, one-click revoke.</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <SlidersHorizontal className="w-5 h-5 text-signal-teal" />
            <h4 className="font-display font-semibold text-sm text-text-primary">Bounded load presets</h4>
            <p className="type-caption text-xs">Smoke, Baseline, Stress &amp; Soak profiles.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
