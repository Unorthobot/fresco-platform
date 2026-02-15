'use client';

// FRESCO Experiment Brief™ - Structured Hypothesis Testing
// Hypothesis cards with confidence sliders and structured brief output

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
  FlaskConical,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import { cn, debounce, formatRelativeTime } from '@/lib/utils';
import { useFrescoStore } from '@/lib/store';
import { TOOLKITS, type ThinkingModeId } from '@/types';
import { ThinkingLensSelector } from '@/components/ui/ThinkingLensSelector';
import { ThinkingLensHint } from '@/components/ui/ThinkingLensHint';
import { ExportModal } from '@/components/ui/ExportModal';
import { ProgressRing } from '@/components/ui/VisualOutputs';
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

interface ExperimentBriefSessionProps {
  sessionId: string;
  workspaceId: string;
  onBack?: () => void;
  onStartToolkit?: (toolkitType: string) => void;
}

interface Risk {
  id: string;
  content: string;
  severity: 'low' | 'medium' | 'high';
}

export function ExperimentBriefSession({ sessionId, workspaceId, onBack, onStartToolkit }: ExperimentBriefSessionProps) {
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
  const toolkit = TOOLKITS.experiment_brief;
  
  const [hypothesis, setHypothesis] = useState('');
  const [confidence, setConfidence] = useState(50);
  const [testDesign, setTestDesign] = useState('');
  const [successLooksLike, setSuccessLooksLike] = useState('');
  const [failureLooksLike, setFailureLooksLike] = useState('');
  const [risks, setRisks] = useState<Risk[]>([]);
  const [assumptions, setAssumptions] = useState('');
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
          setHypothesis(parsed.hypothesis || '');
          setConfidence(parsed.confidence || 50);
        } catch {
          setHypothesis(step1.content);
        }
      }
      if (step2?.content) setTestDesign(step2.content);
      if (step3?.content) {
        try {
          const parsed = JSON.parse(step3.content);
          setSuccessLooksLike(parsed.success || '');
          setFailureLooksLike(parsed.failure || '');
        } catch {
          setSuccessLooksLike(step3.content);
        }
      }
      if (step4?.content) {
        try {
          const parsed = JSON.parse(step4.content);
          setRisks(parsed.risks || []);
          setAssumptions(parsed.assumptions || '');
        } catch {
          setAssumptions(step4.content);
        }
      }
    }
  }, [session?.id]);

  // Restore saved AI outputs
  useEffect(() => {
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

  const saveHypothesis = (hyp: string, conf: number) => {
    debouncedSave(1, JSON.stringify({ hypothesis: hyp, confidence: conf }));
  };

  const handleHypothesisChange = (value: string) => {
    setHypothesis(value);
    saveHypothesis(value, confidence);
  };

  const handleConfidenceChange = (value: number) => {
    setConfidence(value);
    saveHypothesis(hypothesis, value);
  };

  const handleTestDesignChange = (value: string) => {
    setTestDesign(value);
    debouncedSave(2, value);
  };

  const saveCriteria = () => {
    debouncedSave(3, JSON.stringify({ success: successLooksLike, failure: failureLooksLike }));
  };

  const handleSuccessChange = (value: string) => {
    setSuccessLooksLike(value);
    saveCriteria();
  };

  const handleFailureChange = (value: string) => {
    setFailureLooksLike(value);
    saveCriteria();
  };

  const saveRisksAndAssumptions = (newRisks: Risk[], newAssumptions: string) => {
    debouncedSave(4, JSON.stringify({ risks: newRisks, assumptions: newAssumptions }));
  };

  const handleRisksChange = (newRisks: Risk[]) => {
    setRisks(newRisks);
    saveRisksAndAssumptions(newRisks, assumptions);
  };

  const handleAssumptionsChange = (value: string) => {
    setAssumptions(value);
    saveRisksAndAssumptions(risks, value);
  };

  const addRisk = () => {
    const newRisk: Risk = { id: `risk-${Date.now()}`, content: '', severity: 'medium' };
    handleRisksChange([...risks, newRisk]);
  };

  const updateRisk = (id: string, updates: Partial<Risk>) => {
    const updated = risks.map(r => r.id === id ? { ...r, ...updates } : r);
    handleRisksChange(updated);
  };

  const removeRisk = (id: string) => {
    handleRisksChange(risks.filter(r => r.id !== id));
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
      const risksText = risks.map(r => `[${r.severity.toUpperCase()}] ${r.content}`).join('\n');
      const workspaceContext = getWorkspaceContext();
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolkitType: 'experiment_brief',
          toolkitName: toolkit.name,
          steps: [
            { label: 'HYPOTHESIS', content: `${hypothesis} (Confidence: ${confidence}%)` },
            { label: 'TEST DESIGN', content: testDesign },
            { label: 'SUCCESS CRITERIA', content: `Success: ${successLooksLike}\nFailure: ${failureLooksLike}` },
            { label: 'RISKS & ASSUMPTIONS', content: `Risks:\n${risksText}\n\nAssumptions:\n${assumptions}` },
          ],
          thinkingLens: session?.thinkingLens || 'automatic',
          outputLabels: { primary: 'Experiment Design', secondary: 'Core Hypothesis', action: 'Test Plan' },
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

  const getConfidenceColor = () => {
    if (confidence >= 70) return 'text-fresco-black';
    if (confidence >= 40) return 'text-fresco-graphite';
    return 'text-fresco-graphite-light';
  };

  const getConfidenceBg = () => {
    if (confidence >= 70) return 'bg-fresco-black';
    if (confidence >= 40) return 'bg-fresco-graphite';
    return 'bg-fresco-graphite-light';
  };

  const hasContent = hypothesis.trim().length > 0;
  const completedSections = [
    hypothesis.trim().length > 20,
    testDesign.trim().length > 20,
    successLooksLike.trim().length > 10 || failureLooksLike.trim().length > 10,
    risks.length > 0 || assumptions.trim().length > 10
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
        label="Design Experiment"
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
                <FlaskConical className="w-5 h-5 text-white" />
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
                  { label: 'Hypothesis', isComplete: hypothesis.trim().length > 20, isActive: true },
                  { label: 'Test Design', isComplete: testDesign.trim().length > 20, isActive: false },
                  { label: 'Success Criteria', isComplete: successLooksLike.trim().length > 10, isActive: false },
                  { label: 'Risks', isComplete: risks.length > 0 || assumptions.trim().length > 10, isActive: false }
                ]}
              />
            </div>
          </div>
          
          {/* Hypothesis Card */}
          <div className="mb-8 p-6 bg-fresco-light-gray rounded-2xl border-2 border-fresco-border">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-fresco-graphite" />
              <span className="text-fresco-sm font-medium text-fresco-black">Hypothesis</span>
            </div>
            
            <textarea
              value={hypothesis}
              onChange={(e) => handleHypothesisChange(e.target.value)}
              placeholder="We believe that [X] because [Y]. If we [do Z], we expect [outcome]."
              className="w-full p-4 bg-white dark:bg-gray-900 rounded-xl text-fresco-lg border border-fresco-border dark:border-gray-700 focus:ring-2 focus:ring-fresco-black focus:border-fresco-black outline-none resize-none mb-4"
              rows={3}
            />
            <InputQualityIndicator value={hypothesis} minLength={20} goodLength={80} />
            {TOOLKIT_EXAMPLES.experiment_brief?.hypothesis && (
              <ContextualExample
                stepLabel="Hypothesis"
                example={TOOLKIT_EXAMPLES.experiment_brief.hypothesis.example}
                tip={TOOLKIT_EXAMPLES.experiment_brief.hypothesis.tip}
              />
            )}
            
            {/* Confidence Slider */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-fresco-sm text-fresco-graphite-mid">Current Confidence Level</span>
                <span className="text-fresco-2xl font-bold text-fresco-black">{confidence}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={confidence}
                onChange={(e) => handleConfidenceChange(parseInt(e.target.value))}
                className="w-full h-3 bg-fresco-light-gray rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #1a1a1a 0%, #1a1a1a ${confidence}%, #e5e7eb ${confidence}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between text-fresco-xs text-fresco-graphite-light mt-2">
                <span>Low confidence</span>
                <span>Medium</span>
                <span>High confidence</span>
              </div>
            </div>
          </div>
          
          {/* Test Design */}
          <div className="mb-8">
            <label className="fresco-label block mb-2">Test Design</label>
            <p className="text-fresco-sm text-fresco-graphite-light mb-3">How will you test this hypothesis? What is the minimal experiment?</p>
            <textarea
              value={testDesign}
              onChange={(e) => handleTestDesignChange(e.target.value)}
              placeholder="To test this, we will..."
              className="w-full p-4 bg-fresco-light-gray rounded-xl text-fresco-base border-none focus:ring-2 focus:ring-fresco-black outline-none resize-none"
              rows={4}
            />
          </div>
          
          {/* Success Criteria */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="p-5 bg-fresco-light-gray rounded-xl border border-fresco-border">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-fresco-graphite" />
                <span className="text-fresco-sm font-medium text-fresco-black">Success Looks Like</span>
              </div>
              <textarea
                value={successLooksLike}
                onChange={(e) => handleSuccessChange(e.target.value)}
                placeholder="The hypothesis is validated when..."
                className="w-full p-3 bg-white dark:bg-gray-900 rounded-lg text-fresco-sm border border-fresco-border dark:border-gray-700 focus:ring-2 focus:ring-fresco-black focus:border-fresco-black outline-none resize-none"
                rows={4}
              />
            </div>
            
            <div className="p-5 bg-fresco-light-gray rounded-xl border border-fresco-border">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-fresco-graphite" />
                <span className="text-fresco-sm font-medium text-fresco-black">Failure Looks Like</span>
              </div>
              <textarea
                value={failureLooksLike}
                onChange={(e) => handleFailureChange(e.target.value)}
                placeholder="The hypothesis is invalidated when..."
                className="w-full p-3 bg-white dark:bg-gray-900 rounded-lg text-fresco-sm border border-fresco-border dark:border-gray-700 focus:ring-2 focus:ring-fresco-black focus:border-fresco-black outline-none resize-none"
                rows={4}
              />
            </div>
          </div>
          
          {/* Risks */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-fresco-lg font-medium text-fresco-black">Risks</h3>
                <p className="text-fresco-sm text-fresco-graphite-light">What could invalidate this experiment?</p>
              </div>
              <button onClick={addRisk} className="flex items-center gap-2 px-4 py-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black border border-fresco-border rounded-lg hover:border-fresco-black transition-colors">
                <Plus className="w-4 h-4" /> Add Risk
              </button>
            </div>
            
            <div className="space-y-3">
              {risks.map((risk) => (
                <motion.div
                  key={risk.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-fresco-light-gray rounded-xl group"
                >
                  <select
                    value={risk.severity}
                    onChange={(e) => updateRisk(risk.id, { severity: e.target.value as Risk['severity'] })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-fresco-xs font-medium border-none focus:outline-none cursor-pointer",
                      risk.severity === 'high' ? "bg-fresco-black/10 text-fresco-black" :
                      risk.severity === 'medium' ? "bg-fresco-graphite/10 text-fresco-graphite" :
                      "bg-fresco-light-gray text-fresco-graphite-mid"
                    )}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <input
                    type="text"
                    value={risk.content}
                    onChange={(e) => updateRisk(risk.id, { content: e.target.value })}
                    placeholder="Describe the risk..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-fresco-sm text-fresco-graphite-soft"
                  />
                  <button onClick={() => removeRisk(risk.id)} className="opacity-0 group-hover:opacity-100 p-1 text-fresco-graphite-light hover:text-red-500 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Assumptions */}
          <div className="mb-8">
            <label className="fresco-label block mb-2">Assumptions</label>
            <textarea
              value={assumptions}
              onChange={(e) => handleAssumptionsChange(e.target.value)}
              placeholder="What are you assuming to be true for this experiment to be valid?"
              className="w-full p-4 bg-fresco-light-gray rounded-xl text-fresco-base border-none focus:ring-2 focus:ring-fresco-black outline-none resize-none"
              rows={3}
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
          
                {/* Confidence Gauge */}
                <div className="mb-6 p-4 bg-fresco-light-gray rounded-xl text-center">
                  <div className={cn("text-fresco-4xl font-bold", getConfidenceColor())}>{confidence}%</div>
                  <div className="text-fresco-xs text-fresco-graphite-light">Confidence Level</div>
                </div>
          
                {/* Experiment Design */}
                <div className="mb-8">
                  <span className="fresco-label block mb-4">Experiment Design</span>
                  {aiContent.insights.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-fresco-border rounded-xl">
                      <FlaskConical className="w-8 h-8 text-fresco-graphite-light mx-auto mb-3" />
                      <p className="text-fresco-sm text-fresco-graphite-light">Define your hypothesis<br/>then generate brief</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiContent.insights.map((insight, i) => (
                        <InsightCard key={i} insight={insight} index={i} isNew={true} />
                      ))}
                    </div>
                  )}
                </div>
          
                {/* Core Hypothesis - Enhanced Display */}
                {aiContent.sentenceOfTruth ? (
                  <div className="mb-8">
                    <SentenceOfTruthDisplay
                      sentence={aiContent.sentenceOfTruth}
                      toolkitName="Experiment Brief"
                      isLocked={session?.sentenceOfTruth?.isLocked}
                      onLockToggle={() => toggleSentenceLock(sessionId)}
                      onEdit={(val) => setSentenceOfTruth(sessionId, val)}
                    />
                  </div>
                ) : (
                  <div className="mb-8">
                    <span className="fresco-label block mb-4">Core Hypothesis</span>
                    <div className="p-6 bg-fresco-light-gray rounded-xl text-center">
                      <p className="text-fresco-sm text-fresco-graphite-light">Generate to crystallise your hypothesis</p>
                    </div>
                  </div>
                )}
          
                {/* Test Plan */}
                {aiContent.necessaryMoves.length > 0 && (
                  <div className="mb-8">
                    <span className="fresco-label block mb-4">Test Plan</span>
                    <div className="space-y-2">
                      {aiContent.necessaryMoves.map((move, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 p-3 bg-fresco-light-gray rounded-lg">
                          <div className="w-6 h-6 rounded-full bg-fresco-black text-white flex items-center justify-center flex-shrink-0 text-fresco-xs font-medium">
                            {i + 1}
                          </div>
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
                    Export Brief
                  </button>
                </div>
          
                {/* Next Toolkit CTA */}
                <NextToolkitCTA 
                  currentToolkit="experiment_brief"
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
          toolkitType: 'experiment_brief',
          toolkitName: toolkit.name,
          workspaceTitle: workspace?.title || 'Untitled',
          thinkingLens: session?.thinkingLens || 'automatic',
          date: new Date().toLocaleDateString(),
          steps: [
            { label: 'Hypothesis', content: hypothesis },
            { label: 'Confidence Level', content: `${confidence}%` },
            { label: 'Test Design', content: testDesign },
            { label: 'Success Looks Like', content: successLooksLike },
            { label: 'Failure Looks Like', content: failureLooksLike },
            { label: 'Risks', content: risks.map(r => `[${r.severity.toUpperCase()}] ${r.content}`).join('\n') },
            { label: 'Assumptions', content: assumptions },
          ],
          insights: aiContent.insights,
          sentenceOfTruth: aiContent.sentenceOfTruth,
          necessaryMoves: aiContent.necessaryMoves,
          customData: {
            'Confidence': `${confidence}%`,
            'Risks': risks.map(r => ({ severity: r.severity, content: r.content })),
          }
        }}
      />
    </div>
  );
}
