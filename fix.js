const fs = require('fs');

let code = fs.readFileSync('apps/web/src/components/ReportDetailView.tsx', 'utf8');

const replacement = `{(() => {
  if (!run.policySnapshotJson) return null;
  try {
    const snapshot = JSON.parse(run.policySnapshotJson);
    return (
      <div className="glass-panel p-6 sm:p-8 space-y-6 border-l-4" style={{ borderColor: snapshot.result === "pass" ? "#2FD4A6" : snapshot.result === "fail" ? "#F2586B" : "#F0A63A" }}>
        <div>
          <h3 className="text-base font-semibold text-text-primary">Policy Evaluation Result</h3>
          <div className="text-xs font-mono mt-1" style={{ color: snapshot.result === "pass" ? "#2FD4A6" : snapshot.result === "fail" ? "#F2586B" : "#F0A63A" }}>
            Status: {snapshot.result.toUpperCase()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase">Rule Results</h4>
            {snapshot.rules?.map((rule: any, idx: number) => (
              <div key={idx} className="bg-ink-900 border border-white/[0.08] p-3 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-medium text-text-primary">{rule.metric}</span>
                  <span className="text-[10px] uppercase font-bold" style={{ color: rule.passed ? "#2FD4A6" : "#F2586B" }}>
                    {rule.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
                <div className="text-[10px] text-text-muted font-mono">
                  Value: {rule.actualValue} (Op: {rule.operator} {rule.threshold})
                </div>
              </div>
            ))}
          </div>

          {snapshot.baselineComparison && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-text-muted uppercase">Baseline Comparison</h4>
              <div className="bg-ink-900 border border-white/[0.08] p-3 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted">Regression Detected</span>
                  <span className="font-mono font-bold" style={{ color: snapshot.baselineComparison.isRegression ? "#F2586B" : "#2FD4A6" }}>
                    {snapshot.baselineComparison.isRegression ? "YES" : "NO"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted">Improvement Detected</span>
                  <span className="font-mono font-bold" style={{ color: snapshot.baselineComparison.isImprovement ? "#2FD4A6" : "var(--text-3)" }}>
                    {snapshot.baselineComparison.isImprovement ? "YES" : "NO"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted">Score Delta</span>
                  <span className="font-mono">
                    {snapshot.baselineComparison.scoreDelta > 0 ? "+" : ""}{snapshot.baselineComparison.scoreDelta}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-muted">Baseline Run ID</span>
                  <span className="font-mono">{snapshot.baselineComparison.baselineRunId}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (e) {
    return null;
  }
})()}`;

code = code.replace(/\{run\.policySnapshotJson && \([\s\S]*?\)\}/, replacement);
fs.writeFileSync('apps/web/src/components/ReportDetailView.tsx', code);
