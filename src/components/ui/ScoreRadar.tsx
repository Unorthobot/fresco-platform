'use client';

// Radar chart for Validate scorecard — renders criteria scores as a polygon
// Data: [{ label, score (1-10), note }]

interface ScoreRow { label: string; score: number; note?: string; }

interface ScoreRadarProps {
  scores: ScoreRow[];
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function ScoreRadar({ scores }: ScoreRadarProps) {
  if (!scores || scores.length < 3) return null;

  const cx = 160, cy = 140, maxR = 100;
  const n = scores.length;
  const step = 360 / n;

  // Grid rings at 2.5, 5, 7.5, 10
  const rings = [2.5, 5, 7.5, 10];

  const pointsForScore = (score: number) =>
    scores.map((_, i) => {
      const r = (score / 10) * maxR;
      return polarToCartesian(cx, cy, r, i * step);
    });

  const scorePolygon = pointsForScore(0);
  // Build actual score polygon
  const dataPoints = scores.map((s, i) => {
    const r = (s.score / 10) * maxR;
    return polarToCartesian(cx, cy, r, i * step);
  });

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  // Axis lines
  const axes = scores.map((_, i) => {
    const outer = polarToCartesian(cx, cy, maxR, i * step);
    return { x: outer.x, y: outer.y };
  });

  // Label positions — slightly further out than the grid
  const labelR = maxR + 18;
  const labels = scores.map((s, i) => {
    const pos = polarToCartesian(cx, cy, labelR, i * step);
    const angle = i * step;
    const anchor = angle < 10 || angle > 350 ? 'middle'
      : angle < 170 ? 'start'
      : angle < 190 ? 'middle'
      : 'end';
    return { ...pos, label: s.label, score: s.score, anchor };
  });

  const W = 320, H = 280;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        {/* Grid rings */}
        {rings.map(r => {
          const pts = Array.from({ length: n }, (_, i) => {
            const rPx = (r / 10) * maxR;
            return polarToCartesian(cx, cy, rPx, i * step);
          });
          return (
            <polygon
              key={r}
              points={pts.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#E5E5E5"
              strokeWidth="1"
            />
          );
        })}

        {/* Ring labels — just the midpoint ring */}
        {[5, 10].map(r => {
          const pos = polarToCartesian(cx, cy, (r / 10) * maxR, 0);
          return (
            <text key={r} x={pos.x + 3} y={pos.y - 3}
              fontSize="7" fill="#CCCCCC" fontFamily="Inter, sans-serif">
              {r}
            </text>
          );
        })}

        {/* Axis lines */}
        {axes.map((ax, i) => (
          <line key={i} x1={cx} y1={cy} x2={ax.x} y2={ax.y}
            stroke="#E5E5E5" strokeWidth="1" />
        ))}

        {/* Data polygon — fill */}
        <polygon
          points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="#000000"
          fillOpacity="0.06"
          stroke="#000000"
          strokeWidth="1.5"
          strokeOpacity="0.7"
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3"
            fill="#000000" fillOpacity="0.8" />
        ))}

        {/* Labels */}
        {labels.map((l, i) => (
          <g key={i}>
            <text
              x={l.x} y={l.y}
              textAnchor={l.anchor as any}
              dominantBaseline="middle"
              fontSize="9"
              fontFamily="Inter, -apple-system, sans-serif"
              fill="#555555"
              fontWeight="500"
            >
              {l.label.length > 14 ? l.label.slice(0, 13) + '…' : l.label}
            </text>
            <text
              x={l.x} y={l.y + 11}
              textAnchor={l.anchor as any}
              dominantBaseline="middle"
              fontSize="9"
              fontFamily="Inter, -apple-system, sans-serif"
              fill="#AAAAAA"
            >
              {l.score}/10
            </text>
          </g>
        ))}
      </svg>

      {/* Score summary bar */}
      <div className="mt-3 space-y-1.5">
        {scores.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-fresco-xs text-fresco-graphite-light w-24 flex-shrink-0 truncate">{s.label}</span>
            <div className="flex-1 h-1 bg-fresco-border rounded-full overflow-hidden">
              <div
                className="h-full bg-fresco-black rounded-full transition-all"
                style={{ width: `${(s.score / 10) * 100}%`, opacity: 0.7 + (s.score / 10) * 0.3 }}
              />
            </div>
            <span className="text-fresco-xs font-medium text-fresco-black tabular-nums w-8 text-right">{s.score}/10</span>
          </div>
        ))}
      </div>
    </div>
  );
}
