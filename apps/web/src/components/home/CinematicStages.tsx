import React, { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion as useFramerReducedMotion } from "framer-motion";
import { CheckCircle2, Flame, Zap, Wind } from "lucide-react";
import { Reveal, SpotlightCard } from "../../motion";
import { Section, SectionHeader } from "./HomeSectionBase";

const STAGES = [
  {
    icon: CheckCircle2,
    num: "01",
    name: "Validate",
    body: "Target health, allowlist and authorization are verified. A run cannot start against an unverified endpoint.",
    color: "var(--accent)",
  },
  {
    icon: Flame,
    num: "02",
    name: "Warm",
    body: "Low-intensity probes warm caches and connections, establishing the baseline the load stage is measured against.",
    color: "var(--warning)",
  },
  {
    icon: Zap,
    num: "03",
    name: "Load",
    body: "The bounded envelope ramps to its full virtual-user cap. Telemetry streams per second; hard caps cannot be exceeded.",
    color: "var(--accent-2)",
  },
  {
    icon: Wind,
    num: "04",
    name: "Cool",
    body: "Traffic decays to zero while the scoring engine finalizes SLA checks, findings and the readiness report.",
    color: "var(--success)",
  },
];

export function CinematicStages() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useFramerReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.5"],
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const progress = reduced ? undefined : pathLength;

  return (
    <Section id="pipeline">
      <SectionHeader
        eyebrow="01 / Pipeline"
        title={
          <>
            Four stages. <span className="text-gradient">Zero surprises.</span>
          </>
        }
        body="Every RateCap run moves through the same sandboxed pipeline. Progress is streamed, each stage is independently abortable, and nothing executes outside its declared envelope."
      />

      <div ref={ref} className="mt-14 relative max-w-5xl mx-auto">
        {/* Animated connector path */}
        <svg
          className="absolute left-[27px] top-6 bottom-6 w-[3px] hidden md:block"
          viewBox="0 0 3 600"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line x1="1.5" y1="0" x2="1.5" y2="600" stroke="var(--border)" strokeWidth="3" />
          <motion.line
            x1="1.5"
            y1="0"
            x2="1.5"
            y2="600"
            stroke="url(#pipe-grad)"
            strokeWidth="3"
            style={progress ? { pathLength: progress } : undefined}
            {...(progress ? {} : { strokeDasharray: "none" })}
          />
          <defs>
            <linearGradient id="pipe-grad" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="var(--accent)" />
              <stop offset="0.5" stopColor="var(--accent-2)" />
              <stop offset="1" stopColor="var(--success)" />
            </linearGradient>
          </defs>
        </svg>

        <div className="space-y-6 md:space-y-10 md:pl-24">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <Reveal key={stage.num} index={i}>
                <div className="relative">
                  {/* Stage node */}
                  <div
                    className="hidden md:flex absolute -left-24 top-6 w-14 h-14 rounded-2xl glass items-center justify-center z-10"
                    style={{ boxShadow: "var(--shadow-panel)", color: stage.color }}
                    aria-hidden="true"
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <SpotlightCard className="p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                      <div
                        className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "var(--accent-soft)", color: stage.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-semibold tracking-widest" style={{ color: stage.color }}>
                            {stage.num}
                          </span>
                          <h3 className="font-display font-semibold text-lg text-[var(--text-1)]">{stage.name}</h3>
                        </div>
                        <p className="mt-2 text-sm text-[var(--text-2)] leading-relaxed max-w-2xl">{stage.body}</p>
                      </div>
                    </div>
                  </SpotlightCard>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
