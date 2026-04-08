'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { HOUSE_META } from '@/lib/agents';

interface OnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  {
    id: 'welcome',
    label: null,
    title: 'Fresco is a systems thinking platform.',
    body: 'Most teams jump to solutions before understanding the problem. Fresco structures your thinking — from diagnosis to decision — so you stop solving the wrong thing.',
    visual: null,
  },
  {
    id: 'houses',
    label: 'THE FOUR HOUSES',
    title: 'Each house answers a different question.',
    body: null,
    visual: 'houses',
  },
  {
    id: 'how',
    label: 'HOW IT WORKS',
    title: 'Answer a few questions. Get a verdict.',
    body: 'Three specialist agents run sequentially on your input. Each one builds on the previous. The synthesis returns a GO, PIVOT, STOP, or NEEDS MORE SIGNAL verdict — plus an iceberg analysis, system archetypes, leverage maps, causal loops, and behavior over time charts.',
    visual: null,
  },
  {
    id: 'simulation',
    label: 'SYSTEMS INTELLIGENCE',
    title: 'Fresco models the system, not just the symptom.',
    body: 'Every run surfaces the structure beneath your problem — the beliefs keeping it in place, the loops sustaining it, the leverage points where small changes create large impact. Run the scenario simulation to test what happens before you commit.',
    visual: null,
  },
  {
    id: 'start',
    label: null,
    title: 'Click a house to begin.',
    body: 'No workspace setup needed. Pick the house that matches where you are. Answer honestly. Get a verdict.',
    visual: 'cta',
  },
];

const HOUSES = [
  { id: 'investigate', q: 'Is the problem real?' },
  { id: 'innovate',    q: 'Will people want this?' },
  { id: 'validate',   q: 'Will it sell?' },
  { id: 'evaluate',   q: 'How is it actually doing?' },
] as const;

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const current = STEPS[step];

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else complete();
  };

  const complete = () => {
    setVisible(false);
    localStorage.setItem('fresco-onboarding-complete', 'true');
    setTimeout(onComplete, 250);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="bg-white shadow-2xl max-w-lg w-full overflow-hidden"
          >
            {/* Progress + close */}
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <div key={i} className={`h-0.5 transition-all duration-300 ${
                    i === step ? 'w-6 bg-fresco-black' :
                    i < step  ? 'w-3 bg-fresco-graphite-light' :
                                'w-3 bg-fresco-border'
                  }`} />
                ))}
              </div>
              <button onClick={complete}
                className="p-1 text-fresco-graphite-light hover:text-fresco-black transition-colors"
                aria-label="Skip">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
              className="px-6 py-6"
            >
              {current.label && (
                <p className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light mb-3">
                  {current.label}
                </p>
              )}
              <h2 className="text-xl font-medium text-fresco-black leading-snug mb-3">
                {current.title}
              </h2>
              {current.body && (
                <p className="text-fresco-sm text-fresco-graphite-mid leading-relaxed">
                  {current.body}
                </p>
              )}

              {/* Houses visual */}
              {current.visual === 'houses' && (
                <div className="mt-4 space-y-2">
                  {HOUSES.map(h => {
                    const meta = HOUSE_META[h.id];
                    return (
                      <div key={h.id} className="flex items-center gap-3 p-3 border border-fresco-border-light bg-fresco-light-gray">
                        <div className="w-20 flex-shrink-0">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light">{meta.name}</p>
                          <p className="text-[9px] text-fresco-graphite-light/60">{meta.formalLabel}</p>
                        </div>
                        <div className="w-px h-8 bg-fresco-border flex-shrink-0" />
                        <p className="text-fresco-sm text-fresco-graphite-soft">{h.q}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CTA visual */}
              {current.visual === 'cta' && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {HOUSES.map(h => {
                    const meta = HOUSE_META[h.id];
                    return (
                      <div key={h.id} className="p-3 border border-fresco-border hover:border-fresco-black transition-colors cursor-default">
                        <p className="text-fresco-xs font-medium text-fresco-black mb-0.5">{meta.name}</p>
                        <p className="text-[10px] text-fresco-graphite-light">{h.q}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Footer */}
            <div className="px-6 pb-5 flex items-center justify-between">
              <button onClick={complete}
                className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors">
                Skip
              </button>
              <button onClick={next} className="fresco-btn">
                {step < STEPS.length - 1
                  ? <><span>Next</span><ArrowRight className="w-4 h-4" /></>
                  : <><span>Get started</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Force show for review — remove before finalising
    localStorage.removeItem('fresco-onboarding-complete');
    setShowOnboarding(true);
  }, []);

  return {
    showOnboarding,
    completeOnboarding: () => {
      localStorage.setItem('fresco-onboarding-complete', 'true');
      setShowOnboarding(false);
    },
    resetOnboarding: () => {
      localStorage.removeItem('fresco-onboarding-complete');
      setShowOnboarding(true);
    },
  };
}
