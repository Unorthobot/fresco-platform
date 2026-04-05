'use client';

// Horizontal bar chart for Validate metrics — target vs actual comparison
// Data: [{ metric, target, actual }]

interface MetricRow { metric: string; target: string; actual: string; }

interface MetricsBarProps {
  metrics: MetricRow[];
}

// Try to extract a numeric value from strings like "$1,240", "15%", "34 days"
function extractNumber(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[$,£€%]/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function extractUnit(s: string): string {
  if (!s) return '';
  if (s.includes('%')) return '%';
  if (s.includes('$') || s.includes('£') || s.includes('€')) return s.match(/[$£€]/)?.[0] || '';
  if (s.toLowerCase().includes('day')) return 'd';
  if (s.toLowerCase().includes('mo')) return '/mo';
  return '';
}

export function MetricsBar({ metrics }: MetricsBarProps) {
  const rows = metrics.filter(r => r.metric?.trim());
  if (rows.length === 0) return null;

  // Only render rows where we can parse both numbers
  const parseable = rows
    .map(r => ({
      metric: r.metric,
      targetRaw: r.target,
      actualRaw: r.actual,
      targetN: extractNumber(r.target),
      actualN: extractNumber(r.actual),
      unit: extractUnit(r.target) || extractUnit(r.actual),
    }))
    .filter(r => r.targetN !== null && r.actualN !== null);

  if (parseable.length === 0) {
    // Fallback: render as a plain comparison table
    return (
      <div className="border border-fresco-border overflow-hidden">
        <div className="grid grid-cols-3 bg-fresco-light-gray border-b border-fresco-border">
          {['Metric', 'Target', 'Actual'].map(h => (
            <div key={h} className="px-3 py-2 text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wide">{h}</div>
          ))}
        </div>
        {rows.map((r, i) => {
          const tN = extractNumber(r.target);
          const aN = extractNumber(r.actual);
          // Lower is better for cost/time metrics (CAC, days), higher for conversion/volume
          const lowerIsBetter = r.metric.toLowerCase().includes('cac') ||
            r.metric.toLowerCase().includes('cost') ||
            r.metric.toLowerCase().includes('time') ||
            r.metric.toLowerCase().includes('day');
          const onTrack = tN !== null && aN !== null
            ? (lowerIsBetter ? aN <= tN : aN >= tN)
            : null;
          return (
            <div key={i} className="grid grid-cols-3 border-b border-fresco-border-light last:border-0">
              <div className="px-3 py-2.5 text-fresco-sm text-fresco-black">{r.metric}</div>
              <div className="px-3 py-2.5 text-fresco-sm text-fresco-graphite-mid">{r.target || '—'}</div>
              <div className={`px-3 py-2.5 text-fresco-sm font-medium flex items-center gap-1.5 ${onTrack === true ? 'text-fresco-black' : onTrack === false ? 'text-fresco-graphite-mid' : 'text-fresco-black'}`}>
                {r.actual || '—'}
                {onTrack === true && <span className="text-[10px] text-fresco-graphite-light">✓</span>}
                {onTrack === false && <span className="text-[10px] text-fresco-graphite-light">↓</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Bar chart — normalise to max across targets and actuals
  const allValues = parseable.flatMap(r => [r.targetN!, r.actualN!]);
  const maxVal = Math.max(...allValues) * 1.15; // 15% headroom

  return (
    <div className="space-y-4">
      {parseable.map((r, i) => {
        const targetPct = ((r.targetN!) / maxVal) * 100;
        const actualPct = ((r.actualN!) / maxVal) * 100;

        // Lower is better heuristic
        const lowerIsBetter = r.metric.toLowerCase().includes('cac') ||
          r.metric.toLowerCase().includes('cost') ||
          r.metric.toLowerCase().includes('time') ||
          r.metric.toLowerCase().includes('day') ||
          r.metric.toLowerCase().includes('churn');
        const onTrack = lowerIsBetter
          ? r.actualN! <= r.targetN!
          : r.actualN! >= r.targetN!;

        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-fresco-xs font-medium text-fresco-black">{r.metric}</span>
              <span className="text-fresco-xs text-fresco-graphite-light tabular-nums">
                {r.unit}{r.actualN?.toLocaleString()} <span className="text-fresco-graphite-light/50">vs {r.unit}{r.targetN?.toLocaleString()} target</span>
              </span>
            </div>
            {/* Target bar */}
            <div className="relative h-4 mb-1">
              <div className="absolute inset-0 bg-fresco-border rounded-sm" />
              <div
                className="absolute left-0 top-0 h-full bg-fresco-border-light rounded-sm transition-all"
                style={{ width: `${targetPct}%` }}
              />
              {/* Target line */}
              <div
                className="absolute top-0 h-full w-px bg-fresco-graphite-light"
                style={{ left: `${targetPct}%` }}
              />
              {/* Actual bar */}
              <div
                className={`absolute left-0 top-1 h-2 rounded-sm transition-all ${onTrack ? 'bg-fresco-black opacity-80' : 'bg-fresco-graphite-mid opacity-60'}`}
                style={{ width: `${actualPct}%` }}
              />
            </div>
            <div className="flex items-center gap-3 text-[10px] text-fresco-graphite-light">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 bg-fresco-graphite-light" /> target
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-1.5 bg-fresco-graphite-mid rounded-sm opacity-60" /> actual
                {onTrack
                  ? <span className="text-fresco-black font-medium ml-1">on track</span>
                  : <span className="text-fresco-graphite-mid ml-1">off target</span>}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
