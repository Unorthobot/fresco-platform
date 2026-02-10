'use client';

// FRESCO Platform - Thinking Lens Hint Component
// Shows live guidance based on selected thinking lens

import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Brain, Layers, Users, Box, Search, Target, Telescope, FlaskConical, Coins, Scale, BookOpen, Zap, Cpu, Sparkles, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThinkingModeId } from '@/types';

interface ThinkingLensHintProps {
  lens: ThinkingModeId;
  hint?: string;
  compact?: boolean;
  className?: string;
}

const LENS_CONFIG: Record<ThinkingModeId, { icon: any; color: string; bgColor: string; description: string }> = {
  automatic: { icon: Sparkles, color: 'text-fresco-graphite', bgColor: 'bg-fresco-light-gray', description: 'Claude selects the best lens' },
  critical: { icon: Search, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Question assumptions, test claims' },
  systems: { icon: Layers, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'See connections and patterns' },
  design: { icon: Users, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Human needs and experience' },
  product: { icon: Box, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Feasibility and prioritisation' },
  analytical: { icon: Activity, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Patterns and data structure' },
  first_principles: { icon: Target, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Reduce to fundamental truths' },
  strategic: { icon: Target, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Direction and competition' },
  futures: { icon: Telescope, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Forecast and scenario build' },
  scientific: { icon: FlaskConical, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Hypotheses and testing' },
  economic: { icon: Coins, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Value and incentives' },
  ethical: { icon: Scale, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Integrity and fairness' },
  narrative: { icon: BookOpen, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Story and meaning' },
  lateral: { icon: Zap, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Creative leaps' },
  computational: { icon: Cpu, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Logical steps' },
  philosophical: { icon: Brain, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Essence and purpose' },
  behavioral: { icon: Users, color: 'text-fresco-black', bgColor: 'bg-fresco-light-gray', description: 'Human bias and motivation' },
};

export function ThinkingLensHint({ lens, hint, compact = false, className }: ThinkingLensHintProps) {
  const config = LENS_CONFIG[lens] || LENS_CONFIG.automatic;
  const Icon = config.icon;

  if (lens === 'automatic' && !hint) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={lens}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-start gap-3 rounded-xl",
          compact ? "p-2" : "p-4",
          config.bgColor,
          className
        )}
      >
        <div className={cn(
          "flex-shrink-0 rounded-lg flex items-center justify-center",
          compact ? "w-6 h-6" : "w-8 h-8",
          config.color,
          "bg-white/50"
        )}>
          <Icon className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium capitalize",
              compact ? "text-fresco-xs" : "text-fresco-sm",
              config.color
            )}>
              {lens.replace('_', ' ')} Lens
            </span>
          </div>
          
          {hint ? (
            <p className={cn(
              "text-fresco-graphite-mid mt-0.5",
              compact ? "text-fresco-xs" : "text-fresco-sm"
            )}>
              {hint}
            </p>
          ) : (
            <p className={cn(
              "text-fresco-graphite-light mt-0.5",
              compact ? "text-fresco-xs" : "text-fresco-sm"
            )}>
              {config.description}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact version for inline use
export function ThinkingLensBadge({ lens }: { lens: ThinkingModeId }) {
  if (lens === 'automatic') return null;
  
  const config = LENS_CONFIG[lens] || LENS_CONFIG.automatic;
  const Icon = config.icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-fresco-xs font-medium",
      config.bgColor,
      config.color
    )}>
      <Icon className="w-3 h-3" />
      {lens.replace('_', ' ')}
    </span>
  );
}

// Full lens info panel for output
export function ThinkingLensPanel({ lens, hint }: { lens: ThinkingModeId; hint?: string }) {
  if (lens === 'automatic') return null;
  
  const config = LENS_CONFIG[lens] || LENS_CONFIG.automatic;
  const Icon = config.icon;

  return (
    <div className={cn(
      "p-4 rounded-xl border",
      config.bgColor,
      `border-current/20`
    )}>
      <div className="flex items-center gap-3 mb-2">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-gray-800",
          config.color
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className={cn("font-medium capitalize", config.color)}>
            {lens.replace('_', ' ')} Lens
          </h4>
          <p className="text-fresco-xs text-fresco-graphite-light">{config.description}</p>
        </div>
      </div>
      
      {hint && (
        <div className="mt-3 p-3 bg-white/50 rounded-lg">
          <p className="text-fresco-sm text-fresco-graphite-mid flex items-start gap-2">
            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-fresco-graphite" />
            {hint}
          </p>
        </div>
      )}
    </div>
  );
}
