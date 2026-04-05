'use client';

// Verdict spectrum visualisation — Option A
// A horizontal axis showing where this verdict lands between STOP and GO,
// with fit strength shown as the confidence of the position.

interface VerdictVisualProps {
  verdict: string;
  fitStrength?: string;
  fitLabel?: string;
}

// Map verdict to position on axis (0 = STOP, 1 = GO)
const VERDICT_POSITION: Record<string, number> = {
  'STOP':                 0.08,
  'INVESTIGATE FURTHER':  0.38,
  'PIVOT':                0.65,
  'GO':                   0.92,
};

// Map fit strength to visual weight of the marker
const FIT_RADIUS: Record<string, number> = {
  'Strong': 7,
  'Shaky':  5,
  'Mixed':  5,
  'Weak':   5,
};

const FIT_OPACITY: Record<string, number> = {
  'Strong': 1,
  'Shaky':  0.55,
  'Mixed':  0.7,
  'Weak':   0.55,
};

export function VerdictVisual({ verdict, fitStrength, fitLabel }: VerdictVisualProps) {
  const position = VERDICT_POSITION[verdict] ?? 0.5;
  const radius = fitStrength ? (FIT_RADIUS[fitStrength] ?? 6) : 6;
  const opacity = fitStrength ? (FIT_OPACITY[fitStrength] ?? 0.8) : 0.8;

  const W = 400;
  const H = 56;
  const AXIS_Y = 28;
  const AXIS_X1 = 24;
  const AXIS_X2 = W - 24;
  const AXIS_W = AXIS_X2 - AXIS_X1;

  const markerX = AXIS_X1 + position * AXIS_W;

  // Tick positions for each verdict
  const ticks = [
    { label: 'STOP',          x: AXIS_X1 + 0.08 * AXIS_W },
    { label: 'MORE SIGNAL',   x: AXIS_X1 + 0.38 * AXIS_W },
    { label: 'PIVOT',         x: AXIS_X1 + 0.65 * AXIS_W },
    { label: 'GO',            x: AXIS_X1 + 0.92 * AXIS_W },
  ];

  const displayVerdict = verdict === 'INVESTIGATE FURTHER' ? 'Needs more signal' : verdict;
  const displayFit = fitStrength === 'Undecided' ? 'Mixed' : fitStrength;

  return (
    <div className="space-y-1">
      {/* SVG axis */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        aria-label={`Verdict: ${displayVerdict}${displayFit ? `, fit strength: ${displayFit}` : ''}`}
      >
        {/* Axis line */}
        <line
          x1={AXIS_X1} y1={AXIS_Y}
          x2={AXIS_X2} y2={AXIS_Y}
          stroke="#E5E5E5"
          strokeWidth="1.5"
        />

        {/* Tick marks */}
        {ticks.map(tick => (
          <line
            key={tick.label}
            x1={tick.x} y1={AXIS_Y - 4}
            x2={tick.x} y2={AXIS_Y + 4}
            stroke="#D0D0D0"
            strokeWidth="1"
          />
        ))}

        {/* Filled track from left to marker */}
        <line
          x1={AXIS_X1} y1={AXIS_Y}
          x2={markerX} y2={AXIS_Y}
          stroke="#000000"
          strokeWidth="1.5"
          opacity={0.25}
        />

        {/* Marker — outer ring (fit confidence) */}
        {fitStrength && fitStrength !== 'Strong' && (
          <circle
            cx={markerX}
            cy={AXIS_Y}
            r={radius + 4}
            fill="none"
            stroke="#000000"
            strokeWidth="1"
            opacity={0.15}
            strokeDasharray="3 2"
          />
        )}

        {/* Marker — solid dot */}
        <circle
          cx={markerX}
          cy={AXIS_Y}
          r={radius}
          fill="#000000"
          opacity={opacity}
        />

        {/* Verdict label above marker */}
        <text
          x={markerX}
          y={AXIS_Y - radius - 6}
          textAnchor={position < 0.15 ? 'start' : position > 0.85 ? 'end' : 'middle'}
          fontSize="10"
          fontWeight="600"
          fontFamily="Inter, -apple-system, sans-serif"
          fill="#000000"
          letterSpacing="0.08em"
        >
          {displayVerdict.toUpperCase()}
        </text>

        {/* Axis end labels */}
        <text
          x={AXIS_X1}
          y={AXIS_Y + 16}
          textAnchor="start"
          fontSize="9"
          fontFamily="Inter, -apple-system, sans-serif"
          fill="#BBBBBB"
          letterSpacing="0.06em"
        >
          STOP
        </text>
        <text
          x={AXIS_X2}
          y={AXIS_Y + 16}
          textAnchor="end"
          fontSize="9"
          fontFamily="Inter, -apple-system, sans-serif"
          fill="#BBBBBB"
          letterSpacing="0.06em"
        >
          GO
        </text>
      </svg>

      {/* Fit strength label */}
      {displayFit && fitLabel && (
        <p className="text-fresco-xs text-fresco-graphite-light">
          <span className="font-medium text-fresco-graphite-mid">{displayFit} fit</span>
          {' · '}
          {fitLabel}
        </p>
      )}
    </div>
  );
}
