'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Folder, ChevronDown, Sparkles, Trash2, X } from 'lucide-react';
import { useFrescoStore, useWorkspaces } from '@/lib/store';
import { useDBWrite } from '@/lib/useDBSync';
import { formatRelativeTime } from '@/lib/utils';
import type { ToolkitType } from '@/types';
import type { HouseId } from '@/lib/agents';
import { HOUSE_META } from '@/lib/agents';
import { PricingModal } from '@/components/ui/PricingModal';

interface HomeDashboardProps {
  onNavigateToWorkspace?: (workspaceId: string) => void;
  onNavigateToSession?: (sessionId: string, workspaceId: string) => void;
  onStartToolkit?: (toolkitType: ToolkitType) => void | Promise<void>;
  onStartHouse?: (houseId: HouseId, fromSessionId?: string, initialInput?: string) => void | Promise<void>;
}

const HOUSES: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

export function HomeDashboard({
  onNavigateToWorkspace,
  onNavigateToSession,
  onStartHouse,
}: HomeDashboardProps) {
  const { user, sessions, getRecentSessions } = useFrescoStore();
  const workspaces = useWorkspaces();
  const db = useDBWrite();
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const recentSessions = getRecentSessions(5);
  const { data: session } = useSession();
  const isGuest = !session && (!user || user.id === 'guest');
  const firstName = isGuest ? '' : (session?.user?.name?.split(' ')[0] || user?.name?.split(' ')[0] || '');
  const [guestHasRun, setGuestHasRun] = useState(false);
  const [diagnosticInput, setDiagnosticInput] = useState('');
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [recommendedHouse, setRecommendedHouse] = useState<HouseId | null>(null);
  const [diagnosticExplanation, setDiagnosticExplanation] = useState('');
  const [exampleOpen, setExampleOpen] = useState<HouseId | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | null>(null);
  useEffect(() => {
    try { setGuestHasRun(!!localStorage.getItem('fresco-has-run')); } catch {}
  }, []);

  // Onboarding handoff: if the user typed their decision on the third
  // onboarding slide, pre-fill the diagnostic input with it. Then clear
  // the handoff key so it doesn't reappear on subsequent visits.
  useEffect(() => {
    try {
      const handoff = localStorage.getItem('fresco-onboarding-decision-text');
      if (handoff && handoff.trim().length > 0) {
        setDiagnosticInput(handoff);
        localStorage.removeItem('fresco-onboarding-decision-text');
      }
    } catch { /* localStorage blocked — no handoff possible, proceed quietly */ }
  }, []);
  // hasActivity = true only when there's real persistent work to return to:
  // authenticated users need at least one workspace or session in the DB;
  // guests need the run flag AND at least one in-memory session (so a fresh
  // page load with only the flag but no sessions still shows the empty state).
  const hasActivity = workspaces.length > 0 || sessions.length > 0 || (guestHasRun && sessions.length > 0);

  // ── Diagnostic: call API to get contextual house recommendation ─────────────
  const handleDiagnosticSubmit = async () => {
    if (diagnosticInput.trim().length < 5 || diagnosticLoading) return;
    setDiagnosticLoading(true);
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: diagnosticInput }),
      });
      const data = await res.json();
      setRecommendedHouse(data.house as HouseId);
      setDiagnosticExplanation(data.explanation || '');
    } catch {
      // fallback — keyword match
      const t = diagnosticInput.toLowerCase();
      const house = /evaluat|conversion|drop|variant|metric|analytic|traffic|bounce|funnel/.test(t) ? 'evaluate'
        : /validat|will.*sell|pricing|willingness|should.*build|before.*build/.test(t) ? 'validate'
        : /innovat|solution|feature|how should|what should/.test(t) ? 'innovate'
        : 'investigate';
      setRecommendedHouse(house as HouseId);
      setDiagnosticExplanation('');
    } finally {
      setDiagnosticLoading(false);
    }
  };

  // Verdicts across all sessions
  const verdicts = sessions.reduce((acc, s) => {
    const v = (s as any).aiOutputs?.verdict || (s as any).aiOutputs?.houseResult?.verdict;
    if (v) acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Verdict accent tokens — the single chromatic note in the UI. Dots only,
  // labels stay monochrome, to keep home calm while still legible at a glance.
  const VERDICT_ACCENT: Record<string, string> = {
    'GO': 'var(--verdict-go-accent)',
    'PIVOT': 'var(--verdict-pivot-accent)',
    'STOP': 'var(--verdict-stop-accent)',
    'INVESTIGATE FURTHER': 'var(--verdict-signal-accent)',
  };

  return (
    <>
    <div className="min-h-screen fresco-grid-bg-subtle">

      {/* Upgrade banner — free users only */}
      {!isGuest && user?.subscription === 'free' && (
        <div className="bg-fresco-black text-white px-6 py-2.5 flex items-center justify-between">
          <p className="text-fresco-xs text-white/50">Free plan · 3 house runs/month</p>
          <button onClick={() => setShowPricingModal(true)} className="text-fresco-xs font-medium text-white hover:opacity-70 transition-opacity">See plans →</button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1">
              <span className="fresco-label block mb-3">
                {!hasActivity ? 'GET STARTED' : (isGuest ? 'KEEP GOING' : `WELCOME BACK${firstName ? `, ${firstName.toUpperCase()}` : ''}`)}
              </span>
              <h1 className="text-4xl md:text-5xl font-medium text-fresco-black tracking-tight mb-4 leading-tight">
                {hasActivity
                  ? 'What are you thinking through today?'
                  : 'What decision are you trying to make?'}
              </h1>
              <p className="text-fresco-base text-fresco-graphite-mid max-w-xl">
                {hasActivity
                  ? 'Choose a house, answer a few questions, get a verdict.'
                  : 'Choose a house. Answer a few questions. Get a verdict.'}
              </p>
            </div>

            {/* Context widget — time-aware, habit-informed */}
            {now && (
              <div className="hidden lg:flex flex-col items-end gap-0 flex-shrink-0 pt-1 min-w-[210px]">
                {(() => {
                  const hour = now.getHours();

                  // Time of day buckets
                  const timeOfDay = hour < 6 ? 'latenight'
                    : hour < 12 ? 'morning'
                    : hour < 17 ? 'afternoon'
                    : hour < 21 ? 'evening'
                    : 'latenight';

                  const greetings: Record<string, string> = {
                    morning:   'Good morning',
                    afternoon: 'Good afternoon',
                    evening:   'Good evening',
                    latenight: 'Still at it',
                  };

                  // House recommendation by time of day
                  // Morning → Investigate (planning, defining)
                  // Afternoon → Innovate or Validate (building, testing)
                  // Evening → Evaluate or Investigate (reflecting, diagnosing)
                  // Late night → whatever is most urgent
                  const timeRecommendations: Record<string, { house: HouseId; reason: string }> = {
                    morning:   { house: 'investigate', reason: 'Mornings are good for defining problems clearly.' },
                    afternoon: { house: 'innovate',    reason: 'Afternoons are good for shaping solutions.' },
                    evening:   { house: 'evaluate',    reason: 'Evenings are good for honest reflection.' },
                    latenight: { house: 'investigate', reason: 'Late nights are good for questioning assumptions.' },
                  };

                  // Override time recommendation with session-based logic if applicable
                  const houseSessions = sessions.filter(s => (s as any).houseType);
                  const hasRun = (h: HouseId) => houseSessions.some(s => (s as any).houseType === h);
                  const lastHouseSession = houseSessions
                    .slice()
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
                  const suggestedNext = (lastHouseSession as any)?.aiOutputs?.houseResult?.suggestedNextHouse
                    || (lastHouseSession as any)?.aiOutputs?.suggestedNextHouse;

                  let finalHouse: HouseId = timeRecommendations[timeOfDay].house;
                  let finalReason = timeRecommendations[timeOfDay].reason;

                  // System suggestion beats time-of-day
                  if (suggestedNext) {
                    finalHouse = suggestedNext as HouseId;
                    finalReason = 'Your last analysis pointed here.';
                  } else if (hasRun('investigate') && !hasRun('innovate')) {
                    finalHouse = 'innovate';
                    finalReason = "You have a defined problem. Now shape the solution.";
                  } else if (hasRun('innovate') && !hasRun('validate')) {
                    finalHouse = 'validate';
                    finalReason = 'You have a direction. Test if it will sell.';
                  } else if (hasRun('validate') && !hasRun('evaluate')) {
                    finalHouse = 'evaluate';
                    finalReason = "You've validated. See how it performs live.";
                  }

                  // Habit insight — only after 3+ sessions
                  let habitLine: string | null = null;
                  if (houseSessions.length >= 3) {
                    const sessionHours = houseSessions
                      .map(s => new Date(s.updatedAt).getHours());
                    const eveningRuns = sessionHours.filter(h => h >= 18).length;
                    const morningRuns = sessionHours.filter(h => h < 12).length;
                    const total = sessionHours.length;
                    if (eveningRuns / total >= 0.6) {
                      habitLine = 'You tend to think in the evenings.';
                    } else if (morningRuns / total >= 0.6) {
                      habitLine = 'You tend to think in the mornings.';
                    } else if (total >= 5) {
                      const investigateCount = houseSessions.filter(s => (s as any).houseType === 'investigate').length;
                      if (investigateCount / total >= 0.6) {
                        habitLine = "You investigate a lot. Trust your instincts enough to ship.";
                      }
                      const neverEvaluated = !hasRun('evaluate') && total >= 5;
                      if (neverEvaluated) {
                        habitLine = "You haven't evaluated anything live yet.";
                      }
                    }
                  }

                  const house = HOUSE_META[finalHouse];

                  return (
                    <>
                      {/* Greeting + time */}
                      <div className="text-right mb-4">
                        <div className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wider mb-1">
                          {greetings[timeOfDay]}
                        </div>
                        <div className="text-2xl font-medium text-fresco-black tabular-nums leading-none">
                          {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </div>
                        <div className="text-fresco-xs text-fresco-graphite-light mt-0.5">
                          {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                      </div>

                      {/* Habit insight — only when meaningful */}
                      {habitLine && (
                        <div className="w-full text-right mb-3">
                          <p className="text-fresco-xs text-fresco-graphite-light italic leading-relaxed">
                            {habitLine}
                          </p>
                        </div>
                      )}

                      {/* House recommendation */}
                      <div className="w-full border-t border-fresco-border-light pt-3 mb-3">
                        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-2 text-right">
                          {timeOfDay === 'morning' ? 'Start the day with' :
                           timeOfDay === 'afternoon' ? 'This afternoon' :
                           timeOfDay === 'evening' ? 'Tonight' : 'Right now'}
                        </p>
                        <button
                          onClick={() => onStartHouse?.(finalHouse, undefined, diagnosticInput)}
                          className="w-full text-right group"
                        >
                          <p className="text-fresco-sm font-medium text-fresco-black group-hover:underline underline-offset-2">
                            {house.name}
                          </p>
                          <p className="text-fresco-xs text-fresco-graphite-light mt-0.5 leading-relaxed">
                            {finalReason}
                          </p>
                        </button>
                      </div>


                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Four Houses ── */}
        {!hasActivity ? (
          // ── Empty state — first-time user ─────────────────────────────────
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10">

            {/* ── Feature 1: Diagnostic input ── */}
            <div className="mb-8">
              <p className="text-fresco-sm text-fresco-graphite-mid mb-3">Where are you in your decision?</p>
              {!recommendedHouse ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={diagnosticInput}
                    onChange={e => setDiagnosticInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleDiagnosticSubmit(); }}
                    placeholder="Describe what you're trying to figure out in one sentence…"
                    className="flex-1 h-10 px-4 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border focus:outline-none focus:border-fresco-black transition-colors placeholder:text-fresco-graphite-light"
                    disabled={diagnosticLoading}
                  />
                  <button
                    onClick={handleDiagnosticSubmit}
                    disabled={diagnosticInput.trim().length < 5 || diagnosticLoading}
                    className="h-10 px-4 bg-fresco-black text-white text-fresco-xs font-medium uppercase tracking-wider hover:bg-fresco-graphite transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {diagnosticLoading
                      ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /></>
                      : <ArrowRight className="w-4 h-4" />
                    }
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-fresco-black p-4 bg-fresco-white"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1">Recommended house</p>
                      <p className="text-fresco-base font-medium text-fresco-black">{HOUSE_META[recommendedHouse].name}</p>
                    </div>
                    <button
                      onClick={() => { setRecommendedHouse(null); setDiagnosticInput(''); setDiagnosticExplanation(''); }}
                      className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors mt-1 whitespace-nowrap"
                    >
                      Change →
                    </button>
                  </div>
                  <p className="text-fresco-xs text-fresco-graphite-mid mb-4 leading-relaxed">
                    {diagnosticExplanation}
                  </p>
                  <button
                    onClick={() => onStartHouse?.(recommendedHouse, undefined, diagnosticInput)}
                    className="fresco-btn w-full flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Start {HOUSE_META[recommendedHouse].name}
                  </button>
                </motion.div>
              )}
            </div>

            {/* ── Four house cards with hover explainer + example toggle ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
              {HOUSES.map((houseId, i) => {
                const house = HOUSE_META[houseId];
                const isExampleOpen = exampleOpen === houseId;
                const EXAMPLE_OUTPUTS: Record<HouseId, { sot: string; verdict: string; pill: string; issues: string[]; moves: string[] }> = {
                  investigate: {
                    sot: "The drop-off isn't a UX problem — users are disqualifying themselves before they reach the form.",
                    verdict: "Proceed with confidence",
                    pill: "GO",
                    issues: ["Evidence and hypothesis have been conflated — no one has tested the core assumption", "The measurement point is downstream of the real decision"],
                    moves: ["Separate what you've observed from what you believe is causing it", "Test the assumption that users want to complete this step at all"],
                  },
                  innovate: {
                    sot: "Three options are on the table but only one removes the friction that actually causes churn.",
                    verdict: "Change direction first",
                    pill: "PIVOT",
                    issues: ["Options A and B solve for speed, not the real problem", "The constraint isn't time — it's that no one has questioned the verification step"],
                    moves: ["Remove verification entirely and measure fraud rate for 2 weeks", "If fraud stays below 0.5%, make it permanent"],
                  },
                  validate: {
                    sot: "You have interest signals, not demand signals — nobody has been asked to pay yet.",
                    verdict: "Change direction first",
                    pill: "PIVOT",
                    issues: ["Inbound enquiries are not the same as willingness to pay", "The steelman case against has not been seriously answered"],
                    moves: ["Send a specific price to the 4 warmest leads this week", "Define a clear go/no-go threshold before the test, not after"],
                  },
                  evaluate: {
                    sot: "The CTA is asking for commitment before the page has earned it.",
                    verdict: "Change direction first",
                    pill: "PIVOT",
                    issues: ["70% scroll past the CTA without clicking — the page isn't answering the buyer's question", "'Book a demo' is asking for too much from someone still evaluating"],
                    moves: ["Replace 'Book a demo' with 'See it in action' — lower commitment, same intent signal", "Add one proof point above the fold that answers 'why trust this'"],
                  },
                };
                const ex = EXAMPLE_OUTPUTS[houseId];
                return (
                  <motion.div
                    key={houseId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="fresco-card flex flex-col"
                  >
                    {/* Card header — clickable to start */}
                    <button
                      onClick={() => onStartHouse?.(houseId)}
                      className="group p-5 flex flex-col text-left flex-1 hover:bg-fresco-off-white transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-fresco-xs font-medium text-fresco-graphite-light uppercase tracking-wider">{house.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-fresco-graphite-light group-hover:text-fresco-black group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <span className="self-start text-[9px] font-medium uppercase tracking-wider text-fresco-graphite-light bg-fresco-light-gray border border-fresco-border px-2 py-0.5 rounded-full mb-2 whitespace-nowrap">
                        {house.formalLabel}
                      </span>
                      <p className="text-fresco-sm font-medium text-fresco-black leading-snug mb-2">{house.output}</p>
                      <p className="text-fresco-xs text-fresco-graphite-light leading-relaxed">{house.description}</p>
                    </button>

                    {/* ── Feature 4: What is this? inline explainer ── */}
                    <div className="border-t border-fresco-border-light">
                      <button
                        onClick={() => setExampleOpen(isExampleOpen ? null : houseId)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors"
                      >
                        <span>See an example result</span>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExampleOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* ── Feature 3: Example output inline ── */}
                      {isExampleOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3 border-t border-fresco-border-light pt-3">
                            {/* Sentence of truth */}
                            <div className="border-l-2 border-fresco-black pl-3 py-0.5">
                              <p className="text-[10px] text-fresco-graphite-light uppercase tracking-wide mb-1">Insight</p>
                              <p className="text-fresco-xs text-fresco-black italic leading-relaxed">"{ex.sot}"</p>
                            </div>
                            {/* Verdict */}
                            <div className="flex items-center gap-2">
                              <span className="text-fresco-xs font-medium text-fresco-black">{ex.verdict}</span>
                              <span className="text-[9px] font-medium uppercase tracking-wider bg-fresco-light-gray border border-fresco-border text-fresco-graphite-light px-2 py-0.5 rounded-full">{ex.pill}</span>
                            </div>
                            {/* Key issues */}
                            <div>
                              <p className="text-[10px] text-fresco-graphite-light uppercase tracking-wide mb-1.5">Key issues</p>
                              {ex.issues.map((issue, idx) => (
                                <div key={idx} className="flex gap-2 mb-1.5 items-start">
                                  <span className="w-4 h-4 rounded-full border border-fresco-border flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-[9px] text-fresco-graphite-light">{idx + 1}</span>
                                  </span>
                                  <p className="text-[11px] text-fresco-graphite-soft leading-relaxed">{issue}</p>
                                </div>
                              ))}
                            </div>
                            {/* Recommended moves */}
                            <div>
                              <p className="text-[10px] text-fresco-graphite-light uppercase tracking-wide mb-1.5">Recommended moves</p>
                              {ex.moves.map((move, idx) => (
                                <div key={idx} className="flex gap-2 mb-1.5 items-start">
                                  <span className="w-4 h-4 rounded-full bg-fresco-black flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-[9px] text-white font-medium">{idx + 1}</span>
                                  </span>
                                  <p className="text-[11px] text-fresco-graphite-soft leading-relaxed">{move}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ── What happens — now inline per house, plus summary strip ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="pt-6 border-t border-fresco-border-light"
            >
              <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-4">What happens when you run a house</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { step: '01', label: 'Answer 3–4 questions', desc: 'Specific to your situation — not generic prompts. The questions separate evidence from assumption.' },
                  { step: '02', label: '3 agents analyse sequentially', desc: 'Each one builds on the previous. You get depth, not just breadth.' },
                  { step: '03', label: 'A verdict + the structure beneath it', desc: 'GO, PIVOT, STOP, or NEEDS MORE SIGNAL — plus archetypes, causal loops, and scenario simulation.' },
                ].map(item => (
                  <div key={item.step} className="flex gap-4">
                    <span className="text-[10px] font-medium text-fresco-graphite-light/40 tabular-nums mt-0.5 flex-shrink-0">{item.step}</span>
                    <div>
                      <p className="text-fresco-xs font-medium text-fresco-black mb-1">{item.label}</p>
                      <p className="text-[10px] text-fresco-graphite-light leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          // ── Returning user — full four house grid ─────────────────────────
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-10">
            {HOUSES.map((houseId, i) => {
              const house = HOUSE_META[houseId];
              return (
                <motion.button
                  key={houseId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => onStartHouse?.(houseId)}
                  className="group fresco-card p-5 flex flex-col text-left hover:border-fresco-black transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-fresco-xs font-medium text-fresco-graphite-light uppercase tracking-wider">{house.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-fresco-graphite-light group-hover:text-fresco-black group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <span className="self-start text-[9px] font-medium uppercase tracking-wider text-fresco-graphite-light bg-fresco-light-gray border border-fresco-border px-2 py-0.5 rounded-full mb-2 whitespace-nowrap">
                    {house.formalLabel}
                  </span>
                  <p className="text-fresco-sm font-medium text-fresco-black leading-snug mb-2">{house.output}</p>
                  <p className="text-fresco-xs text-fresco-graphite-light leading-relaxed flex-1">{house.description}</p>
                </motion.button>
              );
            })}
          </div>
        )}



        {/* ── Activity — returning users ── */}
        {hasActivity && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-fresco-sm font-medium text-fresco-black">Recent sessions</h2>
  
                </div>
                <div className="space-y-1.5">
                  {recentSessions.map(s => {
                    const ws = workspaces.find(w => w.id === s.workspaceId);
                    const houseType = (s as any).houseType as HouseId | undefined;
                    const houseName = houseType ? HOUSE_META[houseType]?.name : null;
                    const verdict = (s as any).aiOutputs?.verdict || (s as any).aiOutputs?.houseResult?.verdict;
                    const label = s.sentenceOfTruth?.content
                      ? `"${s.sentenceOfTruth.content.slice(0, 72)}${s.sentenceOfTruth.content.length > 72 ? '…' : ''}"`
                      : houseName || 'Session';

                    return (
                      <div key={s.id}
                        role="button" tabIndex={0}
                        onClick={() => onNavigateToSession?.(s.id, s.workspaceId)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateToSession?.(s.id, s.workspaceId); } }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-fresco-light-gray transition-colors text-left group cursor-pointer">
                        <Clock className="w-3.5 h-3.5 text-fresco-graphite-light flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-fresco-sm text-fresco-graphite-soft truncate leading-snug">{label}</p>
                          <p className="text-fresco-xs text-fresco-graphite-light mt-0.5">
                            {houseName && <span>{houseName} · </span>}
                            {ws?.title && <span>{ws.title} · </span>}
                            {formatRelativeTime(s.updatedAt)}
                          </p>
                        </div>
                        {verdict && (
                          <span className="flex-shrink-0 text-[10px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-fresco-light-gray text-fresco-black border-fresco-border flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: VERDICT_ACCENT[verdict] || 'var(--verdict-signal-accent)' }} />
                            {verdict === 'INVESTIGATE FURTHER' ? 'NEEDS MORE SIGNAL' : verdict}
                          </span>
                        )}
                        {/* Delete trash — hover-revealed, stops propagation so the row
                            click doesn't fire when the user is targeting the icon. */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeleteSessionId(s.id); }}
                          title="Delete session"
                          className="p-1.5 text-fresco-graphite-light opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Workspaces strip */}
            {workspaces.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-fresco-sm font-medium text-fresco-black">Workspaces</h2>
                  <span className="text-fresco-xs text-fresco-graphite-light">{workspaces.length} total</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {workspaces.slice(0, 6).map(w => {
                    const wSessions = sessions.filter(s => s.workspaceId === w.id);
                    return (
                      <div key={w.id}
                        role="button" tabIndex={0}
                        onClick={() => onNavigateToWorkspace?.(w.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigateToWorkspace?.(w.id); } }}
                        className="group flex items-center gap-2 px-3 py-2 border border-fresco-border hover:border-fresco-black text-fresco-sm text-fresco-graphite-soft hover:text-fresco-black transition-colors cursor-pointer">
                        <Folder className="w-3.5 h-3.5 text-fresco-graphite-light" />
                        <span>{w.title}</span>
                        <span className="text-fresco-graphite-light text-fresco-xs">{wSessions.length}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeleteWorkspaceId(w.id); }}
                          title="Delete workspace"
                          className="-mr-1 ml-0.5 p-0.5 text-fresco-graphite-light opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}

                </div>
              </div>
            )}


          </motion.div>
        )}
      </div>
    </div>

    <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />

      {/* Delete-workspace confirm modal — same pattern as elsewhere.
          Uses db.deleteWorkspace which atomically removes workspace +
          sessions and nulls active IDs. */}
      {deleteWorkspaceId && (() => {
        const target = workspaces.find(w => w.id === deleteWorkspaceId);
        if (!target) { setDeleteWorkspaceId(null); return null; }
        const targetSessions = sessions.filter(s => s.workspaceId === deleteWorkspaceId);
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]"
            onClick={() => setDeleteWorkspaceId(null)}>
            <div onClick={e => e.stopPropagation()}
              className="bg-white p-6 max-w-sm w-full mx-4 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-fresco-base font-medium text-fresco-black">Delete this workspace?</h3>
                <button onClick={() => setDeleteWorkspaceId(null)} className="p-1 text-fresco-graphite-light hover:text-fresco-black">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-fresco-sm text-fresco-graphite-mid mb-6">
                This will permanently delete <span className="text-fresco-black font-medium">{target.title}</span> and all {targetSessions.length} session{targetSessions.length !== 1 ? 's' : ''} inside. Can&apos;t be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteWorkspaceId(null)}
                  className="flex-1 h-9 text-fresco-sm text-fresco-graphite-mid border border-fresco-border hover:bg-fresco-light-gray transition-colors">
                  Cancel
                </button>
                <button onClick={() => { db.deleteWorkspace(deleteWorkspaceId); setDeleteWorkspaceId(null); }}
                  className="flex-1 h-9 text-fresco-sm text-white bg-red-600 hover:bg-red-700 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete-session confirm modal — same pattern as the workspace and
          sidebar deletes for consistency. */}
      {deleteSessionId && (() => {
        const target = sessions.find(s => s.id === deleteSessionId);
        if (!target) { setDeleteSessionId(null); return null; }
        const targetLabel = target.sentenceOfTruth?.content
          ? `"${target.sentenceOfTruth.content.slice(0, 60)}${target.sentenceOfTruth.content.length > 60 ? '…' : ''}"`
          : ((target as any).houseType ? HOUSE_META[(target as any).houseType as HouseId]?.name : 'this session') || 'this session';
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]"
            onClick={() => setDeleteSessionId(null)}>
            <div onClick={e => e.stopPropagation()}
              className="bg-white p-6 max-w-sm w-full mx-4 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-fresco-base font-medium text-fresco-black">Delete this session?</h3>
                <button onClick={() => setDeleteSessionId(null)} className="p-1 text-fresco-graphite-light hover:text-fresco-black">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-fresco-sm text-fresco-graphite-mid mb-6">
                This will permanently delete <span className="text-fresco-black font-medium">{targetLabel}</span>. Can&apos;t be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteSessionId(null)}
                  className="flex-1 h-9 text-fresco-sm text-fresco-graphite-mid border border-fresco-border hover:bg-fresco-light-gray transition-colors">
                  Cancel
                </button>
                <button onClick={() => { db.deleteSession(deleteSessionId); setDeleteSessionId(null); }}
                  className="flex-1 h-9 text-fresco-sm text-white bg-red-600 hover:bg-red-700 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
