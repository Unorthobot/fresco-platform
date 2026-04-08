'use client';

import { useState, useMemo } from 'react';

interface SimVariable {
  name: string;
  unit: string;
  currentValue: number;
  minValue: number;
  maxValue: number;
  sensitivityScore: number;
  direction: 'positive' | 'negative';
}

interface ScenarioModelProps {
  outcomeVariable: string;
  outcomeUnit: string;
  baselineValue: number;
  variables: SimVariable[];
}

export function ScenarioSimulation({ outcomeVariable, outcomeUnit, baselineValue, variables }: ScenarioModelProps) {
  const [sliders, setSliders] = useState<Record<string, number>>(
    Object.fromEntries(variables.map(v => [v.name, v.currentValue]))
  );

  const projectedOutcome = useMemo(() => {
    let delta = 0;
    for (const v of variables) {
      const range = v.maxValue - v.minValue || 1;
      const change = (sliders[v.name] - v.currentValue) / range;
      const weight = v.sensitivityScore / 10;
      const contribution = change * weight * (baselineValue * 0.5);
      delta += v.direction === 'positive' ? contribution : -contribution;
    }
    return Math.max(0, Math.round((baselineValue + delta) * 10) / 10);
  }, [sliders, variables, baselineValue]);

  const improvement = projectedOutcome - baselineValue;
  const improvePct = baselineValue > 0 ? ((improvement / baselineValue) * 100) : 0;

  const reset = () => {
    setSliders(Object.fromEntries(variables.map(v => [v.name, v.currentValue])));
  };

  const hasChanged = variables.some(v => sliders[v.name] !== v.currentValue);

  return (
    <div className="border border-fresco-border overflow-hidden">
      {/* Header — outcome display */}
      <div className="p-4 bg-fresco-light-gray border-b border-fresco-border">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1">{outcomeVariable}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-medium text-fresco-black tabular-nums">
                {projectedOutcome}{outcomeUnit}
              </span>
              {hasChanged && (
                <span className={`text-fresco-sm font-medium ${improvement > 0 ? 'text-fresco-black' : 'text-fresco-graphite-mid'}`}>
                  {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}{outcomeUnit}
                  {' '}
                  <span className="text-fresco-xs font-normal text-fresco-graphite-light">
                    ({improvePct > 0 ? '+' : ''}{improvePct.toFixed(0)}%)
                  </span>
                </span>
              )}
              {!hasChanged && (
                <span className="text-fresco-xs text-fresco-graphite-light">baseline</span>
              )}
            </div>
          </div>
          {hasChanged && (
            <button onClick={reset}
              className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors underline underline-offset-2">
              Reset
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-fresco-border rounded-full overflow-hidden">
          <div className="h-full bg-fresco-black rounded-full transition-all duration-200"
            style={{ width: `${Math.min(100, (projectedOutcome / (baselineValue * 2)) * 100)}%` }} />
        </div>
      </div>

      {/* Sliders */}
      <div className="p-4 space-y-5">
        <p className="text-fresco-xs text-fresco-graphite-light">Adjust variables to simulate impact on {outcomeVariable.toLowerCase()}</p>
        {[...variables].sort((a, b) => b.sensitivityScore - a.sensitivityScore).map((v, i) => {
          const val = sliders[v.name];
          const pct = ((val - v.minValue) / (v.maxValue - v.minValue)) * 100;
          const changed = val !== v.currentValue;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-fresco-xs font-medium text-fresco-black">{v.name}</span>
                  {/* Sensitivity indicator */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className={`w-1 h-1 rounded-full ${j < Math.round(v.sensitivityScore / 2) ? 'bg-fresco-black' : 'bg-fresco-border'}`} />
                    ))}
                  </div>
                </div>
                <span className={`text-fresco-xs tabular-nums ${changed ? 'text-fresco-black font-medium' : 'text-fresco-graphite-light'}`}>
                  {val}{v.unit}
                </span>
              </div>
              <div className="relative">
                <div className="h-1 bg-fresco-border rounded-full mb-1">
                  <div className="h-full bg-fresco-black rounded-full transition-all"
                    style={{ width: `${pct}%` }} />
                </div>
                <input type="range"
                  min={v.minValue} max={v.maxValue}
                  step={(v.maxValue - v.minValue) / 20}
                  value={val}
                  onChange={e => setSliders(prev => ({ ...prev, [v.name]: parseFloat(e.target.value) }))}
                  className="w-full h-1 absolute top-0 opacity-0 cursor-pointer"
                  style={{ zIndex: 1 }}
                />
                {/* Invisible range input overlay */}
                <input type="range"
                  min={v.minValue} max={v.maxValue}
                  step={(v.maxValue - v.minValue) / 20}
                  value={val}
                  onChange={e => setSliders(prev => ({ ...prev, [v.name]: parseFloat(e.target.value) }))}
                  className="w-full accent-fresco-black cursor-pointer"
                  style={{ marginTop: '-8px' }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-fresco-graphite-light mt-0.5">
                <span>{v.minValue}{v.unit}</span>
                <span>{v.maxValue}{v.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="px-4 pb-3 text-[10px] text-fresco-graphite-light">
        5 dots = highest sensitivity · Model based on agent analysis · Not a precise forecast
      </p>
    </div>
  );
}
