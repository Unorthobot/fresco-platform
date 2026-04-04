'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { HOUSE_META, type HouseId } from '@/lib/agents';

type Session = any;

const VERDICT_COLORS: Record<string, string> = {
  'GO':                  'bg-emerald-600',
  'PIVOT':               'bg-amber-500',
  'INVESTIGATE FURTHER': 'bg-blue-600',
  'STOP':                'bg-red-600',
};

const VERDICT_TEXT: Record<string, string> = {
  'GO':                  'text-emerald-700',
  'PIVOT':               'text-amber-700',
  'INVESTIGATE FURTHER': 'text-blue-700',
  'STOP':                'text-red-700',
};

const HOUSE_ORDER: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

export function VerdictPatterns({ sessions }: { sessions: Session[] }) {
  const houseSessions = useMemo(() =>
    sessions.filter(s => s.houseType && (s.aiOutputs?.verdict || s.aiOutputs?.houseResult?.verdict)),
    [sessions]
  );

  const verdictCounts = useMemo(() => {
    const counts: Record<string, number> = { GO: 0, PIVOT: 0, 'INVESTIGATE FURTHER': 0, STOP: 0 };
    houseSessions.forEach(s => {
      const v = s.aiOutputs?.houseResult?.verdict || s.aiOutputs?.verdict;
      if (v && counts[v] !== undefined) counts[v]++;
    });
    return counts;
  }, [houseSessions]);

  const houseUsage = useMemo(() => {
    return HOUSE_ORDER.map(houseId => ({
      houseId,
      name: HOUSE_META[houseId]?.name || houseId,
      count: sessions.filter(s => s.houseType === houseId).length,
      withOutput: sessions.filter(s => s.houseType === houseId && (s.aiOutputs?.verdict || s.aiOutputs?.houseResult?.verdict)).length,
      lastVerdict: sessions
        .filter(s => s.houseType === houseId)
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
        ?.aiOutputs?.houseResult?.verdict || null,
    }));
  }, [sessions]);

  const totalRuns = houseSessions.length;
  const dominantVerdict = Object.entries(verdictCounts)
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

  const insight = useMemo(() => {
    if (totalRuns === 0) return null;
    const stopCount = verdictCounts['STOP'];
    const goCount = verdictCounts['GO'];
    const pivotCount = verdictCounts['PIVOT'];
    const investigateCount = verdictCounts['INVESTIGATE FURTHER'];

    if (stopCount >= 2) return { text: `${stopCount} STOP verdicts suggest a recurring problem definition issue. Consider starting every new initiative with Investigate.`, color: 'text-red-700', bg: 'bg-red-50 border-red-200' };
    if (pivotCount >= 2) return { text: `${pivotCount} PIVOT verdicts — you're finding better directions but late. Innovate earlier in your process.`, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    if (investigateCount >= 3) return { text: `${investigateCount} Investigate Further verdicts — more input is needed before committing. Try the Challenge step to sharpen your inputs.`, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' };
    if (goCount >= 2) return { text: `${goCount} GO verdicts — strong signal across your analyses. Your thinking process is working.`, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    return null;
  }, [verdictCounts, totalRuns]);

  if (totalRuns === 0) {
    return (
      <div className="space-y-3">
        <p className="text-fresco-xs text-fresco-graphite-light">
          Run at least one house to see verdict patterns across your workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Verdict distribution bar */}
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light mb-2">{totalRuns} house run{totalRuns !== 1 ? 's' : ''}</p>
        <div className="flex h-3 gap-0.5 mb-2">
          {Object.entries(verdictCounts)
            .filter(([, c]) => c > 0)
            .map(([verdict, count]) => (
              <div
                key={verdict}
                className={cn('h-full transition-all', VERDICT_COLORS[verdict])}
                style={{ width: `${(count / totalRuns) * 100}%` }}
                title={`${verdict}: ${count}`}
              />
            ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(verdictCounts)
            .filter(([, c]) => c > 0)
            .map(([verdict, count]) => (
              <div key={verdict} className="flex items-center gap-1">
                <div className={cn('w-1.5 h-1.5 rounded-full', VERDICT_COLORS[verdict])} />
                <span className="text-fresco-xs text-fresco-graphite-light">{verdict} ({count})</span>
              </div>
            ))}
        </div>
      </div>

      {/* Per-house usage */}
      <div className="space-y-1.5">
        {houseUsage.filter(h => h.count > 0).map(h => (
          <div key={h.houseId} className="flex items-center gap-2">
            <span className="text-fresco-xs text-fresco-graphite-mid w-20 flex-shrink-0">{h.name}</span>
            <div className="flex-1 flex gap-0.5">
              {Array.from({ length: h.count }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-2 flex-1 max-w-[16px]',
                    i < h.withOutput
                      ? (h.lastVerdict ? VERDICT_COLORS[h.lastVerdict] || 'bg-fresco-black' : 'bg-fresco-black')
                      : 'bg-fresco-border'
                  )}
                />
              ))}
            </div>
            {h.lastVerdict && (
              <span className={cn('text-[10px] font-medium flex-shrink-0', VERDICT_TEXT[h.lastVerdict] || 'text-fresco-graphite-light')}>
                {h.lastVerdict === 'INVESTIGATE FURTHER' ? 'INV. FURTHER' : h.lastVerdict}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Pattern insight */}
      {insight && (
        <div className={cn('p-3 border text-fresco-xs', insight.bg, insight.color)}>
          {insight.text}
        </div>
      )}
    </div>
  );
}
