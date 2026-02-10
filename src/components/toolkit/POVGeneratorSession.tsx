'use client';

// FRESCO POV Generator™ - Live POV Statement Builder
// Combines User + Need + Truth into a formatted statement in real-time
// Enhanced UX: Floating generate, progress indicator, wizard mode, celebrations

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Download, 
  Sparkles,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  X,
  Target,
  User,
  Heart,
  Lightbulb,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn, debounce, formatRelativeTime } from '@/lib/utils';
import { useFrescoStore } from '@/lib/store';
import { TOOLKITS, type ThinkingModeId } from '@/types';
import { ThinkingLensSelector } from '@/components/ui/ThinkingLensSelector';
import { ThinkingLensHint } from '@/components/ui/ThinkingLensHint';
import { ExportModal } from '@/components/ui/ExportModal';
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

interface POVGeneratorSessionProps {
  sessionId: string;
  workspaceId: string;
  onBack?: () => void;
  onStartToolkit?: (toolkitType: string) => void;
}

export function POVGeneratorSession({ sessionId, workspaceId, onBack, onStartToolkit }: POVGeneratorSessionProps) {
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
  const toolkit = TOOLKITS.pov_generator;
  
  const [stepResponses, setStepResponses] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiContent, setAiContent] = useState<{ insights: string[]; sentenceOfTruth: string; necessaryMoves: string[] }>({ insights: [], sentenceOfTruth: '', necessaryMoves: [] });
  const [showExportModal, setShowExportModal] = useState(false);
  const [copiedPOV, setCopiedPOV] = useState(false);
  
  // New UX state
  const [isWizardMode, setIsWizardMode] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isOutputPanelExpanded, setIsOutputPanelExpanded] = useState(false);
  
  // Initialize from session - including saved AI outputs
  useEffect(() => {
    if (session?.steps) {
      const responses: Record<number, string> = {};
      session.steps.forEach((step) => { 
        responses[step.stepNumber] = step.content;
      });
      setStepResponses(responses);
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

  const handleStepChange = (stepNumber: number, value: string) => {
    setStepResponses((prev) => ({ ...prev, [stepNumber]: value }));
    debouncedSave(stepNumber, value);
  };

  const handleLensChange = (lens: ThinkingModeId) => {
    setSessionLens(sessionId, lens);
  };

  // Generate POV statement from components
  const generatePOVStatement = () => {
    const user = stepResponses[1]?.trim() || '[User]';
    const need = stepResponses[2]?.trim() || '[Need]';
    const truth = stepResponses[3]?.trim() || '[Truth]';
    const consequence = stepResponses[4]?.trim() || '[Consequence]';
    
    if (!stepResponses[1] && !stepResponses[2] && !stepResponses[3]) {
      return null;
    }
    
    return `${user} needs ${need.toLowerCase().startsWith('to ') ? need : `to ${need.toLowerCase()}`} because ${truth.toLowerCase()}. Therefore, ${consequence.toLowerCase()}.`;
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
      const workspaceContext = getWorkspaceContext();
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolkitType: 'pov_generator',
          toolkitName: toolkit.name,
          steps: toolkit.steps.map(step => ({
            label: step.label,
            content: stepResponses[step.stepNumber] || ''
          })),
          thinkingLens: session?.thinkingLens || 'automatic',
          outputLabels: { primary: 'POV Synthesis', secondary: 'Core POV Statement', action: 'Strategic Implications' },
          workspaceContext,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setAiContent(data);
        saveAIOutputs(sessionId, data);
        
        // Trigger celebration and expand output panel
        setShowCelebration(true);
        setIsOutputPanelExpanded(true);
      }
    } catch (e) { console.error('Failed to generate:', e); showToast('Failed to generate. Please try again.', 'error'); }
    setIsGenerating(false);
  };

  // Check if step is complete
  const isStepComplete = (stepNum: number) => (stepResponses[stepNum]?.trim().length || 0) > 15;
  const completedStepsCount = toolkit.steps.filter(s => isStepComplete(s.stepNumber)).length;

  const copyPOV = async () => {
    const pov = generatePOVStatement();
    if (pov) {
      await navigator.clipboard.writeText(pov);
      setCopiedPOV(true);
      setTimeout(() => setCopiedPOV(false), 2000);
    }
  };

  const povStatement = generatePOVStatement();
  const hasContent = Object.values(stepResponses).some(v => v && v.trim().length > 10);
  
  if (!session) return <div className="flex items-center justify-center h-96"><p className="text-fresco-graphite-light">Session not found</p></div>;

  const stepIcons = [User, Heart, Lightbulb, ArrowRight];
  const stepColors = ['bg-fresco-black', 'bg-fresco-graphite', 'bg-fresco-graphite-mid', 'bg-fresco-graphite-light'];

  return (
    <div className="flex h-full bg-fresco-white">
      {/* Generation Success Celebration */}
      <GenerationSuccess 
        show={showCelebration} 
        onComplete={() => setShowCelebration(false)}
        insightCount={aiContent.insights.length}
        hasTruth={!!aiContent.sentenceOfTruth}
        actionCount={aiContent.necessaryMoves.length}
      />
      
      {/* Floating Generate Button */}
      <FloatingGenerateButton
        isVisible={completedStepsCount >= 3 && !aiContent.sentenceOfTruth && !isGenerating}
        isGenerating={isGenerating}
        onClick={generateContent}
        label="Synthesise & Strengthen"
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
              <div className="flex items-center gap-3">
                <WizardModeControls
                  isWizardMode={isWizardMode}
                  onToggle={() => setIsWizardMode(!isWizardMode)}
                  currentStep={activeStep}
                  totalSteps={toolkit.steps.length}
                  onPrevious={() => setActiveStep(Math.max(1, activeStep - 1))}
                  onNext={() => setActiveStep(Math.min(toolkit.steps.length, activeStep + 1))}
                  canGoNext={isStepComplete(activeStep)}
                />
                <ThinkingLensSelector value={session.thinkingLens} onChange={handleLensChange} recommendedModes={toolkit.primaryModes} />
              </div>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-fresco-black flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
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
                steps={toolkit.steps.map(step => ({
                  label: step.label,
                  isComplete: isStepComplete(step.stepNumber),
                  isActive: activeStep === step.stepNumber
                }))}
              />
            </div>
          </div>
          
          {/* Live POV Preview */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 p-6 bg-gradient-to-br from-fresco-black to-fresco-graphite rounded-2xl text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-fresco-xs uppercase tracking-wider text-white/60">
                    {aiContent.sentenceOfTruth ? 'Refined POV Statement' : 'Live POV Statement'}
                  </span>
                  {aiContent.sentenceOfTruth && (
                    <span className="px-2 py-0.5 bg-white/20 text-white/70 text-fresco-xs rounded-full uppercase tracking-wider">AI Enhanced</span>
                  )}
                </div>
                {(povStatement || aiContent.sentenceOfTruth) && (
                  <button 
                    onClick={async () => {
                      const textToCopy = aiContent.sentenceOfTruth || povStatement || '';
                      await navigator.clipboard.writeText(textToCopy);
                      setCopiedPOV(true);
                      setTimeout(() => setCopiedPOV(false), 2000);
                    }} 
                    className="flex items-center gap-2 text-fresco-sm text-white/80 hover:text-white transition-colors"
                  >
                    {copiedPOV ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedPOV ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
              
              {aiContent.sentenceOfTruth ? (
                // Show AI-refined POV statement
                <p className="text-fresco-xl leading-relaxed font-light">
                  {aiContent.sentenceOfTruth}
                </p>
              ) : povStatement ? (
                // Show live template-based version
                <p className="text-fresco-xl leading-relaxed font-light">
                  <span className="text-white/70">{stepResponses[1] || '[User]'}</span>
                  {' needs '}
                  <span className="text-white/70">{stepResponses[2] ? (stepResponses[2].toLowerCase().startsWith('to ') ? stepResponses[2] : `to ${stepResponses[2].toLowerCase()}`) : '[need]'}</span>
                  {' because '}
                  <span className="text-white/70">{stepResponses[3]?.toLowerCase() || '[truth]'}</span>
                  {stepResponses[4] && (
                    <>
                      {'. Therefore, '}
                      <span className="text-white/70">{stepResponses[4].toLowerCase()}</span>
                      {'.'}
                    </>
                  )}
                </p>
              ) : (
                <p className="text-fresco-lg text-white/40 italic">Fill in the components below to see your POV statement...</p>
              )}
              
              {/* Hint to synthesize */}
              {povStatement && !aiContent.sentenceOfTruth && (
                <p className="mt-4 text-fresco-xs text-white/50 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  Use the floating button to synthesise and strengthen your POV
                </p>
              )}
            </div>
          </motion.div>
          
          {/* POV Components Grid */}
          <div className="grid grid-cols-2 gap-6">
            {toolkit.steps
              .filter(step => !isWizardMode || activeStep === step.stepNumber)
              .map((step, index) => {
              const Icon = stepIcons[step.stepNumber - 1];
              const colorClass = stepColors[step.stepNumber - 1];
              const isComplete = isStepComplete(step.stepNumber);
              
              return (
                <motion.div 
                  key={step.stepNumber}
                  initial={isWizardMode ? { opacity: 0, x: 50 } : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={isWizardMode ? { opacity: 0, x: -50 } : { opacity: 0, y: -20 }}
                  transition={{ delay: isWizardMode ? 0 : index * 0.1 }}
                  className={cn(
                    "bg-white dark:bg-gray-900 rounded-2xl border-2 p-6 transition-colors",
                    isComplete ? "border-fresco-border bg-fresco-light-gray/50" : "border-fresco-border hover:border-fresco-graphite-light"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isComplete ? "bg-fresco-black" : colorClass)}>
                        {isComplete ? <Check className="w-5 h-5 text-white" /> : <Icon className="w-5 h-5 text-white" />}
                      </div>
                      <div>
                        <div className="text-fresco-xs uppercase tracking-wider text-fresco-graphite-light">Step {step.stepNumber}</div>
                        <div className="text-fresco-lg font-medium text-fresco-black">{step.label}</div>
                      </div>
                    </div>
                    {isComplete && (
                      <span className="px-2 py-1 bg-fresco-light-gray text-fresco-black text-fresco-xs font-medium rounded-full">Complete</span>
                    )}
                  </div>
                  
                  <DynamicPrompt 
                    basePrompt={step.prompt}
                    lensHint={step.lensHints[session?.thinkingLens || 'automatic']}
                    lens={session?.thinkingLens || 'automatic'}
                  />
                  
                  <textarea
                    value={stepResponses[step.stepNumber] || ''}
                    onChange={(e) => handleStepChange(step.stepNumber, e.target.value)}
                    placeholder={step.placeholder}
                    className={cn(
                      "w-full p-4 rounded-xl text-fresco-base border-2 focus:ring-0 outline-none resize-none transition-colors",
                      isComplete
                        ? "bg-white dark:bg-gray-900 border-fresco-border dark:border-gray-700 focus:border-fresco-black"
                        : "bg-fresco-light-gray border-transparent focus:border-fresco-black"
                    )}
                    rows={4}
                  />
                  
                  {/* Input Quality Indicator */}
                  <InputQualityIndicator value={stepResponses[step.stepNumber] || ''} minLength={15} goodLength={60} />
                  
                  {/* Smart Prompt */}
                  <SmartPrompt value={stepResponses[step.stepNumber] || ''} minLength={15} goodLength={60} />
                  
                  {/* Contextual Example */}
                  {TOOLKIT_EXAMPLES.pov_generator[step.stepNumber as keyof typeof TOOLKIT_EXAMPLES.pov_generator] && (
                    <ContextualExample
                      stepLabel={step.label}
                      example={TOOLKIT_EXAMPLES.pov_generator[step.stepNumber as keyof typeof TOOLKIT_EXAMPLES.pov_generator].example}
                      tip={TOOLKIT_EXAMPLES.pov_generator[step.stepNumber as keyof typeof TOOLKIT_EXAMPLES.pov_generator].tip}
                    />
                  )}
                  
                  {session.thinkingLens !== 'automatic' && step.lensHints[session.thinkingLens] && (
                    <p className="mt-3 text-fresco-xs text-fresco-graphite-light italic flex items-start gap-2">
                      <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      {step.lensHints[session.thinkingLens]}
                    </p>
                  )}
                  
                  {/* Continue button in wizard mode */}
                  {isWizardMode && isComplete && step.stepNumber < toolkit.steps.length && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setActiveStep(step.stepNumber + 1)}
                      className="fresco-btn fresco-btn-primary fresco-btn-sm mt-4"
                    >
                      Continue to {toolkit.steps[step.stepNumber]?.label} <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
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
                    <button 
                      onClick={() => setIsOutputPanelExpanded(false)}
                      className="p-1.5 text-fresco-graphite-light hover:text-fresco-black rounded transition-colors"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>
          
                {/* POV Synthesis */}
                <div className="mb-8">
                  <span className="fresco-label block mb-4">POV Synthesis</span>
                  {aiContent.insights.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-fresco-border rounded-xl">
                      <Target className="w-8 h-8 text-fresco-graphite-light mx-auto mb-3" />
                      <p className="text-fresco-sm text-fresco-graphite-light">Fill in your POV components<br/>then synthesise</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiContent.insights.map((insight, i) => (
                        <InsightCard
                          key={i}
                          insight={insight}
                          index={i}
                          isNew={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
          
                {/* Core POV Statement - Enhanced Display */}
                {aiContent.sentenceOfTruth ? (
                  <div className="mb-8">
                    <SentenceOfTruthDisplay
                      sentence={aiContent.sentenceOfTruth}
                      toolkitName={toolkit.name}
                      isLocked={session?.sentenceOfTruth?.isLocked}
                      onLockToggle={() => toggleSentenceLock(sessionId)}
                      onEdit={(val) => setSentenceOfTruth(sessionId, val)}
                    />
                  </div>
                ) : (
                  <div className="mb-8">
                    <span className="fresco-label block mb-4">Core POV Statement</span>
                    <div className="p-6 bg-fresco-light-gray rounded-xl text-center">
                      <p className="text-fresco-sm text-fresco-graphite-light">Generate to discover your POV</p>
                    </div>
                  </div>
                )}
          
                {/* Strategic Implications */}
                {aiContent.necessaryMoves.length > 0 && (
                  <div className="mb-8">
                    <span className="fresco-label block mb-4">Strategic Implications</span>
                    <div className="space-y-2">
                      {aiContent.necessaryMoves.map((move, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-start gap-3 p-3 bg-fresco-light-gray rounded-lg"
                        >
                          <ArrowRight className="w-4 h-4 text-fresco-graphite-mid flex-shrink-0 mt-0.5" />
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
                    Export POV
                  </button>
                </div>
          
                {/* Next Toolkit CTA */}
                <NextToolkitCTA 
                  currentToolkit="pov_generator"
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
          toolkitType: 'pov_generator',
          toolkitName: toolkit.name,
          workspaceTitle: workspace?.title || 'Untitled',
          thinkingLens: session?.thinkingLens || 'automatic',
          date: new Date().toLocaleDateString(),
          steps: toolkit.steps.map((step) => ({
            label: step.label,
            content: stepResponses[step.stepNumber] || ''
          })),
          insights: aiContent.insights,
          sentenceOfTruth: aiContent.sentenceOfTruth || povStatement,
          necessaryMoves: aiContent.necessaryMoves,
        }}
      />
    </div>
  );
}
