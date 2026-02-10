'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link2, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOOLKITS, type Session } from '@/types';

interface ConnectedInsightsProps {
  sessions: Session[];
  onSessionClick?: (sessionId: string) => void;
  className?: string;
}

export function ConnectedInsights({ sessions, onSessionClick, className }: ConnectedInsightsProps) {
  // Extract all insights with their source sessions
  const allInsights = useMemo(() => {
    return sessions
      .filter(s => s.aiOutputs?.insights?.length || s.sentenceOfTruth?.content)
      .flatMap(session => {
        const insights = (session.aiOutputs?.insights || []).map(insight => ({
          type: 'insight' as const,
          content: insight,
          session,
          toolkit: TOOLKITS[session.toolkitType]
        }));
        
        if (session.sentenceOfTruth?.content) {
          insights.push({
            type: 'truth' as const,
            content: session.sentenceOfTruth.content,
            session,
            toolkit: TOOLKITS[session.toolkitType]
          });
        }
        
        return insights;
      });
  }, [sessions]);

  // Find potential connections (simple keyword matching)
  const connections = useMemo(() => {
    const conn: { from: number; to: number; keyword: string }[] = [];
    
    allInsights.forEach((insight, i) => {
      const words = insight.content.toLowerCase().split(/\s+/);
      const significantWords = words.filter(w => 
        w.length > 5 && 
        !['about', 'there', 'their', 'which', 'would', 'could', 'should'].includes(w)
      );
      
      allInsights.slice(i + 1).forEach((other, j) => {
        const otherWords = other.content.toLowerCase();
        const matchingWord = significantWords.find(w => otherWords.includes(w));
        if (matchingWord && insight.session.id !== other.session.id) {
          conn.push({ from: i, to: i + j + 1, keyword: matchingWord });
        }
      });
    });
    
    return conn.slice(0, 10); // Limit connections shown
  }, [allInsights]);

  if (allInsights.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <Link2 className="w-12 h-12 mx-auto mb-4 text-fresco-graphite-light" />
        <p className="text-fresco-sm text-fresco-graphite-mid">
          Complete sessions to see how your insights connect.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-fresco-lg font-medium text-fresco-black">Connected Insights</h3>
          <p className="text-fresco-sm text-fresco-graphite-light">
            {allInsights.length} insights across {sessions.length} sessions
          </p>
        </div>
        {connections.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-fresco-light-gray rounded-full">
            <Link2 className="w-4 h-4 text-fresco-graphite" />
            <span className="text-fresco-xs font-medium text-fresco-graphite">
              {connections.length} connections found
            </span>
          </div>
        )}
      </div>

      {/* Insights grid */}
      <div className="grid gap-3">
        {allInsights.map((insight, index) => {
          const hasConnections = connections.some(c => c.from === index || c.to === index);
          
          return (
            <motion.div
              key={`${insight.session.id}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSessionClick?.(insight.session.id)}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                insight.type === 'truth' 
                  ? "bg-fresco-black text-white border-fresco-black" 
                  : "bg-fresco-white border-fresco-border hover:border-fresco-graphite-light transition-colors",
                hasConnections && insight.type !== 'truth' && "ring-2 ring-fresco-light-gray"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {/* Source badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "text-fresco-xs font-medium uppercase tracking-wider",
                      insight.type === 'truth' ? "text-white/60" : "text-fresco-graphite-light"
                    )}>
                      {insight.toolkit.name}
                    </span>
                    {insight.type === 'truth' && (
                      <Sparkles className="w-3 h-3 text-white/60" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <p className={cn(
                    "text-fresco-sm leading-relaxed",
                    insight.type === 'truth' ? "font-light" : "text-fresco-graphite-soft"
                  )}>
                    {insight.content}
                  </p>
                </div>
                
                <ArrowRight className={cn(
                  "w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                  insight.type === 'truth' ? "text-white/50" : "text-fresco-graphite-light"
                )} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
