import React, { useState, useEffect, useRef } from "react";
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
  ExternalLink
} from "lucide-react";

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
  onNewTestPlan
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
      action: () => onNavigate("projects")
    },
    {
      id: "nav-targets",
      title: "Target Endpoints",
      subtitle: "Manage authorized URLs and environments",
      icon: Target,
      section: "Navigation",
      action: () => onNavigate("targets")
    },
    {
      id: "nav-plans",
      title: "Test Plans & Envelopes",
      subtitle: "Configure bounded load profiles and thresholds",
      icon: PlaySquare,
      section: "Navigation",
      action: () => onNavigate("plans")
    },
    {
      id: "nav-runs",
      title: "Live Test Runs",
      subtitle: "Monitor active telemetry and execution queue",
      icon: Activity,
      section: "Navigation",
      action: () => onNavigate("runs")
    },
    {
      id: "nav-reports",
      title: "Readiness Reports",
      subtitle: "Inspect empirical scores, SLA checks, and findings",
      icon: FileText,
      section: "Navigation",
      action: () => onNavigate("reports")
    },
    {
      id: "nav-org",
      title: "Organization & RBAC",
      subtitle: "Members, invitations, and access controls",
      icon: Users,
      section: "Navigation",
      action: () => onNavigate("organization")
    },
    {
      id: "nav-settings",
      title: "Settings & Kill Switch",
      subtitle: "Platform config, user profile, and circuit breaker",
      icon: Settings,
      section: "Navigation",
      action: () => onNavigate("settings")
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
      }
    }
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

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-ink-900 border border-[var(--border-strong)] shadow-2xl overflow-hidden text-text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border)] gap-3">
          <Search className="w-5 h-5 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search sections..."
            className="flex-1 bg-transparent border-0 outline-none text-sm text-text-primary placeholder:text-text-faint font-sans"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-faint hover:text-text-primary hover:bg-[var(--white-fill-sm)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[var(--border)]">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted font-mono">
              No matching commands or routes found.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((cmd, idx) => {
                const Icon = cmd.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={cmd.id}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition ${
                      isSelected
                        ? "bg-signal-indigo/15 text-signal-indigo border border-signal-indigo/30"
                        : "text-text-muted hover:text-text-primary hover:bg-[var(--white-fill-sm)] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isSelected ? "bg-signal-indigo text-white" : "bg-[var(--white-fill-sm)] text-text-muted"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-text-primary flex items-center gap-2">
                          <span>{cmd.title}</span>
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-[var(--white-fill-sm)] text-text-faint border border-[var(--border)]">
                            {cmd.section}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted truncate">{cmd.subtitle}</p>
                      </div>
                    </div>
                    <ArrowRight className={`w-3.5 h-3.5 transition ${isSelected ? "text-signal-indigo" : "text-transparent"}`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-[var(--white-fill-sm)] border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-text-faint">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--white-fill-md)] text-text-muted border border-[var(--border)]">↑</kbd>{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--white-fill-md)] text-text-muted border border-[var(--border)]">↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--white-fill-md)] text-text-muted border border-[var(--border)]">↵</kbd> select
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--white-fill-md)] text-text-muted border border-[var(--border)]">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
