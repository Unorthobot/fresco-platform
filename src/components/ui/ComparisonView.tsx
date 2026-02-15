'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOOLKITS, type Session } from '@/types';

interface ComparisonViewProps {
  sessions: Session[];
  onClose?: () => void;
  className?: string;
}

export function ComparisonView({ sessions, onClose, className }: ComparisonViewProps) {
  const [selectedSessions, setSelectedSessions] = useState<[string | null, string | null]>([
    sessions[0]?.id || null,
    sessions[1]?.id || null
  ]);

  const session1 = sessions.find(s => s.id === selectedSessions[0]);
  const session2 = sessions.find(s => s.id === selectedSessions[1]);

  const handleSelect = (index: 0 | 1, sessionId: string) => {
    const newSelection = [...selectedSessions] as [string | null, string | null];
    newSelection[index] = sessionId;
    setSelectedSessions(newSelection);
  };

  if (sessions.length < 2) {
    return (
      <div className={cn("text-center py-12", className)}>
        <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 text-fresco-graphite-light" />
        <p className="text-fresco-sm text-fresco-graphite-mid">
          Complete at least 2 sessions to compare outputs.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-fresco-lg font-medium text-fresco-black">Compare Sessions</h3>
          <p className="text-fresco-sm text-fresco-graphite-light">
            View outputs side by side
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-fresco-graphite-light hover:text-fresco-black transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Session selectors */}
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((index) => (
          <select
            key={index}
            value={selectedSessions[index] || ''}
            onChange={(e) => handleSelect(index as 0 | 1, e.target.value)}
            className="w-full p-3 bg-fresco-light-gray rounded-xl text-fresco-sm border-none focus:ring-2 focus:ring-fresco-black outline-none"
          >
            <option value="">Select session...</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {TOOLKITS[session.toolkitType].name}
              </option>
            ))}
          </select>
        ))}
      </div>

      {/* Comparison grid */}
      <div className="grid grid-cols-2 gap-4">
        {[session1, session2].map((session, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-4"
          >
            {session ? (
              <>
                {/* Sentence of Truth */}
                <div className={cn(
                  "p-4 rounded-xl",
                  session.sentenceOfTruth?.content 
                    ? "bg-fresco-black text-white" 
                    : "bg-fresco-light-gray"
                )}>
                  <div className={cn(
                    "text-fresco-xs font-medium uppercase tracking-wider mb-2",
                    session.sentenceOfTruth?.content ? "text-white/60" : "text-fresco-graphite-light"
                  )}>
                    Sentence of Truth
                  </div>
                  {session.sentenceOfTruth?.content ? (
                    <p className="text-fresco-sm font-light leading-relaxed">
                      {session.sentenceOfTruth.content}
                    </p>
                  ) : (
                    <p className="text-fresco-sm text-fresco-graphite-light italic">
                      Not yet defined
                    </p>
                  )}
                </div>

                {/* Insights */}
                <div className="bg-fresco-white border border-fresco-border rounded-xl p-4">
                  <div className="text-fresco-xs font-medium uppercase tracking-wider text-fresco-graphite-light mb-3">
                    Insights ({session.aiOutputs?.insights?.length || 0})
                  </div>
                  {session.aiOutputs?.insights?.length ? (
                    <ul className="space-y-2">
                      {session.aiOutputs.insights.slice(0, 3).map((insight, i) => (
                        <li key={i} className="text-fresco-sm text-fresco-graphite-soft flex items-start gap-2">
                          <span className="text-fresco-graphite-light">•</span>
                          <span className="line-clamp-2">{insight}</span>
                        </li>
                      ))}
                      {session.aiOutputs.insights.length > 3 && (
                        <li className="text-fresco-xs text-fresco-graphite-light">
                          +{session.aiOutputs.insights.length - 3} more
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-fresco-sm text-fresco-graphite-light italic">
                      No insights yet
                    </p>
                  )}
                </div>

                {/* Actions */}
                {session.aiOutputs?.necessaryMoves?.length > 0 && (
                  <div className="bg-fresco-light-gray rounded-xl p-4">
                    <div className="text-fresco-xs font-medium uppercase tracking-wider text-fresco-graphite-light mb-3">
                      Actions ({session.aiOutputs.necessaryMoves.length})
                    </div>
                    <ul className="space-y-1">
                      {session.aiOutputs.necessaryMoves.slice(0, 2).map((move, i) => (
                        <li key={i} className="text-fresco-xs text-fresco-graphite-mid">
                          → {move.content}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="h-48 flex items-center justify-center bg-fresco-light-gray/50 rounded-xl border-2 border-dashed border-fresco-border">
                <p className="text-fresco-sm text-fresco-graphite-light">
                  Select a session
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
