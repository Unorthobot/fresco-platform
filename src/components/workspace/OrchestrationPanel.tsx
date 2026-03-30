'use client';

// FRESCO Orchestration Panel
// Calls /api/orchestrate and shows the recommended next house + toolkit.
// Rendered in the WorkspaceOverview sidebar.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, RefreshCw, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { ToolkitType } from '@/types';

type HouseId = 'investigate' | 'innovate' | 'validate' | 'evaluate';

interface SessionSummary {
  toolkit: string;
  toolkitName: string;
  house: HouseId;
  sentenceOfTruth?: string;
  insights?: string[];
  necessaryMoves?: string[];
  hasOutput: boolean;
}

interface OrchestrationResult {
  nextHouse: HouseId;
  nextToolkit: string;
  nextToolkitName: string;
  recommendation: string;
  reasoning: string;
  urgency: 'high' | 'medium' | 'low';
  houseProgress: Record<HouseId, { total: number; completed: number }>;
}

interface OrchestrationPanelProps {
  workspaceTitle?: string;
  sessions: any[]; // ToolkitSession[]
  onStartToolkit?: (toolkitType: ToolkitType) => void | Promise<void>;
}

const HOUSE_COLORS: Record<HouseId, string> = {
  investigate: 'bg-fresco-black text-white',
  innovate: 'bg-fresco-graphite text-white',
  validate: 'bg-fresco-graphite-mid text-white',
  evaluate: 'bg-fresco-black/80 text-white',
};

const HOUSE_BORDER: Record<HouseId, string> = {
  investigate: 'border-l-fresco-black',
  innovate: 'border-l-fresco-graphite',
  validate: 'border-l-fresco-graphite-light',
  evaluate: 'border-l-fresco-black/50',
};

const URGENCY_LABEL: Record<string, string> = {
  high: 'Do this next',
  medium: 'Suggested',
  low: 'When ready',
};

const HOUSE_ICONS: Record<HouseId, string> = {
  investigate: '/01-investigate.png',
  innovate: '/02-innovate.png',
  validate: '/03-validate.png',
  evaluate: '/04-evaluate.png',
};

function getHouseForToolkit(toolkit: string): HouseId {
  const map: Record<string, HouseId> = {
    insight_stack: 'investigate', pov_generator: 'investigate', mental_model_mapper: 'investigate',
    flow_board: 'innovate', experiment_brief: 'innovate', strategy_sketchbook: 'innovate',
    ux_scorecard: 'validate', persuasion_canvas: 'validate', performance_grid: 'validate',
    decision_matrix: 'evaluate', risk_radar: 'evaluate', signal_checker: 'evaluate',
  };
  return map[toolkit] || 'investigate';
}

const TOOLKIT_DISPLAY_NAMES: Record<string, string> = {
  insight_stack: 'Insight Stack', pov_generator: 'Position Builder', mental_model_mapper: 'Belief Mapper',
  flow_board: 'Flow Board', experiment_brief: 'Experiment Brief', strategy_sketchbook: 'Strategy Sketchbook',
  ux_scorecard: 'Experience Scorecard', persuasion_canvas: 'Influence Map', performance_grid: 'Results Tracker',
  decision_matrix: 'Decision Matrix', risk_radar: 'Risk Radar', signal_checker: 'Signal Checker',
};

export function OrchestrationPanel({ workspaceTitle, sessions, onStartToolkit }: OrchestrationPanelProps) {
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const buildSessionSummaries = useCallback((): SessionSummary[] => {
    return sessions.map(s => {
      const aiOutputs = s.aiOutputs || {};
      return {
        toolkit: s.toolkitType,
        toolkitName: TOOLKIT_DISPLAY_NAMES[s.toolkitType] || s.toolkitType,
        house: getHouseForToolkit(s.toolkitType),
        sentenceOfTruth: s.sentenceOfTruth?.content || aiOutputs.sentenceOfTruth || undefined,
        insights: s.insights?.map((i: any) => i.content || i) || aiOutputs.insights || [],
        necessaryMoves: s.necessaryMoves?.map((m: any) => m.content || m) || aiOutputs.necessaryMoves || [],
        hasOutput: !!(
          (s.insights && s.insights.length > 0) ||
          s.sentenceOfTruth?.content ||
          aiOutputs.insights?.length > 0 ||
          aiOutputs.sentenceOfTruth
        ),
      };
    });
  }, [sessions]);

  const fetchOrchestration = useCallback(async () => {
    setIsLoading(true);
    try {
      const summaries = buildSessionSummaries();
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceTitle,
          sessions: summaries,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setHasLoaded(true);
      }
    } catch (err) {
      console.error('Orchestration fetch failed:', err);
    }
    setIsLoading(false);
  }, [workspaceTitle, buildSessionSummaries]);

  // Auto-fetch on mount and when sessions change (debounced by session count)
  useEffect(() => {
    if (!hasLoaded) {
      fetchOrchestration();
    }
  }, [hasLoaded, fetchOrchestration]);

  // Re-run when session count changes
  const sessionCount = sessions.length;
  useEffect(() => {
    if (hasLoaded) {
      setHasLoaded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCount]);

  if (!result && !isLoading) return null;

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
              result.urgency === 'high'
                ? 'bg-fresco-black text-white'
                : result.urgency === 'medium'
                ? 'bg-fresco-graphite-mid/20 text-fresco-graphite-mid'
                : 'bg-fresco-border text-fresco-graphite-light'
            }`}>
              {URGENCY_LABEL[result.urgency]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-fresco-graphite-light animate-spin" />}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-fresco-graphite-light" />
          ) : (
            <ChevronDown className="w-4 h-4 text-fresco-graphite-light" />
          )}
        </div>
      </button>

      {/* Body */}
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
                  <span>Analysing your sessions...</span>
                </div>
              ) : result ? (
                <>
                  {/* Next toolkit recommendation */}
                  <div className={`border-l-4 ${HOUSE_BORDER[result.nextHouse]} pl-3 mb-4`}>
                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src={HOUSE_ICONS[result.nextHouse]}
                        alt={result.nextHouse}
                        className="w-4 h-4 icon-theme"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide">
                        {result.nextHouse.charAt(0).toUpperCase() + result.nextHouse.slice(1)} house
                      </span>
                    </div>
                    <p className="text-fresco-base font-medium text-fresco-black">{result.nextToolkitName}</p>
                    <p className="text-fresco-sm text-fresco-graphite-mid mt-1">{result.recommendation}</p>
                  </div>

                  {/* Reasoning */}
                  <p className="text-fresco-xs text-fresco-graphite-light mb-4 leading-relaxed">
                    {result.reasoning}
                  </p>

                  {/* House progress mini-bars */}
                  {result.houseProgress && (
                    <div className="grid grid-cols-4 gap-1 mb-4">
                      {(['investigate', 'innovate', 'validate', 'evaluate'] as HouseId[]).map(h => {
                        const p = result.houseProgress[h];
                        const pct = p ? Math.round((p.completed / p.total) * 100) : 0;
                        const isTarget = h === result.nextHouse;
                        return (
                          <div key={h} className="flex flex-col gap-1">
                            <div className="h-1 bg-fresco-border rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isTarget ? 'bg-fresco-black' : 'bg-fresco-graphite-light'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`text-fresco-xs ${isTarget ? 'text-fresco-black font-medium' : 'text-fresco-graphite-light'}`}>
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
                      onClick={() => onStartToolkit?.(result.nextToolkit as ToolkitType)}
                      className="flex-1 flex items-center justify-center gap-2 h-9 bg-fresco-black text-white text-fresco-sm font-medium hover:bg-fresco-graphite transition-colors rounded-none"
                    >
                      Start {result.nextToolkitName}
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
