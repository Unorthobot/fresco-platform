'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExampleToggleProps {
  stepLabel: string;
  example: string;
  tip?: string;
  className?: string;
}

export function ExampleToggle({ stepLabel, example, tip, className }: ExampleToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-fresco-xs text-fresco-graphite-light hover:text-fresco-graphite transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Show example</span>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 bg-fresco-light-gray rounded-xl">
              <p className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wider mb-2">
                Example for {stepLabel}
              </p>
              <p className="text-fresco-sm text-fresco-graphite italic leading-relaxed">
                "{example}"
              </p>
              {tip && (
                <div className="flex items-start gap-2 mt-3 pt-3 border-t border-fresco-border-light">
                  <Lightbulb className="w-3.5 h-3.5 text-fresco-graphite-light mt-0.5" />
                  <p className="text-fresco-xs text-fresco-graphite-mid">{tip}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
