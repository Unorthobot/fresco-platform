'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ArrowRight, X, PartyPopper, Layout, Lock } from 'lucide-react';
import { TOOLKITS, type ToolkitType } from '@/types';
import { useFrescoStore } from '@/lib/store';

const TOOLKIT_FLOW: Record<ToolkitType, ToolkitType | null> = {
  insight_stack: 'pov_generator',
  pov_generator: 'mental_model_mapper',
  mental_model_mapper: 'flow_board',
  flow_board: 'experiment_brief',
  experiment_brief: 'strategy_sketchbook',
  strategy_sketchbook: 'ux_scorecard',
  ux_scorecard: 'persuasion_canvas',
  persuasion_canvas: 'performance_grid',
  performance_grid: null,
};

const TRANSITION_MESSAGES: Record<ToolkitType, string> = {
  insight_stack: 'Your insights are ready. Continue to Position Builder to turn them into a clear position.',
  pov_generator: 'Your position is defined. Continue to Belief Mapper to surface the assumptions driving decisions.',
  mental_model_mapper: 'Your assumptions are mapped. Continue to Flow Board to design the solution journey.',
  flow_board: 'Your flow is designed. Continue to Experiment Brief to structure your hypothesis.',
  experiment_brief: 'Your experiment is briefed. Continue to Strategy Sketchbook to compare strategic options.',
  strategy_sketchbook: 'Your strategy is sketched. Continue to UX Scorecard to evaluate the experience.',
  ux_scorecard: 'Your experience is scored. Continue to Influence Map to plan how to reach your audience.',
  persuasion_canvas: 'Your persuasion strategy is ready. Continue to Performance Grid for final validation.',
  performance_grid: '',
};

interface NextToolkitCTAProps {
  currentToolkit: ToolkitType;
  isReady: boolean;
  onStartToolkit?: (toolkitType: ToolkitType) => void;
  onViewWorkspace?: () => void;
}

export function NextToolkitCTA({ currentToolkit, isReady, onStartToolkit, onViewWorkspace }: NextToolkitCTAProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const { canUseToolkit } = useFrescoStore();

  const nextToolkit = TOOLKIT_FLOW[currentToolkit];

  if (isDismissed || !isReady || !nextToolkit) {
    if (isReady && !nextToolkit && currentToolkit === 'performance_grid' && !isDismissed) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mt-6 p-4 bg-fresco-black rounded-none"
        >
          <button onClick={() => setIsDismissed(true)} className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-none text-white">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <PartyPopper className="w-5 h-5 flex-shrink-0 mt-0.5 text-white" />
            <div>
              <p className="text-fresco-sm font-medium mb-2 text-white">Journey complete.</p>
              <p className="text-fresco-sm text-white/70 mb-3">You've completed all 9 Fresco toolkits. View your workspace synthesis for the full picture.</p>
              <button
                onClick={onViewWorkspace}
                className="flex items-center gap-2 px-4 py-2 bg-white text-fresco-black rounded-none text-fresco-sm font-medium hover:bg-fresco-light-gray transition-colors"
              >
                <Layout className="w-4 h-4" /> View Workspace Synthesis
              </button>
            </div>
          </div>
        </motion.div>
      );
    }
    return null;
  }

  const nextToolkitData = TOOLKITS[nextToolkit];
  const message = TRANSITION_MESSAGES[currentToolkit];
  const isLocked = !canUseToolkit(nextToolkit);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="relative mt-6 p-4 bg-fresco-light-gray border border-fresco-border rounded-none"
      >
        <button onClick={() => setIsDismissed(true)} className="absolute top-3 right-3 p-1 hover:bg-fresco-warm-gray rounded-none text-fresco-graphite-light">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5 text-fresco-graphite-mid" />
          <div>
            <p className="text-fresco-sm font-medium mb-1 text-fresco-black">Next step</p>
            <p className="text-fresco-sm text-fresco-graphite-mid mb-3">{message}</p>
            {isLocked ? (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('fresco:upgrade', { detail: { reason: 'toolkits' } }))}
                className="flex items-center gap-2 px-4 py-2 bg-fresco-black text-white rounded-none text-fresco-sm font-medium hover:bg-fresco-graphite transition-colors"
              >
                <Lock className="w-3.5 h-3.5" /> Upgrade to unlock {nextToolkitData.name}
              </button>
            ) : (
              <button
                onClick={() => onStartToolkit?.(nextToolkit)}
                className="flex items-center gap-2 px-4 py-2 bg-fresco-black text-white rounded-none text-fresco-sm font-medium hover:bg-fresco-graphite transition-colors"
              >
                Continue to {nextToolkitData.name} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
