'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ToolkitProgressProps {
  sections: { label: string; isComplete: boolean }[];
  currentSection?: number;
  onSectionClick?: (index: number) => void;
}

export function ToolkitProgress({ sections, currentSection, onSectionClick }: ToolkitProgressProps) {
  const completedCount = sections.filter(s => s.isComplete).length;
  const progress = (completedCount / sections.length) * 100;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-fresco-light-gray rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-fresco-black rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-fresco-xs text-fresco-graphite-mid font-medium">
          {completedCount}/{sections.length}
        </span>
      </div>

      {/* Section anchors */}
      <div className="flex flex-wrap gap-2">
        {sections.map((section, index) => (
          <button
            key={index}
            onClick={() => onSectionClick?.(index)}
            className={cn(
              "px-3 py-1.5 text-fresco-xs rounded-lg transition-colors",
              section.isComplete
                ? "bg-fresco-black text-white"
                : currentSection === index
                ? "bg-fresco-light-gray text-fresco-black border border-fresco-black"
                : "bg-fresco-light-gray text-fresco-graphite-mid hover:text-fresco-black"
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
}
