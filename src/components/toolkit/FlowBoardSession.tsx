'use client';

// FRESCO Flow Board™ - Visual Flow Builder
// Drag-and-drop steps with friction markers and connectors

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  ChevronLeft, 
  Download, 
  Sparkles,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  X,
  GitBranch,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Play,
  Flag,
  GripVertical
} from 'lucide-react';
import { cn, debounce, formatRelativeTime } from '@/lib/utils';
import { useFrescoStore } from '@/lib/store';
import { TOOLKITS, type ThinkingModeId } from '@/types';
import { ThinkingLensSelector } from '@/components/ui/ThinkingLensSelector';
import { ThinkingLensHint } from '@/components/ui/ThinkingLensHint';
import { ExportModal } from '@/components/ui/ExportModal';
import { FlowDiagram } from '@/components/ui/VisualOutputs';
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
import type { ExportData } from '@/lib/export';

interface FlowBoardSessionProps {
  sessionId: string;
  workspaceId: string;
  onBack?: () => void;
  onStartToolkit?: (toolkitType: string) => void;
}

interface FlowStep {
  id: string;
  content: string;
  hasFriction: boolean;
  frictionNote: string;
}

export function FlowBoardSession({ sessionId, workspaceId, onBack, onStartToolkit }: FlowBoardSessionProps) {
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
  const toolkit = TOOLKITS.flow_board;
  
  const [startingState, setStartingState] = useState('');
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [idealState, setIdealState] = useState('');
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
      const step4 = session.steps.find(s => s.stepNumber === 4);
      
      if (step1?.content) setStartingState(step1.content);
      if (step2?.content) {
        try {
          const parsed = JSON.parse(step2.content);
          if (Array.isArray(parsed)) setSteps(parsed);
        } catch {
          const lines = step2.content.split('\n').filter(l => l.trim());
          setSteps(lines.map((line, i) => ({
            id: `step-${i}`,
            content: line,
            hasFriction: false,
            frictionNote: ''
          })));
        }
      }
      if (step4?.content) setIdealState(step4.content);
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

  const handleStartingStateChange = (value: string) => {
    setStartingState(value);
    debouncedSave(1, value);
  };

  const handleStepsChange = (newSteps: FlowStep[]) => {
    setSteps(newSteps);
    debouncedSave(2, JSON.stringify(newSteps));
    // Save friction points as step 3
    const frictionText = newSteps
      .filter(s => s.hasFriction)
      .map(s => `${s.content}: ${s.frictionNote}`)
      .join('\n');
    debouncedSave(3, frictionText);
  };

  const handleIdealStateChange = (value: string) => {
    setIdealState(value);
    debouncedSave(4, value);
  };

  const addStep = () => {
    const newStep: FlowStep = {
      id: `step-${Date.now()}`,
      content: '',
      hasFriction: false,
      frictionNote: ''
    };
    handleStepsChange([...steps, newStep]);
  };

  const updateStep = (id: string, updates: Partial<FlowStep>) => {
    const updated = steps.map(s => s.id === id ? { ...s, ...updates } : s);
    handleStepsChange(updated);
  };

  const removeStep = (id: string) => {
    handleStepsChange(steps.filter(s => s.id !== id));
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

  // Generate AI content
  const generateContent = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const stepsText = steps.map((s, i) => `${i + 1}. ${s.content}${s.hasFriction ? ` [FRICTION: ${s.frictionNote}]` : ''}`).join('\n');
      const frictionText = steps.filter(s => s.hasFriction).map(s => `${s.content}: ${s.frictionNote}`).join('\n');
      const workspaceContext = getWorkspaceContext();
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolkitType: 'flow_board',
          toolkitName: toolkit.name,
          steps: [
            { label: 'STARTING STATE', content: startingState },
            { label: 'KEY STEPS', content: stepsText },
            { label: 'FRICTION POINTS', content: frictionText },
            { label: 'IDEAL STATE', content: idealState },
          ],
          thinkingLens: session?.thinkingLens || 'automatic',
          outputLabels: { primary: 'Flow Analysis', secondary: 'Optimal Path', action: 'Flow Improvements' },
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

  const frictionCount = steps.filter(s => s.hasFriction).length;
  const hasContent = startingState.trim().length > 0 || steps.some(s => s.content.trim().length > 0);
  const completedSections = [
    startingState.trim().length > 10,
    steps.filter(s => s.content.trim()).length >= 2,
    idealState.trim().length > 10
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
        label="Analyse Flow"
      />
      
      {/* Main Column */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <button type="button" onClick={() => onBack?.()} className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors">
                <ChevronLeft className="w-4 h-4" /><span>Back to {workspace?.title || 'Workspace'}</span>
              </button>
              <ThinkingLensSelector value={session.thinkingLens} onChange={handleLensChange} recommendedModes={toolkit.primaryModes} />
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-fresco-black flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-white" />
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
                  { label: 'Starting State', isComplete: startingState.trim().length > 10, isActive: true },
                  { label: 'Flow Steps', isComplete: steps.filter(s => s.content.trim()).length >= 2, isActive: false },
                  { label: 'Ideal State', isComplete: idealState.trim().length > 10, isActive: false }
                ]}
              />
            </div>
          </div>
          
          {/* Flow Visualization */}
          <div className="relative">
            {/* Starting State */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-fresco-black flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <span className="text-fresco-sm font-medium text-fresco-black">Starting State</span>
              </div>
              <textarea
                value={startingState}
                onChange={(e) => handleStartingStateChange(e.target.value)}
                placeholder="Describe the current state or starting point..."
                className="w-full p-4 bg-fresco-light-gray border-2 border-fresco-border rounded-xl text-fresco-base focus:ring-2 focus:ring-fresco-black focus:border-fresco-black outline-none resize-none"
                rows={2}
              />
              <InputQualityIndicator value={startingState} minLength={10} goodLength={50} />
              {TOOLKIT_EXAMPLES.flow_board?.starting && (
                <ContextualExample
                  stepLabel="Starting State"
                  example={TOOLKIT_EXAMPLES.flow_board.starting.example}
                  tip={TOOLKIT_EXAMPLES.flow_board.starting.tip}
                />
              )}
            </div>
            
            {/* Connector Line */}
            <div className="absolute left-5 top-[120px] bottom-[120px] w-0.5 bg-fresco-border -z-10" />
            
            {/* Flow Steps */}
            <div className="ml-5 pl-8 border-l-2 border-fresco-border space-y-4 mb-6">
              <Reorder.Group axis="y" values={steps} onReorder={handleStepsChange} className="space-y-4">
                {steps.map((step, index) => (
                  <Reorder.Item key={step.id} value={step}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing",
                        step.hasFriction 
                          ? "bg-fresco-light-gray border-fresco-graphite-light" 
                          : "bg-white dark:bg-gray-900 border-fresco-border dark:border-gray-700 hover:border-fresco-graphite-light"
                      )}
                    >
                      {/* Step connector dot */}
                      <div className={cn(
                        "absolute -left-[25px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white",
                        step.hasFriction ? "bg-fresco-light-gray0" : "bg-fresco-black"
                      )} />
                      
                      <div className="flex items-start gap-3">
                        <GripVertical className="w-5 h-5 text-fresco-graphite-light flex-shrink-0 mt-1" />
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-fresco-xs font-medium text-fresco-graphite-light">Step {index + 1}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateStep(step.id, { hasFriction: !step.hasFriction })}
                                className={cn(
                                  "flex items-center gap-1 px-2 py-1 rounded-lg text-fresco-xs transition-colors",
                                  step.hasFriction 
                                    ? "bg-fresco-light-gray0 text-white" 
                                    : "bg-fresco-light-gray text-fresco-graphite-mid hover:bg-fresco-light-gray hover:text-fresco-black"
                                )}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Friction
                              </button>
                              <button
                                onClick={() => removeStep(step.id)}
                                className="p-1 text-fresco-graphite-light hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <input
                            type="text"
                            value={step.content}
                            onChange={(e) => updateStep(step.id, { content: e.target.value })}
                            placeholder="Describe this step..."
                            className="w-full bg-transparent border-none focus:outline-none text-fresco-base text-fresco-black"
                          />
                          
                          {step.hasFriction && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="mt-3 pt-3 border-t border-fresco-border"
                            >
                              <input
                                type="text"
                                value={step.frictionNote}
                                onChange={(e) => updateStep(step.id, { frictionNote: e.target.value })}
                                placeholder="What causes friction here?"
                                className="w-full bg-white/50 rounded-lg px-3 py-2 text-fresco-sm text-fresco-graphite border border-fresco-border focus:outline-none focus:ring-1 focus:ring-fresco-black"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
              
              {/* Add Step Button */}
              <button
                onClick={addStep}
                className="w-full p-4 border-2 border-dashed border-fresco-border rounded-xl text-fresco-sm text-fresco-graphite-mid hover:border-fresco-black hover:text-fresco-black transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Step
              </button>
            </div>
            
            {/* Ideal State */}
            <div className="mt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-fresco-graphite flex items-center justify-center">
                  <Flag className="w-5 h-5 text-white" />
                </div>
                <span className="text-fresco-sm font-medium text-fresco-black">Ideal State</span>
              </div>
              <textarea
                value={idealState}
                onChange={(e) => handleIdealStateChange(e.target.value)}
                placeholder="Describe the optimal end state. What does success look like?"
                className="w-full p-4 bg-fresco-light-gray border-2 border-fresco-border rounded-xl text-fresco-base focus:ring-2 focus:ring-fresco-black focus:border-fresco-black outline-none resize-none"
                rows={2}
              />
            </div>
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
          
                {/* Flow Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-4 bg-fresco-light-gray rounded-xl text-center">
                    <div className="text-fresco-3xl font-bold text-fresco-black">{steps.length}</div>
                    <div className="text-fresco-xs text-fresco-graphite-light">Steps</div>
                  </div>
                  <div className={cn("p-4 rounded-xl text-center", frictionCount > 0 ? "bg-fresco-light-gray" : "bg-fresco-light-gray")}>
                    <div className={cn("text-fresco-3xl font-bold", frictionCount > 0 ? "text-fresco-graphite" : "text-fresco-black")}>{frictionCount}</div>
                    <div className="text-fresco-xs text-fresco-graphite-light">Friction Points</div>
                  </div>
                </div>
          
                {/* Visual Flow Diagram */}
                {steps.length > 0 && (
                  <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-xl border border-fresco-border-light dark:border-gray-700">
                    <span className="fresco-label block mb-3">Flow Visualization</span>
                    <FlowDiagram 
                      steps={steps.map(s => ({ 
                        label: s.content.slice(0, 20) + (s.content.length > 20 ? '...' : ''), 
                        hasFriction: s.hasFriction,
                        frictionNote: s.frictionNote
                      }))} 
                    />
                  </div>
                )}
          
                {/* Flow Analysis */}
                <div className="mb-8">
                  <span className="fresco-label block mb-4">Flow Analysis</span>
                  {aiContent.insights.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-fresco-border rounded-xl">
                      <GitBranch className="w-8 h-8 text-fresco-graphite-light mx-auto mb-3" />
                      <p className="text-fresco-sm text-fresco-graphite-light">Map your flow<br/>then analyse</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiContent.insights.map((insight, i) => (
                        <InsightCard key={i} insight={insight} index={i} isNew={true} />
                      ))}
                    </div>
                  )}
                </div>
          
                {/* Optimal Path - Enhanced Display */}
                {aiContent.sentenceOfTruth ? (
                  <div className="mb-8">
                    <SentenceOfTruthDisplay
                      sentence={aiContent.sentenceOfTruth}
                      toolkitName="Flow Board"
                      isLocked={session?.sentenceOfTruth?.isLocked}
                      onLockToggle={() => toggleSentenceLock(sessionId)}
                      onEdit={(val) => setSentenceOfTruth(sessionId, val)}
                    />
                  </div>
                ) : (
                  <div className="mb-8">
                    <span className="fresco-label block mb-4">Optimal Path</span>
                    <div className="p-6 bg-fresco-light-gray rounded-xl text-center">
                      <p className="text-fresco-sm text-fresco-graphite-light">Generate to discover the optimal path</p>
                    </div>
                  </div>
                )}
          
                {/* Flow Improvements */}
                {aiContent.necessaryMoves.length > 0 && (
                  <div className="mb-8">
                    <span className="fresco-label block mb-4">Flow Improvements</span>
                    <div className="space-y-2">
                      {aiContent.necessaryMoves.map((move, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 p-3 bg-fresco-light-gray rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-fresco-black flex-shrink-0 mt-0.5" />
                          <p className="text-fresco-sm text-fresco-graphite-soft">{move}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
          
                {/* Export */}
                <div className="pt-6 border-t border-fresco-border-light">
                  <button 
                    onClick={() => setShowExportModal(true)}
                    className="fresco-btn w-full"
                  >
                    <Download className="w-4 h-4" />
                    Export Flow
                  </button>
                </div>
          
                {/* Next Toolkit CTA */}
                <NextToolkitCTA 
                  currentToolkit="flow_board"
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
          toolkitType: 'flow_board',
          toolkitName: toolkit.name,
          workspaceTitle: workspace?.title || 'Untitled',
          thinkingLens: session?.thinkingLens || 'automatic',
          date: new Date().toLocaleDateString(),
          steps: [
            { label: 'Starting State', content: startingState },
            { label: 'Flow Steps', content: steps.map((s, i) => `${i + 1}. ${s.content}${s.hasFriction ? ` [FRICTION: ${s.frictionNote}]` : ''}`).join('\n') },
            { label: 'Ideal State', content: idealState },
          ],
          insights: aiContent.insights,
          sentenceOfTruth: aiContent.sentenceOfTruth,
          necessaryMoves: aiContent.necessaryMoves,
          customData: {
            'Flow Steps': steps.map(s => ({
              name: s.content,
              hasFriction: s.hasFriction ? 'Yes' : 'No',
              frictionNote: s.frictionNote || 'N/A'
            }))
          }
        }}
      />
    </div>
  );
}
