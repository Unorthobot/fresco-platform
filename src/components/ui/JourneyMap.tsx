'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HOUSE_META, type HouseId } from '@/lib/agents';

type Session = any;

interface JourneyMapProps {
  sessions: Session[];
  onSessionClick?: (sessionId: string) => void;
  onHouseStart?: (houseId: HouseId) => void;
  className?: string;
}

const HOUSE_ORDER: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

const HOUSE_AGENTS: Record<HouseId, string[]> = {
  investigate: ['Insight Stack', 'Belief Mapper', 'Position Builder'],
  innovate:    ['Flow Board', 'Strategy Sketchbook', 'Experiment Brief'],
  validate:    ['Experience Scorecard', 'Influence Map', 'Results Tracker'],
  evaluate:    ['Page Scorecard', 'Variant Lens', 'Journey Trace'],
};

export function JourneyMap({ sessions, onSessionClick, onHouseStart, className }: JourneyMapProps) {
  const sessionsByHouse = useMemo(() => {
    const map: Record<HouseId, Session[]> = {
      investigate: [], innovate: [], validate: [], evaluate: [],
    };
    sessions.forEach(s => {
      const houseType = s.houseType as HouseId | undefined;
      if (houseType && map[houseType]) map[houseType].push(s);
    });
    return map;
  }, [sessions]);

  return (
    <div className={cn('space-y-6', className)}>
      {HOUSE_ORDER.map((houseId, idx) => {
        const house = HOUSE_META[houseId];
        const houseSessions = sessionsByHouse[houseId];
        const hasRun = houseSessions.length > 0;
        const latestSession = houseSessions[0];
        const verdict = latestSession?.aiOutputs?.verdict;
        const sentenceOfTruth = latestSession?.sentenceOfTruth?.content;
        const agents = HOUSE_AGENTS[houseId];

        return (
          <motion.div
            key={houseId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
          >
            <div className={cn(
              'border rounded-none transition-all',
              hasRun ? 'border-fresco-black bg-fresco-white' : 'border-fresco-border bg-fresco-white'
            )}>
              {/* House header */}
              <div className="flex items-start justify-between p-4 border-b border-fresco-border-light">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 flex items-center justify-center border',
                    hasRun ? 'border-fresco-black bg-fresco-black' : 'border-fresco-border'
                  )}>
                    {hasRun
                      ? <Check className="w-4 h-4 text-white" />
                      : <img src={house.icon} alt="" className="w-4 h-4 opacity-40 icon-theme"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    }
                  </div>
                  <div>
                    <p className="text-fresco-sm font-medium text-fresco-black">{house.name}</p>
                    <p className="text-fresco-xs text-fresco-graphite-light">→ {house.output}</p>
                  </div>
                </div>

                {/* Verdict badge */}
                {verdict && (
                  <span className={cn(
                    'text-fresco-xs font-medium px-2 py-1 border',
                    verdict === 'GO'                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    verdict === 'PIVOT'               ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    verdict === 'STOP'                ? 'bg-red-50 text-red-600 border-red-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  )}>
                    {verdict}
                  </span>
                )}
              </div>

              {/* Agent pills */}
              <div className="px-4 py-3 flex items-center gap-2 border-b border-fresco-border-light/50">
                {agents.map((agent, ai) => (
                  <span key={agent} className="flex items-center gap-1">
                    <span className="text-[10px] text-fresco-graphite-light bg-fresco-light-gray px-2 py-0.5 rounded-full">
                      {agent}
                    </span>
                    {ai < agents.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-fresco-border" />}
                  </span>
                ))}
              </div>

              {/* Sessions or CTA */}
              <div className="p-4">
                {hasRun ? (
                  <div className="space-y-2">
                    {/* Sentence of truth */}
                    {sentenceOfTruth && (
                      <div className="flex items-start gap-2 mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-fresco-graphite-light flex-shrink-0 mt-0.5" />
                        <p className="text-fresco-xs text-fresco-graphite-mid italic">"{sentenceOfTruth}"</p>
                      </div>
                    )}
                    {/* Session list */}
                    {houseSessions.map((s: Session) => (
                      <button
                        key={s.id}
                        onClick={() => onSessionClick?.(s.id)}
                        className="w-full flex items-center justify-between p-2.5 bg-fresco-light-gray hover:bg-fresco-border transition-colors text-left group"
                      >
                        <div>
                          <p className="text-fresco-xs font-medium text-fresco-black">
                            {s.title || `${house.name} Analysis`}
                          </p>
                          <p className="text-fresco-xs text-fresco-graphite-light">
                            {new Date(s.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-fresco-graphite-light group-hover:text-fresco-black transition-colors" />
                      </button>
                    ))}
                    {/* Run again */}
                    <button
                      onClick={() => onHouseStart?.(houseId)}
                      className="w-full text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors text-left pt-1 flex items-center gap-1"
                    >
                      + Run again
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onHouseStart?.(houseId)}
                    className="w-full flex items-center justify-between p-3 border border-dashed border-fresco-border hover:border-fresco-black hover:bg-fresco-light-gray transition-colors group"
                  >
                    <div>
                      <p className="text-fresco-xs font-medium text-fresco-black">{house.description}</p>
                      <p className="text-fresco-xs text-fresco-graphite-light mt-0.5 flex items-center gap-1">
                        Run {house.name} <ArrowRight className="w-3 h-3" />
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Connector */}
            {idx < HOUSE_ORDER.length - 1 && (
              <div className="flex justify-center my-2">
                <ChevronRight className="w-4 h-4 text-fresco-border rotate-90" />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
