import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING } from "./tokens";
import { useTheme } from "../components/home/ThemeContext";

/**
 * Manual dark/light toggle with a morphing icon (sun rays retract, moon
 * grows; reverse in light mode). Uses the existing ThemeContext.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className={`neo-btn relative flex items-center justify-center overflow-hidden ${
        compact ? "w-8 h-8 rounded-lg" : "w-9 h-9"
      }`}
      style={{ borderRadius: compact ? 10 : 14 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.svg
          key={theme}
          viewBox="0 0 24 24"
          width={17}
          height={17}
          fill="none"
          initial={{ rotate: isDark ? -90 : 90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: isDark ? 90 : -90, opacity: 0, scale: 0.5 }}
          transition={SPRING.toggle}
        >
          {isDark ? (
            <path
              d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"
              stroke="var(--text-1)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <g stroke="var(--text-1)" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="4.2" />
              <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
            </g>
          )}
        </motion.svg>
      </AnimatePresence>
    </button>
  );
}
