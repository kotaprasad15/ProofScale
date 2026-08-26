import React from "react";
import { Activity, CheckCircle2, Gauge, ShieldCheck, Zap } from "lucide-react";
import { LoadingDots } from "./LoadingDots";

export function MetricPreview() {
  return (
    <div className="metric-preview">
      <div className="metric-preview-top">
        <div className="service-ident">
          <span className="service-icon">
            <Activity size={20} />
          </span>
          <div>
            <strong>Payment Gateway Service</strong>
            <small>api.staging.internal / v2 / checkout</small>
          </div>
        </div>
        <span className="status-pill success">
          <i /> Conditionally ready
        </span>
      </div>

      <div className="metric-preview-body">
        <div className="score-hero">
          <span>READINESS SCORE</span>
          <strong>
            96<small>/100</small>
          </strong>
          <p>
            <CheckCircle2 size={15} /> Passes declared SLA thresholds
          </p>
        </div>

        <div className="metric-grid">
          <div>
            <span>
              p95 latency <Activity size={14} />
            </span>
            <strong>
              380 <small>ms</small>
            </strong>
            <em>Target: &lt; 500ms</em>
          </div>

          <div>
            <span>
              Throughput <Zap size={14} />
            </span>
            <strong>
              482 <small>RPS</small>
            </strong>
            <em>Zero dropouts</em>
          </div>

          <div>
            <span>
              Error rate <ShieldCheck size={14} />
            </span>
            <strong className="success-ink">
              0.00<small>%</small>
            </strong>
            <em>0 / 28,920 reqs</em>
          </div>

          <div>
            <span>
              Test envelope <Gauge size={14} />
            </span>
            <strong>
              25 <small>VUs · 60s</small>
            </strong>
            <em>Bounded ramp</em>
          </div>
        </div>
      </div>

      <div className="metric-preview-note">
        <span>ⓘ</span>
        <p>
          <b>Validity envelope:</b> score is valid only within the declared workload. It does not represent unconditional production capacity.
        </p>
        <LoadingDots size="sm" label="Assessment engine online" />
      </div>
    </div>
  );
}
