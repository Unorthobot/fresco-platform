'use client';

// FRESCO Persuasion Canvas™ - Visual Influence Mapping
// Audience persona, barrier cards, and message builder

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Download, 
  Sparkles,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  X,
  MessageCircle,
  Users,
  Target,
  Shield,
  Zap,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  Heart,
  Brain,
  Hand
} from 'lucide-react';
import { cn, debounce, formatRelativeTime } from '@/lib/utils';
import { useFrescoStore } from '@/lib/store';
import { TOOLKITS, type ThinkingModeId } from '@/types';
import { ThinkingLensSelector } from '@/components/ui/ThinkingLensSelector';
import { ThinkingLensHint } from '@/components/ui/ThinkingLensHint';
import { ExportModal } from '@/components/ui/ExportModal';
import { ProsConsBalance } from '@/components/ui/VisualOutputs';
import { NextToolkitCTA } from '@/components/ui/NextToolkitCTA';
import { 
  FloatingGenerateButton,
  ProgressIndicator,
  InputQualityIndicator,
  SmartPrompt,
  ContextualExample,
  WizardModeControls,
  CompletionCelebration,
  DynamicPrompt
} from '@/components/ui/ToolkitUX';
import { useToast } from '@/components/ui/Toast';
import { InsightCard } from '@/components/ui/InsightCard';
import { SentenceOfTruthDisplay } from '@/components/ui/SentenceOfTruthDisplay';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GenerationSuccess } from '@/components/ui/GenerationSuccess';
import { TOOLKIT_EXAMPLES } from '@/lib/examples';

interface PersuasionCanvasSessionProps {
  sessionId: string;
  workspaceId: string;
  onBack?: () => void;
  onStartToolkit?: (toolkitType: string) => void;
}

interface Barrier {
  id: string;
  content: string;
  type: 'belief' | 'fear' | 'habit';
}

interface Tactic {
  id: string;
  content: string;
  leverType: 'logic' | 'emotion' | 'action';
}

const BARRIER_TYPES = {
  belief: { icon: Brain, color: 'bg-fresco-light-gray border-fresco-border text-fresco-graphite', label: 'Belief' },
  fear: { icon: Shield, color: 'bg-fresco-off-white border-fresco-graphite-light text-fresco-graphite', label: 'Fear' },
  habit: { icon: Hand, color: 'bg-white dark:bg-gray-800 border-fresco-border dark:border-gray-700 text-fresco-graphite-mid', label: 'Habit' },
};

const TACTIC_TYPES = {
  logic: { icon: Brain, color: 'bg-fresco-light-gray border-fresco-border text-fresco-black', label: 'Logic' },
  emotion: { icon: Heart, color: 'bg-fresco-off-white border-fresco-graphite-light text-fresco-graphite', label: 'Emotion' },
  action: { icon: Zap, color: 'bg-white dark:bg-gray-800 border-fresco-border dark:border-gray-700 text-fresco-graphite-mid', label: 'Action' },
};

export function PersuasionCanvasSession({ sessionId, workspaceId, onBack, onStartToolkit }: PersuasionCanvasSessionProps) {
  const {
    sessions,
    workspaces,
    updateSessionStep,
    setSessionLens,
    setSentenceOfTruth,
    toggleSentenceLock,
    saveAIOutputs,
    getWorkspaceSessions,
  } = useFrescoStore();
  const { showToast } = useToast();
  
  const session = sessions.find((s) => s.id === sessionId);
  const workspace = workspaces.find((w) => w.id === workspaceId);
  const toolkit = TOOLKITS.persuasion_canvas;
  
  const [audienceName, setAudienceName] = useState('');
  const [currentBeliefs, setCurrentBeliefs] = useState('');
  const [desiredChange, setDesiredChange] = useState('');
  const [barriers, setBarriers] = useState<Barrier[]>([]);
  const [tactics, setTactics] = useState<Tactic[]>([]);
  const [coreMessage, setCoreMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiContent, setAiContent] = useState<{ insights: string[]; sentenceOfTruth: string; necessaryMoves: string[] }>({ insights: [], sentenceOfTruth: '', necessaryMoves: [] });
  const [showExportModal, setShowExportModal] = useState(false);
  
  // New UX state
  const [isWizardMode, setIsWizardMode] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isOutputPanelExpanded, setIsOutputPanelExpanded] = useState(false);
  
  // Initialize from session
  useEffect(() => {
    if (session?.steps) {
      const step1 = session.steps.find(s => s.stepNumber === 1);
      const step2 = session.steps.find(s => s.stepNumber === 2);
      const step3 = session.steps.find(s => s.stepNumber === 3);
      const step4 = session.steps.find(s => s.stepNumber === 4);
      
      if (step1?.content) {
        try {
          const parsed = JSON.parse(step1.content);
          setAudienceName(parsed.name || '');
          setCurrentBeliefs(parsed.beliefs || '');
        } catch {
          setAudienceName(step1.content);
        }
      }
      if (step2?.content) setDesiredChange(step2.content);
      if (step3?.content) {
        try {
          const parsed = JSON.parse(step3.content);
          if (Array.isArray(parsed)) setBarriers(parsed);
        } catch {}
      }
      if (step4?.content) {
        try {
          const parsed = JSON.parse(step4.content);
          setTactics(parsed.tactics || []);
          setCoreMessage(parsed.message || '');
        } catch {
          setCoreMessage(step4.content);
        }
      }
    }
    
    // Restore saved AI outputs
    if (session?.insights && session.insights.length > 0) {
      setAiContent(prev => ({ ...prev, insights: session.insights?.map(i => i.content) || [] }));
    }
    if (session?.sentenceOfTruth?.content) {
      setAiContent(prev => ({ ...prev, sentenceOfTruth: session.sentenceOfTruth?.content || '' }));
    }
    if (session?.necessaryMoves && session.necessaryMoves.length > 0) {
      setAiContent(prev => ({ ...prev, necessaryMoves: session.necessaryMoves?.map(m => m.content) || [] }));
    }
  }, [session?.id]);

  const debouncedSave = useCallback(
    debounce((stepNumber: number, value: string) => {
      updateSessionStep(sessionId, stepNumber, value);
    }, 500),
    [sessionId, updateSessionStep]
  );

  const saveAudience = (name: string, beliefs: string) => {
    debouncedSave(1, JSON.stringify({ name, beliefs }));
  };

  const handleAudienceNameChange = (value: string) => {
    setAudienceName(value);
    saveAudience(value, currentBeliefs);
  };

  const handleCurrentBeliefsChange = (value: string) => {
    setCurrentBeliefs(value);
    saveAudience(audienceName, value);
  };

  const handleDesiredChangeChange = (value: string) => {
    setDesiredChange(value);
    debouncedSave(2, value);
  };

  const handleBarriersChange = (newBarriers: Barrier[]) => {
    setBarriers(newBarriers);
    debouncedSave(3, JSON.stringify(newBarriers));
  };

  const saveStrategy = (newTactics: Tactic[], message: string) => {
    debouncedSave(4, JSON.stringify({ tactics: newTactics, message }));
  };

  const handleTacticsChange = (newTactics: Tactic[]) => {
    setTactics(newTactics);
    saveStrategy(newTactics, coreMessage);
  };

  const handleCoreMessageChange = (value: string) => {
    setCoreMessage(value);
    saveStrategy(tactics, value);
  };

  const addBarrier = (type: Barrier['type']) => {
    const newBarrier: Barrier = { id: `barrier-${Date.now()}`, content: '', type };
    handleBarriersChange([...barriers, newBarrier]);
  };

  const updateBarrier = (id: string, content: string) => {
    const updated = barriers.map(b => b.id === id ? { ...b, content } : b);
    handleBarriersChange(updated);
  };

  const removeBarrier = (id: string) => {
    handleBarriersChange(barriers.filter(b => b.id !== id));
  };

  const addTactic = (leverType: Tactic['leverType']) => {
    const newTactic: Tactic = { id: `tactic-${Date.now()}`, content: '', leverType };
    handleTacticsChange([...tactics, newTactic]);
  };

  const updateTactic = (id: string, content: string) => {
    const updated = tactics.map(t => t.id === id ? { ...t, content } : t);
    handleTacticsChange(updated);
  };

  const removeTactic = (id: string) => {
    handleTacticsChange(tactics.filter(t => t.id !== id));
  };

  const handleLensChange = (lens: ThinkingModeId) => {
    setSessionLens(sessionId, lens);
  };

  // Get workspace context from other sessions
  // Get workspace context from other sessions - includes full context for AI continuity
  const getWorkspaceContext = () => {
    const workspaceSessions = getWorkspaceSessions(workspaceId);
    const otherSessions = workspaceSessions.filter(s => 
      s.id !== sessionId && 
      (s.sentenceOfTruth?.content || s.steps?.some(step => step.content?.trim()))
    );
    if (otherSessions.length === 0) return null;
    return otherSessions.map(s => ({
      toolkit: s.toolkitType,
      toolkitName: TOOLKITS[s.toolkitType]?.name || s.toolkitType,
      sentenceOfTruth: s.sentenceOfTruth?.content,
      insights: s.insights?.map(i => i.content) || [],
      necessaryMoves: s.necessaryMoves?.map(m => m.content) || [],
      steps: s.steps?.map(step => ({
        label: TOOLKITS[s.toolkitType]?.steps?.[step.stepNumber - 1]?.label || `Step ${step.stepNumber}`,
        content: step.content || ''
      })).filter(step => step.content.trim()) || []
    }));
  };

  const generateContent = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const barriersText = barriers.map(b => `[${b.type.toUpperCase()}] ${b.content}`).join('\n');
      const tacticsText = tactics.map(t => `[${t.leverType.toUpperCase()}] ${t.content}`).join('\n');
      const workspaceContext = getWorkspaceContext();
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolkitType: 'persuasion_canvas',
          toolkitName: toolkit.name,
          steps: [
            { label: 'AUDIENCE', content: `${audienceName}\nCurrent beliefs: ${currentBeliefs}` },
            { label: 'DESIRED CHANGE', content: desiredChange },
            { label: 'BARRIERS', content: barriersText },
            { label: 'PERSUASION STRATEGY', content: `Tactics:\n${tacticsText}\n\nCore message: ${coreMessage}` },
          ],
          thinkingLens: session?.thinkingLens || 'automatic',
          outputLabels: { primary: 'Persuasion Elements', secondary: 'Core Message', action: 'Communication Plan' },
          workspaceContext,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setAiContent(data);
        saveAIOutputs(sessionId, data);
        setShowCelebration(true);
        setIsOutputPanelExpanded(true);
      }
    } catch (e) { console.error('Failed to generate:', e); showToast('Failed to generate. Please try again.', 'error'); }
    setIsGenerating(false);
  };

  const hasContent = audienceName.trim().length > 0 || desiredChange.trim().length > 0;
  const completedSections = [
    audienceName.trim().length > 5 || currentBeliefs.trim().length > 10,
    desiredChange.trim().length > 10,
    barriers.filter(b => b.content.trim()).length >= 1,
    tactics.filter(t => t.content.trim()).length >= 1 || coreMessage.trim().length > 10
  ].filter(Boolean).length;
  
  if (!session) return <div className="flex items-center justify-center h-96"><p className="text-fresco-graphite-light">Session not found</p></div>;

  return (
    <div className="flex h-full bg-fresco-white">
      {/* Completion Celebration */}
      <GenerationSuccess 
        show={showCelebration} 
        onComplete={() => setShowCelebration(false)}
        insightCount={aiContent.insights.length}
        hasTruth={!!aiContent.sentenceOfTruth}
        actionCount={aiContent.necessaryMoves.length}
      />
      
      {/* Floating Generate Button */}
      <FloatingGenerateButton
        isVisible={completedSections >= 2 && !aiContent.sentenceOfTruth && !isGenerating}
        isGenerating={isGenerating}
        onClick={generateContent}
        label="Build Strategy"
      />
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-8 py-10">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <button type="button" onClick={() => onBack?.()} className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors">
                <ChevronLeft className="w-4 h-4" /><span>Back to {workspace?.title || 'Workspace'}</span>
              </button>
              <ThinkingLensSelector value={session.thinkingLens} onChange={handleLensChange} recommendedModes={toolkit.primaryModes} />
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-fresco-black flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-fresco-2xl font-medium text-fresco-black tracking-tight">{toolkit.name}</h1>
                <p className="text-fresco-sm text-fresco-graphite-mid">{toolkit.subtitle}</p>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="mt-6">
              <ProgressIndicator 
                variant="bar"
                steps={[
                  { label: 'Audience', isComplete: audienceName.trim().length > 5 || currentBeliefs.trim().length > 10, isActive: true },
                  { label: 'Desired Change', isComplete: desiredChange.trim().length > 10, isActive: false },
                  { label: 'Barriers', isComplete: barriers.filter(b => b.content.trim()).length >= 1, isActive: false },
                  { label: 'Strategy', isComplete: tactics.filter(t => t.content.trim()).length >= 1 || coreMessage.trim().length > 10, isActive: false }
                ]}
              />
            </div>
          </div>
          
          <div className="mb-8 p-6 bg-gradient-to-br from-fresco-light-gray to-fresco-off-white rounded-2xl border-2 border-fresco-border">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-fresco-graphite" />
              <span className="text-fresco-sm font-medium text-fresco-black">Target Audience</span>
            </div>
            <input
              type="text"
              value={audienceName}
              onChange={(e) => handleAudienceNameChange(e.target.value)}
              placeholder="Who are you trying to persuade?"
              className="w-full p-4 bg-white/70 rounded-xl text-fresco-lg font-medium border border-fresco-border focus:ring-2 focus:ring-fresco-black focus:border-fresco-black outline-none mb-4"
            />
            <textarea
              value={currentBeliefs}
              onChange={(e) => handleCurrentBeliefsChange(e.target.value)}
              placeholder="What do they currently believe? What's their worldview?"
              className="w-full p-4 bg-white/70 rounded-xl text-fresco-base border border-fresco-border focus:ring-2 focus:ring-fresco-black focus:border-fresco-black outline-none resize-none"
              rows={3}
            />
            {TOOLKIT_EXAMPLES.persuasion_canvas?.audience && (
              <ContextualExample
                stepLabel="Target Audience"
                example={TOOLKIT_EXAMPLES.persuasion_canvas.audience.example}
                tip={TOOLKIT_EXAMPLES.persuasion_canvas.audience.tip}
              />
            )}
          </div>
          
          <div className="mb-8 p-6 bg-gradient-to-br from-fresco-light-gray to-fresco-off-white rounded-2xl border-2 border-fresco-border">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-fresco-graphite" />
              <span className="text-fresco-sm font-medium text-fresco-black">Desired Change</span>
            </div>
            <textarea
              value={desiredChange}
              onChange={(e) => handleDesiredChangeChange(e.target.value)}
              placeholder="What do you want them to believe, feel, or do differently?"
              className="w-full p-4 bg-white/70 rounded-xl text-fresco-base border border-fresco-border focus:ring-2 focus:ring-fresco-black focus:border-fresco-black outline-none resize-none"
              rows={3}
            />
            {TOOLKIT_EXAMPLES.persuasion_canvas?.change && (
              <ContextualExample
                stepLabel="Desired Change"
                example={TOOLKIT_EXAMPLES.persuasion_canvas.change.example}
                tip={TOOLKIT_EXAMPLES.persuasion_canvas.change.tip}
              />
            )}
          </div>
          
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-fresco-lg font-medium text-fresco-black">Barriers to Change</h3>
                <p className="text-fresco-sm text-fresco-graphite-light">What prevents the change?</p>
              </div>
              <div className="flex gap-2">
                {Object.entries(BARRIER_TYPES).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => addBarrier(type as Barrier['type'])}
                      className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-fresco-xs border transition-colors", config.color)}
                    >
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(BARRIER_TYPES).map(([type, config]) => {
                const Icon = config.icon;
                const typeBarriers = barriers.filter(b => b.type === type);
                return (
                  <div key={type} className="space-y-3">
                    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", config.color.split(' ')[0])}>
                      <Icon className="w-4 h-4" />
                      <span className="text-fresco-sm font-medium">{config.label}s</span>
                      <span className="text-fresco-xs opacity-60">({typeBarriers.length})</span>
                    </div>
                    {typeBarriers.map((barrier) => (
                      <motion.div
                        key={barrier.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn("p-3 rounded-xl border group", config.color)}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="text"
                            value={barrier.content}
                            onChange={(e) => updateBarrier(barrier.id, e.target.value)}
                            placeholder={`What ${type} blocks them?`}
                            className="flex-1 bg-transparent border-none focus:outline-none text-fresco-sm"
                          />
                          <button onClick={() => removeBarrier(barrier.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    {typeBarriers.length === 0 && (
                      <div className="p-4 rounded-xl border-2 border-dashed text-center opacity-50">
                        <p className="text-fresco-xs">No {type}s added</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-fresco-lg font-medium text-fresco-black">Persuasion Tactics</h3>
                <p className="text-fresco-sm text-fresco-graphite-light">How will you overcome barriers?</p>
              </div>
              <div className="flex gap-2">
                {Object.entries(TACTIC_TYPES).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => addTactic(type as Tactic['leverType'])}
                      className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-fresco-xs border transition-colors", config.color)}
                    >
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(TACTIC_TYPES).map(([type, config]) => {
                const Icon = config.icon;
                const typeTactics = tactics.filter(t => t.leverType === type);
                return (
                  <div key={type} className="space-y-3">
                    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", config.color.split(' ')[0])}>
                      <Icon className="w-4 h-4" />
                      <span className="text-fresco-sm font-medium">{config.label}</span>
                      <span className="text-fresco-xs opacity-60">({typeTactics.length})</span>
                    </div>
                    {typeTactics.map((tactic) => (
                      <motion.div
                        key={tactic.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn("p-3 rounded-xl border group", config.color)}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="text"
                            value={tactic.content}
                            onChange={(e) => updateTactic(tactic.id, e.target.value)}
                            placeholder={`${config.label}-based approach...`}
                            className="flex-1 bg-transparent border-none focus:outline-none text-fresco-sm"
                          />
                          <button onClick={() => removeTactic(tactic.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    {typeTactics.length === 0 && (
                      <div className="p-4 rounded-xl border-2 border-dashed text-center opacity-50">
                        <p className="text-fresco-xs">No tactics added</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mb-8">
            <label className="fresco-label block mb-2">Core Message</label>
            <p className="text-fresco-sm text-fresco-graphite-light mb-3">What's the single most compelling message?</p>
            <textarea
              value={coreMessage}
              onChange={(e) => handleCoreMessageChange(e.target.value)}
              placeholder="In one powerful sentence, what do you want them to remember?"
              className="w-full p-4 bg-gradient-to-r from-fresco-black to-fresco-graphite rounded-xl text-fresco-lg text-white placeholder-white/40 border-none focus:ring-2 focus:ring-fresco-graphite outline-none resize-none"
              rows={2}
            />
          </div>
          
          <div className="mt-12 pt-6 border-t border-fresco-border-light">
            <p className="text-fresco-xs text-fresco-graphite-light">Auto-saved {session.updatedAt ? formatRelativeTime(session.updatedAt) : 'just now'}</p>
          </div>
        </div>
      </div>
      
      {/* Output Panel - Collapsible */}
      <AnimatePresence>
        {isOutputPanelExpanded ? (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-l border-fresco-border-light bg-fresco-off-white overflow-hidden"
          >
            <div className="w-[360px] h-full overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-fresco-lg font-medium text-fresco-black">Output</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsOutputPanelExpanded(false)} className="p-1.5 text-fresco-graphite-light hover:text-fresco-black rounded transition-colors">
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>
          
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-3 bg-fresco-light-gray rounded-xl text-center">
                    <div className="text-fresco-2xl font-bold text-fresco-black">{barriers.length}</div>
                    <div className="text-fresco-xs text-fresco-graphite-light">Barriers</div>
                  </div>
                  <div className="p-3 bg-fresco-off-white rounded-xl text-center">
                    <div className="text-fresco-2xl font-bold text-fresco-graphite">{tactics.length}</div>
                    <div className="text-fresco-xs text-fresco-graphite-light">Tactics</div>
                  </div>
                </div>
          
                <div className="mb-8">
                  <span className="fresco-label block mb-4">Persuasion Elements</span>
                  {aiContent.insights.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-fresco-border rounded-xl">
                      <MessageCircle className="w-8 h-8 text-fresco-graphite-light mx-auto mb-3" />
                      <p className="text-fresco-sm text-fresco-graphite-light">Map your audience<br/>then generate plan</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiContent.insights.map((insight, i) => (
                        <InsightCard key={i} insight={insight} index={i} isNew={true} />
                      ))}
                    </div>
                  )}
                </div>
          
          {aiContent.sentenceOfTruth ? (
            <div className="mb-8">
              <SentenceOfTruthDisplay
                sentence={aiContent.sentenceOfTruth}
                toolkitName="Persuasion Canvas"
                isLocked={session?.sentenceOfTruth?.isLocked}
                onLockToggle={() => toggleSentenceLock(sessionId)}
                onEdit={(val) => setSentenceOfTruth(sessionId, val)}
              />
            </div>
          ) : (
            <div className="mb-8">
              <span className="fresco-label block mb-4">Core Message</span>
              <div className="p-6 bg-fresco-light-gray rounded-xl text-center">
                <p className="text-fresco-sm text-fresco-graphite-light">Generate to craft your core message</p>
              </div>
            </div>
          )}
          
          {aiContent.necessaryMoves.length > 0 && (
            <div className="mb-8">
              <span className="fresco-label block mb-4">Communication Plan</span>
              <div className="space-y-2">
                {aiContent.necessaryMoves.map((move, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 p-3 bg-fresco-light-gray rounded-lg">
                    <ArrowRight className="w-4 h-4 text-fresco-graphite-mid flex-shrink-0 mt-0.5" />
                    <p className="text-fresco-sm text-fresco-graphite-soft">{move}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          
                <div className="pt-6 border-t border-fresco-border-light">
                  <button 
                    onClick={() => setShowExportModal(true)}
                    className="fresco-btn w-full"
                  >
                    <Download className="w-4 h-4" />
                    Export Canvas
                  </button>
                </div>
          
                {/* Next Toolkit CTA */}
                <NextToolkitCTA 
                  currentToolkit="persuasion_canvas"
                  isReady={aiContent.insights.length > 0 && !!aiContent.sentenceOfTruth && aiContent.necessaryMoves.length > 0}
                  onStartToolkit={onStartToolkit}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsOutputPanelExpanded(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-fresco-black text-white px-3 py-6 rounded-l-xl shadow-lg hover:bg-fresco-graphite transition-colors flex flex-col items-center gap-2"
          >
            <Eye className="w-5 h-5" />
            <span className="text-fresco-xs font-medium" style={{ writingMode: 'vertical-rl' }}>Output</span>
            {aiContent.insights.length > 0 && (
              <span className="w-5 h-5 bg-fresco-black rounded-full text-fresco-xs flex items-center justify-center">
                {aiContent.insights.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={{
          toolkitType: 'persuasion_canvas',
          toolkitName: toolkit.name,
          workspaceTitle: workspace?.title || 'Untitled',
          thinkingLens: session?.thinkingLens || 'automatic',
          date: new Date().toLocaleDateString(),
          steps: [
            { label: 'Audience', content: `${audienceName}\nBeliefs: ${currentBeliefs}` },
            { label: 'Desired Change', content: desiredChange },
            { label: 'Barriers', content: barriers.map(b => `[${b.type}] ${b.content}`).join('\n') },
            { label: 'Tactics', content: tactics.map(t => `[${t.leverType}] ${t.content}`).join('\n') },
            { label: 'Core Message', content: coreMessage },
          ],
          insights: aiContent.insights,
          sentenceOfTruth: aiContent.sentenceOfTruth,
          necessaryMoves: aiContent.necessaryMoves,
          customData: {
            'Barriers': barriers.map(b => ({ type: b.type, content: b.content })),
            'Tactics': tactics.map(t => ({ type: t.leverType, content: t.content })),
          }
        }}
      />
    </div>
  );
}
