'use client';

// WP1 — first-run "See an example session" (spec Moment 1). Read-only,
// spends no run. STUB CONTENT: the structure is final; the copy below is
// placeholder until the anonymised Sorted session transcript is supplied.

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ExampleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── STUB — replace with the anonymised Sorted session ─────────────────────
const EXAMPLE = {
  prompt:
    'We connect car owners with independent mechanics. Bookings grew 40% last quarter but mechanic sign-ups have stalled — we have 20 mechanics and most are at capacity. Do we spend the next month building tools to recruit more mechanics, or double down on the demand side?',
  house: 'VALIDATE',
  verdict: 'PIVOT',
  sentenceOfTruth:
    'Your bottleneck is supply trust, not supply tooling — mechanics aren\'t joining because the commission terms feel risky, not because sign-up is hard.',
  rationale:
    'The evidence points at economics, not friction: capacity is full, demand is proven, and the stalled sign-ups correlate with the commission change — not with any product gap a recruiting tool would fix.',
  keyIssues: [
    'Mechanic acquisition stalled after the commission restructure, not before',
    'Recruiting tooling solves a friction problem the evidence doesn\'t show',
    'Demand growth makes the supply gap more expensive every week',
  ],
  moves: [
    'Call the last 10 mechanics who didn\'t complete sign-up — ask one question: what stopped you?',
    'Test a revised commission structure with 5 prospective mechanics before building anything',
    'Set a two-week decision point: if 15 of 20 accept revised terms, the verdict flips to GO on supply tooling',
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
