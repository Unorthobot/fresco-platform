'use client';

// Behavior Over Time Graph (BOTG) — a core systems thinking tool.
// Shows how key variables change over time and projects forward.
// Rendered as a clean SVG line chart, monochrome.

interface DataPoint {
  label: string;
  value: number;
}

interface BotgSeries {
  variable: string;
  unit: string;
  dataPoints: DataPoint[];
  trend: 'rising' | 'falling' | 'oscillating' | 'plateauing' | 'accelerating';
  projection?: DataPoint[];
}

interface BehaviorOverTimeChartProps {
  series: BotgSeries[];
}

const TREND_LABELS: Record<string, string> = {
  rising:        '↑ Rising',
  falling:       '↓ Falling',
  oscillating:   '⟳ Oscillating',
  plateauing:    '→ Plateauing',
  accelerating:  '↑↑ Accelerating',
};

function SingleSeries({ s }: { s: BotgSeries }) {
  const allPoints = [...s.dataPoints, ...(s.projection || [])];
  if (allPoints.length < 2) return null;

  const values = allPoints.map(p => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const W = 320, H = 100;
  const PAD = { top: 16, right: 12, bottom: 28, left: 32 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const toX = (i: number, total: number) => PAD.left + (i / (total - 1)) * plotW;
  const toY = (v: number) => PAD.top + plotH - ((v - minV) / range) * plotH;

  const histCount = s.dataPoints.length;
  const totalCount = allPoints.length;

  // Historical path
  const histPath = s.dataPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i, totalCount).toFixed(1)} ${toY(p.value).toFixed(1)}`)
    .join(' ');

  // Projection path (starts at last historical point)
  const projPath = s.projection && s.projection.length > 0
    ? [s.dataPoints[s.dataPoints.length - 1], ...s.projection]
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(histCount - 1 + i, totalCount).toFixed(1)} ${toY(p.value).toFixed(1)}`)
        .join(' ')
    : null;

  // Y axis tick values
  const yTicks = [minV, (minV + maxV) / 2, maxV].map(v => ({
    v, y: toY(v),
  }));

  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <p className="text-fresco-xs font-medium text-fresco-black">{s.variable}</p>
        <span className="text-[10px] text-fresco-graphite-light">{TREND_LABELS[s.trend] || s.trend}</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="overflow-visible">
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
              stroke="#E8E8E8" strokeWidth="1" />
            <text x={PAD.left - 4} y={t.y} textAnchor="end" dominantBaseline="middle"
              fontSize="8" fill="#BBBBBB" fontFamily="Inter, sans-serif">
              {Math.round(t.v)}{s.unit === '%' ? '%' : ''}
            </text>
          </g>
        ))}

        {/* Projection zone fill */}
        {projPath && s.projection && s.projection.length > 0 && (() => {
          const projPoints = [s.dataPoints[s.dataPoints.length - 1], ...s.projection];
          const areaPath = projPoints
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(histCount - 1 + i, totalCount).toFixed(1)} ${toY(p.value).toFixed(1)}`)
            .join(' ') +
            ` L ${toX(totalCount - 1, totalCount).toFixed(1)} ${(PAD.top + plotH).toFixed(1)}` +
            ` L ${toX(histCount - 1, totalCount).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} Z`;
          return (
            <path d={areaPath} fill="#000000" fillOpacity="0.04" />
          );
        })()}

        {/* Divider between historical and projected */}
        {s.projection && s.projection.length > 0 && (
          <line
            x1={toX(histCount - 1, totalCount)}
            y1={PAD.top}
            x2={toX(histCount - 1, totalCount)}
            y2={PAD.top + plotH}
            stroke="#D0D0D0" strokeWidth="1" strokeDasharray="3 2"
          />
        )}

        {/* Historical line */}
        <path d={histPath} fill="none" stroke="#000000" strokeWidth="1.5" strokeOpacity="0.8" />

        {/* Projection line */}
        {projPath && (
          <path d={projPath} fill="none" stroke="#000000" strokeWidth="1.5"
            strokeOpacity="0.35" strokeDasharray="4 3" />
        )}

        {/* Data point dots — historical */}
        {s.dataPoints.map((p, i) => (
          <circle key={i}
            cx={toX(i, totalCount)} cy={toY(p.value)} r="2.5"
            fill="#000000" fillOpacity="0.8"
          />
        ))}

        {/* Projection dots */}
        {s.projection?.map((p, i) => (
          <circle key={i}
            cx={toX(histCount + i, totalCount)} cy={toY(p.value)} r="2"
            fill="none" stroke="#000000" strokeWidth="1.5" strokeOpacity="0.4"
          />
        ))}

        {/* X axis labels */}
        {allPoints.map((p, i) => {
          // Show only first, last, and middle labels to avoid crowding
          const show = i === 0 || i === allPoints.length - 1 || i === Math.floor(allPoints.length / 2);
          if (!show) return null;
          const isProjected = i >= histCount;
          return (
            <text key={i}
              x={toX(i, totalCount)} y={H - 4}
              textAnchor="middle" fontSize="8"
              fill={isProjected ? '#BBBBBB' : '#888888'}
              fontFamily="Inter, sans-serif"
              fontStyle={isProjected ? 'italic' : 'normal'}>
              {p.label}
            </text>
          );
        })}

        {/* "Projected" label */}
        {s.projection && s.projection.length > 0 && (
          <text
            x={toX(histCount + (s.projection.length / 2), totalCount)}
            y={PAD.top + 8}
            textAnchor="middle" fontSize="7"
            fill="#CCCCCC" fontFamily="Inter, sans-serif"
            letterSpacing="0.05em">
            PROJECTED
          </text>
        )}
      </svg>
    </div>
  );
}

export function BehaviorOverTimeChart({ series }: BehaviorOverTimeChartProps) {
  const validSeries = series.filter(s => s.dataPoints && s.dataPoints.length >= 2);
  if (validSeries.length === 0) return null;

  return (
    <div>
      {validSeries.map((s, i) => (
        <SingleSeries key={i} s={s} />
      ))}
      <p className="text-[10px] text-fresco-graphite-light mt-1">
        Dashed line = projected trajectory · Based on patterns in the input
      </p>
    </div>
  );
}
