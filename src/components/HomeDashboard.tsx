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
import { EmptyState } from '@/components/ui/EmptyStates';
import { UpgradeModal } from '@/components/ui/UpgradeModal';
import { PricingModal } from '@/components/ui/PricingModal';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { JourneyMap } from '@/components/ui/JourneyMap';
import { TimelineView } from '@/components/ui/TimelineView';
import { ConnectedInsights } from '@/components/ui/ConnectedInsights';

interface HomeDashboardProps {
  onNavigateToWorkspace?: (workspaceId: string) => void;
  onNavigateToSession?: (sessionId: string, workspaceId: string) => void;
  onCreateWorkspace?: () => void;
  onStartToolkit?: (toolkitType: ToolkitType) => void | Promise<void>;
  onStartHouse?: (houseId: HouseId) => void | Promise<void>;
}

interface WeatherData {
  temp: number;
  condition: string;
  location: string;
}

export function HomeDashboard({
  onNavigateToWorkspace,
  onNavigateToSession,
  onCreateWorkspace,
  onStartToolkit,
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
  
  const recentSessions = getRecentSessions(5);
  const sentencesOfTruth = sessions.filter((s) => s.sentenceOfTruth?.content).slice(0, 3);
  const totalInsights = sessions.reduce((acc, s) => acc + (s.insights?.length || 0), 0);
  const decisionCounts = sessions.reduce((acc, s) => {
    const d = (s as any).decision;
    if (d === 'GO') acc.go++;
    else if (d === 'PIVOT') acc.pivot++;
    else if (d === 'KILL') acc.kill++;
    else if (d === 'DEFERRED') acc.deferred++;
    else acc.pending++;
    return acc;
  }, { go: 0, pivot: 0, kill: 0, deferred: 0, pending: 0 });
  const decidedCount = decisionCounts.go + decisionCounts.pivot + decisionCounts.kill + decisionCounts.deferred;
  const pendingCount = sessions.filter(s => !(s as any).decision && (s.insights?.length || 0) > 0).length;

  // Set mounted and initial time on client
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
  }, []);

  // Update time every minute
  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [mounted]);

  // Get user location and weather
  useEffect(() => {
    if (!mounted) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const geoResponse = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            setLocation(geoData.city || geoData.locality || 'Unknown');
          }
          
          // Get weather (using Open-Meteo free API)
          const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
          );
          if (weatherResponse.ok) {
            const weatherData = await weatherResponse.json();
            const temp = Math.round(weatherData.current_weather.temperature);
            const code = weatherData.current_weather.weathercode;
            let condition = 'Clear';
            if (code >= 1 && code <= 3) condition = 'Cloudy';
            else if (code >= 51 && code <= 67) condition = 'Rainy';
            else if (code >= 71 && code <= 77) condition = 'Snowy';
            setWeather({ temp, condition, location: location || 'Your location' });
          }
        } catch (e) {
          console.log('Weather fetch failed:', e);
        }
      },
      () => setLocation('Location unavailable')
    );
  }, [mounted]);

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Loading...';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'Cloudy': return <Cloud className="w-4 h-4" />;
      case 'Rainy': return <CloudRain className="w-4 h-4" />;
      default: return <Sun className="w-4 h-4" />;
    }
  };

  const { data: session } = useSession();
  const isGuest = !session && (!user || user.id === 'guest');
  const firstName = isGuest ? 'there' : (session?.user?.name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there');

  return (
    <>
    <div className="min-h-screen fresco-grid-bg-subtle relative">

      {/* Upgrade banner — free users only */}
      {!isGuest && user?.subscription === 'free' && (
        <div className="bg-fresco-black text-white px-6 py-3 flex items-center justify-between">
          <p className="text-fresco-xs text-white/50">
            Free plan · 3 workspaces · 10 AI generations/month
          </p>
          <button
            onClick={() => setShowPricingModal(true)}
            className="text-fresco-xs font-medium text-white hover:opacity-70 transition-opacity"
          >
            Upgrade →
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div className="px-6 md:px-12 py-12 border-b border-fresco-border-light relative">
        <div className="max-w-6xl flex flex-col lg:flex-row items-start justify-between gap-12">
          {/* Left: Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1"
          >
            <span className="fresco-label mb-3 block">{isGuest ? 'Stop debating. Decide.' : `Welcome back, ${firstName}!`}</span>
            <h1 className="text-fresco-4xl font-medium text-fresco-black tracking-tight mb-4">
              What decision are you working toward?
            </h1>
            <p className="text-fresco-lg text-fresco-graphite-mid max-w-xl mb-6">
              Fresco makes decision discipline visible. Choose a house to define the problem, design the solution, or validate before you commit.
            </p>
            
            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
              <div className="mb-6">
                <span className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide block mb-3">Recent Sessions</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {recentSessions.map((session) => {
                    const ws = workspaces.find(w => w.id === session.workspaceId);
                    const houseType = (session as any).houseType as HouseId | undefined;
                    const sessionName = houseType
                      ? `${HOUSE_META[houseType]?.name ?? 'House'} Analysis`
                      : (TOOLKITS[session.toolkitType]?.name ?? 'Session');
                    return (
                      <button
                        key={session.id}
                        onClick={() => onNavigateToSession?.(session.id, session.workspaceId)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-fresco-light-gray hover:bg-fresco-border rounded-full text-fresco-sm text-fresco-graphite-soft hover:text-fresco-black transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{sessionName}</span>
                        {ws && (
                          <>
                            <span className="text-fresco-graphite-light">·</span>
                            <span className="text-fresco-graphite-light">{ws.title}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* New Workspace Button */}
            <button onClick={onCreateWorkspace} className="fresco-btn">
              <Plus className="w-4 h-4" />
              <span>New Workspace</span>
            </button>
          </motion.div>

          {/* Right: Time/Weather/Stats Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-[320px] flex-shrink-0"
          >
            <div className="fresco-weather-widget">
              {/* Time & Date */}
              <div className="mb-4">
                <div className="text-fresco-3xl font-medium text-fresco-black tracking-tight">
                  {formatTime(currentTime)}
                </div>
                <div className="text-fresco-sm text-fresco-graphite-mid">
                  {formatDate(currentTime)}
                </div>
              </div>

              {/* Location & Weather */}
              <div className="flex items-center gap-4 pb-4 border-b border-fresco-border-light">
                <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft">
                  <MapPin className="w-4 h-4" />
                  <span>{location || 'Detecting...'}</span>
                </div>
                {weather && (
                  <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-soft">
                    {getWeatherIcon(weather.condition)}
                    <span>{weather.temp}°C</span>
                  </div>
                )}
              </div>

              {/* Usage Stats */}
              <div className="pt-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-fresco-xs text-fresco-graphite-light mb-1">
                    <Folder className="w-4 h-4" />
                    <span>Workspaces</span>
                  </div>
                  <div className="text-fresco-xl font-medium text-fresco-black">{workspaces.length}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-fresco-xs text-fresco-graphite-light mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Sessions</span>
                  </div>
                  <div className="text-fresco-xl font-medium text-fresco-black">{sessions.length}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-fresco-xs text-fresco-graphite-light mb-1">
                    <Lightbulb className="w-4 h-4" />
                    <span>Insights</span>
                  </div>
                  <div className="text-fresco-xl font-medium text-fresco-black">{totalInsights}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-fresco-xs text-fresco-graphite-light mb-1">
                    <Timer className="w-4 h-4" />
                    <span>Truths</span>
                  </div>
                  <div className="text-fresco-xl font-medium text-fresco-black">{sentencesOfTruth.length}</div>
                </div>
              </div>
              {/* Decision Summary */}
              {sessions.length > 0 && (
                <div className="pt-4 border-t border-fresco-border-light mt-2">
                  <div className="text-fresco-xs text-fresco-graphite-light mb-2">Decisions</div>
                  <div className="flex gap-2 flex-wrap">
                    {decisionCounts.go > 0 && (
                      <span className="text-fresco-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {decisionCounts.go} GO
                      </span>
                    )}
                    {decisionCounts.pivot > 0 && (
                      <span className="text-fresco-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {decisionCounts.pivot} PIVOT
                      </span>
                    )}
                    {decisionCounts.kill > 0 && (
                      <span className="text-fresco-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                        {decisionCounts.kill} KILL
                      </span>
                    )}
                    {decisionCounts.deferred > 0 && (
                      <span className="text-fresco-xs font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                        {decisionCounts.deferred} Pending
                      </span>
                    )}
                    {pendingCount > 0 && (
                      <span className="text-fresco-xs font-medium px-2 py-0.5 rounded-full bg-fresco-light-gray text-fresco-graphite-light border border-fresco-border-light">
                        {pendingCount} undecided
                      </span>
                    )}
                    {decidedCount === 0 && pendingCount === 0 && (
                      <span className="text-fresco-xs text-fresco-graphite-light">No decisions yet</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* The Four Houses */}
      <div className="px-6 md:px-12 py-12">
        <div className="max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
            <h2 className="text-fresco-2xl font-medium text-fresco-black mb-2">The Four Houses</h2>
            <p className="text-fresco-base text-fresco-graphite-mid">
              Select a house. Three agents analyse your input and return a verdict.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {(['investigate', 'innovate', 'validate', 'evaluate'] as HouseId[]).map((houseId, i) => {
              const house = HOUSE_META[houseId];
              const borderColors = ['border-l-fresco-black', 'border-l-fresco-graphite-mid', 'border-l-fresco-graphite-light', 'border-l-fresco-black/40'];
              return (
                <motion.div
                  key={houseId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className={`fresco-card p-6 border-l-4 ${borderColors[i]} flex flex-col`}
                >
                  <div className="fresco-phase-icon">
                    <img
                      src={house.icon}
                      alt={house.name}
                      className="w-5 h-5 icon-theme"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <h3 className="text-fresco-lg font-medium text-fresco-black mb-1">{house.name}</h3>
                  <p className="text-fresco-xs text-fresco-graphite-light font-medium uppercase tracking-wide mb-3">
                    → {house.output}
                  </p>
                  <p className="text-fresco-sm text-fresco-graphite-mid mb-6 flex-1">{house.description}</p>
                  <button
                    onClick={() => onStartHouse?.(houseId)}
                    className="fresco-btn w-full"
                  >
                    <span>Run {house.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    <UpgradeModal
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      reason="toolkits"
      currentUsage={0}
      limit={0}
    />
    <PricingModal
      isOpen={showPricingModal}
      onClose={() => setShowPricingModal(false)}
    />
    </>
  );
}
