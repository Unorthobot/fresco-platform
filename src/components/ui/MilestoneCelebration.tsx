'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles, Target, Zap, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MilestoneType = 
  | 'first_insight' 
  | 'first_truth' 
  | 'house_complete' 
  | 'workspace_complete'
  | 'streak';

interface MilestoneCelebrationProps {
  type: MilestoneType;
  isVisible: boolean;
  onClose: () => void;
  details?: string;
}

const MILESTONES = {
  first_insight: {
    icon: Sparkles,
    title: "First Insight Unlocked!",
    message: "You've discovered your first insight. This is just the beginning.",
    emoji: "🎯"
  },
  first_truth: {
    icon: Target,
    title: "Truth Discovered!",
    message: "You've captured your first Sentence of Truth. A powerful foundation.",
    emoji: "💎"
  },
  house_complete: {
    icon: Trophy,
    title: "House Complete!",
    message: "You've completed an entire thinking house. Impressive progress!",
    emoji: "🏆"
  },
  workspace_complete: {
    icon: Award,
    title: "Journey Complete!",
    message: "You've explored all 9 toolkits. You're a thinking master!",
    emoji: "👑"
  },
  streak: {
    icon: Zap,
    title: "On Fire!",
    message: "3-day thinking streak! Keep the momentum going.",
    emoji: "🔥"
  }
};

export function MilestoneCelebration({ type, isVisible, onClose, details }: MilestoneCelebrationProps) {
  const milestone = MILESTONES[type];
  const Icon = milestone.icon;

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40"
          onClick={onClose}
        >
          {/* Confetti particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                }}
                animate={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  scale: [0, 1, 0.5],
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: 2 + Math.random(),
                  ease: "easeOut",
                }}
                className={cn(
                  "absolute w-3 h-3 rounded-full",
                  i % 3 === 0 ? "bg-fresco-black" : i % 3 === 1 ? "bg-fresco-graphite" : "bg-fresco-graphite-light"
                )}
              />
            ))}
          </div>

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 50 }}
            transition={{ type: "spring", damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-fresco-white rounded-3xl shadow-2xl p-8 max-w-sm mx-4 text-center overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-fresco-light-gray to-white" />
            
            {/* Content */}
            <div className="relative">
              {/* Animated emoji */}
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                {milestone.emoji}
              </motion.div>
              
              {/* Icon badge */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-fresco-black flex items-center justify-center">
                <Icon className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-fresco-2xl font-bold text-fresco-black mb-2">
                {milestone.title}
              </h2>
              <p className="text-fresco-base text-fresco-graphite-mid mb-2">
                {milestone.message}
              </p>
              {details && (
                <p className="text-fresco-sm text-fresco-graphite-light">
                  {details}
                </p>
              )}
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="fresco-btn fresco-btn-primary mt-6"
              >
                Continue
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to track milestones
export function useMilestones() {
  const [milestone, setMilestone] = useState<{ type: MilestoneType; details?: string } | null>(null);

  const triggerMilestone = (type: MilestoneType, details?: string) => {
    // Check if already achieved (stored in localStorage)
    const achieved = localStorage.getItem(`milestone-${type}`);
    if (!achieved) {
      setMilestone({ type, details });
      localStorage.setItem(`milestone-${type}`, 'true');
    }
  };

  const clearMilestone = () => setMilestone(null);

  return { milestone, triggerMilestone, clearMilestone };
}
