'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOOLKITS, type ToolkitType, type ToolkitCategory, type Session } from '@/types';

interface JourneyMapProps {
  sessions: Session[];
  onSessionClick?: (sessionId: string) => void;
  onToolkitStart?: (toolkitType: ToolkitType) => void;
  className?: string;
}

const HOUSES: { category: ToolkitCategory; label: string; toolkits: ToolkitType[] }[] = [
  { 
    category: 'investigate', 
    label: 'Investigate',
    toolkits: ['insight_stack', 'pov_generator', 'mental_model_mapper']
  },
  { 
    category: 'innovate', 
    label: 'Innovate',
    toolkits: ['flow_board', 'experiment_brief', 'strategy_sketchbook']
  },
  { 
    category: 'validate', 
    label: 'Validate',
    toolkits: ['ux_scorecard', 'persuasion_canvas', 'performance_grid']
  },
];

export function JourneyMap({ sessions, onSessionClick, onToolkitStart, className }: JourneyMapProps) {
  const sessionsByToolkit = useMemo(() => {
    const map: Record<ToolkitType, Session[]> = {} as any;
    HOUSES.flatMap(h => h.toolkits).forEach(t => map[t] = []);
    sessions.forEach(s => {
      if (map[s.toolkitType]) map[s.toolkitType].push(s);
    });
    return map;
  }, [sessions]);

  const completedToolkits = useMemo(() => {
    return new Set(sessions.map(s => s.toolkitType));
  }, [sessions]);

  return (
    <div className={cn("space-y-8", className)}>
      {HOUSES.map((house, houseIndex) => {
        const houseComplete = house.toolkits.every(t => completedToolkits.has(t));
        const houseStarted = house.toolkits.some(t => completedToolkits.has(t));
        
        return (
          <motion.div
            key={house.category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: houseIndex * 0.1 }}
            className="relative"
          >
            {/* House header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                houseComplete ? "bg-fresco-black" : "bg-fresco-light-gray"
              )}>
                {houseComplete ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <img 
                    src={`/0${houseIndex + 1}-${house.category}.png`} 
                    alt="" 
                    className="w-5 h-5 icon-themed" 
                  />
                )}
              </div>
              <div>
                <h3 className="text-fresco-base font-medium text-fresco-black">{house.label}</h3>
                <p className="text-fresco-xs text-fresco-graphite-light">
                  {house.toolkits.filter(t => completedToolkits.has(t)).length} of {house.toolkits.length} complete
                </p>
              </div>
            </div>
            
            {/* Toolkits in this house */}
            <div className="ml-5 pl-5 border-l-2 border-fresco-border space-y-3">
              {house.toolkits.map((toolkitType, toolkitIndex) => {
                const toolkit = TOOLKITS[toolkitType];
                const toolkitSessions = sessionsByToolkit[toolkitType];
                const isComplete = toolkitSessions.length > 0;
                const hasTruth = toolkitSessions.some(s => s.sentenceOfTruth?.content);
                
                return (
                  <motion.div
                    key={toolkitType}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: houseIndex * 0.1 + toolkitIndex * 0.05 }}
                    className="relative"
                  >
                    {/* Connection dot */}
                    <div className={cn(
                      "absolute -left-[25px] top-4 w-3 h-3 rounded-full border-2",
                      isComplete 
                        ? "bg-fresco-black border-fresco-black" 
                        : "bg-fresco-white border-fresco-border"
                    )} />
                    
                    {/* Toolkit card */}
                    <div className={cn(
                      "p-4 rounded-xl transition-all",
                      isComplete 
                        ? "bg-fresco-light-gray hover:bg-fresco-warm-gray cursor-pointer transition-colors" 
                        : "bg-fresco-white border border-dashed border-fresco-border hover:border-fresco-graphite-light transition-colors"
                    )}
                    onClick={() => {
                      if (isComplete && toolkitSessions[0]) {
                        onSessionClick?.(toolkitSessions[0].id);
                      } else {
                        onToolkitStart?.(toolkitType);
                      }
                    }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-fresco-sm font-medium text-fresco-black">
                              {toolkit.name}
                            </h4>
                            {hasTruth && (
                              <Sparkles className="w-3.5 h-3.5 text-fresco-graphite" />
                            )}
                          </div>
                          <p className="text-fresco-xs text-fresco-graphite-light mt-0.5">
                            {toolkit.subtitle}
                          </p>
                          
                          {/* Session count or CTA */}
                          {isComplete ? (
                            <p className="text-fresco-xs text-fresco-graphite-mid mt-2">
                              {toolkitSessions.length} session{toolkitSessions.length > 1 ? 's' : ''}
                            </p>
                          ) : (
                            <p className="text-fresco-xs text-fresco-graphite-mid mt-2 flex items-center gap-1">
                              <span>Start this toolkit</span>
                              <ChevronRight className="w-3 h-3" />
                            </p>
                          )}
                        </div>
                        
                        {isComplete && (
                          <Check className="w-4 h-4 text-fresco-black" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* House connector */}
            {houseIndex < HOUSES.length - 1 && (
              <div className="flex justify-center my-4">
                <ChevronRight className="w-5 h-5 text-fresco-border rotate-90" />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
