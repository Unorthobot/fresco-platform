'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, Clock, MapPin, Cloud, Sun, CloudRain, Folder, Lightbulb, Timer, Layout, GitBranch } from 'lucide-react';
import { useFrescoStore, useWorkspaces } from '@/lib/store';
import { formatRelativeTime } from '@/lib/utils';
import { TOOLKITS, type ToolkitType } from '@/types';
import { EmptyState } from '@/components/ui/EmptyStates';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { JourneyMap } from '@/components/ui/JourneyMap';
import { TimelineView } from '@/components/ui/TimelineView';
import { ConnectedInsights } from '@/components/ui/ConnectedInsights';

interface HomeDashboardProps {
  onNavigateToWorkspace?: (workspaceId: string) => void;
  onNavigateToSession?: (sessionId: string, workspaceId: string) => void;
  onCreateWorkspace?: () => void;
  onStartToolkit?: (toolkitType: ToolkitType) => void;
}

interface WeatherData {
  temp: number;
  condition: string;
  location: string;
}

// Toolkit descriptions for hint text (kept concise for consistent 2-line display)
const TOOLKIT_HINTS: Record<string, string> = {
  insight_stack: 'Extract patterns and tensions from complexity to uncover the core truth',
  pov_generator: 'Crystallise your perspective into a clear, defensible point of view',
  mental_model_mapper: 'Map the invisible frameworks that shape decisions and beliefs',
  flow_board: 'Visualise user journeys step by step and identify friction points',
  experiment_brief: 'Structure hypotheses and validation criteria for focused testing',
  strategy_sketchbook: 'Explore and compare strategic options before committing',
  ux_scorecard: 'Evaluate experiences with structured scoring and clear priorities',
  persuasion_canvas: 'Map influence strategies by understanding barriers and beliefs',
  performance_grid: 'Track key metrics and identify optimisation opportunities',
};

export function HomeDashboard({
  onNavigateToWorkspace,
  onNavigateToSession,
  onCreateWorkspace,
  onStartToolkit,
}: HomeDashboardProps) {
  const { user, sessions, getRecentSessions } = useFrescoStore();
  const workspaces = useWorkspaces();
  
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<string>('');
  
  const recentSessions = getRecentSessions(5);
  const sentencesOfTruth = sessions.filter((s) => s.sentenceOfTruth?.content).slice(0, 3);
  const totalInsights = sessions.reduce((acc, s) => acc + (s.insights?.length || 0), 0);

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
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
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

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen fresco-grid-bg-subtle relative">
      {/* Hero Section */}
      <div className="px-6 md:px-12 py-12 border-b border-fresco-border-light relative">
        <div className="max-w-6xl flex flex-col lg:flex-row items-start justify-between gap-12">
          {/* Left: Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1"
          >
            <span className="fresco-label mb-3 block">Welcome back, {firstName}</span>
            <h1 className="text-fresco-4xl font-medium text-fresco-black tracking-tight mb-4">
              What will you think through today?
            </h1>
            <p className="text-fresco-lg text-fresco-graphite-mid max-w-xl mb-6">
              Structure your thinking before action begins. Choose a toolkit to start extracting clarity.
            </p>
            
            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
              <div className="mb-6">
                <span className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide block mb-3">Recent Sessions</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {recentSessions.map((session) => {
                    const ws = workspaces.find(w => w.id === session.workspaceId);
                    const toolkitName = TOOLKITS[session.toolkitType]?.name || 'Session';
                    return (
                      <button
                        key={session.id}
                        onClick={() => onNavigateToSession?.(session.id, session.workspaceId)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-fresco-light-gray hover:bg-fresco-border rounded-full text-fresco-sm text-fresco-graphite-soft hover:text-fresco-black transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{toolkitName}</span>
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
            </div>
          </motion.div>
        </div>
      </div>

      {/* The Three Houses */}
      <div className="px-6 md:px-12 py-12">
        <div className="max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
            <h2 className="text-fresco-2xl font-medium text-fresco-black mb-2">The Three Houses</h2>
            <p className="text-fresco-base text-fresco-graphite-mid">
              Every clear decision requires three movements: understanding truth, exploring possibility, and validating direction.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Investigate */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="fresco-card p-6 border-l-4 border-l-fresco-black">
              <div className="fresco-phase-icon">
                <img src="/01-investigate.png" alt="Investigate" className="w-5 h-5 icon-theme" />
              </div>
              <h3 className="text-fresco-lg font-medium text-fresco-black mb-2">Investigate</h3>
              <p className="text-fresco-sm text-fresco-graphite-mid mb-6">Extract truth from complexity. Define the real problem before proposing solutions.</p>
              <div className="space-y-2">
                <button 
                  onClick={() => onStartToolkit?.('insight_stack')} 
                  className="w-full text-left p-3 rounded-xl border border-fresco-border hover:bg-fresco-light-gray hover:border-fresco-graphite-light transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-fresco-sm font-medium text-fresco-black">Insight Stack™</span>
                    <ArrowRight className="w-4 h-4 text-fresco-graphite-light group-hover:text-fresco-black group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-fresco-xs text-fresco-graphite-light mt-1">{TOOLKIT_HINTS.insight_stack}</p>
                </button>
                <button 
                  onClick={() => onStartToolkit?.('pov_generator')} 
                  className="w-full text-left p-3 rounded-xl border border-fresco-border hover:bg-fresco-light-gray hover:border-fresco-graphite-light transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-fresco-sm font-medium text-fresco-black">POV Generator™</span>
                    <ArrowRight className="w-4 h-4 text-fresco-graphite-light group-hover:text-fresco-black group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-fresco-xs text-fresco-graphite-light mt-1">{TOOLKIT_HINTS.pov_generator}</p>
                </button>
                <button 
                  onClick={() => onStartToolkit?.('mental_model_mapper')} 
                  className="w-full text-left p-3 rounded-xl border border-fresco-border hover:bg-fresco-light-gray hover:border-fresco-graphite-light transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-fresco-sm font-medium text-fresco-black">Mental Model Mapper™</span>
                    <ArrowRight className="w-4 h-4 text-fresco-graphite-light group-hover:text-fresco-black group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-fresco-xs text-fresco-graphite-light mt-1">{TOOLKIT_HINTS.mental_model_mapper}</p>
                </button>
              </div>
            </motion.div>

            {/* Innovate */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="fresco-card p-6 border-l-4 border-l-fresco-graphite-mid">
              <div className="fresco-phase-icon">
                <img src="/02-innovate.png" alt="Innovate" className="w-5 h-5 icon-theme" />
              </div>
              <h3 className="text-fresco-lg font-medium text-fresco-black mb-2">Innovate</h3>
              <p className="text-fresco-sm text-fresco-graphite-mid mb-6">Create structured possibilities. Transform truth into strategic direction.</p>
              <div className="space-y-2">
                <button 
                  onClick={() => onStartToolkit?.('flow_board')} 
                  className="w-full text-left p-3 rounded-xl border border-fresco-border hover:bg-fresco-light-gray hover:border-fresco-graphite-light transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-fresco-sm font-medium text-fresco-black">Flow Board™</span>
                    <ArrowRight className="w-4 h-4 text-fresco-graphite-light group-hover:text-fresco-black group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-fresco-xs text-fresco-graphite-light mt-1">{TOOLKIT_HINTS.flow_board}</p>
                </button>
                <button 
                  onClick={() => onStartToolkit?.('experiment_brief')} 
                  className="w-full text-left p-3 rounded-xl border border-fresco-border hover:bg-fresco-light-gray hover:border-fresco-graphite-light transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-fresco-sm font-medium text-fresco-black">Experiment Brief™</span>
                    <ArrowRight className="w-4 h-4 text-fresco-graphite-light group-hover:text-fresco-black group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-fresco-xs text-fresco-graphite-light mt-1">{TOOLKIT_HINTS.experiment_brief}</p>
                </button>
                <button 
                  onClick={() => onStartToolkit?.('strategy_sketchbook')} 
                  className="w-full text-left p-3 rounded-xl border border-fresco-border hover:bg-fresco-light-gray hover:border-fresco-graphite-light transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-fresco-sm font-medium text-fresco-black">Strategy Sketchbook™</span>
                    <ArrowRight className="w-4 h-4 text-fresco-graphite-light group-hover:text-fresco-black group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-fresco-xs text-fresco-graphite-light mt-1">{TOOLKIT_HINTS.strategy_sketchbook}</p>
                </button>
              </div>
            </motion.div>

            {/* Validate */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="fresco-card p-6 border-l-4 border-l-fresco-graphite-light">
              <div className="fresco-phase-icon">
                <img src="/03-validate.png" alt="Validate" className="w-5 h-5 icon-theme" />
              </div>
              <h3 className="text-fresco-lg font-medium text-fresco-black mb-2">Validate</h3>
              <p className="text-fresco-sm text-fresco-graphite-mid mb-6">Judge strength and feasibility. Ensure clarity before execution begins.</p>
              <div className="space-y-2">
                <button 
                  onClick={() => onStartToolkit?.('ux_scorecard')} 
                  className="w-full text-left p-3 rounded-xl border border-fresco-border hover:bg-fresco-light-gray hover:border-fresco-graphite-light transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-fresco-sm font-medium text-fresco-black">UX Scorecard™</span>
                    <ArrowRight className="w-4 h-4 text-fresco-graphite-light group-hover:text-fresco-black group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-fresco-xs text-fresco-graphite-light mt-1">{TOOLKIT_HINTS.ux_scorecard}</p>
                </button>
                <button 
                  onClick={() => onStartToolkit?.('persuasion_canvas')} 
                  className="w-full text-left p-3 rounded-xl border border-fresco-border hover:bg-fresco-light-gray hover:border-fresco-graphite-light transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-fresco-sm font-medium text-fresco-black">Persuasion Canvas™</span>
                    <ArrowRight className="w-4 h-4 text-fresco-graphite-light group-hover:text-fresco-black group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-fresco-xs text-fresco-graphite-light mt-1">{TOOLKIT_HINTS.persuasion_canvas}</p>
                </button>
                <button 
                  onClick={() => onStartToolkit?.('performance_grid')} 
                  className="w-full text-left p-3 rounded-xl border border-fresco-border hover:bg-fresco-light-gray hover:border-fresco-graphite-light transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-fresco-sm font-medium text-fresco-black">Performance Grid™</span>
                    <ArrowRight className="w-4 h-4 text-fresco-graphite-light group-hover:text-fresco-black group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-fresco-xs text-fresco-graphite-light mt-1">{TOOLKIT_HINTS.performance_grid}</p>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
