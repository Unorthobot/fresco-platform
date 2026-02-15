'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, ArrowRight, Edit3, Check, X, Trash2, Sparkles, ChevronDown, Layout, Clock, Link2 } from 'lucide-react';
import { useFrescoStore } from '@/lib/store';
import { formatRelativeTime, truncate, cn } from '@/lib/utils';
import { TOOLKITS, type ToolkitType, type ToolkitCategory, type Session } from '@/types';
import { JourneyMap } from '@/components/ui/JourneyMap';
import { TimelineView } from '@/components/ui/TimelineView';
import { ConnectedInsights } from '@/components/ui/ConnectedInsights';
import { WorkspaceSynthesis } from '@/components/ui/WorkspaceSynthesis';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { EmptyState } from '@/components/ui/EmptyStates';

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
    <div className="p-4 bg-fresco-light-gray rounded-xl">
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
  onStartToolkit?: (toolkitType: ToolkitType) => void;
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
  performance_grid: null,
};

// House progression
const HOUSE_FLOW: Record<ToolkitCategory, ToolkitCategory | null> = {
  investigate: 'innovate',
  innovate: 'validate',
  validate: null,
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
];

const CATEGORY_ICONS: Record<ToolkitCategory, string> = {
  investigate: '/01-investigate.png',
  innovate: '/02-innovate.png',
  validate: '/03-validate.png',
};

const CATEGORY_LABELS: Record<ToolkitCategory, string> = {
  investigate: 'Investigate',
  innovate: 'Innovate',
  validate: 'Validate',
};

export function WorkspaceOverview({ workspaceId, onBack, onOpenSession, onStartToolkit }: WorkspaceOverviewProps) {
  const { workspaces, sessions, updateWorkspace, deleteSession } = useFrescoStore();
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
      updateWorkspace(workspaceId, { title: editTitle.trim() }); 
    } 
    setIsEditingTitle(false); 
  };

  const handleDeleteSession = (sessionId: string) => {
    deleteSession(sessionId);
    setDeleteConfirm(null);
  };

  const handleSelectToolkit = (type: ToolkitType) => {
    setShowToolkitSelector(false);
    onStartToolkit?.(type);
  };

  if (!workspace) return <div className="flex items-center justify-center h-96"><p className="text-fresco-graphite-light">Workspace not found</p></div>;

  return (
    <div className="min-h-screen fresco-grid-bg-subtle">
      {/* Header */}
      <div className="px-6 md:px-12 py-12 border-b border-fresco-border-light">
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
            <p className="text-fresco-base text-fresco-graphite-mid mt-2">{workspaceSessions.length} sessions · Updated {formatRelativeTime(workspace.updatedAt)}</p>
          </div>
          
          {/* New Session Button with Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowToolkitSelector(!showToolkitSelector)} 
              className="fresco-btn"
            >
              <Plus className="w-4 h-4" />
              <span>New Session</span>
              <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showToolkitSelector ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Toolkit Selector Dropdown */}
            <AnimatePresence>
              {showToolkitSelector && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowToolkitSelector(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-fresco-white rounded-xl shadow-lg border border-fresco-border z-50 overflow-hidden"
                  >
                    {/* Suggestions */}
                    {suggestedToolkits.length > 0 && (
                      <div className="p-3 border-b border-fresco-border-light bg-fresco-light-gray/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-fresco-graphite-mid" />
                          <span className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wider">Suggested</span>
                        </div>
                        {suggestedToolkits.map((suggestion) => (
                          <button
                            key={suggestion.type}
                            onClick={() => handleSelectToolkit(suggestion.type)}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors text-left"
                          >
                            <img 
                              src={CATEGORY_ICONS[TOOLKITS[suggestion.type].category]} 
                              alt="" 
                              className="w-5 h-5 icon-themed" 
                            />
                            <div className="flex-1">
                              <div className="text-fresco-sm font-medium text-fresco-black">{TOOLKITS[suggestion.type].name}</div>
                              <div className="text-fresco-xs text-fresco-graphite-light">{suggestion.reason}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* All Toolkits by Category */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {(['investigate', 'innovate', 'validate'] as ToolkitCategory[]).map((category) => (
                        <div key={category} className="p-3 border-b border-fresco-border-light last:border-b-0">
                          <div className="flex items-center gap-2 mb-2">
                            <img src={CATEGORY_ICONS[category]} alt="" className="w-4 h-4 icon-themed" />
                            <span className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wider">{CATEGORY_LABELS[category]}</span>
                          </div>
                          <div className="space-y-1">
                            {ALL_TOOLKITS.filter(t => t.category === category).map((toolkit) => (
                              <button
                                key={toolkit.type}
                                onClick={() => handleSelectToolkit(toolkit.type)}
                                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-fresco-light-gray transition-colors text-left"
                              >
                                <div>
                                  <div className="text-fresco-sm text-fresco-black">{TOOLKITS[toolkit.type].name}</div>
                                  <div className="text-fresco-xs text-fresco-graphite-light">{TOOLKITS[toolkit.type].subtitle}</div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-fresco-graphite-light" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 py-12 relative">
        {/* Ambient Background */}
        <AmbientBackground variant="subtle" />
        
        <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* View Tabs */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1 p-1 bg-fresco-light-gray rounded-xl">
                {[
                  { id: 'sessions', label: 'Sessions', icon: <Layout className="w-4 h-4" /> },
                  { id: 'synthesis', label: 'Synthesis', icon: <Sparkles className="w-4 h-4" /> },
                  { id: 'journey', label: 'Journey', icon: <ArrowRight className="w-4 h-4" /> },
                  { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
                  { id: 'insights', label: 'Insights', icon: <Link2 className="w-4 h-4" /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-fresco-sm font-medium transition-colors",
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
                  {workspaceSessions.length === 0 ? (
                    <EmptyState 
                      variant="session" 
                      onAction={() => onStartToolkit?.('insight_stack')}
                      actionLabel="Start Insight Stack"
                    />
                  ) : (
                    <div className="space-y-3">
                      {workspaceSessions.map((session, index) => {
                        const toolkit = TOOLKITS[session.toolkitType];
                        const nextToolkit = TOOLKIT_FLOW[session.toolkitType];
                        
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
                              className="w-full bg-fresco-white rounded-xl border border-fresco-border p-5 text-left hover:shadow-md hover:border-fresco-graphite-light transition-all group"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 pr-10">
                                  <div className="flex items-center gap-2 mb-1">
                                    <img src={CATEGORY_ICONS[toolkit.category]} alt="" className="w-5 h-5 icon-themed" />
                                    <h3 className="text-fresco-base font-medium text-fresco-black">{toolkit.name}</h3>
                                    {session.sentenceOfTruth?.content && (
                                      <Sparkles className="w-4 h-4 text-fresco-graphite" />
                                    )}
                                  </div>
                                  <p className="text-fresco-xs text-fresco-graphite-light">{formatRelativeTime(session.updatedAt)}</p>
                                  {session.sentenceOfTruth?.content && (
                                    <p className="text-fresco-sm text-fresco-graphite-soft mt-3 italic line-clamp-2">
                                      "{session.sentenceOfTruth.content}"
                                    </p>
                                  )}
                                  {session.aiOutputs?.insights?.length > 0 && (
                                    <p className="text-fresco-xs text-fresco-graphite-light mt-2">
                                      {session.aiOutputs.insights.length} insights
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
                                className="absolute right-14 top-1/2 -translate-y-1/2 p-2 text-fresco-graphite-light hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10"
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
                    onToolkitStart={(type) => onStartToolkit?.(type)}
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
            {/* Workspace Clarity Score */}
            <div>
              <span className="fresco-label block mb-4">Workspace Clarity</span>
              <WorkspaceClarityScore sessions={workspaceSessions} />
            </div>
            
            {/* Toolkit Journey Progress */}
            <div>
              <span className="fresco-label block mb-4">Journey Progress</span>
              <div className="space-y-3">
                {(['investigate', 'innovate', 'validate'] as ToolkitCategory[]).map((category) => {
                  const categoryToolkits = ALL_TOOLKITS.filter(t => t.category === category);
                  const completedCount = categoryToolkits.filter(t => 
                    workspaceSessions.some(s => s.toolkitType === t.type)
                  ).length;
                  
                  return (
                    <div key={category} className="p-3 bg-fresco-light-gray rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <img src={CATEGORY_ICONS[category]} alt="" className="w-4 h-4 icon-themed" />
                          <span className="text-fresco-sm font-medium text-fresco-black">{CATEGORY_LABELS[category]}</span>
                        </div>
                        <span className="text-fresco-xs text-fresco-graphite-light">{completedCount}/{categoryToolkits.length}</span>
                      </div>
                      <div className="h-1.5 bg-fresco-border rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-fresco-black rounded-full transition-all"
                          style={{ width: `${(completedCount / categoryToolkits.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

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
                      <p className="text-fresco-xs text-fresco-graphite-light mt-2">{TOOLKITS[session.toolkitType].name}</p>
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
