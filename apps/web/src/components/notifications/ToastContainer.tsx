import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InAppToast } from "../../hooks/useNotifications";
import { AlertOctagon, AlertTriangle, CheckCircle2, ExternalLink, X } from "lucide-react";
import { toastVariants } from "../../motion/tokens";

interface ToastContainerProps {
  toasts: InAppToast[];
  onDismiss: (id: string) => void;
  onNavigate?: (url: string) => void;
}

const SEVERITY = {
  critical: { icon: AlertOctagon, color: "var(--danger)" },
  warning: { icon: AlertTriangle, color: "var(--warning)" },
  info: { icon: CheckCircle2, color: "var(--success)" },
} as const;

/**
 * Glass toast stack. Notifications slide in from the top-right with a spring
 * pop and animate out on dismiss. aria-live announces them politely.
 */
export function ToastContainer({ toasts, onDismiss, onNavigate }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const sev = SEVERITY[toast.severity] ?? SEVERITY.info;
          const Icon = sev.icon;

          return (
            <motion.div
              key={toast.id}
              layout
              variants={toastVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              role="status"
              className="pointer-events-auto rounded-2xl p-4"
              style={{
                background: "var(--glass-strong)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
                border: `1px solid color-mix(in srgb, ${sev.color} 35%, transparent)`,
                boxShadow: `var(--shadow-panel), 0 0 24px -10px color-mix(in srgb, ${sev.color} 45%, transparent)`,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="p-1.5 rounded-xl shrink-0"
                  style={{
                    background: `color-mix(in srgb, ${sev.color} 12%, transparent)`,
                    color: sev.color,
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-[var(--text-1)] truncate">{toast.title}</h4>
                    <button
                      onClick={() => onDismiss(toast.id)}
                      aria-label="Dismiss notification"
                      className="p-1 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-[var(--text-2)] mt-1 leading-relaxed line-clamp-2">{toast.body}</p>

                  {toast.linkUrl && (
                    <button
                      onClick={() => {
                        onDismiss(toast.id);
                        if (onNavigate) {
                          onNavigate(toast.linkUrl!);
                        } else {
                          window.location.href = toast.linkUrl!;
                        }
                      }}
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium cursor-pointer transition-opacity hover:opacity-80"
                      style={{ color: "var(--accent)" }}
                    >
                      <span>View Report</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
