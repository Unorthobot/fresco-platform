'use client';

// Systems thinking output sections — rendered in the house session output panel.
// Each house gets different sections based on its simulation type.

import { cn } from '@/lib/utils';
import { ArchetypeCard } from './ArchetypeCard';
import { ScenarioSimulation } from './ScenarioSimulation';
import { StockFlowDiagram } from './StockFlowDiagram';
import { CausalLoopDiagram } from './CausalLoopDiagram';
import { SensitivityChart } from './SensitivityChart';
import { IPOMap } from './IPOMap';
import { BehaviorOverTimeChart } from './BehaviorOverTimeChart';

interface SystemsOutputProps {
  house: string;
  systemsOutput: any;
}

// ── Shared ──────────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="fresco-label block mb-3">{label}</span>
      {children}
    </div>
  );
}

// ── Investigate: Iceberg + Current State Simulation ──────────────────────────

function IcebergView({ levels }: { levels: { event: string; pattern: string; structure: string; mentalModel: string } }) {
  const rows = [
    { label: 'Event', desc: 'What is visible', value: levels.event, depth: 1 },
    { label: 'Pattern', desc: 'What keeps recurring', value: levels.pattern, depth: 2 },
    { label: 'Structure', desc: 'What produces the pattern', value: levels.structure, depth: 3 },
    { label: 'Mental model', desc: 'What belief keeps it in place', value: levels.mentalModel, depth: 4 },
  ];

  return (
    <div className="space-y-1">
      {rows.map((row, i) => (
        <div key={i} className={cn(
          'flex items-start gap-3 p-3 border-l-2',
          i === 0 ? 'border-fresco-border bg-white' :
          i === 1 ? 'border-fresco-border bg-fresco-light-gray/40 ml-2' :
          i === 2 ? 'border-fresco-graphite-light bg-fresco-light-gray/60 ml-4' :
          'border-fresco-black bg-fresco-light-gray ml-6'
        )}>
          <div className="flex-shrink-0 w-24">
            <p className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light">{row.label}</p>
            <p className="text-[9px] text-fresco-graphite-light/60 mt-0.5 leading-tight">{row.desc}</p>
          </div>
          <p className="text-fresco-xs text-fresco-graphite-soft leading-relaxed flex-1">{row.value}</p>
        </div>
      ))}
      <div className="mt-1 flex items-center gap-1 pl-3">
        <div className="h-px flex-1 bg-fresco-border-light" />
        <span className="text-[9px] text-fresco-graphite-light uppercase tracking-wider px-1">above the surface</span>
        <div className="h-px flex-1 bg-fresco-border-light" />
      </div>
    </div>
  );
}

// ── Innovate: Leverage Map ────────────────────────────────────────────────────

const LEVERAGE_ORDER = ['parameters', 'feedback', 'information', 'rules', 'goals', 'paradigms'];
const LEVERAGE_LABELS: Record<string, string> = {
  parameters: 'Parameters',
  feedback: 'Feedback loops',
  information: 'Information flows',
  rules: 'Rules',
  goals: 'Goals',
  paradigms: 'Paradigms',
};

function LeverageMap({ options }: { options: { option: string; leverageLevel: string; impact: string }[] }) {
  if (!options?.length) return null;

  const sorted = [...options].sort((a, b) => {
    const ai = LEVERAGE_ORDER.indexOf(a.leverageLevel.toLowerCase());
    const bi = LEVERAGE_ORDER.indexOf(b.leverageLevel.toLowerCase());
    return bi - ai; // highest leverage first
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[10px] text-fresco-graphite-light uppercase tracking-wide">Low leverage</div>
        <div className="flex-1 h-px bg-gradient-to-r from-fresco-border to-fresco-black" />
        <div className="text-[10px] text-fresco-graphite-light uppercase tracking-wide">High leverage</div>
      </div>
      {sorted.map((opt, i) => {
        const levelIdx = LEVERAGE_ORDER.indexOf(opt.leverageLevel.toLowerCase());
        const pct = levelIdx === -1 ? 50 : Math.round(((levelIdx + 1) / LEVERAGE_ORDER.length) * 100);
        return (
          <div key={i} className="flex items-start gap-3">
            <div className="w-24 flex-shrink-0">
              <div className="h-1.5 bg-fresco-border rounded-full overflow-hidden">
                <div className="h-full bg-fresco-black rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[9px] text-fresco-graphite-light mt-1 uppercase tracking-wide">
                {LEVERAGE_LABELS[opt.leverageLevel.toLowerCase()] || opt.leverageLevel}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-fresco-xs font-medium text-fresco-black">{opt.option}</p>
              <p className="text-fresco-xs text-fresco-graphite-light mt-0.5">{opt.impact}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Validate: Funnel Simulation ───────────────────────────────────────────────

function FunnelSimulation({ sim }: { sim: { expected: string; bestCase: string; worstCase: string } }) {
  const cases = [
    { label: 'Best case', value: sim.bestCase, weight: 'opacity-60' },
    { label: 'Expected', value: sim.expected, weight: 'opacity-100' },
    { label: 'Worst case', value: sim.worstCase, weight: 'opacity-40' },
  ];

  return (
    <div className="space-y-2">
      {cases.map((c, i) => (
        <div key={i} className={cn(
          'flex items-center gap-3 p-3',
          i === 1 ? 'bg-fresco-black text-white' : 'bg-fresco-light-gray'
        )}>
          <span className={cn(
            'text-[10px] font-medium uppercase tracking-wider w-20 flex-shrink-0',
            i === 1 ? 'text-white/70' : 'text-fresco-graphite-light'
          )}>{c.label}</span>
          <p className={cn(
            'text-fresco-xs',
            i === 1 ? 'text-white font-medium' : 'text-fresco-graphite-soft'
          )}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Evaluate: Evolution Projection ───────────────────────────────────────────

function EvolutionProjection({ projection, learning, kpiMap }: { projection?: string; learning?: string; kpiMap?: string }) {
  return (
    <div className="space-y-3">
      {projection && (
        <div className="p-3 border-l-2 border-fresco-black bg-fresco-light-gray">
          <p className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light mb-1">In 3 months, if this continues</p>
          <p className="text-fresco-xs text-fresco-graphite-soft">{projection}</p>
        </div>
      )}
      {kpiMap && (
        <div className="p-3 bg-fresco-light-gray border border-fresco-border">
          <p className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light mb-1">What actually drives the metric</p>
          <p className="text-fresco-xs text-fresco-graphite-soft">{kpiMap}</p>
        </div>
      )}
      {learning && (
        <div className="p-3 border border-fresco-black/10">
          <p className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light mb-1">The learning</p>
          <p className="text-fresco-xs text-fresco-graphite-soft italic">{learning}</p>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SystemsOutput({ house, systemsOutput }: SystemsOutputProps) {
  if (!systemsOutput) return null;

  if (house === 'investigate') {
    return (
      <>
        {systemsOutput.icebergLevels && (
          <Section label="Iceberg analysis">
            <IcebergView levels={systemsOutput.icebergLevels} />
          </Section>
        )}
        {systemsOutput.currentStateSimulation && (
          <Section label="If nothing changes">
            <div className="p-4 border border-fresco-border bg-fresco-light-gray">
              <p className="text-fresco-sm text-fresco-graphite-soft italic leading-relaxed">
                {systemsOutput.currentStateSimulation}
              </p>
            </div>
          </Section>
        )}
      </>
    );
  }

  if (house === 'innovate') {
    return (
      <>
        {systemsOutput.leverageMap?.length > 0 && (
          <Section label="Leverage map">
            <LeverageMap options={systemsOutput.leverageMap} />
          </Section>
        )}
        {systemsOutput.interventionForecast && (
          <Section label="Intervention forecast">
            <div className="space-y-2">
              {[
                { label: 'Immediate effect', value: systemsOutput.interventionForecast.immediate },
                { label: 'Over time', value: systemsOutput.interventionForecast.delayed },
                { label: 'Watch for', value: systemsOutput.interventionForecast.risk },
              ].filter(r => r.value).map((row, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-fresco-light-gray">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light w-24 flex-shrink-0 mt-0.5">{row.label}</span>
                  <p className="text-fresco-xs text-fresco-graphite-soft">{row.value}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
      </>
    );
  }

  if (house === 'validate') {
    return (
      <>
        {systemsOutput.funnelSimulation && (
          <Section label="Predicted outcome range">
            <FunnelSimulation sim={systemsOutput.funnelSimulation} />
          </Section>
        )}
        {systemsOutput.influenceMap && (
          <Section label="Influence map">
            <div className="space-y-2">
              {[
                { label: 'Real barrier', value: systemsOutput.influenceMap.barrier },
                { label: 'What overcomes it', value: systemsOutput.influenceMap.lever },
                { label: 'Proof required', value: systemsOutput.influenceMap.proofRequired },
              ].filter(r => r.value).map((row, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-fresco-light-gray">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light w-28 flex-shrink-0 mt-0.5">{row.label}</span>
                  <p className="text-fresco-xs text-fresco-graphite-soft">{row.value}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
      </>
    );
  }

  if (house === 'evaluate') {
    return (
      <Section label="System projection">
        <EvolutionProjection
          projection={systemsOutput.evolutionProjection}
          learning={systemsOutput.doublLoopLearning}
          kpiMap={systemsOutput.kpiSystemMap}
        />
      </Section>
    );
  }

  return null;
}

// Shared cross-house sections — archetype + BOTG
// These are exported separately so HouseSession can render them after house-specific sections
export function CrossHouseSystems({ systemsOutput }: { systemsOutput: any }) {
  if (!systemsOutput) return null;
  return (
    <>
      {/* Archetype */}
      {systemsOutput.archetype?.name && systemsOutput.archetype.name !== 'null' && (
        <ArchetypeCard
          name={systemsOutput.archetype.name}
          description={systemsOutput.archetype.description || ''}
          loop={systemsOutput.archetype.loop || ''}
          escape={systemsOutput.archetype.escape || ''}
        />
      )}

      {/* Behavior Over Time */}
      {systemsOutput.behaviorOverTime?.length > 0 && (
        <div>
          <span className="fresco-label block mb-3">Behavior over time</span>
          <BehaviorOverTimeChart series={systemsOutput.behaviorOverTime} />
        </div>
      )}

      {/* Causal Loop Diagram */}
      {systemsOutput.causalLoop?.nodes?.length > 1 && (
        <Section label="Causal loop diagram">
          <CausalLoopDiagram
            nodes={systemsOutput.causalLoop.nodes}
            edges={systemsOutput.causalLoop.edges || []}
            dominantLoop={systemsOutput.causalLoop.dominantLoop || ''}
            loopType={systemsOutput.causalLoop.loopType || 'both'}
          />
        </Section>
      )}

      {/* Stock & Flow */}
      {systemsOutput.stockFlow?.stocks?.length > 0 && (
        <Section label="Stock & flow">
          <StockFlowDiagram
            stocks={systemsOutput.stockFlow.stocks}
            inflows={systemsOutput.stockFlow.inflows || []}
            outflows={systemsOutput.stockFlow.outflows || []}
            keyConstraint={systemsOutput.stockFlow.keyConstraint || ''}
          />
        </Section>
      )}

      {/* Input → Process → Output */}
      {(systemsOutput.ipoMap?.inputs?.length > 0 || systemsOutput.ipoMap?.processes?.length > 0) && (
        <Section label="Input → Process → Output">
          <IPOMap
            inputs={systemsOutput.ipoMap.inputs || []}
            processes={systemsOutput.ipoMap.processes || []}
            outputs={systemsOutput.ipoMap.outputs || []}
            bottleneck={systemsOutput.ipoMap.bottleneck}
          />
        </Section>
      )}

      {/* Sensitivity Analysis */}
      {systemsOutput.sensitivityAnalysis?.variables?.length > 0 && (
        <Section label="Sensitivity analysis">
          <SensitivityChart
            outcomeVariable={systemsOutput.sensitivityAnalysis.outcomeVariable || 'outcome'}
            variables={systemsOutput.sensitivityAnalysis.variables}
          />
        </Section>
      )}

      {/* Scenario Simulation */}
      {systemsOutput.scenarioModel?.variables?.length > 0 && (
        <Section label="Scenario simulation">
          <ScenarioSimulation
            outcomeVariable={systemsOutput.scenarioModel.outcomeVariable || 'outcome'}
            outcomeUnit={systemsOutput.scenarioModel.outcomeUnit || ''}
            baselineValue={systemsOutput.scenarioModel.baselineValue || 0}
            variables={systemsOutput.scenarioModel.variables}
          />
        </Section>
      )}
    </>
  );
}
