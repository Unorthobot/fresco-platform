'use client';

import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Section {
  id: string;
  label: string;
  isComplete?: boolean;
}

interface SectionAnchorsProps {
  sections: Section[];
  currentSection?: string;
  onSectionClick?: (id: string) => void;
}

export function SectionAnchors({ sections, currentSection, onSectionClick }: SectionAnchorsProps) {
  const completedCount = sections.filter(s => s.isComplete).length;
  const progress = (completedCount / sections.length) * 100;

  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-fresco-border-light py-3 px-4 mb-6">
      <div className="flex items-center gap-4">
        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-fresco-light-gray rounded-full overflow-hidden max-w-[120px]">
          <motion.div
            className="h-full bg-fresco-black rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-fresco-xs text-fresco-graphite-light">{completedCount}/{sections.length}</span>
        
        {/* Section pills */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => onSectionClick?.(section.id)}
              className={cn(
                "px-3 py-1 text-fresco-xs rounded-full whitespace-nowrap transition-colors",
                section.isComplete
                  ? "bg-fresco-black text-white"
                  : currentSection === section.id
                  ? "bg-fresco-light-gray text-fresco-black ring-1 ring-fresco-black"
                  : "bg-fresco-light-gray text-fresco-graphite-mid hover:text-fresco-black transition-colors"
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook to scroll to section
export function useScrollToSection() {
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return { scrollToSection };
}
