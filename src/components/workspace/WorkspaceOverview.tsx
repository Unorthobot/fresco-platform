'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, ArrowRight, Edit3, Check, X, Trash2, Sparkles, ChevronDown, Layout, Clock, Link2, Users } from 'lucide-react';
import { useDBWrite } from '@/lib/useDBSync';
import { useFrescoStore } from '@/lib/store';
import { formatRelativeTime, truncate, cn } from '@/lib/utils';
import { TOOLKITS, type ToolkitType, type ToolkitCategory } from '@/types';
import type { HouseId } from '@/lib/agents';
import { HOUSE_META } from '@/lib/agents';
type Session = any;
import { JourneyMap } from '@/components/ui/JourneyMap';
import { TimelineView } from '@/components/ui/TimelineView';
import { ConnectedInsights } from '@/components/ui/ConnectedInsights';
import { WorkspaceSynthesis } from '@/components/ui/WorkspaceSynthesis';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { EmptyState } from '@/components/ui/EmptyStates';
import { OrchestrationPanel } from './OrchestrationPanel';

// Workspace Clarity Score Component
function WorkspaceClarityScore({ sessions }: { sessions: Session[] }) {
  // Calculate workspace-level clarity score
  const score = useMemo(() => {
    if (sessions.length === 0) return 0;
    
    let totalScore = 0;
    
    // Sessions started (20 points max)
    const sessionPoints = Math.min(20, sessions.length * 5);
    totalScore += sessionPoints;
    
    // Sessions with AI outputs (30 points max)
    const sessionsWithOutputs = sessions.filter(s => 
      s.aiOutputs?.insights?.length > 0 || s.aiOutputs?.sentenceOfTruth
    ).length;
    const outputPoints = sessions.length > 0 
      ? Math.round((sessionsWithOutputs / sessions.length) * 30) 
      : 0;
    totalScore += outputPoints;
    
    // Sentences of Truth defined (30 points max)
    const sessionsWithTruth = sessions.filter(s => s.sentenceOfTruth?.content).length;
    const truthPoints = sessions.length > 0 
      ? Math.round((sessionsWithTruth / sessions.length) * 30) 
      : 0;
    totalScore += truthPoints;
    
    // Diversity of toolkits used (20 points max)
    const uniqueToolkits = new Set(sessions.map(s => s.toolkitType)).size;
    const diversityPoints = Math.min(20, uniqueToolkits * 4);
    totalScore += diversityPoints;
    
    return Math.min(100, totalScore);
  }, [sessions]);
  
  const getScoreLabel = () => {
    if (score >= 80) return 'High Clarity';
    if (score >= 60) return 'Good Progress';
    if (score >= 40) return 'Developing';
    if (score >= 20) return 'Early Stage';
    return 'Just Starting';
  };
  
  const getScoreColor = () => {
    if (score >= 80) return 'text-fresco-black';
    if (score >= 60) return 'text-fresco-graphite';
    if (score >= 40) return 'text-fresco-graphite-mid';
    return 'text-fresco-graphite-light';
  };

  return (
    <div className="p-4 bg-fresco-light-gray rounded-none">
      <div className="flex items-center justify-between mb-3">
        <span className={cn("text-fresco-3xl font-bold", getScoreColor())}>{score}</span>
        <span className="text-fresco-xs text-fresco-graphite-light">/100</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-white dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full bg-fresco-black rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-fresco-xs font-medium text-fresco-graphite-mid">{getScoreLabel()}</span>
      </div>
      
      {/* Breakdown */}
      <div className="mt-4 pt-4 border-t border-fresco-border space-y-2">
        <div className="flex items-center justify-between text-fresco-xs">
          <span className="text-fresco-graphite-light">Sessions</span>
          <span className={sessions.length > 0 ? 'text-fresco-black' : 'text-fresco-graphite-light'}>{sessions.length}</span>
        </div>
        <div className="flex items-center justify-between text-fresco-xs">
          <span className="text-fresco-graphite-light">With outputs</span>
          <span className={sessions.filter(s => s.aiOutputs?.insights?.length > 0).length > 0 ? 'text-fresco-black' : 'text-fresco-graphite-light'}>
            {sessions.filter(s => s.aiOutputs?.insights?.length > 0).length}
          </span>
        </div>
        <div className="flex items-center justify-between text-fresco-xs">
          <span className="text-fresco-graphite-light">Truths defined</span>
          <span className={sessions.filter(s => s.sentenceOfTruth?.content).length > 0 ? 'text-fresco-black' : 'text-fresco-graphite-light'}>
            {sessions.filter(s => s.sentenceOfTruth?.content).length}
          </span>
        </div>
      </div>
    </div>
  );
}

interface WorkspaceOverviewProps {
  workspaceId: string;
  onBack?: () => void;
  onOpenSession?: (sessionId: string) => void;
  onStartToolkit?: (toolkitType: ToolkitType) => void | Promise<void>;
  onStartHouse?: (houseId: HouseId) => void | Promise<void>;
}

// Toolkit flow - each toolkit suggests the next in the journey
const TOOLKIT_FLOW: Record<ToolkitType, ToolkitType | null> = {
  insight_stack: 'pov_generator',
  pov_generator: 'mental_model_mapper',
  mental_model_mapper: 'flow_board',
  flow_board: 'experiment_brief',
  experiment_brief: 'strategy_sketchbook',
  strategy_sketchbook: 'ux_scorecard',
  ux_scorecard: 'persuasion_canvas',
  persuasion_canvas: 'performance_grid',
  performance_grid: 'decision_matrix',
  decision_matrix: 'risk_radar',
  risk_radar: 'signal_checker',
  signal_checker: null,
};

// House progression
const HOUSE_FLOW: Record<ToolkitCategory, ToolkitCategory | null> = {
  investigate: 'innovate',
  innovate: 'validate',
  validate: 'evaluate',
  evaluate: null,
};

const ALL_TOOLKITS: { type: ToolkitType; category: ToolkitCategory }[] = [
  { type: 'insight_stack', category: 'investigate' },
  { type: 'pov_generator', category: 'investigate' },
  { type: 'mental_model_mapper', category: 'investigate' },
  { type: 'flow_board', category: 'innovate' },
  { type: 'experiment_brief', category: 'innovate' },
  { type: 'strategy_sketchbook', category: 'innovate' },
  { type: 'ux_scorecard', category: 'validate' },
  { type: 'persuasion_canvas', category: 'validate' },
  { type: 'performance_grid', category: 'validate' },
  { type: 'decision_matrix', category: 'evaluate' },
  { type: 'risk_radar', category: 'evaluate' },
  { type: 'signal_checker', category: 'evaluate' },
];

const CATEGORY_ICONS: Record<ToolkitCategory, string> = {
  investigate: '/01-investigate.png',
  innovate: '/02-innovate.png',
  validate: '/03-validate.png',
  evaluate: '/04-evaluate.png',
};

const CATEGORY_LABELS: Record<ToolkitCategory, string> = {
  investigate: 'Investigate',
  innovate: 'Innovate',
  validate: 'Validate',
  evaluate: 'Evaluate',
};

export function WorkspaceOverview({ workspaceId, onBack, onOpenSession, onStartToolkit, onStartHouse }: WorkspaceOverviewProps) {
  const { workspaces, sessions, deleteSession, activeSessionId } = useFrescoStore();
  const db = useDBWrite();
  const workspace = workspaces.find((w) => w.id === workspaceId);
  const workspaceSessions = sessions.filter((s) => s.workspaceId === workspaceId).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const sentencesOfTruth = workspaceSessions.filter((s) => s.sentenceOfTruth?.content);
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(workspace?.title || '');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const [showToolkitSelector, setShowToolkitSelector] = useState(false);
  const [activeView, setActiveView] = useState<'sessions' | 'synthesis' | 'journey' | 'timeline' | 'insights'>('sessions');

  // Escape key to close modals
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (deleteConfirm) setDeleteConfirm(null);
      if (showToolkitSelector) setShowToolkitSelector(false);
    }
  }, [deleteConfirm, showToolkitSelector]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Smart suggestions based on workspace sessions
  const suggestedToolkits = useMemo(() => {
    if (workspaceSessions.length === 0) {
      return [{ type: 'insight_stack' as ToolkitType, reason: 'Start your investigation' }];
    }
    
    const suggestions: { type: ToolkitType; reason: string }[] = [];
    const lastSession = workspaceSessions[0];
    const usedToolkits = new Set(workspaceSessions.map(s => s.toolkitType));
    
    // Suggest next in flow
    const nextInFlow = TOOLKIT_FLOW[lastSession.toolkitType];
    if (nextInFlow && !usedToolkits.has(nextInFlow)) {
      suggestions.push({ 
        type: nextInFlow, 
        reason: `Continue from ${TOOLKITS[lastSession.toolkitType].name}` 
      });
    }
    
    // Check if we should move to next house
    const currentCategory = TOOLKITS[lastSession.toolkitType].category;
    const nextHouse = HOUSE_FLOW[currentCategory];
    if (nextHouse) {
      const firstToolkitInNextHouse = ALL_TOOLKITS.find(t => t.category === nextHouse)?.type;
      if (firstToolkitInNextHouse && !suggestions.find(s => s.type === firstToolkitInNextHouse)) {
        suggestions.push({
          type: firstToolkitInNextHouse,
          reason: `Move to ${CATEGORY_LABELS[nextHouse]} phase`
        });
      }
    }
    
    // Suggest unused toolkits in current house
    const currentHouseToolkits = ALL_TOOLKITS.filter(t => t.category === currentCategory);
    for (const toolkit of currentHouseToolkits) {
      if (!usedToolkits.has(toolkit.type) && !suggestions.find(s => s.type === toolkit.type)) {
        suggestions.push({
          type: toolkit.type,
          reason: `Explore more in ${CATEGORY_LABELS[currentCategory]}`
        });
        break;
      }
    }
    
    return suggestions.slice(0, 2);
  }, [workspaceSessions]);

  const handleSaveTitle = () => { 
    if (editTitle.trim()) { 
      db.updateWorkspace(workspaceId, { title: editTitle.trim() }); 
    } 
    setIsEditingTitle(false); 
  };

  const handleDeleteSession = (sessionId: string) => {
    const wasActive = activeSessionId === sessionId;
    deleteSession(sessionId);
    setDeleteConfirm(null);
    // If the user deleted the session they were currently in, go back immediately
    if (wasActive) onBack?.();
  };

  const handleSelectToolkit = (type: ToolkitType) => {
    setShowToolkitSelector(false);
    onStartToolkit?.(type);
  };

  if (!workspace) return <div className="flex items-center justify-center h-96"><p className="text-fresco-graphite-light">Workspace not found</p></div>;

  return (
    <div className="min-h-screen fresco-grid-bg-subtle">
      {/* Header */}
      <div className="px-4 md:px-12 py-8 md:py-12 border-b border-fresco-border-light">
        <button type="button" onClick={() => onBack?.()} className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /><span>Back to Home</span>
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} 
                  className="text-fresco-3xl font-medium text-fresco-black tracking-tight bg-transparent border-b-2 border-fresco-black focus:outline-none" autoFocus />
                <button onClick={handleSaveTitle} className="p-2 text-fresco-black hover:bg-fresco-light-gray rounded-fresco transition-colors"><Check className="w-5 h-5" /></button>
                <button onClick={() => setIsEditingTitle(false)} className="p-2 text-fresco-graphite-light hover:bg-fresco-light-gray rounded-fresco transition-colors"><X className="w-5 h-5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <h1 className="text-fresco-3xl font-medium text-fresco-black tracking-tight">{workspace.title}</h1>
                <button onClick={() => { setEditTitle(workspace.title); setIsEditingTitle(true); }} 
                  className="p-2 text-fresco-graphite-light opacity-0 group-hover:opacity-100 hover:text-fresco-black rounded-fresco transition-all">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-4 mt-2">
              <p className="text-fresco-base text-fresco-graphite-mid">{workspaceSessions.length} sessions · Updated {formatRelativeTime(workspace.updatedAt)}</p>
              {workspace.teamId && workspace.team && (
                <span className="flex items-center gap-1.5 text-fresco-xs text-fresco-graphite-mid bg-fresco-light-gray px-2.5 py-1 rounded-none">
                  <Users className="w-3 h-3" />
                  {workspace.team.name}
                </span>
              )}
            </div>
          </div>
          
          {/* New Session — House Picker */}
          <div className="relative">
            <button 
              onClick={() => setShowToolkitSelector(!showToolkitSelector)} 
              className="fresco-btn"
            >
              <Plus className="w-4 h-4" />
              <span>New Session</span>
              <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showToolkitSelector ? 'rotate-180' : ''}`} />
            </button>
            
            {/* House Picker Dropdown */}
            <AnimatePresence>
              {showToolkitSelector && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowToolkitSelector(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-72 bg-fresco-white rounded-none shadow-lg border border-fresco-border z-50 overflow-hidden"
                  >
                    <div className="p-3 border-b border-fresco-border-light bg-fresco-light-gray/50">
                      <span className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wider">Select a house</span>
                    </div>
                    <div className="p-2">
                      {(['investigate', 'innovate', 'validate', 'evaluate'] as HouseId[]).map((houseId) => {
                        const house = HOUSE_META[houseId];
                        return (
                          <button
                            key={houseId}
                            onClick={() => { setShowToolkitSelector(false); onStartHouse?.(houseId); }}
                            className="w-full flex items-center gap-3 p-3 rounded-none hover:bg-fresco-light-gray transition-colors text-left"
                          >
                            <img
                              src={house.icon}
                              alt={house.name}
                              className="w-5 h-5 icon-themed flex-shrink-0"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-fresco-sm font-medium text-fresco-black">{house.name}</div>
                              <div className="text-fresco-xs text-fresco-graphite-light truncate">→ {house.output}</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-fresco-graphite-light flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-12 py-8 md:py-12 relative">
        {/* Ambient Background */}
        <AmbientBackground variant="subtle" />
        
        <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* View Tabs */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1 p-1 bg-fresco-light-gray rounded-none overflow-x-auto scrollbar-hide">
                {[
                  { id: 'sessions',  label: 'Sessions',  icon: <Layout className="w-4 h-4" /> },
                  { id: 'synthesis', label: 'Synthesis', icon: <Sparkles className="w-4 h-4" /> },
                  { id: 'journey',   label: 'Journey',   icon: <ArrowRight className="w-4 h-4" /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-none text-fresco-sm font-medium transition-colors",
                      activeView === tab.id
                        ? "bg-white dark:bg-gray-800 text-fresco-black shadow-sm"
                        : "text-fresco-graphite-light hover:text-fresco-graphite transition-colors"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* View Content */}
            <AnimatePresence mode="wait">
              {activeView === 'sessions' && (
                <motion.div
                  key="sessions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {/* Cross-toolkit summary prompt */}
                  {workspaceSessions.length >= 2 && workspaceSessions.some(s => s.sentenceOfTruth?.content) && activeView === 'sessions' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-4 bg-fresco-light-gray border border-fresco-border flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="text-fresco-sm font-medium text-fresco-black">You have outputs across multiple sessions.</p>
                        <p className="text-fresco-xs text-fresco-graphite-mid mt-0.5">View a synthesis of everything you've found so far.</p>
                      </div>
                      <button
                        onClick={() => setActiveView('synthesis')}
                        className="fresco-btn-secondary text-fresco-sm whitespace-nowrap flex-shrink-0"
                      >
                        View Synthesis
                      </button>
                    </motion.div>
                  )}

                  {workspaceSessions.length === 0 ? (
                    <div className="border-2 border-dashed border-fresco-border p-10 text-center">
                      <h3 className="text-fresco-lg font-medium text-fresco-black mb-2">What are you trying to decide?</h3>
                      <p className="text-fresco-sm text-fresco-graphite-mid mb-6 max-w-sm mx-auto">Select a house to begin. Each house runs three specialist agents and returns a verdict.</p>
                      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                        {(['investigate', 'innovate', 'validate', 'evaluate'] as HouseId[]).map((houseId) => {
                          const house = HOUSE_META[houseId];
                          return (
                            <button
                              key={houseId}
                              onClick={() => onStartHouse?.(houseId)}
                              className="flex flex-col items-center gap-2 p-3 border border-fresco-border hover:bg-fresco-light-gray hover:border-fresco-graphite-light transition-all rounded-none"
                            >
                              <img
                                src={house.icon}
                                alt={house.name}
                                className="w-5 h-5 icon-themed"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                              <span className="text-fresco-xs font-medium text-fresco-black">{house.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {workspaceSessions.map((session, index) => {
                        // House session: use HOUSE_META. Legacy toolkit session: use TOOLKITS.
                        const isHouseSession = !!(session as any).houseType;
                        const houseId = (session as any).houseType as HouseId | undefined;
                        const houseMeta = houseId ? HOUSE_META[houseId] : null;
                        const toolkit = !isHouseSession ? TOOLKITS[session.toolkitType] : null;
                        const sessionName = isHouseSession
                          ? `${houseMeta?.name ?? 'House'} Analysis`
                          : (toolkit?.name ?? session.toolkitType);
                        const sessionCategory = isHouseSession ? houseId! : toolkit?.category ?? 'investigate';
                        const categoryIcon = CATEGORY_ICONS[sessionCategory];

                        return (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative"
                            onMouseEnter={() => setHoveredSession(session.id)}
                            onMouseLeave={() => setHoveredSession(null)}
                          >
                            <button 
                              onClick={() => onOpenSession?.(session.id)} 
                              className="w-full bg-fresco-white rounded-none border border-fresco-border p-5 text-left hover:shadow-md hover:border-fresco-graphite-light transition-all group"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 pr-10">
                                  <div className="flex items-center gap-2 mb-1">
                                    <img src={categoryIcon} alt="" className="w-5 h-5 icon-themed" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                                    <div>
                                    <h3 className="text-fresco-base font-medium text-fresco-black">{sessionName}</h3>
                                    {session.steps?.[0]?.content && (() => {
                                      const raw = session.steps![0].content;
                                      let preview = raw;
                                      // If the content is JSON, try to extract a human-readable string
                                      if (raw.trimStart().startsWith('{') || raw.trimStart().startsWith('[')) {
                                        try {
                                          const parsed = JSON.parse(raw);
                                          if (Array.isArray(parsed) && parsed[0]) {
                                            // Array of objects (e.g. stakeholders) — use first item's name/title/label
                                            const first = parsed[0];
                                            preview = first.name || first.title || first.label || first.content || raw;
                                          } else if (typeof parsed === 'object') {
                                            preview = parsed.name || parsed.title || parsed.content || raw;
                                          }
                                        } catch { /* not valid JSON, use as-is */ }
                                      }
                                      const trimmed = preview.slice(0, 60);
                                      return (
                                        <p className="text-fresco-xs text-fresco-graphite-mid mt-0.5 line-clamp-1">
                                          {trimmed}{preview.length > 60 ? '...' : ''}
                                        </p>
                                      );
                                    })()}
                                  </div>
                                    {session.sentenceOfTruth?.content && (
                                      <Sparkles className="w-4 h-4 text-fresco-graphite" />
                                    )}
                                    {/* House verdict badge */}
                                    {(() => {
                                      const v = (session as any).aiOutputs?.verdict || (session as any).aiOutputs?.houseResult?.verdict;
                                      if (!v) return null;
                                      const vstyle = 'bg-fresco-light-gray text-fresco-black border-fresco-border';
                                      return (
                                        <span className={`text-[10px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${vstyle}`}>
                                          {v === 'INVESTIGATE FURTHER' ? 'MORE SIGNAL' : v}
                                        </span>
                                      );
                                    })()}
                                    {(session as any).decision && (
                                      <span className={[
                                        'text-[10px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full border',
                                        'bg-fresco-light-gray text-fresco-black border-fresco-border'
                                      ].join(' ')}>
                                        {(session as any).decision === 'DEFERRED' ? 'Pending' : (session as any).decision}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-fresco-xs text-fresco-graphite-light">{formatRelativeTime(session.updatedAt)}</p>
                                  {session.sentenceOfTruth?.content && (
                                    <p className="text-fresco-sm text-fresco-graphite-soft mt-3 italic line-clamp-2">
                                      "{session.sentenceOfTruth.content}"
                                    </p>
                                  )}
                                  {(session.insights?.length ?? 0) > 0 && (
                                    <p className="text-fresco-xs text-fresco-graphite-light mt-2">
                                      {session.insights?.length ?? 0} insights
                                    </p>
                                  )}
                                </div>
                                <ArrowRight className="w-5 h-5 text-fresco-graphite-light opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                            
                            {/* Delete button */}
                            {hoveredSession === session.id && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(session.id); }}
                                className="absolute right-14 top-1/2 -translate-y-1/2 p-2 text-fresco-graphite-light hover:text-red-500 hover:bg-red-50 rounded-none transition-colors z-10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeView === 'journey' && (
                <motion.div
                  key="journey"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <JourneyMap 
                    sessions={workspaceSessions}
                    onSessionClick={(id) => onOpenSession?.(id)}
                    onHouseStart={(houseId) => onStartHouse?.(houseId)}
                  />
                </motion.div>
              )}

              {activeView === 'synthesis' && (
                <motion.div
                  key="synthesis"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <WorkspaceSynthesis 
                    sessions={workspaceSessions}
                    workspaceTitle={workspace?.title}
                  />
                </motion.div>
              )}

              {activeView === 'timeline' && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <TimelineView 
                    sessions={workspaceSessions}
                    onSessionClick={(id) => onOpenSession?.(id)}
                  />
                </motion.div>
              )}

              {activeView === 'insights' && (
                <motion.div
                  key="insights"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ConnectedInsights 
                    sessions={workspaceSessions}
                    onSessionClick={(id) => onOpenSession?.(id)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            {/* Orchestration — what to do next */}
            <div>
              <span className="fresco-label block mb-3">What to run next</span>
              <OrchestrationPanel
                workspaceTitle={workspace?.title}
                sessions={workspaceSessions}
                onStartHouse={onStartHouse}
              />
            </div>

            {/* House runs summary */}
            {workspaceSessions.some(s => (s as any).houseType) && (() => {
              const houseRuns = (['investigate','innovate','validate','evaluate'] as any[]).map(h => ({
                house: h,
                count: workspaceSessions.filter(s => (s as any).houseType === h).length,
                verdict: (() => {
                  const last = workspaceSessions
                    .filter(s => (s as any).houseType === h)
                    .sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
                  return (last as any)?.aiOutputs?.houseResult?.verdict || null;
                })(),
              })).filter(h => h.count > 0);
              return (
                <div>
                  <span className="fresco-label block mb-3">Houses run</span>
                  <div className="space-y-1.5">
                    {houseRuns.map(({ house, count, verdict }) => {
                      const vstyle = 'text-fresco-black';
                      return (
                        <div key={house} className="flex items-center justify-between py-1.5 border-b border-fresco-border-light last:border-0">
                          <span className="text-fresco-sm text-fresco-graphite-soft capitalize">{house}</span>
                          <div className="flex items-center gap-2">
                            {verdict && <span className={`text-fresco-xs font-medium ${vstyle}`}>{verdict === 'INVESTIGATE FURTHER' ? 'NEEDS MORE SIGNAL' : verdict}</span>}
                            {count > 1 && <span className="text-fresco-xs text-fresco-graphite-light">×{count}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Sentences of Truth */}
            {sentencesOfTruth.length > 0 && (
              <div>
                <span className="fresco-label block mb-4">Sentences of Truth</span>
                <div className="space-y-3">
                  {sentencesOfTruth.slice(0, 3).map((session) => (
                    <button key={session.id} onClick={() => onOpenSession?.(session.id)} 
                      className="w-full p-4 text-left bg-fresco-light-gray rounded-fresco-lg hover:bg-fresco-warm-gray transition-colors">
                      <p className="text-fresco-sm text-fresco-graphite-soft italic leading-relaxed">
                        "{truncate(session.sentenceOfTruth?.content || '', 100)}"
                      </p>
                      <p className="text-fresco-xs text-fresco-graphite-light mt-2">
                        {(session as any).houseType
                          ? `${HOUSE_META[(session as any).houseType as HouseId]?.name ?? 'House'} Analysis`
                          : (TOOLKITS[session.toolkitType]?.name ?? session.toolkitType)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-fresco-white rounded-fresco-lg p-6 max-w-sm w-full mx-4 shadow-fresco-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-fresco-lg font-medium text-fresco-black">Delete Session?</h3>
                <button onClick={() => setDeleteConfirm(null)} className="p-1 text-fresco-graphite-light hover:text-fresco-black transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-fresco-sm text-fresco-graphite-mid mb-6">
                This will permanently delete this session and all its insights. This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 fresco-btn">Cancel</button>
                <button onClick={() => handleDeleteSession(deleteConfirm)} 
                  className="flex-1 h-11 text-fresco-sm font-medium text-white bg-red-500 rounded-fresco hover:bg-red-600 transition-colors">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
