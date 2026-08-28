import React, { useEffect, useState } from "react";
import { ShieldCheck, Lock, Radio, Share2, type LucideIcon } from "lucide-react";
import { useInView } from "../hooks/useInView";
import { Eyebrow } from "./ui/Eyebrow";

/* =========================================================================
   Safety Guardrails — a shield assembles piece by piece as the user scrolls
   past each hard control. Each piece lands with a brutalist "click" (border
   flash), reinforcing that these are hard controls, not soft features.
   ========================================================================= */

const GUARDS = [
  {
    title: "SSRF & IP Guard",
    desc: "Every worker request is filtered against loopback 127.0.0.1, RFC 1918 private subnets, and cloud metadata endpoints before it ever leaves the sandbox.",
    icon: ShieldCheck,
    tint: "#5B5FEF"
  },
  {
    title: "Authorization Requirement",
    desc: "A cryptographic domain-verification challenge (DNS TXT or HTTP token) must pass before any traffic is executed against a target endpoint.",
    icon: Lock,
    tint: "#2FD4A6"
  },
  {
    title: "Emergency Kill Switch",
    desc: "A global, per-run abort immediately terminates all runner processes and socket connections — no draining window, no grace period.",
    icon: Radio,
    tint: "#F2586B"
  },
  {
    title: "Hashed Share Links",
    desc: "Readiness reports ship only through SHA-256 token-hashed URLs with configurable expiry and instant one-click revocation.",
    icon: Share2,
    tint: "#F0A63A"
  }
];

function GuardCard({
  index,
  title,
  desc,
  icon: Icon,
  onArm
}: {
  index: number;
  title: string;
  desc: string;
  icon: LucideIcon;
  onArm: (index: number) => void;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.55 });
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (inView) {
      onArm(index);
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 500);
      return () => clearTimeout(t);
    }
  }, [inView, index, onArm]);

  return (
    <div
      ref={ref}
      className={`brutalist p-5 sm:p-6 transition-opacity duration-500 ${inView ? "opacity-100" : "opacity-40"} ${
        flash ? "brutalist--flash" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-md bg-white/[0.04] border border-white/[0.12] flex items-center justify-center shrink-0"
          style={{ color: GUARDS[index].tint }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: GUARDS[index].tint }}>
              CONTROL {String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-mono text-[10px] text-text-faint uppercase tracking-wider">· armed</span>
          </div>
          <h3 className="text-text-primary font-display font-bold text-lg leading-tight">{title}</h3>
          <p className="text-text-muted text-xs leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}

export function SafetyGuardrails() {
  const [armed, setArmed] = useState(0);
  const handleArm = React.useCallback((i: number) => {
    setArmed((prev) => Math.max(prev, i + 1));
  }, []);

  const revealPct = (armed / GUARDS.length) * 100;

  return (
    <section id="safety" className="py-16 sm:py-32 border-t border-white/[0.06] relative">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-12">
        <div className="max-w-2xl mb-12 sm:mb-16 space-y-4">
          <Eyebrow color="rose">
            <Lock className="w-3.5 h-3.5" />
            Safety guardrails
          </Eyebrow>
          <h2 className="type-h2 text-text-primary tracking-tight">
            Hard controls, assembled one at a time.
          </h2>
          <p className="text-text-muted text-base leading-relaxed">
            Each guard below is a hard boundary, not a setting you can forget to turn on. Scroll to assemble the shield.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Sticky shield assembly */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="glass-panel p-8 flex flex-col items-center space-y-6">
              <svg viewBox="0 0 24 24" className="w-40 h-40 sm:w-48 sm:h-48" aria-hidden="true">
                <defs>
                  <linearGradient id="sg-fill" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#5B5FEF" />
                    <stop offset="1" stopColor="#2FD4A6" />
                  </linearGradient>
                  <clipPath id="sg-clip">
                    <rect x="0" y={24 - (revealPct / 100) * 24} width="24" height={(revealPct / 100) * 24} />
                  </clipPath>
                </defs>
                <path
                  d="M12 2L4 5.5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5.5L12 2Z"
                  fill="none"
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 2L4 5.5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5.5L12 2Z"
                  fill="url(#sg-fill)"
                  clipPath="url(#sg-clip)"
                />
              </svg>

              <div className="text-center space-y-2">
                <div className="font-mono text-xs font-bold text-text-primary uppercase tracking-wider">
                  Controls armed: {armed} / {GUARDS.length}
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  {GUARDS.map((g, i) => (
                    <span
                      key={i}
                      className="w-7 h-1 rounded-full transition-colors duration-300"
                      style={{ background: i < armed ? g.tint : "rgba(255,255,255,0.12)" }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Controls list */}
          <div className="lg:col-span-7 space-y-6">
            {GUARDS.map((g, i) => (
              <GuardCard key={g.title} index={i} title={g.title} desc={g.desc} icon={g.icon} onArm={handleArm} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
