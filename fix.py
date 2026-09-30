import re

with open('apps/web/src/components/ReportDetailView.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add policySnapshot variable
code = code.replace(
    'const metrics = run.summaryMetrics;',
    'const metrics = run.summaryMetrics;\n  const policySnapshot = (run as any).policySnapshotJson ? JSON.parse((run as any).policySnapshotJson) : null;'
)

# Replace run.policySnapshot with policySnapshot
code = code.replace('run.policySnapshot', 'policySnapshot')

with open('apps/web/src/components/ReportDetailView.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
