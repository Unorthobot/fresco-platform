'use client';

// FRESCO Thinking Lens Selector - frescolab.io style

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Brain, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THINKING_MODES, type ThinkingModeId } from '@/types';

interface ThinkingLensSelectorProps {
  value: ThinkingModeId;
  onChange: (mode: ThinkingModeId) => void;
  recommendedModes?: ThinkingModeId[];
  className?: string;
}

// Flatten the THINKING_MODES structure for easier access
const getAllModes = () => {
  const modes: Array<{ id: ThinkingModeId; label: string; description: string; tier: string }> = [
    { id: 'automatic', label: 'Automatic', description: 'Balanced analysis across all dimensions', tier: 'core' },
  ];
  
  THINKING_MODES.core.forEach((mode) => {
    modes.push({ ...mode, id: mode.id as ThinkingModeId, tier: 'core' });
  });
  
  THINKING_MODES.secondary.forEach((mode) => {
    modes.push({ ...mode, id: mode.id as ThinkingModeId, tier: 'secondary' });
  });
  
  THINKING_MODES.advanced.forEach((mode) => {
    modes.push({ ...mode, id: mode.id as ThinkingModeId, tier: 'advanced' });
  });
  
  return modes;
};

const allModes = getAllModes();

const getModeById = (id: ThinkingModeId) => {
  return allModes.find((m) => m.id === id) || allModes[0];
};

const tierLabels: Record<string, string> = {
  core: 'Core Modes',
  secondary: 'Secondary Modes',
  advanced: 'Advanced Modes',
};

export function ThinkingLensSelector({
  value,
  onChange,
  recommendedModes = [],
  className,
}: ThinkingLensSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const currentMode = getModeById(value);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Group modes by tier
  const groupedModes = {
    core: allModes.filter((m) => m.tier === 'core'),
    secondary: allModes.filter((m) => m.tier === 'secondary'),
    advanced: allModes.filter((m) => m.tier === 'advanced'),
  };
  
  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 h-10 border border-fresco-border dark:border-gray-700 rounded-fresco text-fresco-sm text-fresco-graphite-soft hover:border-fresco-graphite-light dark:hover:border-gray-500 transition-colors"
      >
        <Brain className="w-4 h-4 text-fresco-graphite-light" />
        <span>Thinking Lens: {currentMode.label}</span>
        <ChevronDown className={cn('w-4 h-4 text-fresco-graphite-light transition-transform', isOpen && 'rotate-180')} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-fresco-border dark:border-gray-700 rounded-fresco-lg shadow-fresco-lg overflow-hidden z-50"
          >
            <div className="max-h-[400px] overflow-y-auto">
              {(['core', 'secondary', 'advanced'] as const).map((tier) => (
                <div key={tier}>
                  <div className="px-4 py-2 text-fresco-xs font-medium uppercase tracking-wider text-fresco-graphite-light bg-fresco-light-gray dark:bg-gray-800 sticky top-0">
                    {tierLabels[tier]}
                  </div>
                  {groupedModes[tier].map((mode) => {
                    const isSelected = value === mode.id;
                    const isRecommended = recommendedModes.includes(mode.id);
                    return (
                      <button
                        key={mode.id}
                        onClick={() => {
                          onChange(mode.id);
                          setIsOpen(false);
                        }}
                        className={cn(
                          'flex items-start gap-3 w-full px-4 py-3 text-left transition-colors',
                          isSelected ? 'bg-fresco-light-gray dark:bg-gray-800' : 'hover:bg-fresco-off-white dark:hover:bg-gray-800'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-fresco-sm', isSelected ? 'font-medium text-fresco-black' : 'text-fresco-graphite-soft')}>
                              {mode.label}
                            </span>
                            {isRecommended && (
                              <span className="px-1.5 py-0.5 text-fresco-xs font-medium bg-fresco-black text-white rounded">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-fresco-xs text-fresco-graphite-light mt-0.5 line-clamp-1">
                            {mode.description}
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-fresco-black flex-shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
