import React from "react";
import { motion, useReducedMotion as useFramerReducedMotion, AnimatePresence } from "framer-motion";
import { pageVariants, reducedPageVariants } from "./tokens";

/**
 * Page-level transition: crossfade with slight blur + translate.
 * Wrap each routed view's content in this; AnimatePresence lives in the shell.
 */
export function PageTransition({
  routeKey,
  children,
  className,
}: {
  /** Unique key per route — drives AnimatePresence exit/enter */
  routeKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useFramerReducedMotion();
  const variants = reduced ? reducedPageVariants : pageVariants;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
