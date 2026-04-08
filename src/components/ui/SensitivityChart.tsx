'use client';

interface SensVar {
  name: string;
  impact: number;       // 0-10
  direction: 'positive' | 'negative';
  note: string;
}

interface SensitivityChartProps {
  outcomeVariable: string;
  variables: SensVar[];
}

export function SensitivityChart({ outcomeVariable, variables }: SensitivityChartProps) {
  if (!variables?.length) return null;

  const sorted = [...variables].sort((a, b) => b.impact - a.impact);
  const maxImpact = 10;

  return (
    <div>
      <p className="text-fresco-xs text-fresco-graphite-light mb-4">
        Which variables have the most impact on <span className="font-medium text-fresco-black">{outcomeVariable}</span>
      </p>
      <div className="space-y-3">
        {sorted.map((v, i) => {
          const pct = (v.impact / maxImpact) * 100;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-fresco-xs font-medium text-fresco-black">{v.name}</span>
                  <span className={`text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 ${
                    v.direction === 'positive'
                      ? 'text-fresco-black bg-fresco-light-gray'
                      : 'text-fresco-graphite-mid bg-fresco-light-gray'
                  }`}>
                    {v.direction === 'positive' ? '↑ helps' : '↓ hurts'}
                  </span>
                </div>
                <span className="text-fresco-xs text-fresco-graphite-light tabular-nums">{v.impact}/10</span>
              </div>
              <div className="h-2 bg-fresco-border rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all"
                  style={{
                    width: `${pct}%`,
                    background: i === 0 ? '#000000' : `rgba(0,0,0,${0.7 - i * 0.12})`,
                  }}
                />
              </div>
              {v.note && (
                <p className="text-[10px] text-fresco-graphite-light mt-0.5">{v.note}</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-fresco-graphite-light mt-3">
        Ranked by estimated impact · Darker = highest leverage
      </p>
    </div>
  );
}
