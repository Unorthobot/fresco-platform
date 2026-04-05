'use client';

// Step-drop funnel for Evaluate journey mode
// Parses step descriptions from the user's text input looking for
// patterns like "Step 1 (landing): 8s avg" or "60% scroll, 2.1% click"

interface FunnelStep {
  label: string;
  value: number; // 0-100, extracted percentage or relative value
  note: string;
}

interface JourneyFunnelProps {
  subjectText: string; // The raw text from the 'subject' field in journey mode
}

// Extract a percentage from a string fragment
function extractPct(s: string): number | null {
  const m = s.match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : null;
}

// Parse step lines from the journey description
function parseSteps(text: string): FunnelStep[] {
  if (!text) return [];

  const lines = text.split(/[\n.]+/).map(l => l.trim()).filter(Boolean);
  const steps: FunnelStep[] = [];

  for (const line of lines) {
    // Look for numbered steps: "Step 1", "1.", "1/"
    const stepMatch = line.match(/^(?:step\s*)?(\d+)[.:)\/]?\s*(?:\(([^)]+)\))?\s*[:\-–]?\s*(.*)/i);
    if (stepMatch) {
      const label = stepMatch[2] || `Step ${stepMatch[1]}`;
      const rest = stepMatch[3] || '';
      const pct = extractPct(rest);
      steps.push({
        label: label.length > 20 ? label.slice(0, 19) + '…' : label,
        value: pct ?? -1, // -1 means no percentage found
        note: rest.slice(0, 60),
      });
    }
  }

  // If no step structure found, try to extract any percentage mentions
  if (steps.length === 0) {
    const pctMatches = text.matchAll(/([A-Za-z][^:.\n]{2,25})[:\s]+.*?(\d+(?:\.\d+)?)\s*%/g);
    for (const m of pctMatches) {
      steps.push({ label: m[1].trim().slice(0, 20), value: parseFloat(m[2]), note: '' });
    }
  }

  return steps.slice(0, 8);
}

export function JourneyFunnel({ subjectText }: JourneyFunnelProps) {
  const steps = parseSteps(subjectText);

  // Only render if we have steps with meaningful data
  const hasValues = steps.some(s => s.value > 0);
  if (steps.length < 2) return null;

  const W = 320;
  const barH = 28;
  const gap = 8;
  const H = steps.length * (barH + gap) + 8;
  const maxPct = hasValues ? Math.max(...steps.filter(s => s.value > 0).map(s => s.value)) : 100;

  // Normalise: if first step has no percentage, assume 100%
  const normalised = steps.map((s, i) => ({
    ...s,
    displayPct: s.value > 0 ? s.value : (i === 0 ? 100 : -1),
  }));

  if (!hasValues) {
    // No percentages — render as a plain step list with drop indicators
    return (
      <div className="space-y-1">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-5 h-5 border border-fresco-border flex items-center justify-center">
                <span className="text-[10px] text-fresco-graphite-light">{i + 1}</span>
              </div>
              {i < steps.length - 1 && <div className="w-px h-4 bg-fresco-border-light" />}
            </div>
            <div className="pb-2">
              <p className="text-fresco-xs font-medium text-fresco-black">{s.label}</p>
              {s.note && <p className="text-fresco-xs text-fresco-graphite-light mt-0.5">{s.note}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        {normalised.map((s, i) => {
          if (s.displayPct < 0) return null;
          const barW = Math.max(8, (s.displayPct / 100) * (W - 100));
          const y = i * (barH + gap);
          const prevPct = i > 0 ? (normalised[i - 1].displayPct) : s.displayPct;
          const drop = prevPct > 0 && s.displayPct > 0
            ? Math.round(prevPct - s.displayPct)
            : null;

          return (
            <g key={i}>
              {/* Bar */}
              <rect x={0} y={y + 2} width={barW} height={barH - 4}
                fill="#000000" fillOpacity={0.06 + (s.displayPct / 100) * 0.14}
                stroke="#000000" strokeOpacity={0.12} strokeWidth={0.5} />

              {/* Label */}
              <text x={barW + 8} y={y + barH / 2 + 1}
                dominantBaseline="middle"
                fontSize="9" fontFamily="Inter, -apple-system, sans-serif"
                fill="#555555">
                {s.label}
              </text>

              {/* Percentage */}
              <text x={barW - 4} y={y + barH / 2 + 1}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="9" fontFamily="Inter, -apple-system, sans-serif"
                fill="#000000" fontWeight="500"
                opacity={barW > 30 ? 1 : 0}>
                {s.displayPct.toFixed(1)}%
              </text>

              {/* Drop indicator */}
              {drop !== null && drop > 0 && i > 0 && (
                <text x={W - 4} y={y + barH / 2 + 1}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize="9" fontFamily="Inter, -apple-system, sans-serif"
                  fill="#AAAAAA">
                  −{drop}pp
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Step notes below */}
      {steps.some(s => s.note) && (
        <div className="mt-3 space-y-1">
          {steps.filter(s => s.note).map((s, i) => (
            <p key={i} className="text-fresco-xs text-fresco-graphite-light">
              <span className="font-medium text-fresco-graphite-mid">{s.label}:</span> {s.note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
