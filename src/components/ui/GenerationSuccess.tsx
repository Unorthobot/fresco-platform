'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, ArrowRight } from 'lucide-react';

interface GenerationSuccessProps {
  show: boolean;
  onComplete?: () => void;
  insightCount?: number;
  hasTruth?: boolean;
  actionCount?: number;
}

export function GenerationSuccess({ 
  show, 
  onComplete,
  insightCount = 0,
  hasTruth = false,
  actionCount = 0
}: GenerationSuccessProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    if (show) {
      setPhase('enter');
      
      // Show for 4 seconds then exit
      const showTimer = setTimeout(() => setPhase('show'), 100);
      const exitTimer = setTimeout(() => {
        setPhase('exit');
        setTimeout(() => onComplete?.(), 400);
      }, 4000);
      
      return () => {
        clearTimeout(showTimer);
        clearTimeout(exitTimer);
      };
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <AnimatePresence>
      {phase !== 'exit' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
        >
          {/* Subtle backdrop pulse */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.03, 0] }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 bg-fresco-black"
          />

          {/* Main card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 30 
            }}
            className="relative"
          >
            {/* Glow effect behind card */}
            <div className="absolute inset-0 bg-gradient-radial from-fresco-graphite/20 to-transparent blur-3xl scale-150" />
            
            {/* Card */}
            <div className="relative bg-fresco-black rounded-2xl px-8 py-6 shadow-2xl border border-white/10">
              {/* Animated checkmark */}
              <div className="flex items-center justify-center mb-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 20,
                    delay: 0.1 
                  }}
                  className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Check className="w-6 h-6 text-fresco-black" strokeWidth={3} />
                  </motion.div>
                </motion.div>
              </div>

              {/* Text */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <h3 className="text-white text-fresco-lg font-medium mb-1">
                  Clarity Extracted
                </h3>
                <p className="text-white/50 text-fresco-sm">
                  Your thinking has crystallised
                </p>
              </motion.div>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-white/10"
              >
                {insightCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-white/70 text-fresco-xs">
                      {insightCount} insight{insightCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {hasTruth && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    <span className="text-white/70 text-fresco-xs">Truth found</span>
                  </div>
                )}
                {actionCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-white/70 text-fresco-xs">
                      {actionCount} action{actionCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </motion.div>

              {/* Animated shine effect */}
              <motion.div
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: '200%', opacity: [0, 0.5, 0] }}
                transition={{ delay: 0.5, duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
              />
            </div>
          </motion.div>

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0,
                  scale: 0,
                  x: '50vw',
                  y: '50vh'
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                  x: `${50 + (Math.random() - 0.5) * 30}vw`,
                  y: `${50 + (Math.random() - 0.5) * 30}vh`
                }}
                transition={{ 
                  duration: 1.5,
                  delay: 0.2 + i * 0.1,
                  ease: "easeOut"
                }}
                className="absolute w-1 h-1 rounded-full bg-fresco-graphite-light"
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Simpler inline success indicator for the output panel
export function InlineSuccess({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4 p-3 bg-fresco-black rounded-xl flex items-center gap-3"
    >
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
        <Check className="w-4 h-4 text-fresco-black" strokeWidth={3} />
      </div>
      <div>
        <p className="text-white text-fresco-sm font-medium">Generation complete</p>
        <p className="text-white/50 text-fresco-xs">Review your insights below</p>
      </div>
    </motion.div>
  );
}
