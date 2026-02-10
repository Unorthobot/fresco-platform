'use client';

// FRESCO Next Toolkit CTA Component
// Shows a prompt to continue to the next toolkit in the journey

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ArrowRight, X, PartyPopper, Layout } from 'lucide-react';
import { TOOLKITS, type ToolkitType } from '@/types';

// Toolkit flow mapping
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

// Custom messages for each transition
const TRANSITION_MESSAGES: Record<ToolkitType, string> = {
  insight_stack: 'Your insights are ready. Continue to POV Generator to crystallise your point of view.',
  pov_generator: 'Your POV is defined. Continue to Mental Model Mapper to map out the belief landscape.',
  mental_model_mapper: 'Your mental model is mapped. Continue to Flow Board to design the user journey.',
  flow_board: 'Your flow is designed. Continue to Experiment Brief to structure your hypothesis.',
  experiment_brief: 'Your experiment is briefed. Continue to Strategy Sketchbook to compare strategic options.',
  strategy_sketchbook: 'Your strategy is sketched. Continue to UX Scorecard to evaluate the experience.',
  ux_scorecard: 'Your UX is scored. Continue to Persuasion Canvas to craft your influence strategy.',
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
  
  const nextToolkit = TOOLKIT_FLOW[currentToolkit];
  
  // Don't show if dismissed, not ready, or no next toolkit
  if (isDismissed || !isReady || !nextToolkit) {
    // Show completion message for last toolkit
    if (isReady && !nextToolkit && currentToolkit === 'performance_grid' && !isDismissed) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mt-6 p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl"
        >
          <button 
            onClick={() => setIsDismissed(true)} 
            className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded text-white"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <PartyPopper className="w-5 h-5 flex-shrink-0 mt-0.5 text-white" />
            <div>
              <p className="text-fresco-sm font-medium mb-2 text-white">Journey Complete! 🎉</p>
              <p className="text-fresco-sm text-white/90 mb-3">You've completed all 9 FRESCO toolkits. View your workspace synthesis for the full picture.</p>
              <button
                onClick={onViewWorkspace}
                className="flex items-center gap-2 px-4 py-2 bg-white text-fresco-black rounded-lg text-fresco-sm font-medium hover:bg-fresco-light-gray transition-colors"
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
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="relative mt-6 p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl"
      >
        <button 
          onClick={() => setIsDismissed(true)} 
          className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded text-white"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5 text-white" />
          <div>
            <p className="text-fresco-sm font-medium mb-2 text-white">Ready for the next step!</p>
            <p className="text-fresco-sm text-white/90 mb-3">{message}</p>
            <button
              onClick={() => onStartToolkit?.(nextToolkit)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-fresco-black rounded-lg text-fresco-sm font-medium hover:bg-fresco-light-gray transition-colors"
            >
              Continue to {nextToolkitData.name} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
