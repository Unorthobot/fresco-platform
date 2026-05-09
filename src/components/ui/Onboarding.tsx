'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

/* ──────────────────────────────────────────────────────────────────────────
   Three-slide onboarding — each slide is a working artefact, not an
   explainer. The discipline (per the Fresco brand book): show, don't tell.

   Slide 1 — A real verdict card (the deliverable)
   Slide 2 — A real iceberg analysis (the structure beneath)
   Slide 3 — Live entry: the user types their own decision

   The example in slides 1 & 2 is consistent with FRSC-005 (the Annotated
   Session poster) — measurement framework that nobody populates. Specific,
   recognisable to senior product/design folks, not invented.

   Slide 3 captures the user's decision text into localStorage. The home
   dashboard reads this on mount and pre-fills its diagnostic input — so
   the user lands on the dashboard with their decision already typed and
   ready to route. No double-entry.
   ────────────────────────────────────────────────────────────────────────── */

const ONBOARDING_INPUT_KEY = 'fresco-onboarding-decision-text';

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [decisionText, setDecisionText] = useState('');

  const isLast = step === 2;
  const canFinish = decisionText.trim().length >= 8;

  const next = () => {
    if (step < 2) setStep(s => s + 1);
    else complete();
  };

  const complete = () => {
    // Capture the user's decision text for the home dashboard to pre-fill.
    if (decisionText.trim().length > 0) {
      try {
        localStorage.setItem(ONBOARDING_INPUT_KEY, decisionText.trim());
      } catch { /* localStorage blocked — proceed without handoff */ }
    }
    setVisible(false);
    try { localStorage.setItem('fresco-onboarding-complete', 'true'); } catch {}
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
            className="bg-white shadow-2xl max-w-xl w-full overflow-hidden"
          >
            {/* Progress + close */}
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
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

            {/* Slide content */}
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
              className="px-6 py-5"
            >
              {step === 0 && <SlideVerdict />}
              {step === 1 && <SlideIceberg />}
              {step === 2 && (
                <SlideLiveEntry value={decisionText} onChange={setDecisionText} />
              )}
            </motion.div>

            {/* Footer */}
            <div className="px-6 pb-5 flex items-center justify-between">
              <button onClick={complete}
                className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors">
                Skip
              </button>
              <button
                onClick={next}
                disabled={isLast && !canFinish}
                className="fresco-btn disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isLast
                  ? <><span>Begin</span><ArrowRight className="w-4 h-4" /></>
                  : <><span>Next</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SLIDE 1 — A real verdict card
   ────────────────────────────────────────────────────────────────────────── */
function SlideVerdict() {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-fresco-graphite-light mb-1">
        WHAT YOU LEAVE WITH
      </p>
      <h2 className="text-fresco-lg font-medium text-fresco-black leading-snug mb-4">
        A defensible verdict — not a summary.
      </h2>

      <div className="border border-fresco-border bg-white" style={{ borderLeft: '4px solid #d97706' }}>
        <div className="px-5 py-4 border-b border-fresco-border-light">
          <div className="inline-flex items-center gap-1.5 border border-fresco-border bg-fresco-light-gray px-2.5 py-0.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#d97706' }} />
            <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-fresco-black">PIVOT</span>
          </div>
          <p className="text-fresco-base text-fresco-black leading-snug font-medium mb-1.5">
            Change direction first
          </p>
          <p className="text-fresco-xs text-fresco-graphite-mid italic leading-relaxed">
            &quot;The framework is fine. The contradiction is at leadership level — and the framework was built for the stated identity while landing in the operating reality.&quot;
          </p>
        </div>

        <div className="px-5 py-3 border-b border-fresco-border-light">
          <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-fresco-graphite-light mb-1.5">
            KEY ISSUES
          </p>
          <ol className="space-y-1.5 text-fresco-xs text-fresco-black leading-snug">
            <li className="flex gap-2"><span className="text-fresco-graphite-light font-mono">01</span><span>&quot;Data-led&quot; prioritisation untested against actual sponsorship or commitment</span></li>
            <li className="flex gap-2"><span className="text-fresco-graphite-light font-mono">02</span><span>Measurement point sits downstream of the decision being protected</span></li>
          </ol>
        </div>

        <div className="px-5 py-3">
          <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-fresco-graphite-light mb-1.5">
            RECOMMENDED MOVES
          </p>
          <ol className="space-y-1.5 text-fresco-xs text-fresco-black leading-snug">
            <li className="flex gap-2"><span className="text-fresco-graphite-light font-mono">01</span><span>Get a named executive to sign accountability before iterating the framework</span></li>
            <li className="flex gap-2"><span className="text-fresco-graphite-light font-mono">02</span><span>Phased measurement design — start with what&apos;s actually measurable today</span></li>
          </ol>
        </div>
      </div>

      <p className="text-[10px] text-fresco-graphite-light italic mt-3 leading-relaxed">
        Real output from an Investigate session. Pill, sentence of truth, ranked issues, ranked moves. Defensible in a meeting.
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SLIDE 2 — A real iceberg analysis
   ────────────────────────────────────────────────────────────────────────── */
function SlideIceberg() {
  const layers = [
    {
      label: 'EVENT',
      what: 'What is being observed',
      content: '9 of 12 metrics empty after 11 weeks. Two reviews scheduled, both rescheduled.',
    },
    {
      label: 'PATTERN',
      what: 'What keeps happening',
      content: 'Easy metrics get populated, hard ones don\u2019t. The team produces data when it\u2019s free.',
    },
    {
      label: 'STRUCTURE',
      what: 'What in the system produces this',
      content: 'No accountability link between metric and person. No consequence for empty cells.',
    },
    {
      label: 'MENTAL MODEL',
      what: 'What belief keeps it in place',
      content: '\u201CWe are data-driven\u201D is being held as identity, not behaviour.',
    },
  ];

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-fresco-graphite-light mb-1">
        AND THE STRUCTURE BENEATH IT
      </p>
      <h2 className="text-fresco-lg font-medium text-fresco-black leading-snug mb-4">
        Every verdict surfaces what&apos;s holding the problem in place.
      </h2>

      <div className="border border-fresco-border bg-white">
        {layers.map((layer, i) => (
          <div
            key={layer.label}
            className={`px-5 py-3 ${i < layers.length - 1 ? 'border-b border-fresco-border-light' : ''}`}
          >
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-fresco-black w-28 flex-shrink-0">
                {layer.label}
              </span>
              <span className="text-[10px] text-fresco-graphite-light italic">
                {layer.what}
              </span>
            </div>
            <p className="text-fresco-xs text-fresco-black leading-snug pl-[124px]">
              {layer.content}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-fresco-graphite-light italic mt-3 leading-relaxed">
        Iceberg analysis from the same session. Investigate produces this. Innovate produces a leverage map. Validate produces a barrier scorecard. Evaluate produces a journey trace.
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SLIDE 3 — Live entry
   ────────────────────────────────────────────────────────────────────────── */
function SlideLiveEntry({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-fresco-graphite-light mb-1">
        NOW YOURS
      </p>
      <h2 className="text-fresco-lg font-medium text-fresco-black leading-snug mb-4">
        What&apos;s the decision in front of you?
      </h2>

      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={4}
        autoFocus
        placeholder="A few sentences. e.g. We're seeing drop-off after signup climbing week-on-week. We're about to commit to an onboarding redesign — I'm not sure we've actually diagnosed what's causing it."
        className="w-full px-4 py-3 text-fresco-sm text-fresco-black bg-white border border-fresco-border focus:outline-none focus:border-fresco-black transition-colors placeholder:text-fresco-graphite-light resize-none leading-relaxed"
      />

      <p className="text-[10px] text-fresco-graphite-light italic mt-3 leading-relaxed">
        We&apos;ll route you to the right house based on what you describe. The text you enter here pre-fills the next screen — you can edit it before running.
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Hook — used by AppContent to decide whether to show onboarding
   ────────────────────────────────────────────────────────────────────────── */
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('fresco-onboarding-complete');
    if (!completed) setShowOnboarding(true);
  }, []);

  return {
    showOnboarding,
    completeOnboarding: () => {
      localStorage.setItem('fresco-onboarding-complete', 'true');
      setShowOnboarding(false);
    },
    resetOnboarding: () => {
      localStorage.removeItem('fresco-onboarding-complete');
      localStorage.removeItem(ONBOARDING_INPUT_KEY);
      setShowOnboarding(true);
    },
  };
}

/* Exported so HomeDashboard can pre-fill its diagnostic input on mount. */
export const ONBOARDING_HANDOFF_KEY = ONBOARDING_INPUT_KEY;
