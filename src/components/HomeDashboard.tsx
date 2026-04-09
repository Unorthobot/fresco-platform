'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Folder } from 'lucide-react';
import { useFrescoStore, useWorkspaces } from '@/lib/store';
import { formatRelativeTime } from '@/lib/utils';
import type { ToolkitType } from '@/types';
import type { HouseId } from '@/lib/agents';
import { HOUSE_META } from '@/lib/agents';
import { PricingModal } from '@/components/ui/PricingModal';

interface HomeDashboardProps {
  onNavigateToWorkspace?: (workspaceId: string) => void;
  onNavigateToSession?: (sessionId: string, workspaceId: string) => void;
  onStartToolkit?: (toolkitType: ToolkitType) => void | Promise<void>;
  onStartHouse?: (houseId: HouseId) => void | Promise<void>;
}

const HOUSES: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

export function HomeDashboard({
  onNavigateToWorkspace,
  onNavigateToSession,
  onStartHouse,
}: HomeDashboardProps) {
  const { user, sessions, getRecentSessions } = useFrescoStore();
  const workspaces = useWorkspaces();
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
  useEffect(() => {
    // Guests don't sync from DB — check localStorage flag instead
    try { setGuestHasRun(!!localStorage.getItem('fresco-has-run')); } catch {}
  }, []);
  const hasActivity = sessions.length > 0 || guestHasRun;

  // Verdicts across all sessions
  const verdicts = sessions.reduce((acc, s) => {
    const v = (s as any).aiOutputs?.verdict || (s as any).aiOutputs?.houseResult?.verdict;
    if (v) acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const VERDICT_STYLE: Record<string, string> = {
    'GO': 'bg-fresco-light-gray text-fresco-black border-fresco-border',
    'PIVOT': 'bg-fresco-light-gray text-fresco-black border-fresco-border',
    'STOP': 'bg-fresco-light-gray text-fresco-black border-fresco-border',
    'INVESTIGATE FURTHER': 'bg-fresco-light-gray text-fresco-black border-fresco-border',
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
                {isGuest ? 'GET STARTED' : `WELCOME BACK${firstName ? `, ${firstName.toUpperCase()}` : ''}`}
              </span>
              <h1 className="text-4xl md:text-5xl font-medium text-fresco-black tracking-tight mb-4 leading-tight">
                {isGuest
                  ? 'What decision are you trying to make?'
                  : hasActivity
                  ? 'Pick up where you left off, or start something new.'
                  : 'What decision are you trying to make?'}
              </h1>
              <p className="text-fresco-base text-fresco-graphite-mid max-w-xl">
                Choose a house. Answer a few questions. Get a verdict.
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
                          onClick={() => onStartHouse?.(finalHouse)}
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
            {/* Four equal houses — user self-selects based on where they are */}
            <div className="mb-2">
              <p className="text-fresco-sm text-fresco-graphite-mid mb-5">Where are you in your decision?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {HOUSES.map((houseId, i) => {
                  const house = HOUSE_META[houseId];
                  return (
                    <motion.button
                      key={houseId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
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
            </div>

            {/* What to expect — below the fold, no pressure */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 pt-8 border-t border-fresco-border-light"
            >
              <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-4">What happens when you run a house</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { step: '01', label: 'Answer 3–4 questions', desc: 'Specific to your situation. No generic prompts.' },
                  { step: '02', label: '3 agents analyse sequentially', desc: 'Each one builds on the previous. Not one big prompt.' },
                  { step: '03', label: 'Get a verdict + systems analysis', desc: 'GO, PIVOT, STOP, or NEEDS MORE SIGNAL — plus the structure beneath the problem.' },
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
                      <button key={s.id}
                        onClick={() => onNavigateToSession?.(s.id, s.workspaceId)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-fresco-light-gray transition-colors text-left group">
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
                          <span className={`flex-shrink-0 text-[10px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${VERDICT_STYLE[verdict] || 'bg-fresco-light-gray text-fresco-graphite-mid border-fresco-border'}`}>
                            {verdict === 'INVESTIGATE FURTHER' ? 'NEEDS MORE SIGNAL' : verdict}
                          </span>
                        )}
                      </button>
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
                      <button key={w.id}
                        onClick={() => onNavigateToWorkspace?.(w.id)}
                        className="flex items-center gap-2 px-3 py-2 border border-fresco-border hover:border-fresco-black text-fresco-sm text-fresco-graphite-soft hover:text-fresco-black transition-colors">
                        <Folder className="w-3.5 h-3.5 text-fresco-graphite-light" />
                        <span>{w.title}</span>
                        <span className="text-fresco-graphite-light text-fresco-xs">{wSessions.length}</span>
                      </button>
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
    </>
  );
}
