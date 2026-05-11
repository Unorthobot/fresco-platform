'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Pause, Play, RotateCcw } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

/* ──────────────────────────────────────────────────────────────────────────
   Animated session onboarding (Option F).

   The user watches a real Investigate session play out in ~28 seconds.
   Six beats, each a discrete state of the session UI. The demo session
   is the measurement-framework example from FRSC-005 (Annotated Session
   poster) — kept consistent across all brand documents.

   The point is not to teach Fresco's mechanics in the abstract. It's to
   give the user the *rhythm* of a session: question lands, you type, the
   agents work, the verdict arrives. Watching once is closer to having
   used it once than reading any number of explainer slides.

   Controls: auto-advance through beats, pause/resume button, replay,
   skip. Honours prefers-reduced-motion (jumps straight to final state).
   ────────────────────────────────────────────────────────────────────────── */

type Beat =
  | { kind: 'question' }
  | { kind: 'typing' }
  | { kind: 'thinking' }
  | { kind: 'agent1' }
  | { kind: 'agent2' }
  | { kind: 'verdict' }
  | { kind: 'done' };

const BEATS: Beat[] = [
  { kind: 'question' },
  { kind: 'typing' },
  { kind: 'thinking' },
  { kind: 'agent1' },
  { kind: 'agent2' },
  { kind: 'verdict' },
  { kind: 'done' },
];

// Beat durations in ms — calibrated so the eye has time to read the content
// in each state without feeling like it's lagging behind the next.
const DURATIONS: Record<Beat['kind'], number> = {
  question: 3000,
  typing:   5000,
  thinking: 4000,
  agent1:   6500,
  agent2:   5500,
  verdict:  5000,
  done:     0,
};

const TYPED_ANSWER =
  'Six weeks ago we shipped a major mobile redesign. Average session length has dropped from 8 minutes to 4.8 minutes — a 40% drop. The team is split. Half want to roll back, half want to push through and patch what they think are regressions. We need to commit one way or the other this week.';

export function Onboarding({ onComplete }: OnboardingProps) {
  const [visible, setVisible] = useState(true);
  const [beatIndex, setBeatIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const beat = BEATS[beatIndex];
  const isDone = beat.kind === 'done';

  // Detect prefers-reduced-motion. If set, jump to the final state on mount
  // so users with vestibular sensitivities aren't subjected to the timeline.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setReducedMotion(true);
      setBeatIndex(BEATS.length - 1);
    }
  }, []);

  // Auto-advance: when the current beat's duration elapses, move to the next
  // unless the user has paused, finished, or has reduced motion enabled.
  useEffect(() => {
    if (isPaused || isDone || reducedMotion) return;
    const t = setTimeout(() => {
      setBeatIndex(i => Math.min(i + 1, BEATS.length - 1));
    }, DURATIONS[beat.kind]);
    return () => clearTimeout(t);
  }, [beatIndex, isPaused, isDone, reducedMotion, beat.kind]);

  const complete = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem('fresco-onboarding-complete', 'true'); } catch {}
    setTimeout(onComplete, 250);
  }, [onComplete]);

  const replay = useCallback(() => {
    setBeatIndex(0);
    setIsPaused(false);
  }, []);

  // Visible beats accumulate — once a beat has played, its content stays on
  // screen so the user can re-read it as the next beat layers on.
  const showQuestion = beatIndex >= 0;
  const showTyping   = beatIndex >= 1;
  const showThinking = beatIndex >= 2 && beatIndex < 3;
  const showAgent1   = beatIndex >= 3;
  const showAgent2   = beatIndex >= 4;
  const showVerdict  = beatIndex >= 5;
  const isThinking   = beatIndex === 2;

  // Visible beat for the indicator (1-of-6, etc) — done state stays at 6/6.
  const visibleStep = Math.min(beatIndex + 1, 6);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-label="Fresco — example session"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="bg-white shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col"
            style={{ maxHeight: 'min(90vh, 720px)' }}
          >
            {/* ── Header — labels and controls ─────────────────────────── */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-fresco-border-light">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-fresco-graphite-light">
                  Example session · Investigate
                </p>
                <p className="text-fresco-xs text-fresco-graphite-mid italic mt-0.5">
                  Watch one play out — it&apos;s close to twenty-five seconds.
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!isDone && !reducedMotion && (
                  <button
                    onClick={() => setIsPaused(p => !p)}
                    className="p-1.5 text-fresco-graphite-light hover:text-fresco-black transition-colors"
                    aria-label={isPaused ? 'Resume' : 'Pause'}
                    title={isPaused ? 'Resume' : 'Pause'}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                )}
                {(isDone || reducedMotion) && (
                  <button
                    onClick={replay}
                    className="p-1.5 text-fresco-graphite-light hover:text-fresco-black transition-colors"
                    aria-label="Replay"
                    title="Replay"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={complete}
                  className="p-1.5 text-fresco-graphite-light hover:text-fresco-black transition-colors"
                  aria-label="Skip"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Stage — the demo session content ─────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 bg-fresco-off-white">
              <div className="space-y-4">

                {/* Question card */}
                {showQuestion && (
                  <BeatFade>
                    <div className="border border-fresco-border bg-white">
                      <div className="px-4 py-3 border-b border-fresco-border-light">
                        <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-fresco-graphite-light">
                          QUESTION 01 / 04 · INVESTIGATE
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-fresco-base text-fresco-black italic leading-snug">
                          What are you trying to figure out?
                        </p>
                      </div>
                      {showTyping && (
                        <div className="border-t border-fresco-border-light px-4 py-3 bg-fresco-light-gray">
                          <Typewriter
                            text={TYPED_ANSWER}
                            durationMs={DURATIONS.typing - 400}
                            paused={isPaused || reducedMotion}
                            instant={reducedMotion}
                          />
                        </div>
                      )}
                    </div>
                  </BeatFade>
                )}

                {/* Thinking state */}
                {showThinking && isThinking && (
                  <BeatFade>
                    <div className="border border-fresco-border bg-white px-4 py-3 flex items-center gap-3">
                      <ThinkingDot />
                      <p className="text-fresco-sm text-fresco-graphite-soft">
                        Working through it — three agents in sequence…
                      </p>
                    </div>
                  </BeatFade>
                )}

                {/* Agent 1 — Insight Stack */}
                {showAgent1 && (
                  <BeatFade>
                    <div className="border border-fresco-border bg-white">
                      <div className="bg-fresco-black text-white px-4 py-2 flex items-center justify-between">
                        <p className="text-[9px] font-mono uppercase tracking-[0.14em]">
                          AGENT · 01 · INSIGHT STACK
                        </p>
                        <span className="text-[8px] font-mono uppercase tracking-wide opacity-50">
                          DIVERGE
                        </span>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-fresco-graphite-light mb-1">
                          ICEBERG · STRUCTURE LAYER
                        </p>
                        <p className="text-fresco-xs text-fresco-black leading-snug">
                          The framing assumes session length is a quality signal — but the
                          evidence doesn&apos;t support that link. Users who spent 8 minutes
                          pre-redesign were navigating, searching, retrying. Users who spend
                          4.8 minutes now arrive, complete, leave. That&apos;s not regression.
                          That&apos;s compression.
                        </p>
                      </div>
                    </div>
                  </BeatFade>
                )}

                {/* Agent 2 — Belief Mapper */}
                {showAgent2 && (
                  <BeatFade>
                    <div className="border border-fresco-border bg-white">
                      <div className="bg-fresco-black text-white px-4 py-2 flex items-center justify-between">
                        <p className="text-[9px] font-mono uppercase tracking-[0.14em]">
                          AGENT · 02 · BELIEF MAPPER
                        </p>
                        <span className="text-[8px] font-mono uppercase tracking-wide opacity-50">
                          CONVERGE
                        </span>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-fresco-graphite-light mb-1">
                          ASSUMPTION BEING TREATED AS FACT
                        </p>
                        <p className="text-fresco-xs text-fresco-black leading-snug italic">
                          &quot;Longer sessions mean a better product.&quot; A belief held since the
                          early app-engagement era. Holds for content and social products,
                          where time IS the value. Doesn&apos;t hold for utility products,
                          where time IS the cost. The team is measuring engagement when they
                          should be measuring completion.
                        </p>
                      </div>
                    </div>
                  </BeatFade>
                )}

                {/* Verdict card */}
                {showVerdict && (
                  <BeatFade>
                    <div
                      className="border border-fresco-border bg-white"
                      style={{ borderLeft: '4px solid #d97706' }}
                    >
                      <div className="px-4 py-3 border-b border-fresco-border-light">
                        <div className="inline-flex items-center gap-1.5 border border-fresco-border bg-fresco-light-gray px-2.5 py-0.5 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#d97706' }} />
                          <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-fresco-black">
                            PIVOT
                          </span>
                        </div>
                        <p className="text-fresco-base text-fresco-black leading-snug font-medium mb-1">
                          Session length isn&apos;t your metric. Task completion is.
                        </p>
                        <p className="text-[10px] text-fresco-graphite-light italic">
                          Sentence of truth — defensible in a meeting.
                        </p>
                      </div>
                    </div>
                  </BeatFade>
                )}

                {/* Closing — done state */}
                {isDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="border border-fresco-black bg-fresco-black text-white px-5 py-4"
                  >
                    <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/60 mb-2">
                      THAT&apos;S A SESSION
                    </p>
                    <p className="text-fresco-base leading-snug mb-3">
                      Twenty-five minutes of yours produces the same shape — for a decision in
                      front of you, not someone else&apos;s.
                    </p>
                    <button
                      onClick={complete}
                      className="inline-flex items-center gap-2 bg-white text-fresco-black px-4 py-2 text-fresco-sm font-medium hover:bg-fresco-off-white transition-colors"
                    >
                      <span>Begin yours</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

              </div>
            </div>

            {/* ── Footer — beat indicator + skip ───────────────────────── */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-fresco-border-light bg-white">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`h-0.5 transition-all duration-500 ${
                        visibleStep > i ? 'w-5 bg-fresco-black' : 'w-3 bg-fresco-border'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-fresco-graphite-light">
                  {Math.min(visibleStep, 6)} / 6
                </span>
              </div>
              {!isDone && (
                <button
                  onClick={complete}
                  className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors"
                >
                  Skip to app
                </button>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   BeatFade — wraps each beat's content with a fade-and-slide-up entrance.
   Layout doesn't shift because beats accumulate downward; new beats simply
   appear below previous ones.
   ────────────────────────────────────────────────────────────────────────── */
function BeatFade({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Typewriter — reveals text character-by-character over `durationMs`.
   Honours pause and instant flags. Doesn't use setInterval; uses
   requestAnimationFrame for smooth easing tied to wall-clock time so a
   pause produces a clean resume rather than a stutter.
   ────────────────────────────────────────────────────────────────────────── */
function Typewriter({
  text,
  durationMs,
  paused,
  instant,
}: {
  text: string;
  durationMs: number;
  paused: boolean;
  instant: boolean;
}) {
  const [shown, setShown] = useState(instant ? text : '');
  const startedAtRef = useRef<number | null>(null);
  const elapsedRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (instant) {
      setShown(text);
      return;
    }

    if (paused) {
      // freeze the elapsed counter at whatever it was
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startedAtRef.current = null;
      return;
    }

    function tick(now: number) {
      if (startedAtRef.current === null) startedAtRef.current = now;
      const localElapsed = now - startedAtRef.current;
      const total = elapsedRef.current + localElapsed;
      const ratio = Math.min(1, total / durationMs);
      const charCount = Math.floor(ratio * text.length);
      setShown(text.slice(0, charCount));

      if (ratio < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        elapsedRef.current = durationMs;
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // accumulate the elapsed time so resume picks up where we left off
      if (startedAtRef.current !== null) {
        elapsedRef.current += performance.now() - startedAtRef.current;
        startedAtRef.current = null;
      }
    };
  }, [text, durationMs, paused, instant]);

  return (
    <p className="text-fresco-xs text-fresco-black leading-relaxed font-mono">
      {shown}
      {shown.length < text.length && !instant && (
        <span className="inline-block w-1.5 h-3 bg-fresco-black ml-0.5 align-middle animate-pulse" />
      )}
    </p>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   ThinkingDot — single pulsing dot to mark the agent run state. Brand book
   says no spinners ("spinners imply blocking; pulses imply progress").
   ────────────────────────────────────────────────────────────────────────── */
function ThinkingDot() {
  return (
    <motion.span
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      className="inline-block w-1.5 h-1.5 rounded-full bg-fresco-black flex-shrink-0"
    />
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
      setShowOnboarding(true);
    },
  };
}
