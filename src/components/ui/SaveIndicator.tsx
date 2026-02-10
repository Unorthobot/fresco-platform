'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Cloud } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface SaveIndicatorProps {
  lastSaved?: Date | string;
  isSaving?: boolean;
}

export function SaveIndicator({ lastSaved, isSaving }: SaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);
  const [prevLastSaved, setPrevLastSaved] = useState(lastSaved);

  useEffect(() => {
    if (lastSaved && lastSaved !== prevLastSaved) {
      setShowSaved(true);
      setPrevLastSaved(lastSaved);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved, prevLastSaved]);

  return (
    <div className="flex items-center gap-2 text-fresco-xs text-fresco-graphite-light">
      <AnimatePresence mode="wait">
        {isSaving ? (
          <motion.div
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Cloud className="w-3.5 h-3.5" />
            </motion.div>
            <span>Saving...</span>
          </motion.div>
        ) : showSaved ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-fresco-black"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Saved</span>
          </motion.div>
        ) : (
          <motion.span key="autosaved" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Auto-saved {lastSaved ? formatRelativeTime(lastSaved) : 'just now'}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
