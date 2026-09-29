import React from "react";
import { Reveal } from "../../motion";

export function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body?: string;
}) {
  return (
    <div className="max-w-3xl">
      <Reveal>
        <span
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[10px] font-semibold uppercase tracking-[0.2em] glass-subtle"
          style={{ color: "var(--accent)" }}
        >
          {eyebrow}
        </span>
      </Reveal>
      <Reveal index={1}>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-1)]">
          {title}
        </h2>
      </Reveal>
      {body && (
        <Reveal index={2}>
          <p className="mt-4 text-[var(--text-2)] leading-relaxed">{body}</p>
        </Reveal>
      )}
    </div>
  );
}

export function Section({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`relative z-10 py-16 sm:py-24 ${className}`}>
      {/* One consistent centered container for every marketing section */}
      <div className="mx-auto w-full max-w-[1360px] px-6 sm:px-10 lg:px-14">{children}</div>
    </section>
  );
}
