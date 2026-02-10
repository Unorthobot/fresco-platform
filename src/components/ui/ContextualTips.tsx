'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tip {
  id: string;
  title: string;
  content: string;
  trigger: 'empty_input' | 'short_input' | 'first_step' | 'generating' | 'complete';
}

const TIPS: Tip[] = [
  {
    id: 'empty_input',
    title: 'Start with what you know',
    content: 'Don\'t worry about being perfect. Capture your initial thoughts - you can always refine them later.',
    trigger: 'empty_input'
  },
  {
    id: 'short_input',
    title: 'Add more detail',
    content: 'The more context you provide, the richer your insights will be. Try adding specific examples or observations.',
    trigger: 'short_input'
  },
  {
    id: 'first_step',
    title: 'You\'re off to a great start!',
    content: 'Complete each step to build a full picture. Each one adds a layer to your understanding.',
    trigger: 'first_step'
  },
  {
    id: 'generating',
    title: 'AI is thinking...',
    content: 'We\'re analysing your inputs to extract meaningful insights. This usually takes 10-20 seconds.',
    trigger: 'generating'
  },
  {
    id: 'complete',
    title: 'Great work!',
    content: 'Review your insights and refine your Sentence of Truth. Consider what toolkit to use next.',
    trigger: 'complete'
  }
];

interface ContextualTipsProps {
  trigger: Tip['trigger'];
  className?: string;
}

export function ContextualTip({ trigger, className }: ContextualTipsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  
  const tip = TIPS.find(t => t.trigger === trigger && !dismissed.has(t.id));

  useEffect(() => {
    if (tip) {
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [tip]);

  const handleDismiss = () => {
    if (tip) {
      setDismissed(prev => new Set([...prev, tip.id]));
    }
    setIsVisible(false);
  };

  if (!tip || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "flex items-start gap-3 p-4 bg-fresco-light-gray dark:bg-gray-800 rounded-xl",
          className
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-4 h-4 text-fresco-graphite dark:text-gray-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-fresco-sm font-medium text-fresco-black mb-0.5">{tip.title}</h4>
          <p className="text-fresco-xs text-fresco-graphite-mid">{tip.content}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-fresco-graphite-light hover:text-fresco-black dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// Progress encouragement
interface ProgressEncouragementProps {
  completedSteps: number;
  totalSteps: number;
  className?: string;
}

export function ProgressEncouragement({ completedSteps, totalSteps, className }: ProgressEncouragementProps) {
  const percentage = Math.round((completedSteps / totalSteps) * 100);
  
  const getMessage = () => {
    if (percentage === 0) return "Let's begin your thinking journey";
    if (percentage < 25) return "Great start! Keep going";
    if (percentage < 50) return "You're making progress";
    if (percentage < 75) return "Halfway there! Momentum building";
    if (percentage < 100) return "Almost complete - finish strong!";
    return "All steps complete! Generate your insights";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex items-center gap-3 px-4 py-2 bg-fresco-light-gray/50 dark:bg-gray-800/50 rounded-full",
        className
      )}
    >
      <div className="flex-1 h-1.5 bg-white dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-fresco-black rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="text-fresco-xs text-fresco-graphite-mid whitespace-nowrap">
        {getMessage()}
      </span>
    </motion.div>
  );
}
