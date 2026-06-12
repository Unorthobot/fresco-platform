'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, ArrowRight } from 'lucide-react';
import { useFrescoStore } from '@/lib/store';
import { checkoutUrlFor } from '@/lib/checkout';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerHouse?: string; // which house triggered the upgrade (for context)
}

const HOUSES = [
  { name: 'Investigate', output: 'Is the problem real?', agents: ['Insight Stack', 'Belief Mapper', 'Position Builder'] },
  { name: 'Innovate',    output: 'Will people want this?',  agents: ['Flow Board', 'Strategy Sketchbook', 'Experiment Brief'] },
  { name: 'Validate',    output: 'Will it sell?', agents: ['Experience Scorecard', 'Influence Map', 'Results Tracker'] },
  { name: 'Evaluate',    output: 'How is it actually doing?', agents: ['Page Scorecard', 'Variant Lens', 'Journey Trace'] },
];

// Public ladder matches frescolab.io: Free + Founder. Founder is the public
// name of the `pro` tier (same entitlements: unlimited verdicts, all
// lenses). Studio left the public ladder June 2026 — the beta cohort stays
// grandfathered; nothing in the entitlement checks changed.
const PLANS = [
  {
    key: 'pro' as const,
    name: 'Founder',
    price: 24,
    zarPrice: 450,
    description: 'For founders who make the call week after week.',
    icon: Zap,
    features: [
      'Unlimited verdicts',
      "Decision memory — every call you've made, searchable",
      'All eight analytical lenses',
      'Priority runs',
      'Unlimited plugin evaluations',
      'PDF report + presentation deck export',
    ],
    cta: 'Get Founder',
    primary: true,
  },
];

export function PricingModal({ isOpen, onClose, triggerHouse }: PricingModalProps) {
  const [showArchitecture, setShowArchitecture] = useState(false);
  const user = useFrescoStore(state => state.user);

  const CHECKOUT_URLS: Record<'pro' | 'studio', string> = {
    pro:    'https://frescolab.lemonsqueezy.com/checkout/buy/2cff72c9-78bb-4698-b41d-9bb3abe6ef65',
    studio: 'https://frescolab.lemonsqueezy.com/checkout/buy/76f524c3-3cf8-49cf-98c3-2cd56465d460',
  };

  const handleUpgrade = (plan: 'pro' | 'studio') => {
    window.open(checkoutUrlFor(CHECKOUT_URLS[plan], user), '_blank', 'noopener');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            className="bg-fresco-white border border-fresco-border rounded-none shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-8 py-6 border-b border-fresco-border-light">
              <div>
                <h2 className="text-fresco-xl font-medium text-fresco-black">Upgrade Fresco</h2>
                <p className="text-fresco-sm text-fresco-graphite-light mt-0.5">
                  {triggerHouse
                    ? `You've used your free verdicts this month. Upgrade to keep deciding.`
                    : 'A clear verdict on the decision in front of you — with the reasoning that produced it.'}
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 text-fresco-graphite-light hover:text-fresco-black transition-colors mt-0.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free tier context */}
            <div className="px-8 py-4 bg-fresco-light-gray border-b border-fresco-border-light">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-fresco-sm font-medium text-fresco-black">Free plan</p>
                  <p className="text-fresco-xs text-fresco-graphite-mid">3 verdicts a month · Full engine, full reasoning · Chrome plugin included</p>
                </div>
                <button
                  onClick={() => setShowArchitecture(v => !v)}
                  className="text-fresco-xs text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1"
                >
                  What happens in a run? <ArrowRight className={`w-3 h-3 transition-transform ${showArchitecture ? 'rotate-90' : ''}`} />
                </button>
              </div>

              <AnimatePresence>
                {showArchitecture && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden"
                  >
                    <p className="text-fresco-xs text-fresco-graphite-mid mb-3">
                      Each verdict runs your input through three specialist analysis passes, then synthesises them into a single call — GO, PIVOT, STOP, or NEEDS MORE SIGNAL. One run = one complete analysis.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {HOUSES.map(h => (
                        <div key={h.name} className="bg-fresco-white p-3 border border-fresco-border-light">
                          <p className="text-fresco-xs font-medium text-fresco-black mb-0.5">{h.name}</p>
                          <p className="text-fresco-xs text-fresco-graphite-light mb-2">→ {h.output}</p>
                          <div className="flex flex-col gap-0.5">
                            {h.agents.map(a => (
                              <p key={a} className="text-[10px] text-fresco-graphite-light">{a}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Plugin callout */}
            <div className="px-8 py-4 border-b border-fresco-border-light flex items-start gap-4">
              <div className="w-8 h-8 bg-fresco-black flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="0"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              </div>
              <div className="flex-1">
                <p className="text-fresco-sm font-medium text-fresco-black mb-0.5">Includes the Fresco Evaluate Chrome plugin</p>
                <p className="text-fresco-xs text-fresco-graphite-mid leading-relaxed">Evaluate any page, compare versions, and trace user journeys — directly in your browser, without switching context. Every plan includes the Chrome extension.</p>
                {/* The promise was unactionable — the setup page existed but
                    nothing in the app linked to it. */}
                <a
                  href="/connect-extension"
                  className="inline-flex items-center gap-1 mt-2 text-fresco-xs font-medium text-fresco-black underline underline-offset-4 hover:opacity-70 transition-opacity"
                >
                  Set up the plugin →
                </a>
              </div>
            </div>

            {/* Plan cards */}
            <div>
              {PLANS.map(plan => {
                const Icon = plan.icon;
                return (
                  <div key={plan.key} className="p-8 flex flex-col">
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-4 h-4 text-fresco-graphite-mid" />
                        <span className="text-fresco-xs uppercase tracking-widest text-fresco-graphite-light font-medium">{plan.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-fresco-4xl font-medium text-fresco-black">R{(plan as any).zarPrice.toLocaleString()}</span>
                        <span className="text-fresco-sm text-fresco-graphite-light">/month</span>
                      </div>
                      <p className="text-fresco-xs text-fresco-graphite-light mt-0.5">≈ ${plan.price}/month</p>
                      <p className="text-fresco-sm text-fresco-graphite-mid mt-1">{plan.description}</p>
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-fresco-black flex-shrink-0 mt-0.5" />
                          <span className="text-fresco-sm text-fresco-graphite-soft">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      
                      className={plan.primary
                        ? 'w-full py-3 bg-fresco-black text-white text-fresco-sm font-medium hover:bg-fresco-graphite transition-colors disabled:opacity-50'
                        : 'w-full py-3 border border-fresco-border text-fresco-black text-fresco-sm font-medium hover:bg-fresco-light-gray transition-colors disabled:opacity-50'
                      }
                    >
                      {plan.cta}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="px-8 py-4 border-t border-fresco-border-light flex items-center justify-between">
              <p className="text-fresco-xs text-fresco-graphite-light">Secure checkout via Lemon Squeezy · Cancel anytime</p>
              <a href="/terms" className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors">Terms apply</a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
