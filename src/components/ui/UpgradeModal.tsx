'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Sparkles, Zap } from 'lucide-react';
import { PricingModal } from '@/components/ui/PricingModal';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: 'workspaces' | 'ai_generations' | 'toolkits';
  currentUsage: number;
  limit: number;
}

export function UpgradeModal({ isOpen, onClose, reason, currentUsage, limit }: UpgradeModalProps) {
  const [showPricing, setShowPricing] = useState(false);

  const content = {
    toolkits: {
      icon: Crown,
      title: 'This is Pro only',
      description: 'Upgrade to unlock unlimited workspaces and house runs.',
    },
    workspaces: {
      icon: Sparkles,
      title: "You've hit your workspace limit",
      description: `You have ${currentUsage} of ${limit} workspaces on the free plan. Upgrade for unlimited workspaces.`,
    },
    ai_generations: {
      icon: Zap,
      title: "You've used your free runs",
      description: `You've used ${currentUsage} of ${limit} runs this month. Runs are shared between the app and the browser plugin. Upgrade to Pro for 30 runs/month plus unlimited plugin evaluations.`,
    },
  };

  const { icon: Icon, title, description } = content[reason];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="bg-fresco-white border border-fresco-border rounded-none shadow-xl max-w-sm w-full overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-fresco-black px-6 py-5 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-white/70" />
                  <h2 className="text-fresco-base font-medium text-white">{title}</h2>
                </div>
                <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-6">
                <p className="text-fresco-sm text-fresco-graphite-mid mb-6">{description}</p>

                {/* Usage bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-fresco-xs text-fresco-graphite-light mb-2">
                    <span>Usage</span>
                    <span>{currentUsage}/{limit}</span>
                  </div>
                  <div className="h-1.5 bg-fresco-light-gray rounded-full overflow-hidden">
                    <div
                      className="h-full bg-fresco-black rounded-full transition-all"
                      style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { onClose(); setShowPricing(true); }}
                    className="w-full py-2.5 bg-fresco-black text-white text-fresco-sm font-medium hover:bg-fresco-graphite transition-colors"
                  >
                    See plans
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-2 text-fresco-xs text-fresco-graphite-light hover:text-fresco-graphite-mid transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </>
  );
}
