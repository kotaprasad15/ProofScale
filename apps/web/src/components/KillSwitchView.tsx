import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { Power, ShieldAlert, ShieldCheck } from "lucide-react";

/* =========================================================================
   Kill switch — full brutalist. No blur, no ambient motion. When someone
   reaches for this control, it should feel like flipping a physical breaker.
   ========================================================================= */

export function KillSwitchView() {
  const statusQuery = trpc.system.killSwitchStatus.useQuery();
  const toggleMutation = trpc.system.toggleKillSwitch.useMutation();
  const [confirm, setConfirm] = useState(false);

  const state = statusQuery.data;
  const enabled = state?.enabled ?? false;

  const handleToggle = async () => {
    try {
      await toggleMutation.mutateAsync({
        enabled: !enabled,
        reason: enabled ? undefined : "Operator emergency shutdown"
      });
      await statusQuery.refetch();
      setConfirm(false);
    } catch (err: any) {
      alert(err?.message || "Failed to toggle the kill switch.");
    }
  };

  return (
    <div className="brutalist p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-md bg-signal-rose/15 border-2 border-signal-rose flex items-center justify-center text-signal-rose shrink-0">
            <Power className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-text-primary tracking-tight uppercase">
              Emergency Kill Switch
            </h3>
            <p className="text-[11px] text-text-muted">
              Global abort — instantly terminates all active &amp; queued test runs.
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider border ${
            enabled
              ? "bg-signal-rose-soft text-signal-rose border-signal-rose/40"
              : "bg-signal-teal-soft text-signal-teal border-signal-teal/30"
          }`}
        >
          {enabled ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          {enabled ? "Engaged" : "Disarmed"}
        </span>
      </div>

      {/* State readout */}
      {enabled ? (
        <div className="space-y-1.5 border-t-2 border-signal-rose/30 pt-4 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-text-muted">STATUS</span>
            <span className="text-signal-rose font-bold uppercase">ACTIVE — RUNS BLOCKED</span>
          </div>
          {state?.reason && (
            <div className="flex justify-between gap-4">
              <span className="text-text-muted shrink-0">REASON</span>
              <span className="text-text-primary font-semibold text-right">{state.reason}</span>
            </div>
          )}
          {state?.activatedBy && (
            <div className="flex justify-between">
              <span className="text-text-muted">ACTIVATED BY</span>
              <span className="text-text-primary font-semibold">{state.activatedBy}</span>
            </div>
          )}
          {state?.activatedAt && (
            <div className="flex justify-between">
              <span className="text-text-muted">ACTIVATED AT</span>
              <span className="text-text-primary font-semibold">{new Date(state.activatedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="border-t-2 border-white/[0.08] pt-4 text-[11px] font-mono text-text-muted uppercase tracking-wider">
          Status: disarmed · run creation enabled
        </div>
      )}

      {/* Action */}
      {confirm ? (
        <div className="p-4 border-2 border-signal-rose bg-signal-rose-soft space-y-3">
          <p className="text-xs font-mono text-signal-rose leading-relaxed">
            {enabled
              ? "Disarm the kill switch and re-enable run creation for the whole control plane?"
              : "Engage the kill switch? This immediately aborts every active and queued run across the system and blocks new runs until disarmed."}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="flex-1 py-2.5 px-4 bg-white/[0.06] hover:bg-white/[0.1] text-text-primary text-xs font-bold uppercase rounded-md border border-white/[0.1] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleToggle}
              disabled={toggleMutation.isPending}
              className="flex-1 py-2.5 px-4 bg-signal-rose hover:bg-red-600 text-white text-xs font-bold uppercase rounded-md transition cursor-pointer disabled:opacity-60"
            >
              {toggleMutation.isPending ? "Executing…" : enabled ? "Yes, disarm" : "Yes, engage"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          disabled={toggleMutation.isPending}
          className="btn-destructive w-full py-3"
        >
          {enabled ? "Disarm kill switch" : "Engage kill switch"}
        </button>
      )}
    </div>
  );
}
