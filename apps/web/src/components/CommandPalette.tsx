import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Target,
  PlaySquare,
  Activity,
  FileText,
  Users,
  Settings,
  X,
  Play,
  ArrowRight,
} from "lucide-react";
import { SPRING } from "../motion/tokens";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onNewTestPlan?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onNewTestPlan,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = [
    {
      id: "nav-overview",
      title: "Go to Overview",
      subtitle: "System health and readiness dashboard",
      icon: LayoutDashboard,
      section: "Navigation",
      action: () => onNavigate("projects"),
    },
    {
      id: "nav-targets",
      title: "Target Endpoints",
      subtitle: "Manage authorized URLs and environments",
      icon: Target,
      section: "Navigation",
      action: () => onNavigate("targets"),
    },
    {
      id: "nav-plans",
      title: "Test Plans & Envelopes",
      subtitle: "Configure bounded load profiles and thresholds",
      icon: PlaySquare,
      section: "Navigation",
      action: () => onNavigate("plans"),
    },
    {
      id: "nav-runs",
      title: "Live Test Runs",
      subtitle: "Monitor active telemetry and execution queue",
      icon: Activity,
      section: "Navigation",
      action: () => onNavigate("runs"),
    },
    {
      id: "nav-reports",
      title: "Readiness Reports",
      subtitle: "Inspect empirical scores, SLA checks, and findings",
      icon: FileText,
      section: "Navigation",
      action: () => onNavigate("reports"),
    },
    {
      id: "nav-org",
      title: "Organization & RBAC",
      subtitle: "Members, invitations, and access controls",
      icon: Users,
      section: "Navigation",
      action: () => onNavigate("organization"),
    },
    {
      id: "nav-settings",
      title: "Settings & Kill Switch",
      subtitle: "Platform config, user profile, and circuit breaker",
      icon: Settings,
      section: "Navigation",
      action: () => onNavigate("settings"),
    },
    {
      id: "action-new-plan",
      title: "Create New Test Plan",
      subtitle: "Quickly launch the stepped plan builder",
      icon: Play,
      section: "Quick Actions",
      action: () => {
        if (onNewTestPlan) {
          onNewTestPlan();
        } else {
          onNavigate("plans");
        }
      },
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.subtitle.toLowerCase().includes(q) ||
      cmd.section.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          selected.action();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4"
          style={{ background: "var(--scrim)", backdropFilter: "blur(8px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-xl rounded-2xl overflow-hidden"
            style={{
              background: "var(--glass-strong)",
              backdropFilter: "blur(24px) saturate(160%)",
              WebkitBackdropFilter: "blur(24px) saturate(160%)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--shadow-panel), inset 0 1px 0 var(--glass-highlight)",
              color: "var(--text-1)",
            }}
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={SPRING.pop}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center px-4 py-3.5 gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <Search className="w-5 h-5 text-[var(--text-2)] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a command or search sections…"
                aria-label="Search commands"
                className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-[var(--text-3)] font-sans"
                style={{ color: "var(--text-1)" }}
              />
              <button
                onClick={onClose}
                aria-label="Close command palette"
                className="p-1 rounded-md text-[var(--text-3)] hover:text-[var(--text-1)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Command List */}
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-2)] font-mono">
                  No matching commands or routes found.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCommands.map((cmd, idx) => {
                    const Icon = cmd.icon;
                    const isSelected = idx === selectedIndex;
                    return (
                      <motion.div
                        key={cmd.id}
                        layout
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        role="option"
                        aria-selected={isSelected}
                        className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                          isSelected ? "text-[var(--accent)]" : "text-[var(--text-2)]"
                        }`}
                      >
                        {isSelected && (
                          <motion.span
                            layoutId="cmd-highlight"
                            className="absolute inset-0 rounded-xl"
                            style={{ background: "var(--accent-soft)" }}
                            transition={SPRING.layout}
                          />
                        )}
                        <div className="flex items-center gap-3 relative z-10">
                          <div
                            className="p-1.5 rounded-lg"
                            style={{
                              background: isSelected ? "var(--accent)" : "var(--field)",
                              color: isSelected ? "#fff" : "var(--text-2)",
                            }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[var(--text-1)] flex items-center gap-2">
                              <span>{cmd.title}</span>
                              <span
                                className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded"
                                style={{ background: "var(--field)", color: "var(--text-3)", border: "1px solid var(--border)" }}
                              >
                                {cmd.section}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-2)] truncate">{cmd.subtitle}</p>
                          </div>
                        </div>
                        <ArrowRight
                          className={`w-3.5 h-3.5 relative z-10 transition ${isSelected ? "" : "text-transparent"}`}
                          style={isSelected ? { color: "var(--accent)" } : undefined}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer shortcuts */}
            <div
              className="px-4 py-2 flex items-center justify-between text-[11px] font-mono text-[var(--text-3)]"
              style={{ borderTop: "1px solid var(--border)", background: "var(--field)" }}
            >
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="px-1.5 py-0.5 rounded" style={{ background: "var(--surface-solid)", border: "1px solid var(--border)" }}>↑</kbd>{" "}
                  <kbd className="px-1.5 py-0.5 rounded" style={{ background: "var(--surface-solid)", border: "1px solid var(--border)" }}>↓</kbd> navigate
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 rounded" style={{ background: "var(--surface-solid)", border: "1px solid var(--border)" }}>↵</kbd> select
                </span>
              </div>
              <span>
                <kbd className="px-1.5 py-0.5 rounded" style={{ background: "var(--surface-solid)", border: "1px solid var(--border)" }}>esc</kbd> close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
