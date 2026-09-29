/**
 * RateCap Motion System — shared tokens.
 * Every animation in the app MUST reference these; no ad-hoc durations/easings.
 */

export const DURATION = {
  instant: 0.12,
  fast: 0.2,
  base: 0.32,
  slow: 0.5,
  reveal: 0.7,
  splash: 1.1,
} as const;

export const EASE = {
  out: [0.16, 1, 0.3, 1] as const, // expo-out — entrances
  inOut: [0.65, 0, 0.35, 1] as const, // symmetric — theme, morphs
  sharp: [0.3, 0, 0.8, 0.15] as const, // exits
  soft: [0.25, 0.1, 0.25, 1] as const, // ambient drift
};

export const SPRING = {
  cursor: { type: "spring", stiffness: 500, damping: 40, mass: 0.6 },
  cursorRing: { type: "spring", stiffness: 260, damping: 26, mass: 0.9 },
  magnetic: { type: "spring", stiffness: 180, damping: 14, mass: 0.8 },
  pop: { type: "spring", stiffness: 400, damping: 24 },
  layout: { type: "spring", stiffness: 320, damping: 30 },
  toggle: { type: "spring", stiffness: 500, damping: 30 },
} as const;

/** Page-level crossfade: blur + translate + fade */
export const pageVariants = {
  initial: { opacity: 0, y: 14, filter: "blur(8px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DURATION.base, ease: EASE.out },
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: "blur(6px)",
    transition: { duration: DURATION.fast * 1.2, ease: EASE.sharp },
  },
};

/** Scroll reveal: staggered fade-up with blur-to-sharp */
export const revealVariants = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: DURATION.reveal,
      ease: EASE.out,
      delay: Math.min(i * 0.08, 0.4),
    },
  }),
};

/** Stagger container */
export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE.out },
  },
};

/** Toast / notification entry (top-right slide) */
export const toastVariants = {
  initial: { opacity: 0, x: 40, scale: 0.96 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: SPRING.pop,
  },
  exit: {
    opacity: 0,
    x: 60,
    scale: 0.95,
    transition: { duration: DURATION.fast, ease: EASE.sharp },
  },
};

/** Reduced-motion replacements: opacity-only */
export const reducedPageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATION.fast } },
  exit: { opacity: 0, transition: { duration: DURATION.instant } },
};

export const reducedRevealVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.fast } },
};

/** Button press micro-interaction */
export const pressVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  press: { scale: 0.97 },
};

/** Shared-element list → detail */
export const sharedElementTransition = {
  layout: {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
  },
};
