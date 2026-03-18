'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Users, Zap } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLANS = [
  {
    key: 'pro' as const,
    name: 'Pro',
    price: 29,
    description: 'For individuals and power users.',
    icon: Zap,
    features: [
      'Unlimited workspaces',
      'Unlimited AI generations',
      'All 9 toolkits',
      'All 12 thinking modes',
      'Advanced exports (PDF, DOCX)',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    primary: true,
  },
  {
    key: 'studio' as const,
    name: 'Studio',
    price: 79,
    description: 'For teams who think together.',
    icon: Users,
    features: [
      'Everything in Pro',
      'Shared team workspaces',
      'Invite members with one link',
      'Owner, admin and member roles',
      'Team admin dashboard',
      'Dedicated support',
    ],
    cta: 'Upgrade to Studio',
    primary: false,
  },
];

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [loading, setLoading] = useState<'pro' | 'studio' | null>(null);

  const handleUpgrade = async (plan: 'pro' | 'studio') => {
    setLoading(plan);
    try {
      const res = await fetch('/api/lemonsqueezy/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'No checkout URL');
    } catch {
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
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
            onClick={e => e.stopPropagation()}
            className="bg-fresco-white border border-fresco-border rounded-none shadow-xl w-full max-w-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-fresco-border-light">
              <div>
                <h2 className="text-fresco-xl font-medium text-fresco-black">Upgrade Fresco</h2>
                <p className="text-fresco-sm text-fresco-graphite-light mt-0.5">Cancel anytime. No lock-in.</p>
              </div>
              <button onClick={onClose} className="p-1.5 text-fresco-graphite-light hover:text-fresco-black transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Plan cards */}
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-fresco-border-light">
              {PLANS.map(plan => {
                const Icon = plan.icon;
                return (
                  <div key={plan.key} className="p-8 flex flex-col">
                    {/* Plan name + price */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-4 h-4 text-fresco-graphite-mid" />
                        <span className="text-fresco-xs uppercase tracking-widest text-fresco-graphite-light font-medium">{plan.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-fresco-4xl font-medium text-fresco-black">${plan.price}</span>
                        <span className="text-fresco-sm text-fresco-graphite-light">/month</span>
                      </div>
                      <p className="text-fresco-sm text-fresco-graphite-mid mt-1">{plan.description}</p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-fresco-black flex-shrink-0 mt-0.5" />
                          <span className="text-fresco-sm text-fresco-graphite-soft">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={loading !== null}
                      className={
                        plan.primary
                          ? 'w-full py-3 bg-fresco-black text-white text-fresco-sm font-medium hover:bg-fresco-graphite transition-colors disabled:opacity-50'
                          : 'w-full py-3 border border-fresco-border text-fresco-black text-fresco-sm font-medium hover:bg-fresco-light-gray transition-colors disabled:opacity-50'
                      }
                    >
                      {loading === plan.key ? 'Loading…' : plan.cta}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-fresco-border-light flex items-center justify-between">
              <p className="text-fresco-xs text-fresco-graphite-light">
                Secure checkout via Lemon Squeezy
              </p>
              <a href="/terms" className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors">
                Terms apply
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
