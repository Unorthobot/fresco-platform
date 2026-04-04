'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HOUSE_META, type HouseId } from '@/lib/agents';

type Session = any;

const VERDICT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'GO':                  { bg: 'bg-emerald-600', text: 'text-white', dot: 'bg-emerald-600' },
  'PIVOT':               { bg: 'bg-amber-500',   text: 'text-white', dot: 'bg-amber-500' },
  'INVESTIGATE FURTHER': { bg: 'bg-blue-600',    text: 'text-white', dot: 'bg-blue-600' },
  'STOP':                { bg: 'bg-red-600',      text: 'text-white', dot: 'bg-red-600' },
};

const HOUSE_ORDER: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

interface RunEntry {
  sessionId: string;
  houseId: HouseId;
  houseName: string;
  verdict: string | null;
  fitStrength: string | null;
  sentenceOfTruth: string | null;
  date: Date;
  runIndex: number; // which run of this house (1st, 2nd, etc.)
}

export function HouseJourneyViz({ sessions, onSessionClick }: {
  sessions: Session[];
  onSessionClick?: (id: string) => void;
}) {
  const runs = useMemo<RunEntry[]>(() => {
    const houseSessions = sessions
      .filter(s => s.houseType)
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

    const houseRunCount: Record<string, number> = {};
    return houseSessions.map(s => {
      const houseId = s.houseType as HouseId;
      houseRunCount[houseId] = (houseRunCount[houseId] || 0) + 1;
      return {
        sessionId: s.id,
        houseId,
        houseName: HOUSE_META[houseId]?.name || houseId,
        verdict: s.aiOutputs?.houseResult?.verdict || s.aiOutputs?.verdict || null,
        fitStrength: s.aiOutputs?.houseResult?.fitStrength || s.aiOutputs?.fitStrength || null,
        sentenceOfTruth: s.sentenceOfTruth?.content || null,
        date: new Date(s.updatedAt),
        runIndex: houseRunCount[houseId],
      };
    });
  }, [sessions]);

  if (runs.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-fresco-sm text-fresco-graphite-light">Run a house to see your thinking journey visualised here.</p>
      </div>
    );
  }

  // Detect loop-backs: when a non-evaluate house appears after evaluate
  const loopBacks: Array<{ fromIdx: number; toIdx: number; reason: string }> = [];
  for (let i = 1; i < runs.length; i++) {
    const prev = runs[i - 1];
    const curr = runs[i];
    if (prev.houseId === 'evaluate' && curr.houseId !== 'evaluate') {
      loopBacks.push({
        fromIdx: i - 1,
        toIdx: i,
        reason: prev.verdict === 'STOP' ? 'Stop — route back' :
                prev.verdict === 'PIVOT' ? 'Pivot — new direction' : 'Loop back',
      });
    }
  }

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        {Object.entries(VERDICT_COLORS).map(([v, s]) => (
          <div key={v} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', s.dot)} />
            <span className="text-fresco-xs text-fresco-graphite-light">{v}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <RotateCcw className="w-3 h-3 text-fresco-graphite-light" />
          <span className="text-fresco-xs text-fresco-graphite-light">Loop back</span>
        </div>
      </div>

      {/* Run sequence */}
      <div className="relative">
        {runs.map((run, idx) => {
          const vc = run.verdict ? (VERDICT_COLORS[run.verdict] || VERDICT_COLORS['INVESTIGATE FURTHER']) : null;
          const isLoopBackStart = loopBacks.some(lb => lb.fromIdx === idx);
          const isLoopBackEnd = loopBacks.some(lb => lb.toIdx === idx);
          const meta = HOUSE_META[run.houseId];
          const isEvaluate = run.houseId === 'evaluate';

          return (
            <motion.div
              key={run.sessionId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-stretch gap-4 mb-2"
            >
              {/* Timeline spine */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
                <div className={cn(
                  'w-6 h-6 flex items-center justify-center border-2 flex-shrink-0 text-fresco-xs font-medium',
                  isLoopBackEnd ? 'border-amber-400 bg-amber-50 text-amber-700' :
                  isEvaluate ? 'border-fresco-black bg-fresco-black text-white' :
                  'border-fresco-border bg-fresco-white text-fresco-graphite-mid'
                )}>
                  {isLoopBackEnd ? <RotateCcw className="w-3 h-3" /> : idx + 1}
                </div>
                {idx < runs.length - 1 && (
                  <div className={cn(
                    'w-px flex-1 mt-1',
                    isLoopBackStart ? 'border-l-2 border-dashed border-amber-300' : 'bg-fresco-border-light'
                  )} style={{ minHeight: 24 }} />
                )}
              </div>

              {/* House card */}
              <button
                onClick={() => onSessionClick?.(run.sessionId)}
                className={cn(
                  'flex-1 flex items-start gap-3 p-3 border text-left transition-all hover:border-fresco-black mb-1',
                  isEvaluate ? 'border-fresco-black bg-fresco-light-gray' : 'border-fresco-border bg-fresco-white hover:bg-fresco-light-gray'
                )}
              >
                {/* House icon + name */}
                <div className="flex-shrink-0 mt-0.5">
                  <img src={meta?.icon} alt="" className="w-4 h-4 opacity-50 icon-theme"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wide">
                      {run.houseName}
                      {run.runIndex > 1 && <span className="ml-1 opacity-50">#{run.runIndex}</span>}
                    </span>
                    <span className="text-fresco-xs text-fresco-graphite-light">
                      {run.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {run.sentenceOfTruth && (
                    <p className="text-fresco-xs text-fresco-graphite-soft italic line-clamp-1 mb-1.5">
                      "{run.sentenceOfTruth}"
                    </p>
                  )}

                  {!run.verdict && (
                    <span className="text-fresco-xs text-fresco-graphite-light">No analysis yet</span>
                  )}
                </div>

                {/* Verdict badge */}
                {run.verdict && vc && (
                  <div className={cn('flex-shrink-0 px-2.5 py-1 text-fresco-xs font-medium', vc.bg, vc.text)}>
                    {run.verdict}
                  </div>
                )}
              </button>

              {/* Loop-back arrow label */}
              {isLoopBackStart && (
                <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                  <RotateCcw className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-amber-600 font-medium">{loopBacks.find(lb => lb.fromIdx === idx)?.reason}</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Pattern callout if multiple runs of same house */}
      {(() => {
        const repeatHouses = HOUSE_ORDER.filter(h => runs.filter(r => r.houseId === h).length > 1);
        if (repeatHouses.length === 0) return null;
        return (
          <div className="mt-4 p-3 border border-amber-200 bg-amber-50">
            <p className="text-fresco-xs font-medium text-amber-800 mb-1">Pattern detected</p>
            <p className="text-fresco-xs text-amber-700">
              {repeatHouses.map(h => HOUSE_META[h]?.name).join(' and ')} {repeatHouses.length === 1 ? 'has' : 'have'} been run more than once.
              This usually means the first run surfaced a deeper problem worth revisiting.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
