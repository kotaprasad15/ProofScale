import React, { useState } from "react";
import { motion, useReducedMotion as useFramerReducedMotion } from "framer-motion";
import { revealVariants, reducedRevealVariants } from "./tokens";

interface RevealProps {
  children: React.ReactNode;
  /** Stagger index — adds a small per-item delay */
  index?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
  once?: boolean;
  amount?: number;
}

/**
 * Fallback safety net: if IntersectionObserver is unavailable (old browsers,
 * embedded webviews, prerenderers), the element must render VISIBLE rather
 * than stay in its hidden state forever.
 */
function useObserverAvailable(): boolean {
  const [available] = useState(
    () => typeof window !== "undefined" && "IntersectionObserver" in window
  );
  return available;
}

/**
 * Scroll-triggered reveal: staggered fade-up with blur-to-sharp, once only.
 * - amount defaults to 0.15 so tall blocks (grids, panels) trigger reliably
 *   even when only a sliver is visible in short viewports.
 * - Under prefers-reduced-motion it degrades to an opacity fade.
 * - Renders immediately visible if IntersectionObserver is unavailable.
 */
export function Reveal({
  children,
  index = 0,
  className,
  as = "div",
  once = true,
  amount = 0.15,
}: RevealProps) {
  const reduced = useFramerReducedMotion();
  const ioAvailable = useObserverAvailable();
  const Comp = (motion as any)[as] ?? motion.div;
  const variants = reduced ? reducedRevealVariants : revealVariants;

  // No IntersectionObserver -> never start hidden.
  if (!ioAvailable) {
    return (
      <Comp className={className} initial={false}>
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      className={className}
      variants={variants}
      custom={index}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount, margin: "0px 0px -8% 0px" }}
    >
      {children}
    </Comp>
  );
}

/** Variants helpers for parent-driven staggers */
export { staggerContainer, staggerItem } from "./tokens";
