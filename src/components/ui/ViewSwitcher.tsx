'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ViewOption {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface ViewSwitcherProps {
  options: ViewOption[];
  activeView: string;
  onChange: (viewId: string) => void;
  className?: string;
}

export function ViewSwitcher({ options, activeView, onChange, className }: ViewSwitcherProps) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1 p-1 bg-fresco-light-gray rounded-xl",
      className
    )}>
      {options.map(option => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 rounded-lg text-fresco-sm font-medium transition-colors",
            activeView === option.id
              ? "text-fresco-black"
              : "text-fresco-graphite-light hover:text-fresco-graphite transition-colors"
          )}
        >
          {activeView === option.id && (
            <motion.div
              layoutId="activeViewBg"
              className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            {option.icon}
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}
