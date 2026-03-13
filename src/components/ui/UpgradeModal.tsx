'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Sparkles, Zap } from 'lucide-react';
import { useState } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: 'workspaces' | 'ai_generations' | 'toolkits';
  currentUsage: number;
  limit: number;
}

export function UpgradeModal({ isOpen, onClose, reason, currentUsage, limit }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (plan: 'pro' | 'studio' = 'pro') => {
    setLoading(true);
    try {
      const res = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (res.status === 401) {
        // Not logged in — save intent and redirect to login
        sessionStorage.setItem('post_login_action', JSON.stringify({ type: 'checkout', plan }));
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No checkout URL');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const content = {
    toolkits: {
      icon: Crown,
      title: "This toolkit is Pro only",
      description: "Upgrade to Pro to unlock all 9 thinking toolkits.",
      benefit: "Get unlimited access to every toolkit, exports, and more.",
    },
    workspaces: {
      icon: Sparkles,
      title: "You've hit your workspace limit",
      description: `You have ${currentUsage} of ${limit} workspaces on the free plan.`,
      benefit: "Upgrade to Pro for unlimited workspaces and advanced features.",
    },
    ai_generations: {
      icon: Zap,
      title: "You've used all your AI generations",
      description: `You've used ${currentUsage} of ${limit} AI generations this month.`,
      benefit: "Upgrade to Pro for unlimited AI generations and priority access.",
    },
  };

  const { icon: Icon, title, description, benefit } = content[reason];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{title}</h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-600 mb-4">{description}</p>
              
              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Usage</span>
                  <span className="font-medium text-gray-900">{currentUsage}/{limit}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                    style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Fresco Pro</p>
                    <p className="text-sm text-amber-700">{benefit}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Maybe later
                </button>
                <button
                  onClick={() => handleUpgrade('pro')}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    'Loading...'
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      Upgrade to Pro
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
