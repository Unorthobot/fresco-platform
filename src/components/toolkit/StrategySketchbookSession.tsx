'use client';

// FRESCO Strategy Sketchbook™ - Visual Strategy Comparison
// Side-by-side option cards with trade-off matrix

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
  Map,
  Check,
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Star,
  StarOff
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

interface StrategySketchbookSessionProps {
  sessionId: string;
  workspaceId: string;
  onBack?: () => void;
  onStartToolkit?: (toolkitType: string) => void;
}

interface StrategyOption {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  isRecommended: boolean;
}

export function StrategySketchbookSession({ sessionId, workspaceId, onBack, onStartToolkit }: StrategySketchbookSessionProps) {
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
  const toolkit = TOOLKITS.strategy_sketchbook;
  
  const [strategicQuestion, setStrategicQuestion] = useState('');
  const [options, setOptions] = useState<StrategyOption[]>([
    { id: '1', name: 'Option A', description: '', pros: [''], cons: [''], isRecommended: false },
    { id: '2', name: 'Option B', description: '', pros: [''], cons: [''], isRecommended: false },
    { id: '3', name: 'Option C', description: '', pros: [''], cons: [''], isRecommended: false },
  ]);
  const [recommendation, setRecommendation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiContent, setAiContent] = useState<{ insights: string[]; sentenceOfTruth: string; necessaryMoves: string[] }>({ insights: [], sentenceOfTruth: '', necessaryMoves: [] });
  const [showExportModal, setShowExportModal] = useState(false);
  
  // New UX state
  const [isWizardMode, setIsWizardMode] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isOutputPanelExpanded, setIsOutputPanelExpanded] = useState(false);
  
  useEffect(() => {
    if (session?.steps) {
      const step1 = session.steps.find(s => s.stepNumber === 1);
      const step2 = session.steps.find(s => s.stepNumber === 2);
      const step4 = session.steps.find(s => s.stepNumber === 4);
      
      if (step1?.content) setStrategicQuestion(step1.content);
      if (step2?.content) {
        try {
          const parsed = JSON.parse(step2.content);
          if (Array.isArray(parsed)) setOptions(parsed);
        } catch {}
      }
      if (step4?.content) setRecommendation(step4.content);
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

  const handleQuestionChange = (value: string) => {
    setStrategicQuestion(value);
    debouncedSave(1, value);
  };

  const handleOptionsChange = (newOptions: StrategyOption[]) => {
    setOptions(newOptions);
    debouncedSave(2, JSON.stringify(newOptions));
    const tradeOffs = newOptions.map(o => 
      `${o.name}:\n  Pros: ${o.pros.filter(p => p).join(', ')}\n  Cons: ${o.cons.filter(c => c).join(', ')}`
    ).join('\n\n');
    debouncedSave(3, tradeOffs);
  };

  const handleRecommendationChange = (value: string) => {
    setRecommendation(value);
    debouncedSave(4, value);
  };

  const updateOption = (id: string, updates: Partial<StrategyOption>) => {
    const updated = options.map(o => o.id === id ? { ...o, ...updates } : o);
    handleOptionsChange(updated);
  };

  const addOption = () => {
    const newOption: StrategyOption = {
      id: Date.now().toString(),
      name: `Option ${String.fromCharCode(65 + options.length)}`,
      description: '',
      pros: [''],
      cons: [''],
      isRecommended: false
    };
    handleOptionsChange([...options, newOption]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    handleOptionsChange(options.filter(o => o.id !== id));
  };

  const toggleRecommended = (id: string) => {
    const updated = options.map(o => ({
      ...o,
      isRecommended: o.id === id ? !o.isRecommended : false
    }));
    handleOptionsChange(updated);
  };

  const addPro = (optionId: string) => {
    const option = options.find(o => o.id === optionId);
    if (option) {
      updateOption(optionId, { pros: [...option.pros, ''] });
    }
  };

  const addCon = (optionId: string) => {
    const option = options.find(o => o.id === optionId);
    if (option) {
      updateOption(optionId, { cons: [...option.cons, ''] });
    }
  };

  const updatePro = (optionId: string, index: number, value: string) => {
    const option = options.find(o => o.id === optionId);
    if (option) {
      const newPros = [...option.pros];
      newPros[index] = value;
      updateOption(optionId, { pros: newPros });
    }
  };

  const updateCon = (optionId: string, index: number, value: string) => {
    const option = options.find(o => o.id === optionId);
    if (option) {
      const newCons = [...option.cons];
      newCons[index] = value;
      updateOption(optionId, { cons: newCons });
    }
  };

  const removePro = (optionId: string, index: number) => {
    const option = options.find(o => o.id === optionId);
    if (option && option.pros.length > 1) {
      updateOption(optionId, { pros: option.pros.filter((_, i) => i !== index) });
    }
  };

  const removeCon = (optionId: string, index: number) => {
    const option = options.find(o => o.id === optionId);
    if (option && option.cons.length > 1) {
      updateOption(optionId, { cons: option.cons.filter((_, i) => i !== index) });
    }
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
      const optionsText = options.map(o => 
        `${o.name}: ${o.description}\n  Pros: ${o.pros.filter(p => p).join(', ')}\n  Cons: ${o.cons.filter(c => c).join(', ')}`
      ).join('\n\n');
      const workspaceContext = getWorkspaceContext();
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolkitType: 'strategy_sketchbook',
          toolkitName: toolkit.name,
          steps: [
            { label: 'STRATEGIC QUESTION', content: strategicQuestion },
            { label: 'OPTIONS', content: optionsText },
            { label: 'TRADE-OFFS', content: optionsText },
            { label: 'RECOMMENDATION', content: recommendation },
          ],
          thinkingLens: session?.thinkingLens || 'automatic',
          outputLabels: { primary: 'Strategic Options', secondary: 'Strategic Direction', action: 'Next Moves' },
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

  const recommendedOption = options.find(o => o.isRecommended);
  const hasContent = strategicQuestion.trim().length > 0 || options.some(o => o.description.trim().length > 0);
  const completedSections = [
    strategicQuestion.trim().length > 15,
    options.filter(o => o.description.trim().length > 10).length >= 2,
    options.some(o => o.isRecommended),
    recommendation.trim().length > 20
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
        label="Analyse Strategy"
      />
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-10">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <button type="button" onClick={() => onBack?.()} className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors">
                <ChevronLeft className="w-4 h-4" /><span>Back to {workspace?.title || 'Workspace'}</span>
              </button>
              <ThinkingLensSelector value={session.thinkingLens} onChange={handleLensChange} recommendedModes={toolkit.primaryModes} />
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-fresco-black flex items-center justify-center">
                <Map className="w-5 h-5 text-white" />
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
                  { label: 'Question', isComplete: strategicQuestion.trim().length > 15, isActive: true },
                  { label: 'Options', isComplete: options.filter(o => o.description.trim().length > 10).length >= 2, isActive: false },
                  { label: 'Selected', isComplete: options.some(o => o.isRecommended), isActive: false },
                  { label: 'Rationale', isComplete: recommendation.trim().length > 20, isActive: false }
                ]}
              />
            </div>
          </div>
          
          <div className="mb-10">
            <label className="fresco-label block mb-2">Strategic Question</label>
            <textarea
              value={strategicQuestion}
              onChange={(e) => handleQuestionChange(e.target.value)}
              placeholder="What is the core strategic question you're trying to answer?"
              className="w-full p-5 bg-gradient-to-br from-fresco-black to-fresco-graphite rounded-2xl text-white text-fresco-lg border-none focus:ring-2 focus:ring-fresco-graphite outline-none resize-none placeholder-white/40"
              rows={2}
            />
            <div className="mt-2">
              <InputQualityIndicator value={strategicQuestion} minLength={15} goodLength={60} />
            </div>
            {TOOLKIT_EXAMPLES.strategy_sketchbook?.question && (
              <ContextualExample
                stepLabel="Strategic Question"
                example={TOOLKIT_EXAMPLES.strategy_sketchbook.question.example}
                tip={TOOLKIT_EXAMPLES.strategy_sketchbook.question.tip}
              />
            )}
          </div>
          
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-fresco-lg font-medium text-fresco-black">Strategic Options</h3>
              <button
                onClick={addOption}
                className="flex items-center gap-2 px-4 py-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black border border-fresco-border rounded-lg hover:border-fresco-black transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Option
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {options.map((option, index) => (
                <motion.div 
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "bg-white dark:bg-gray-900 rounded-2xl border-2 transition-all",
                    option.isRecommended ? "border-fresco-black shadow-lg shadow-black/10" : "border-fresco-border hover:border-fresco-graphite-light"
                  )}
                >
                  <div className="p-4 border-b border-fresco-border-light">
                    <div className="flex items-center justify-between mb-3">
                      <input
                        type="text"
                        value={option.name}
                        onChange={(e) => updateOption(option.id, { name: e.target.value })}
                        className="text-fresco-lg font-medium text-fresco-black bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                        placeholder="Option name..."
                      />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleRecommended(option.id)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            option.isRecommended ? "text-fresco-black bg-fresco-light-gray" : "text-fresco-graphite-light hover:text-fresco-black"
                          )}
                          title={option.isRecommended ? "Recommended" : "Mark as recommended"}
                        >
                          {option.isRecommended ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                        </button>
                        {options.length > 2 && (
                          <button
                            onClick={() => removeOption(option.id)}
                            className="p-1.5 text-fresco-graphite-light hover:text-fresco-graphite transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      value={option.description}
                      onChange={(e) => updateOption(option.id, { description: e.target.value })}
                      placeholder="Describe this strategic option..."
                      className="w-full p-0 text-fresco-sm text-fresco-graphite-mid bg-transparent border-none focus:outline-none focus:ring-0 resize-none"
                      rows={2}
                    />
                  </div>
                  
                  <div className="p-4 border-b border-fresco-border-light">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-fresco-xs font-medium text-fresco-black uppercase tracking-wider">Pros</span>
                      <button onClick={() => addPro(option.id)} className="p-1 text-fresco-black hover:bg-fresco-light-gray rounded transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {option.pros.map((pro, i) => (
                        <div key={i} className="flex items-center gap-2 group">
                          <Check className="w-3 h-3 text-fresco-black flex-shrink-0" />
                          <input
                            type="text"
                            value={pro}
                            onChange={(e) => updatePro(option.id, i, e.target.value)}
                            placeholder="Add a pro..."
                            className="flex-1 text-fresco-sm text-fresco-graphite-soft bg-transparent border-none focus:outline-none"
                          />
                          {option.pros.length > 1 && (
                            <button onClick={() => removePro(option.id, i)} className="opacity-0 group-hover:opacity-100 p-1 text-fresco-graphite-light hover:text-fresco-graphite transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-fresco-xs font-medium text-fresco-graphite uppercase tracking-wider">Cons</span>
                      <button onClick={() => addCon(option.id)} className="p-1 text-fresco-graphite hover:bg-fresco-light-gray rounded transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {option.cons.map((con, i) => (
                        <div key={i} className="flex items-center gap-2 group">
                          <AlertTriangle className="w-3 h-3 text-fresco-graphite flex-shrink-0" />
                          <input
                            type="text"
                            value={con}
                            onChange={(e) => updateCon(option.id, i, e.target.value)}
                            placeholder="Add a con..."
                            className="flex-1 text-fresco-sm text-fresco-graphite-soft bg-transparent border-none focus:outline-none"
                          />
                          {option.cons.length > 1 && (
                            <button onClick={() => removeCon(option.id, i)} className="opacity-0 group-hover:opacity-100 p-1 text-fresco-graphite-light hover:text-fresco-graphite transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="mb-8">
            <label className="fresco-label block mb-2">Your Recommendation</label>
            <textarea
              value={recommendation}
              onChange={(e) => handleRecommendationChange(e.target.value)}
              placeholder="Based on your analysis, what strategic direction do you recommend and why?"
              className="w-full p-4 bg-fresco-light-gray rounded-xl text-fresco-base border-none focus:ring-2 focus:ring-fresco-black outline-none resize-none"
              rows={4}
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
          
                {recommendedOption && (
                  <div className="mb-6 p-4 bg-fresco-light-gray border border-fresco-black rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-fresco-black fill-current" />
                      <span className="text-fresco-xs font-medium text-fresco-black uppercase tracking-wider">Recommended</span>
                    </div>
                    <p className="text-fresco-base font-medium text-fresco-black">{recommendedOption.name}</p>
                  </div>
                )}
          
                <div className="mb-8">
                  <span className="fresco-label block mb-4">Strategic Analysis</span>
                  {aiContent.insights.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-fresco-border rounded-xl">
                      <Map className="w-8 h-8 text-fresco-graphite-light mx-auto mb-3" />
                      <p className="text-fresco-sm text-fresco-graphite-light">Define your options<br/>then analyse</p>
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
                      toolkitName="Strategy Sketchbook"
                      isLocked={session?.sentenceOfTruth?.isLocked}
                      onLockToggle={() => toggleSentenceLock(sessionId)}
                      onEdit={(val) => setSentenceOfTruth(sessionId, val)}
                    />
                  </div>
                ) : (
                  <div className="mb-8">
                    <span className="fresco-label block mb-4">Strategic Direction</span>
                    <div className="p-6 bg-fresco-light-gray rounded-xl text-center">
                      <p className="text-fresco-sm text-fresco-graphite-light">Generate to reveal your strategic direction</p>
                    </div>
                  </div>
                )}
          
                {aiContent.necessaryMoves.length > 0 && (
                  <div className="mb-8">
                    <span className="fresco-label block mb-4">Next Moves</span>
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
                    Export Strategy
                  </button>
                </div>
          
                {/* Next Toolkit CTA */}
                <NextToolkitCTA 
                  currentToolkit="strategy_sketchbook"
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
          toolkitType: 'strategy_sketchbook',
          toolkitName: toolkit.name,
          workspaceTitle: workspace?.title || 'Untitled',
          thinkingLens: session?.thinkingLens || 'automatic',
          date: new Date().toLocaleDateString(),
          steps: [
            { label: 'Strategic Question', content: strategicQuestion },
            { label: 'Options', content: options.map(o => `${o.name}${o.isRecommended ? ' ⭐' : ''}: ${o.description}`).join('\n\n') },
            { label: 'Recommendation', content: recommendation },
          ],
          insights: aiContent.insights,
          sentenceOfTruth: aiContent.sentenceOfTruth,
          necessaryMoves: aiContent.necessaryMoves,
          customData: {
            'Strategic Options': options.map(o => ({
              name: o.name,
              description: o.description,
              pros: o.pros.filter(p => p).join(', '),
              cons: o.cons.filter(c => c).join(', '),
              recommended: o.isRecommended ? 'Yes' : 'No'
            }))
          }
        }}
      />
    </div>
  );
}
