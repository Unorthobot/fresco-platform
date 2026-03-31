'use client';

// FRESCO Orchestration Panel
// Recommends the next HOUSE to run based on workspace session outputs.
// Agents are never mentioned — the user only sees houses.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, RefreshCw, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { HouseId } from '@/lib/agents';

interface SessionSummary {
  house: HouseId;
  sentenceOfTruth?: string;
  insights?: string[];
  necessaryMoves?: string[];
  hasOutput: boolean;
}

interface OrchestrationResult {
  nextHouse: HouseId;
  recommendation: string;
  reasoning: string;
  urgency: 'high' | 'medium' | 'low';
  houseProgress: Record<HouseId, { completed: boolean }>;
}

interface OrchestrationPanelProps {
  workspaceTitle?: string;
  sessions: any[];
  onStartHouse?: (houseId: HouseId) => void | Promise<void>;
}

const HOUSE_ICONS: Record<HouseId, string> = {
  investigate: '/01-investigate.png',
  innovate:    '/02-innovate.png',
  validate:    '/03-validate.png',
  evaluate:    '/04-evaluate.png',
};

const HOUSE_NAMES: Record<HouseId, string> = {
  investigate: 'Investigate',
  innovate:    'Innovate',
  validate:    'Validate',
  evaluate:    'Evaluate',
};

const HOUSE_OUTPUTS: Record<HouseId, string> = {
  investigate: 'Problem–Solution Fit',
  innovate:    'Product–Market Fit',
  validate:    'Commercial Viability',
  evaluate:    'Performance Reality',
};

const HOUSE_BORDER: Record<HouseId, string> = {
  investigate: 'border-l-fresco-black',
  innovate:    'border-l-fresco-graphite',
  validate:    'border-l-fresco-graphite-light',
  evaluate:    'border-l-fresco-black/50',
};

const URGENCY_LABEL: Record<string, string> = {
  high:   'Do this next',
  medium: 'Suggested',
  low:    'When ready',
};

function getHouseForSession(session: any): HouseId {
  if (session.houseType) return session.houseType as HouseId;
  const map: Record<string, HouseId> = {
    insight_stack: 'investigate', pov_generator: 'investigate', mental_model_mapper: 'investigate',
    flow_board: 'innovate', experiment_brief: 'innovate', strategy_sketchbook: 'innovate',
    ux_scorecard: 'validate', persuasion_canvas: 'validate', performance_grid: 'validate',
    decision_matrix: 'evaluate', risk_radar: 'evaluate', signal_checker: 'evaluate',
  };
  return map[session.toolkitType] || 'investigate';
}

export function OrchestrationPanel({ workspaceTitle, sessions, onStartHouse }: OrchestrationPanelProps) {
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const buildSummaries = useCallback((): SessionSummary[] => {
    return sessions.map(s => {
      const ao = s.aiOutputs || {};
      return {
        house: getHouseForSession(s),
        sentenceOfTruth: s.sentenceOfTruth?.content || ao.sentenceOfTruth || ao.houseResult?.sentenceOfTruth,
        insights: s.insights?.map((i: any) => i.content || i) || ao.insights || ao.houseResult?.keyIssues || [],
        necessaryMoves: s.necessaryMoves?.map((m: any) => m.content || m) || ao.necessaryMoves || ao.houseResult?.necessaryMoves || [],
        hasOutput: !!(
          s.sentenceOfTruth?.content ||
          (s.insights && s.insights.length > 0) ||
          ao.sentenceOfTruth ||
          ao.houseResult?.sentenceOfTruth
        ),
      };
    });
  }, [sessions]);

  const fetchOrchestration = useCallback(async () => {
    setIsLoading(true);
    try {
      const summaries = buildSummaries();
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceTitle, sessions: summaries }),
      });
      if (res.ok) {
        setResult(await res.json());
        setHasLoaded(true);
      }
    } catch (err) {
      console.error('Orchestration fetch failed:', err);
    }
    setIsLoading(false);
  }, [workspaceTitle, buildSummaries]);

  useEffect(() => {
    if (!hasLoaded) fetchOrchestration();
  }, [hasLoaded, fetchOrchestration]);

  const sessionCount = sessions.length;
  useEffect(() => {
    if (hasLoaded) setHasLoaded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCount]);

  if (!result && !isLoading) return null;

  const houses: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

  return (
    <div className="rounded-none border border-fresco-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-fresco-light-gray hover:bg-fresco-border-light transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-fresco-graphite-mid" />
          <span className="text-fresco-sm font-medium text-fresco-black">What to do next</span>
          {result && (
            <span className={`text-fresco-xs px-2 py-0.5 rounded-full font-medium ${
              result.urgency === 'high'   ? 'bg-fresco-black text-white' :
              result.urgency === 'medium' ? 'bg-fresco-graphite-mid/20 text-fresco-graphite-mid' :
                                           'bg-fresco-border text-fresco-graphite-light'
            }`}>
              {URGENCY_LABEL[result.urgency]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-fresco-graphite-light animate-spin" />}
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-fresco-graphite-light" />
            : <ChevronDown className="w-4 h-4 text-fresco-graphite-light" />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white border-t border-fresco-border-light">
              {isLoading && !result ? (
                <div className="flex items-center gap-2 py-2 text-fresco-sm text-fresco-graphite-light">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analysing your sessions…</span>
                </div>
              ) : result ? (
                <>
                  {/* Recommended house */}
                  <div className={`border-l-4 ${HOUSE_BORDER[result.nextHouse]} pl-3 mb-4`}>
                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src={HOUSE_ICONS[result.nextHouse]}
                        alt={result.nextHouse}
                        className="w-4 h-4 icon-theme"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide">
                        {HOUSE_NAMES[result.nextHouse]}
                      </span>
                    </div>
                    <p className="text-fresco-sm font-medium text-fresco-black">
                      → {HOUSE_OUTPUTS[result.nextHouse]}
                    </p>
                    <p className="text-fresco-sm text-fresco-graphite-mid mt-1">{result.recommendation}</p>
                  </div>

                  {/* Reasoning */}
                  <p className="text-fresco-xs text-fresco-graphite-light mb-4 leading-relaxed">
                    {result.reasoning}
                  </p>

                  {/* House progress dots */}
                  {result.houseProgress && (
                    <div className="grid grid-cols-4 gap-1 mb-4">
                      {houses.map(h => {
                        const done = result.houseProgress[h]?.completed;
                        const isTarget = h === result.nextHouse;
                        return (
                          <div key={h} className="flex flex-col gap-1.5">
                            <div className={`h-1 rounded-full transition-all ${
                              done      ? 'bg-fresco-black' :
                              isTarget  ? 'bg-fresco-graphite-light' :
                                          'bg-fresco-border'
                            }`} />
                            <span className={`text-fresco-xs ${
                              isTarget ? 'text-fresco-black font-medium' : 'text-fresco-graphite-light'
                            }`}>
                              {h.slice(0, 3)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStartHouse?.(result.nextHouse)}
                      className="flex-1 flex items-center justify-center gap-2 h-9 bg-fresco-black text-white text-fresco-sm font-medium hover:bg-fresco-graphite transition-colors rounded-none"
                    >
                      Run {HOUSE_NAMES[result.nextHouse]}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={fetchOrchestration}
                      disabled={isLoading}
                      className="h-9 w-9 flex items-center justify-center border border-fresco-border text-fresco-graphite-light hover:text-fresco-black hover:border-fresco-graphite-light transition-colors rounded-none"
                      title="Re-analyse"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
