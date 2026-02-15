'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Sparkles, ChevronRight } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { TOOLKITS, type Session } from '@/types';

interface TimelineViewProps {
  sessions: Session[];
  onSessionClick?: (sessionId: string) => void;
  className?: string;
}

export function TimelineView({ sessions, onSessionClick, className }: TimelineViewProps) {
  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups: { date: string; sessions: Session[] }[] = [];
    const sorted = [...sessions].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    sorted.forEach(session => {
      const date = new Date(session.createdAt).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      
      const existing = groups.find(g => g.date === date);
      if (existing) {
        existing.sessions.push(session);
      } else {
        groups.push({ date, sessions: [session] });
      }
    });
    
    return groups;
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <Clock className="w-12 h-12 mx-auto mb-4 text-fresco-graphite-light" />
        <p className="text-fresco-sm text-fresco-graphite-mid">
          Your thinking timeline will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      {groupedSessions.map((group, groupIndex) => (
        <motion.div
          key={group.date}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIndex * 0.1 }}
        >
          {/* Date header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-fresco-light-gray flex items-center justify-center">
              <Clock className="w-4 h-4 text-fresco-graphite" />
            </div>
            <h3 className="text-fresco-sm font-medium text-fresco-black">{group.date}</h3>
          </div>
          
          {/* Sessions for this date */}
          <div className="ml-4 pl-4 border-l-2 border-fresco-border space-y-3">
            {group.sessions.map((session, sessionIndex) => {
              const toolkit = TOOLKITS[session.toolkitType];
              const hasTruth = !!session.sentenceOfTruth?.content;
              const time = new Date(session.createdAt).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
              });
              
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: groupIndex * 0.1 + sessionIndex * 0.05 }}
                  className="relative"
                >
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute -left-[21px] top-3 w-2.5 h-2.5 rounded-full",
                    hasTruth ? "bg-fresco-black" : "bg-fresco-border"
                  )} />
                  
                  {/* Session card */}
                  <div
                    onClick={() => onSessionClick?.(session.id)}
                    className="group p-4 bg-white dark:bg-gray-900 rounded-xl border border-fresco-border dark:border-gray-700 hover:border-fresco-graphite-light hover:shadow-sm cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-fresco-xs text-fresco-graphite-light">{time}</span>
                          {hasTruth && <Sparkles className="w-3 h-3 text-fresco-graphite" />}
                        </div>
                        <h4 className="text-fresco-sm font-medium text-fresco-black mb-1">
                          {toolkit.name}
                        </h4>
                        
                        {/* Preview of truth or first insight */}
                        {session.sentenceOfTruth?.content ? (
                          <p className="text-fresco-xs text-fresco-graphite-mid italic line-clamp-2">
                            "{session.sentenceOfTruth.content}"
                          </p>
                        ) : session.aiOutputs?.insights?.[0] && (
                          <p className="text-fresco-xs text-fresco-graphite-light line-clamp-2">
                            {session.aiOutputs.insights[0]}
                          </p>
                        )}
                      </div>
                      
                      <ChevronRight className="w-4 h-4 text-fresco-graphite-light opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
