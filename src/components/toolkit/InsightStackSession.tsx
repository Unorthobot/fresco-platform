'use client';

// FRESCO Insight Stack™ - Progressive Reveal with Stacking Metaphor
// Features: Voice recording (Web Speech API), file/image upload, TTS for outputs, next toolkit CTA
// Enhanced UX: Floating generate, progress indicator, wizard mode, celebrations

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Download, 
  Plus, 
  Trash2, 
  Sparkles,
  Loader2,
  RefreshCw,
  X,
  Mic,
  MicOff,
  Upload,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Layers,
  Volume2,
  VolumeX,
  Image,
  FileText,
  ArrowRight,
  Lightbulb,
  Eye,
  EyeOff,
  Share2,
  Zap
} from 'lucide-react';
import { cn, debounce, formatRelativeTime } from '@/lib/utils';
import { useFrescoStore } from '@/lib/store';
import { TOOLKITS, type ThinkingModeId } from '@/types';
import { ThinkingLensSelector } from '@/components/ui/ThinkingLensSelector';
import { SentenceOfTruth } from '@/components/ui/SentenceOfTruth';
import { ExportModal } from '@/components/ui/ExportModal';
import { NextToolkitCTA } from '@/components/ui/NextToolkitCTA';
import { useToast } from '@/components/ui/Toast';
import { StaggeredList } from '@/components/ui/TypewriterText';
import { SentenceOfTruthDisplay } from '@/components/ui/SentenceOfTruthDisplay';
import { InsightCard, InsightsEmptyState } from '@/components/ui/InsightCard';
import { MilestoneCelebration, useMilestones } from '@/components/ui/MilestoneCelebration';
import { ContextualTip, ProgressEncouragement } from '@/components/ui/ContextualTips';
import { ShareableInsightModal } from '@/components/ui/ShareableInsight';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { GenerationSuccess } from '@/components/ui/GenerationSuccess';
import { 
  LensSuggestBadge, 
  WhatIfPrompt,
  DeepDiveModal,
  LensSpecificOutput,
  suggestLens
} from '@/components/ui/LensFeatures';
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
import { TOOLKIT_EXAMPLES } from '@/lib/examples';

interface InsightStackSessionProps {
  sessionId: string;
  workspaceId: string;
  onBack?: () => void;
  onStartToolkit?: (toolkitType: string) => void;
}

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function InsightStackSession({ sessionId, workspaceId, onBack, onStartToolkit }: InsightStackSessionProps) {
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
  
  // Toast notifications
  const { showToast } = useToast();
  
  const session = sessions.find((s) => s.id === sessionId);
  const workspace = workspaces.find((w) => w.id === workspaceId);
  const toolkit = TOOLKITS.insight_stack;
  
  const [stepResponses, setStepResponses] = useState<Record<number, string>>({});
  const [stepFiles, setStepFiles] = useState<Record<number, { name: string; type: string; preview?: string }[]>>({});
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualInsights, setManualInsights] = useState<string[]>([]);
  const [manualSentence, setManualSentence] = useState('');
  const [aiContent, setAiContent] = useState<{ 
    insights: string[]; 
    sentenceOfTruth: string; 
    necessaryMoves: string[];
    // Lens-specific outputs
    systemsDiagram?: { nodes: string[]; connections: Array<{ from: string; to: string; label?: string }> } | null;
    futuresScenarios?: { optimistic: string; pessimistic: string; mostLikely: string } | null;
    ethicalMatrix?: { stakeholders: Array<{ name: string; impact: 'positive' | 'negative' | 'neutral'; notes: string }> } | null;
    firstPrinciplesList?: string[] | null;
    narrativeArc?: { setup: string; conflict: string; resolution: string } | null;
  }>({ insights: [], sentenceOfTruth: '', necessaryMoves: [] });
  const [showExportModal, setShowExportModal] = useState(false);
  const [isRecording, setIsRecording] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Lens suggestion state
  const [lensSuggestion, setLensSuggestion] = useState<{ lens: ThinkingModeId; confidence: 'high' | 'medium' | 'low'; reason: string } | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  
  // Deep dive state
  const [deepDiveInsight, setDeepDiveInsight] = useState<string | null>(null);
  const [showDeepDive, setShowDeepDive] = useState(false);
  
  // New UX state
  const [isWizardMode, setIsWizardMode] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isOutputPanelExpanded, setIsOutputPanelExpanded] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFileStepRef = useRef<number>(1);
  
  // Initialize from session - including saved AI outputs
  useEffect(() => {
    if (session?.steps) {
      const responses: Record<number, string> = {};
      const completed = new Set<number>();
      session.steps.forEach((step) => { 
        const content = step.content || step.response || '';
        responses[step.stepNumber] = content;
        if (content && content.trim().length > 20) {
          completed.add(step.stepNumber);
        }
      });
      setStepResponses(responses);
      setCompletedSteps(completed);
      const firstIncomplete = toolkit.steps.find(s => !completed.has(s.stepNumber));
      setActiveStep(firstIncomplete?.stepNumber || toolkit.steps.length);
    }
    
    // Restore saved AI outputs
    if (session?.insights && session.insights.length > 0) {
      setAiContent(prev => ({
        ...prev,
        insights: session.insights?.map(i => i.content) || []
      }));
    }
    if (session?.sentenceOfTruth?.content) {
      setManualSentence(session.sentenceOfTruth.content);
      setAiContent(prev => ({
        ...prev,
        sentenceOfTruth: session.sentenceOfTruth?.content || ''
      }));
    }
    if (session?.necessaryMoves && session.necessaryMoves.length > 0) {
      setAiContent(prev => ({
        ...prev,
        necessaryMoves: session.necessaryMoves?.map(m => m.content) || []
      }));
    }
  }, [session?.id]);

  const isStepUnlocked = (stepNumber: number) => {
    if (stepNumber === 1) return true;
    return completedSteps.has(stepNumber - 1);
  };

  const isStepComplete = (stepNumber: number) => {
    const content = stepResponses[stepNumber] || '';
    return content.trim().length > 20;
  };

  const debouncedSave = useCallback(
    debounce((stepNumber: number, value: string) => {
      updateSessionStep(sessionId, stepNumber, value);
    }, 500),
    [sessionId, updateSessionStep]
  );

  const handleStepChange = (stepNumber: number, value: string) => {
    setStepResponses(prev => ({ ...prev, [stepNumber]: value }));
    debouncedSave(stepNumber, value);
    
    if (value.trim().length > 20) {
      setCompletedSteps(prev => new Set([...prev, stepNumber]));
    } else {
      setCompletedSteps(prev => {
        const next = new Set(prev);
        next.delete(stepNumber);
        return next;
      });
    }
  };

  const handleLensChange = (lens: ThinkingModeId) => {
    setSessionLens(sessionId, lens);
  };

  // Get workspace context from other sessions - includes full context for AI continuity
  const getWorkspaceContext = () => {
    const workspaceSessions = getWorkspaceSessions(workspaceId);
    // Include sessions that have either AI outputs OR filled-in steps
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
      // Include the actual step content for full context
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
      const steps = toolkit.steps.map((step) => ({
        label: step.label,
        content: stepResponses[step.stepNumber] || '',
      }));
      
      // Get context from other sessions in this workspace
      const workspaceContext = getWorkspaceContext();
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolkitType: 'insight_stack',
          toolkitName: toolkit.name,
          steps,
          thinkingLens: session?.thinkingLens || 'automatic',
          outputLabels: { primary: 'Insights', secondary: 'Sentence of Truth', action: 'Necessary Moves' },
          workspaceContext, // Include context from other sessions
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiContent(data);
        
        // Save AI outputs to store for persistence
        saveAIOutputs(sessionId, data);
        
        if (data.sentenceOfTruth) {
          setManualSentence(data.sentenceOfTruth);
        }
        
        // Show sleek success celebration
        setShowCelebration(true);
        setIsOutputPanelExpanded(true);
      } else {
        showToast('Failed to generate insights. Please try again.', 'error');
      }
    } catch (e) { 
      console.error('Failed to generate:', e);
      showToast('Connection error. Please check your internet and try again.', 'error');
    }
    setIsGenerating(false);
  };

  // Voice Recording with Web Speech API
  const startRecording = (stepNumber: number) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported. Try Chrome or Edge.', 'info');
      return;
    }
    
    // Store the existing content before we start
    const existingContent = stepResponses[stepNumber] || '';
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    let fullTranscript = '';
    
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      fullTranscript = finalTranscript;
      
      // Combine existing content with new transcription
      const newContent = existingContent 
        ? `${existingContent}\n\n${fullTranscript}${interimTranscript}`.trim()
        : `${fullTranscript}${interimTranscript}`.trim();
      
      setStepResponses(prev => ({ ...prev, [stepNumber]: newContent }));
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone access was denied. Please allow microphone access and try again.');
      }
      setIsRecording(null);
    };
    
    recognition.onend = () => {
      // Save the final transcribed content
      setStepResponses(prev => {
        const content = prev[stepNumber] || '';
        if (content.trim()) {
          debouncedSave(stepNumber, content.trim());
          if (content.trim().length > 20) {
            setCompletedSteps(p => new Set([...p, stepNumber]));
          }
        }
        return prev;
      });
      setIsRecording(null);
    };
    
    recognitionRef.current = recognition;
    
    try {
      recognition.start();
      setIsRecording(stepNumber);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      alert('Failed to start voice recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(null);
  };

  // File Upload
  const handleFileSelect = (stepNumber: number) => {
    activeFileStepRef.current = stepNumber;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const stepNumber = activeFileStepRef.current;
    const newFiles: { name: string; type: string; preview?: string }[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileInfo: { name: string; type: string; preview?: string } = {
        name: file.name,
        type: file.type,
      };
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        fileInfo.preview = URL.createObjectURL(file);
      }
      
      // Extract text from text files
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        const currentContent = stepResponses[stepNumber] || '';
        const newContent = currentContent ? `${currentContent}\n\n[From ${file.name}]:\n${text}` : `[From ${file.name}]:\n${text}`;
        handleStepChange(stepNumber, newContent);
      }
      
      newFiles.push(fileInfo);
    }
    
    setStepFiles(prev => ({
      ...prev,
      [stepNumber]: [...(prev[stepNumber] || []), ...newFiles]
    }));
    
    // Reset input
    event.target.value = '';
  };

  // Remove uploaded file
  const handleRemoveFile = (stepNumber: number, fileIndex: number) => {
    setStepFiles(prev => {
      const files = prev[stepNumber] || [];
      // Revoke object URL if it's an image preview
      if (files[fileIndex]?.preview) {
        URL.revokeObjectURL(files[fileIndex].preview!);
      }
      return {
        ...prev,
        [stepNumber]: files.filter((_, i) => i !== fileIndex)
      };
    });
  };

  // Text-to-Speech with friendlier voice
  const speakText = (text: string) => {
    if (!text) return;
    
    if (!window.speechSynthesis) {
      showToast('Text-to-speech is not available in your browser.', 'info');
      return;
    }
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get available voices (may need to wait for them to load)
    let voices = window.speechSynthesis.getVoices();
    
    // If voices not loaded yet, wait and try again
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        selectVoiceAndSpeak();
      };
    } else {
      selectVoiceAndSpeak();
    }
    
    function selectVoiceAndSpeak() {
      // Preferred female voices (ordered by preference)
      const preferredFemaleVoices = [
        'Samantha', // macOS - natural female
        'Karen', // macOS Australian female
        'Moira', // macOS Irish female
        'Fiona', // macOS Scottish female
        'Victoria', // macOS
        'Google UK English Female',
        'Google US English Female',
        'Microsoft Zira', // Windows female
        'Microsoft Jenny', // Windows female
        'Microsoft Aria', // Windows female
        'Nicky', // macOS
        'Allison', // macOS
      ];
      
      // Try to find a preferred female voice
      let selectedVoice = voices.find(v => 
        preferredFemaleVoices.some(pv => v.name.includes(pv))
      );
      
      // Fallback: look for any voice with 'female' in name or common female voice names
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang.startsWith('en') && 
          (v.name.toLowerCase().includes('female') ||
           v.name.toLowerCase().includes('woman') ||
           /samantha|karen|zira|jenny|aria|victoria|fiona|moira|nicky|allison|kate|susan|linda/i.test(v.name))
        );
      }
      
      // Fallback to first English voice (but adjust pitch to sound more friendly)
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('en'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // Friendly, warm speech settings
      utterance.rate = 0.9; // Slightly slower for warmth
      utterance.pitch = 1.15; // Higher pitch for friendlier tone
      utterance.volume = 1;
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAddManualInsight = () => setManualInsights([...manualInsights, '']);
  const handleManualInsightChange = (index: number, value: string) => {
    const updated = [...manualInsights];
    updated[index] = value;
    setManualInsights(updated);
  };
  const handleRemoveManualInsight = (index: number) => setManualInsights(manualInsights.filter((_, i) => i !== index));

  const allInsights = [...aiContent.insights, ...manualInsights.filter(i => i.trim())];
    
  if (!session) return <div className="flex items-center justify-center h-96"><p className="text-fresco-graphite-light">Session not found</p></div>;

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
        isVisible={completedSteps.size >= 3 && !aiContent.sentenceOfTruth && !isGenerating}
        isGenerating={isGenerating}
        onClick={generateContent}
        label="Extract Insights"
      />
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.txt,.md,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      
      {/* Main Column */}
      <div className={cn("flex-1 overflow-y-auto transition-all", isOutputPanelExpanded ? "" : "")}>
        <div className="max-w-[800px] mx-auto px-8 py-10">
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
                <div className="flex items-center gap-2">
                  <ThinkingLensSelector value={session.thinkingLens} onChange={handleLensChange} recommendedModes={toolkit.primaryModes} />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-fresco-black flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
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
                  isComplete: completedSteps.has(step.stepNumber),
                  isActive: activeStep === step.stepNumber
                }))}
              />
            </div>
          </div>
          
          {/* Steps */}
          <div className="space-y-4">
            {toolkit.steps
              .filter(step => !isWizardMode || activeStep === step.stepNumber)
              .map((step) => {
              const isUnlocked = isStepUnlocked(step.stepNumber);
              const isComplete = isStepComplete(step.stepNumber);
              const isActive = activeStep === step.stepNumber;
              const files = stepFiles[step.stepNumber] || [];
              
              return (
                <motion.div
                  key={step.stepNumber}
                  layout
                  initial={isWizardMode ? { opacity: 0, x: 50 } : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={isWizardMode ? { opacity: 0, x: -50 } : { opacity: 0, y: -20 }}
                  className={cn(
                    "border-2 rounded-2xl overflow-hidden transition-all",
                    isActive ? "border-fresco-black shadow-lg" :
                    isComplete ? "border-fresco-black/50 bg-fresco-light-gray/50" :
                    isUnlocked ? "border-fresco-border hover:border-fresco-graphite-light" :
                    "border-fresco-border-light opacity-50"
                  )}
                >
                  {/* Step Header */}
                  <button
                    onClick={() => isUnlocked && setActiveStep(step.stepNumber)}
                    disabled={!isUnlocked}
                    className={cn(
                      "w-full flex items-center justify-between p-4 text-left transition-colors",
                      isUnlocked ? "hover:bg-fresco-light-gray/50" : "cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-fresco-sm font-medium",
                        isComplete ? "bg-fresco-black text-white" :
                        isActive ? "bg-fresco-black text-white" :
                        "bg-fresco-light-gray text-fresco-graphite-mid"
                      )}>
                        {isComplete ? '✓' : step.stepNumber}
                      </div>
                      <div>
                        <span className="text-fresco-xs font-medium text-fresco-graphite-light uppercase tracking-wider">Step {step.stepNumber}</span>
                        <h3 className="text-fresco-base font-medium text-fresco-black">{step.label}</h3>
                      </div>
                    </div>
                    {isUnlocked && (
                      isActive ? <ChevronUp className="w-5 h-5 text-fresco-graphite-mid" /> : <ChevronDown className="w-5 h-5 text-fresco-graphite-light" />
                    )}
                    {!isUnlocked && <Lock className="w-4 h-4 text-fresco-graphite-light" />}
                  </button>
                  
                  {/* Step Content */}
                  <AnimatePresence>
                    {isActive && isUnlocked && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          {/* Dynamic Prompt based on selected lens */}
                          <DynamicPrompt 
                            basePrompt={step.prompt}
                            lensHint={step.lensHints[session?.thinkingLens || 'automatic']}
                            lens={session?.thinkingLens || 'automatic'}
                          />
                          
                          {/* Text Input */}
                          <textarea
                            value={stepResponses[step.stepNumber] || ''}
                            onChange={(e) => handleStepChange(step.stepNumber, e.target.value)}
                            placeholder={step.placeholder}
                            className={cn(
                              "w-full p-4 rounded-xl text-fresco-base border-2 focus:ring-0 outline-none resize-none transition-all",
                              isComplete 
                                ? "bg-white dark:bg-gray-900 border-fresco-border dark:border-gray-700 focus:border-fresco-black"
                                : "bg-fresco-light-gray border-transparent focus:border-fresco-black"
                            )}
                            style={{ minHeight: step.minHeight || 120 }}
                          />
                          
                          {/* Input Quality Indicator */}
                          <InputQualityIndicator 
                            value={stepResponses[step.stepNumber] || ''} 
                            minLength={20} 
                            goodLength={80} 
                          />
                          
                          {/* Lens Suggestion based on content (only show on last step) */}
                          {step.stepNumber === toolkit.steps.length && session?.thinkingLens === 'automatic' && (
                            <LensSuggestBadge
                              content={Object.values(stepResponses).join(' ')}
                              currentLens={session.thinkingLens}
                              onSelectLens={handleLensChange}
                            />
                          )}
                          
                          {/* Smart Prompt Hint */}
                          <SmartPrompt 
                            value={stepResponses[step.stepNumber] || ''} 
                            minLength={20} 
                            goodLength={80}
                          />
                          
                          {/* Contextual Example */}
                          {TOOLKIT_EXAMPLES.insight_stack[step.stepNumber as keyof typeof TOOLKIT_EXAMPLES.insight_stack] && (
                            <ContextualExample
                              stepLabel={step.label}
                              example={TOOLKIT_EXAMPLES.insight_stack[step.stepNumber as keyof typeof TOOLKIT_EXAMPLES.insight_stack].example}
                              tip={TOOLKIT_EXAMPLES.insight_stack[step.stepNumber as keyof typeof TOOLKIT_EXAMPLES.insight_stack].tip}
                            />
                          )}
                          
                          {/* Uploaded Files Preview */}
                          {files.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {files.map((file, i) => (
                                <div key={i} className="group flex items-center gap-2 px-3 py-1.5 bg-fresco-light-gray rounded-lg">
                                  {file.preview ? (
                                    <img src={file.preview} alt="" className="w-6 h-6 rounded object-cover" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-fresco-graphite-mid" />
                                  )}
                                  <span className="text-fresco-xs text-fresco-graphite-mid truncate max-w-[100px]">{file.name}</span>
                                  <button
                                    onClick={() => handleRemoveFile(step.stepNumber, i)}
                                    className="p-0.5 text-fresco-graphite-light hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove file"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="mt-3 flex items-center gap-2">
                            {/* Voice Recording */}
                            <button
                              onClick={() => isRecording === step.stepNumber ? stopRecording() : startRecording(step.stepNumber)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg text-fresco-sm font-medium transition-all",
                                isRecording === step.stepNumber 
                                  ? "bg-fresco-graphite text-white animate-pulse" 
                                  : "bg-fresco-light-gray text-fresco-graphite-mid hover:bg-fresco-graphite-light hover:text-white"
                              )}
                            >
                              {isRecording === step.stepNumber ? (
                                <><MicOff className="w-4 h-4" /> Stop Recording</>
                              ) : (
                                <><Mic className="w-4 h-4" /> Record Voice</>
                              )}
                            </button>
                            
                            {/* File Upload */}
                            <button
                              onClick={() => handleFileSelect(step.stepNumber)}
                              className="flex items-center gap-2 px-3 py-2 bg-fresco-light-gray rounded-lg text-fresco-sm font-medium text-fresco-graphite-mid hover:bg-fresco-graphite-light hover:text-white transition-all"
                            >
                              <Upload className="w-4 h-4" /> Upload
                            </button>
                          </div>
                          
                          {/* Next step button - in wizard mode or when complete */}
                          {step.stepNumber < toolkit.steps.length && isComplete && (
                            <motion.button
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              onClick={() => setActiveStep(step.stepNumber + 1)}
                              className="fresco-btn fresco-btn-primary fresco-btn-sm mt-4"
                            >
                              Continue to {toolkit.steps[step.stepNumber]?.label} <ArrowRight className="w-4 h-4" />
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                      title="Hide output panel"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Insights */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="fresco-label">Insights</span>
                    <div className="flex items-center gap-1">
                      {allInsights.length > 0 && (
                        <button 
                          onClick={() => speakText(allInsights.join('. '))}
                          className={cn("p-1.5 rounded transition-colors", isSpeaking ? "text-fresco-black bg-fresco-light-gray" : "text-fresco-graphite-light hover:text-fresco-black")}
                          title="Listen to insights"
                        >
                          {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                      )}
                      <button onClick={handleAddManualInsight} className="p-1 text-fresco-graphite-light hover:text-fresco-black transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
            
                  {allInsights.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-fresco-border rounded-xl">
                      <Layers className="w-8 h-8 text-fresco-graphite-light mx-auto mb-3" />
                      <p className="text-fresco-sm text-fresco-graphite-light">Complete at least 3 steps<br/>to extract insights</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiContent.insights.map((insight, i) => (
                        <div key={`ai-${i}`} className="group relative">
                          <InsightCard
                            insight={insight}
                            index={i}
                            isNew={true}
                          />
                          {/* Deep Dive button */}
                          <button
                            onClick={() => { setDeepDiveInsight(insight); setShowDeepDive(true); }}
                            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-fresco-graphite-light hover:text-fresco-black hover:bg-fresco-light-gray rounded transition-all"
                            title="Deep dive into this insight"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {manualInsights.map((insight, i) => (
                  <div key={`manual-${i}`} className="relative group">
                    <input 
                      type="text" 
                      value={insight} 
                      onChange={(e) => handleManualInsightChange(i, e.target.value)} 
                      placeholder="Add your insight..."
                      className="w-full p-4 bg-fresco-light-gray rounded-xl text-fresco-sm border-none focus:ring-2 focus:ring-fresco-black outline-none"
                    />
                    <button onClick={() => handleRemoveManualInsight(i)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-fresco-graphite-light hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Lens-Specific Outputs */}
            {(aiContent.systemsDiagram || aiContent.futuresScenarios || aiContent.ethicalMatrix || aiContent.firstPrinciplesList || aiContent.narrativeArc) && (
              <LensSpecificOutput
                lens={session?.thinkingLens || 'automatic'}
                data={{
                  systemsDiagram: aiContent.systemsDiagram || undefined,
                  futuresScenarios: aiContent.futuresScenarios || undefined,
                  ethicalMatrix: aiContent.ethicalMatrix || undefined,
                  firstPrinciplesList: aiContent.firstPrinciplesList || undefined,
                  narrativeArc: aiContent.narrativeArc || undefined,
                }}
              />
            )}
            
            {/* "What if..." Perspective Prompt */}
            {aiContent.insights.length > 0 && (
              <div className="mt-6">
                <WhatIfPrompt
                  currentLens={session?.thinkingLens || 'automatic'}
                  onTryPerspective={(newLens) => {
                    handleLensChange(newLens);
                    generateContent();
                  }}
                  isGenerating={isGenerating}
                />
              </div>
            )}
          </div>
          
          {/* Sentence of Truth - Enhanced Display */}
          {(manualSentence || aiContent.sentenceOfTruth) ? (
            <div className="mb-8">
              <SentenceOfTruthDisplay
                sentence={manualSentence || aiContent.sentenceOfTruth}
                isLocked={session?.sentenceOfTruth?.isLocked}
                onLockToggle={() => toggleSentenceLock(sessionId)}
                onEdit={(val) => { setManualSentence(val); setSentenceOfTruth(sessionId, val); }}
                toolkitName={toolkit.name}
              />
            </div>
          ) : (
            <div className="mb-8">
              <span className="fresco-label block mb-4">Sentence of Truth</span>
              <div className="p-6 bg-fresco-light-gray rounded-xl text-center">
                <p className="text-fresco-sm text-fresco-graphite-light">
                  Generate insights to discover your truth
                </p>
              </div>
            </div>
          )}
          
          {/* Necessary Moves */}
          {aiContent.necessaryMoves.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="fresco-label">Necessary Moves</span>
                <button 
                  onClick={() => speakText(aiContent.necessaryMoves.join('. '))}
                  className={cn("p-1.5 rounded transition-colors", isSpeaking ? "text-fresco-black bg-fresco-light-gray" : "text-fresco-graphite-light hover:text-fresco-black")}
                  title="Listen"
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
              <div className="space-y-2">
                {aiContent.necessaryMoves.map((move, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-fresco-light-gray rounded-lg"
                  >
                    <div className="w-6 h-6 rounded-full bg-fresco-black text-white flex items-center justify-center flex-shrink-0 text-fresco-xs font-medium">
                      {i + 1}
                    </div>
                    <p className="text-fresco-sm text-fresco-graphite-soft pt-0.5">{move}</p>
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
              Export Session
            </button>
          </div>
          
          {/* Next Toolkit CTA */}
          <NextToolkitCTA 
            currentToolkit="insight_stack"
            isReady={aiContent.insights.length > 0 && !!aiContent.sentenceOfTruth && aiContent.necessaryMoves.length > 0}
            onStartToolkit={onStartToolkit}
          />
              </div>
            </div>
          </motion.div>
        ) : (
          /* Show Output Toggle Button when panel is closed */
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsOutputPanelExpanded(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-fresco-black text-white px-3 py-6 rounded-l-xl shadow-lg hover:bg-fresco-graphite transition-colors flex flex-col items-center gap-2"
          >
            <Eye className="w-5 h-5" />
            <span className="text-fresco-xs font-medium" style={{ writingMode: 'vertical-rl' }}>
              Output
            </span>
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
          toolkitType: 'insight_stack',
          toolkitName: toolkit.name,
          workspaceTitle: workspace?.title || 'Untitled',
          thinkingLens: session?.thinkingLens || 'automatic',
          date: new Date().toLocaleDateString(),
          steps: toolkit.steps.map((step) => ({
            label: step.label,
            content: stepResponses[step.stepNumber] || ''
          })),
          insights: allInsights,
          sentenceOfTruth: manualSentence || aiContent.sentenceOfTruth,
          necessaryMoves: aiContent.necessaryMoves,
        }}
      />
      
      {/* Deep Dive Modal */}
      <DeepDiveModal
        isOpen={showDeepDive}
        onClose={() => { setShowDeepDive(false); setDeepDiveInsight(null); }}
        insight={deepDiveInsight || ''}
        currentLens={session?.thinkingLens || 'automatic'}
        onDeepDive={(lens) => {
          handleLensChange(lens);
          showToast(`Switched to ${lens} lens for deeper exploration`, 'info');
          generateContent();
        }}
      />
    </div>
  );
}
