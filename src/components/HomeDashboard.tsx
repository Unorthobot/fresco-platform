'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, Clock, Folder } from 'lucide-react';
import { useFrescoStore, useWorkspaces } from '@/lib/store';
import { formatRelativeTime } from '@/lib/utils';
import type { ToolkitType } from '@/types';
import type { HouseId } from '@/lib/agents';
import { HOUSE_META } from '@/lib/agents';
import { PricingModal } from '@/components/ui/PricingModal';

interface HomeDashboardProps {
  onNavigateToWorkspace?: (workspaceId: string) => void;
  onNavigateToSession?: (sessionId: string, workspaceId: string) => void;
  onCreateWorkspace?: () => void;
  onStartToolkit?: (toolkitType: ToolkitType) => void | Promise<void>;
  onStartHouse?: (houseId: HouseId) => void | Promise<void>;
}

const HOUSES: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

export function HomeDashboard({
  onNavigateToWorkspace,
  onNavigateToSession,
  onCreateWorkspace,
  onStartHouse,
}: HomeDashboardProps) {
  const { user, sessions, getRecentSessions } = useFrescoStore();
  const workspaces = useWorkspaces();
  const [showPricingModal, setShowPricingModal] = useState(false);

  const recentSessions = getRecentSessions(5);
  const { data: session } = useSession();
  const isGuest = !session && (!user || user.id === 'guest');
  const firstName = isGuest ? '' : (session?.user?.name?.split(' ')[0] || user?.name?.split(' ')[0] || '');
  const hasActivity = sessions.length > 0;

  // Verdicts across all sessions
  const verdicts = sessions.reduce((acc, s) => {
    const v = (s as any).aiOutputs?.verdict || (s as any).aiOutputs?.houseResult?.verdict;
    if (v) acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const VERDICT_STYLE: Record<string, string> = {
    'GO': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'PIVOT': 'bg-amber-50 text-amber-700 border-amber-200',
    'STOP': 'bg-fresco-light-gray text-fresco-graphite-mid border-fresco-border',
    'INVESTIGATE FURTHER': 'bg-blue-50 text-blue-700 border-blue-200',
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

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-10 md:py-14">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
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
        </motion.div>

        {/* ── Four Houses ── */}
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
                {/* Formal label pill */}
                <span className="inline-block text-[10px] font-medium text-fresco-graphite-light bg-fresco-light-gray border border-fresco-border px-2 py-0.5 mb-2 tracking-wide">
                  {house.formalLabel}
                </span>
                {/* Plain English output */}
                <p className="text-fresco-sm font-medium text-fresco-black leading-snug mb-2">{house.output}</p>
                <p className="text-fresco-xs text-fresco-graphite-light leading-relaxed flex-1">{house.description}</p>
              </motion.button>
            );
          })}
        </div>

        {/* ── New workspace CTA for new users ── */}
        {!hasActivity && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex items-center gap-4 mb-12">
            <button onClick={onCreateWorkspace} className="fresco-btn">
              <Plus className="w-4 h-4" /><span>Create a workspace first</span>
            </button>
            <p className="text-fresco-xs text-fresco-graphite-light">Workspaces keep your sessions organised by project or decision.</p>
          </motion.div>
        )}

        {/* ── Activity — returning users ── */}
        {hasActivity && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-fresco-sm font-medium text-fresco-black">Recent sessions</h2>
                  <button onClick={onCreateWorkspace}
                    className="flex items-center gap-1 text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors">
                    <Plus className="w-3 h-3" /> New workspace
                  </button>
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
                          <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 border ${VERDICT_STYLE[verdict] || 'bg-fresco-light-gray text-fresco-graphite-mid border-fresco-border'}`}>
                            {verdict === 'INVESTIGATE FURTHER' ? 'MORE SIGNAL' : verdict}
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
                  <button onClick={onCreateWorkspace}
                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-fresco-border text-fresco-sm text-fresco-graphite-light hover:text-fresco-black hover:border-fresco-black transition-colors">
                    <Plus className="w-3.5 h-3.5" /> New
                  </button>
                </div>
              </div>
            )}

            {/* Verdict tally — only if there are verdicts */}
            {Object.keys(verdicts).length > 0 && (
              <div className="border-t border-fresco-border-light pt-6">
                <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-3">Your verdicts this month</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(verdicts).map(([v, count]) => (
                    <span key={v} className={`text-fresco-xs font-medium px-2.5 py-1 border ${VERDICT_STYLE[v] || 'bg-fresco-light-gray text-fresco-graphite-mid border-fresco-border'}`}>
                      {count} {v === 'INVESTIGATE FURTHER' ? 'NEEDS MORE SIGNAL' : v}
                    </span>
                  ))}
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
