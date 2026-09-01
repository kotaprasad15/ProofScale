import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { motion } from "framer-motion";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-2 p-2 rounded-full border border-[var(--border)] bg-[var(--white-fill-sm)] text-text-primary hover:bg-[var(--white-fill-md)] transition-all duration-300 cursor-pointer select-none ${className}`}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      title={`Switch to ${isLight ? "dark" : "light"} mode`}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex items-center justify-center"
      >
        {isLight ? (
          <Sun className="w-4 h-4 text-amber-500" />
        ) : (
          <Moon className="w-4 h-4 text-signal-teal" />
        )}
      </motion.div>

      {showLabel && (
        <span className="font-mono text-xs font-medium uppercase tracking-wider pr-1">
          {isLight ? "Light" : "Dark"}
        </span>
      )}
    </button>
  );
}
