import React from "react";
import { InAppToast } from "../../hooks/useNotifications";
import { AlertOctagon, AlertTriangle, CheckCircle2, ExternalLink, X } from "lucide-react";

interface ToastContainerProps {
  toasts: InAppToast[];
  onDismiss: (id: string) => void;
  onNavigate?: (url: string) => void;
}

export function ToastContainer({ toasts, onDismiss, onNavigate }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const isCritical = toast.severity === "critical";
        const isWarning = toast.severity === "warning";

        const borderColor = isCritical
          ? "border-signal-rose/50 bg-ink-950/95 shadow-signal-rose/20"
          : isWarning
          ? "border-signal-amber/50 bg-ink-950/95 shadow-signal-amber/20"
          : "border-signal-teal/50 bg-ink-950/95 shadow-signal-teal/20";

        const iconColor = isCritical
          ? "text-signal-rose"
          : isWarning
          ? "text-signal-amber"
          : "text-signal-teal";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border p-4 shadow-xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${borderColor}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-xl bg-white/[0.05] shrink-0 ${iconColor}`}>
                {isCritical ? (
                  <AlertOctagon className="w-5 h-5" />
                ) : isWarning ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-text-primary truncate">
                    {toast.title}
                  </h4>
                  <button
                    onClick={() => onDismiss(toast.id)}
                    className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.05] transition cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2">
                  {toast.body}
                </p>

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
                    className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-signal-indigo hover:text-signal-indigo/80 transition cursor-pointer"
                  >
                    <span>View Report</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
