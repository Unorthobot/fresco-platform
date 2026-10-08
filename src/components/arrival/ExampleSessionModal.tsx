'use client';

// WP1 — first-run "See an example session" (spec Moment 1). Read-only,
// spends no run. A representative anonymised decision — deliberately a
// different scenario from the one on the marketing site so the two never
// read as the same example.

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ExampleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXAMPLE = {
  prompt:
    'We build project management software for construction firms — there are four of us. Customers keep asking for a mobile app, Gantt charts, and a QuickBooks integration. I want all three, but we can only ship one well this quarter. Which do we build, and how should I even decide?',
  house: 'INNOVATE',
  verdict: 'PIVOT',
  sentenceOfTruth:
    'Which feature is the wrong question — until your field crews stop defaulting to WhatsApp and spreadsheets, anything you ship lands in a tool half your users have already left.',
  rationale:
    'Two of your three options serve the office, but adoption isn\'t dying in the office — it\'s dying on site. The mobile app is the only one that touches where the work actually happens.',
  keyIssues: [
    'Gantt charts and QuickBooks serve the office, where adoption isn\'t the problem',
    'Field crews fall back to WhatsApp because the product isn\'t usable on site',
    'Shipping for the office widens the office/field gap that\'s driving churn',
  ],
  moves: [
    'Shadow two crews on a job site for a day — watch every time they reach for WhatsApp instead of you',
    'Ship a thin mobile view — today\'s tasks plus photo upload — before Gantt or QuickBooks',
    'Define adoption as field crews logging in 3×/week; if a mobile pilot hits that within a month, the verdict flips to GO on going mobile-first',
  ],
};
// ──────────────────────────────────────────────────────────────────────────

export function ExampleSessionModal({ isOpen, onClose }: ExampleSessionModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            className="bg-fresco-white border border-fresco-border w-full max-w-lg max-h-[85vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-fresco-white border-b border-fresco-border-light px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fresco-graphite-light">
                  Example session · read-only
                </p>
                <p className="text-fresco-sm text-fresco-graphite-mid mt-0.5">A real decision, anonymised. Yours works the same way.</p>
              </div>
              <button onClick={onClose} className="p-1.5 text-fresco-graphite-light hover:text-fresco-black transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fresco-graphite-light mb-2">The decision</p>
                <p className="text-fresco-sm text-fresco-graphite-soft leading-relaxed italic">&ldquo;{EXAMPLE.prompt}&rdquo;</p>
                <p className="font-mono text-[10px] text-fresco-graphite-light mt-2">RAN AS · {EXAMPLE.house}</p>
              </div>

              <div className="border border-fresco-border border-l-4 border-l-fresco-black p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fresco-graphite-light mb-1">Verdict</p>
                <p className="text-fresco-xl font-medium text-fresco-black mb-2">{EXAMPLE.verdict}</p>
                <p className="text-fresco-sm italic text-fresco-black leading-relaxed mb-2">&ldquo;{EXAMPLE.sentenceOfTruth}&rdquo;</p>
                <p className="text-fresco-xs text-fresco-graphite-mid leading-relaxed">{EXAMPLE.rationale}</p>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fresco-graphite-light mb-2">What&rsquo;s going wrong</p>
                <ol className="space-y-1.5">
                  {EXAMPLE.keyIssues.map((issue, i) => (
                    <li key={i} className="text-fresco-sm text-fresco-graphite-soft flex gap-2.5">
                      <span className="text-fresco-graphite-light tabular-nums">{i + 1}.</span>{issue}
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fresco-graphite-light mb-2">What to do now</p>
                <ol className="space-y-1.5">
                  {EXAMPLE.moves.map((move, i) => (
                    <li key={i} className="text-fresco-sm text-fresco-graphite-soft flex gap-2.5">
                      <span className="text-fresco-graphite-light tabular-nums">{i + 1}.</span>{move}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="border-t border-fresco-border-light px-6 py-4">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-fresco-black text-white text-fresco-sm font-medium hover:bg-fresco-graphite transition-colors"
              >
                Run my own decision
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
