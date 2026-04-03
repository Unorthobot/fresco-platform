'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, Clock, MapPin, Cloud, Sun, CloudRain, Folder, Lightbulb, Timer } from 'lucide-react';
import { useFrescoStore, useWorkspaces } from '@/lib/store';
import { formatRelativeTime } from '@/lib/utils';
import { TOOLKITS, type ToolkitType } from '@/types';
import type { HouseId } from '@/lib/agents';
import { HOUSE_META } from '@/lib/agents';
import { UpgradeModal } from '@/components/ui/UpgradeModal';
import { PricingModal } from '@/components/ui/PricingModal';

interface HomeDashboardProps {
  onNavigateToWorkspace?: (workspaceId: string) => void;
  onNavigateToSession?: (sessionId: string, workspaceId: string) => void;
  onCreateWorkspace?: () => void;
  onStartToolkit?: (toolkitType: ToolkitType) => void | Promise<void>;
  onStartHouse?: (houseId: HouseId) => void | Promise<void>;
}

interface WeatherData { temp: number; condition: string; }

const HOUSES: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

const HOUSE_AGENTS: Record<HouseId, string[]> = {
  investigate: ['Insight Stack', 'Belief Mapper', 'Position Builder'],
  innovate:    ['Flow Board', 'Strategy Sketchbook', 'Experiment Brief'],
  validate:    ['Experience Scorecard', 'Influence Map', 'Results Tracker'],
  evaluate:    ['Page Scorecard', 'Variant Lens', 'Journey Trace'],
};

export function HomeDashboard({
  onNavigateToWorkspace,
  onNavigateToSession,
  onCreateWorkspace,
  onStartHouse,
}: HomeDashboardProps) {
  const { user, sessions, getRecentSessions } = useFrescoStore();
  const workspaces = useWorkspaces();

  const [mounted, setMounted] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<string>('');

  const recentSessions = getRecentSessions(4);
  const sentencesOfTruth = sessions.filter(s => s.sentenceOfTruth?.content).slice(0, 3);
  const totalInsights = sessions.reduce((acc, s) => acc + (s.insights?.length || 0), 0);
  const decisionCounts = sessions.reduce((acc, s) => {
    const d = (s as any).decision;
    if (d === 'GO') acc.go++;
    else if (d === 'PIVOT') acc.pivot++;
    else if (d === 'KILL') acc.kill++;
    else if (d === 'DEFERRED') acc.deferred++;
    return acc;
  }, { go: 0, pivot: 0, kill: 0, deferred: 0 });

  useEffect(() => { setMounted(true); setCurrentTime(new Date()); }, []);
  useEffect(() => {
    if (!mounted) return;
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude, longitude } = pos.coords;
        const geo = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
        if (geo.ok) { const d = await geo.json(); setLocation(d.city || d.locality || ''); }
        const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        if (wx.ok) {
          const d = await wx.json();
          const code = d.current_weather.weathercode;
          setWeather({ temp: Math.round(d.current_weather.temperature), condition: code >= 51 ? 'Rainy' : code >= 1 ? 'Cloudy' : 'Clear' });
        }
      } catch { /* ignore */ }
    }, () => {});
  }, [mounted]);

  const { data: session } = useSession();
  const isGuest = !session && (!user || user.id === 'guest');
  const isNewUser = isGuest && sessions.length === 0; // truly first-time: no auth, no sessions
  const firstName = isGuest ? '' : (session?.user?.name?.split(' ')[0] || user?.name?.split(' ')[0] || '');
  const hasActivity = sessions.length > 0;

  const formatTime = (d: Date | null) => d ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
  const formatDate = (d: Date | null) => d ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const WeatherIcon = ({ condition }: { condition: string }) =>
    condition === 'Rainy' ? <CloudRain className="w-3.5 h-3.5" /> : condition === 'Cloudy' ? <Cloud className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />;

  return (
    <>
    <div className="min-h-screen fresco-grid-bg-subtle">

      {/* Upgrade banner */}
      {!isGuest && user?.subscription === 'free' && (
        <div className="bg-fresco-black text-white px-6 py-2.5 flex items-center justify-between">
          <p className="text-fresco-xs text-white/50">Free plan · 3 workspaces · 10 AI generations/month</p>
          <button onClick={() => setShowPricingModal(true)} className="text-fresco-xs font-medium text-white hover:opacity-70 transition-opacity">Upgrade →</button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1">
              <span className="fresco-label block mb-2">
                {isNewUser ? 'GET STARTED' : `WELCOME BACK${firstName ? `, ${firstName.toUpperCase()}` : ''}`}
              </span>
              <h1 className="text-fresco-3xl font-medium text-fresco-black tracking-tight mb-3">
                {isNewUser
                  ? 'Pick a house. Run your first analysis.'
                  : 'What are you working on today?'}
              </h1>
              <p className="text-fresco-base text-fresco-graphite-mid max-w-2xl">
                {isNewUser
                  ? 'Four houses. Twelve agents. One verdict.'
                  : 'Choose a house. Three agents analyse your input and return a verdict.'}
              </p>
            </div>

            {/* Time / weather — right of header, only when mounted */}
            {mounted && (
              <div className="hidden lg:flex flex-col items-end text-right flex-shrink-0">
                <div className="text-fresco-2xl font-medium text-fresco-black tabular-nums">{formatTime(currentTime)}</div>
                <div className="text-fresco-xs text-fresco-graphite-light mt-0.5">{formatDate(currentTime)}</div>
                {(location || weather) && (
                  <div className="flex items-center gap-3 mt-2 text-fresco-xs text-fresco-graphite-light">
                    {location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{location}</span>}
                    {weather && <span className="flex items-center gap-1"><WeatherIcon condition={weather.condition} />{weather.temp}°C</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent sessions — slim strip, only for returning users */}
          {recentSessions.length > 0 && (
            <div className="flex items-center gap-2 mt-5 flex-wrap">
              <span className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mr-1">Recent</span>
              {recentSessions.map(s => {
                const ws = workspaces.find(w => w.id === s.workspaceId);
                const houseType = (s as any).houseType as HouseId | undefined;
                const name = houseType ? `${HOUSE_META[houseType]?.name ?? 'House'}` : (TOOLKITS[s.toolkitType]?.name ?? 'Session');
                return (
                  <button key={s.id} onClick={() => onNavigateToSession?.(s.id, s.workspaceId)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-fresco-light-gray hover:bg-fresco-border rounded-full text-fresco-xs text-fresco-graphite-soft hover:text-fresco-black transition-colors">
                    <Clock className="w-3 h-3" />
                    {name}{ws && <span className="text-fresco-graphite-light">· {ws.title}</span>}
                  </button>
                );
              })}
              <button onClick={onCreateWorkspace} className="inline-flex items-center gap-1 px-2.5 py-1 border border-fresco-border hover:border-fresco-black rounded-full text-fresco-xs text-fresco-graphite-mid hover:text-fresco-black transition-colors">
                <Plus className="w-3 h-3" /> New Workspace
              </button>
            </div>
          )}

          {/* Guest CTA */}
          {isNewUser && (
            <div className="mt-6">
              <button onClick={onCreateWorkspace} className="fresco-btn">
                <Plus className="w-4 h-4" /><span>New Workspace</span>
              </button>
            </div>
          )}
        </motion.div>

        {/* ── Four Houses — THE HERO ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-12">
          {HOUSES.map((houseId, i) => {
            const house = HOUSE_META[houseId];
            const agents = HOUSE_AGENTS[houseId];
            const borderColors = ['border-t-fresco-black', 'border-t-fresco-graphite-mid', 'border-t-fresco-graphite-light', 'border-t-fresco-black/30'];
            return (
              <motion.div
                key={houseId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`fresco-card p-6 border-t-2 ${borderColors[i]} flex flex-col group`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <img src={house.icon} alt={house.name} className="w-4 h-4 icon-theme opacity-70"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="text-fresco-xs font-medium text-fresco-graphite-light uppercase tracking-wider">{house.name}</span>
                </div>

                <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-2">→ {house.output}</p>
                <p className="text-fresco-sm text-fresco-graphite-mid leading-relaxed mb-5 flex-1">{house.description}</p>

                {/* Agent names — subtle, shows depth */}
                <div className="flex flex-wrap gap-1 mb-5">
                  {agents.map(a => (
                    <span key={a} className="text-[10px] leading-tight text-fresco-graphite-light bg-fresco-light-gray px-1.5 py-0.5 rounded-full">{a}</span>
                  ))}
                </div>

                <button onClick={() => onStartHouse?.(houseId)} className="fresco-btn w-full">
                  <span>Run {house.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* ── Activity — only shown when there's something to show ── */}
        {hasActivity && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="border-t border-fresco-border-light pt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-fresco-base font-medium text-fresco-black">Your progress</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Folder, label: 'Workspaces', value: workspaces.length },
                { icon: Clock, label: 'Sessions', value: sessions.length },
                { icon: Lightbulb, label: 'Insights', value: totalInsights },
                { icon: Timer, label: 'Sentences of Truth', value: sentencesOfTruth.length },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="fresco-card p-4">
                  <div className="flex items-center gap-2 text-fresco-xs text-fresco-graphite-light mb-1">
                    <Icon className="w-3.5 h-3.5" />{label}
                  </div>
                  <div className="text-fresco-2xl font-medium text-fresco-black">{value}</div>
                </div>
              ))}
            </div>

            {/* Decision verdicts if any */}
            {(decisionCounts.go + decisionCounts.pivot + decisionCounts.kill + decisionCounts.deferred) > 0 && (
              <div className="flex items-center gap-2 mt-4">
                <span className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mr-1">Verdicts</span>
                {decisionCounts.go > 0 && <span className="text-fresco-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{decisionCounts.go} GO</span>}
                {decisionCounts.pivot > 0 && <span className="text-fresco-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{decisionCounts.pivot} PIVOT</span>}
                {decisionCounts.kill > 0 && <span className="text-fresco-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">{decisionCounts.kill} KILL</span>}
                {decisionCounts.deferred > 0 && <span className="text-fresco-xs font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">{decisionCounts.deferred} Pending</span>}
              </div>
            )}

            {/* Sentences of Truth */}
            {sentencesOfTruth.length > 0 && (
              <div className="mt-6">
                <h3 className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-3">Sentences of Truth</h3>
                <div className="space-y-2">
                  {sentencesOfTruth.map((s, i) => (
                    <div key={i} className="fresco-card p-4 border-l-2 border-fresco-black/20">
                      <p className="text-fresco-sm text-fresco-graphite-soft italic">"{s.sentenceOfTruth?.content}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>

    <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason="toolkits" currentUsage={0} limit={0} />
    <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </>
  );
}
