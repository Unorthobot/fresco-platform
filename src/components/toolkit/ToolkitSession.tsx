'use client';

// FRESCO Generic Toolkit Session - Works with any toolkit type
// Supports voice recording, file uploads, AI generation

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
  FileText,
  Copy,
  Check,
  FileDown,
  X,
  Mic,
  MicOff,
  Upload,
  FileType
} from 'lucide-react';
import { cn, debounce, formatRelativeTime } from '@/lib/utils';
import { useFrescoStore } from '@/lib/store';
import { TOOLKITS, type ThinkingModeId, type ToolkitType } from '@/types';
import { ThinkingLensSelector } from '@/components/ui/ThinkingLensSelector';
import { SentenceOfTruth } from '@/components/ui/SentenceOfTruth';
import { NextToolkitCTA } from '@/components/ui/NextToolkitCTA';
import { GenerationSuccess } from '@/components/ui/GenerationSuccess';

interface ToolkitSessionProps {
  sessionId: string;
  workspaceId: string;
  onBack?: () => void;
}

interface UploadedFile {
  name: string;
  type: string;
  content: string;
  size: number;
}

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  investigate: '/01-investigate.png',
  innovate: '/02-innovate.png',
  validate: '/03-validate.png',
};

// Output labels per toolkit type
const OUTPUT_LABELS: Record<ToolkitType, { primary: string; secondary: string; action: string }> = {
  insight_stack: { primary: 'Insights', secondary: 'Sentence of Truth', action: 'Necessary Moves' },
  pov_generator: { primary: 'POV Synthesis', secondary: 'Core POV Statement', action: 'Strategic Implications' },
  mental_model_mapper: { primary: 'Model Components', secondary: 'Mental Model Summary', action: 'Model Applications' },
  flow_board: { primary: 'Flow Analysis', secondary: 'Optimal Path', action: 'Flow Improvements' },
  experiment_brief: { primary: 'Experiment Design', secondary: 'Core Hypothesis', action: 'Test Plan' },
  strategy_sketchbook: { primary: 'Strategic Options', secondary: 'Strategic Direction', action: 'Next Moves' },
  ux_scorecard: { primary: 'UX Evaluation', secondary: 'Overall Assessment', action: 'Priority Fixes' },
  persuasion_canvas: { primary: 'Persuasion Elements', secondary: 'Core Message', action: 'Communication Plan' },
  performance_grid: { primary: 'Performance Analysis', secondary: 'Key Finding', action: 'Optimisation Actions' },
};

export function ToolkitSession({ sessionId, workspaceId, onBack }: ToolkitSessionProps) {
  const {
    sessions,
    workspaces,
    updateSessionStep,
    setSessionLens,
    setSentenceOfTruth,
    toggleSentenceLock,
    addInsight,
  } = useFrescoStore();
  
  const session = sessions.find((s) => s.id === sessionId);
  const workspace = workspaces.find((w) => w.id === workspaceId);
  const toolkit = session ? TOOLKITS[session.toolkitType] : null;
  const outputLabels = session ? OUTPUT_LABELS[session.toolkitType] : OUTPUT_LABELS.insight_stack;
  
  const [stepResponses, setStepResponses] = useState<Record<number, string>>({});
  const [stepFiles, setStepFiles] = useState<Record<number, UploadedFile[]>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualInsights, setManualInsights] = useState<string[]>([]);
  const [manualSentence, setManualSentence] = useState('');
  const [aiContent, setAiContent] = useState<{ insights: string[]; sentenceOfTruth: string; necessaryMoves: string[] }>({ insights: [], sentenceOfTruth: '', necessaryMoves: [] });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [showGenerationSuccess, setShowGenerationSuccess] = useState(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState<number | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  
  // Initialize from session
  useEffect(() => {
    if (session?.steps) {
      const responses: Record<number, string> = {};
      session.steps.forEach((step) => { responses[step.stepNumber] = step.content; });
      setStepResponses(responses);
    }
    if (session?.sentenceOfTruth?.content) {
      setManualSentence(session.sentenceOfTruth.content);
    }
  }, [session?.id]);
  
  // Generate content via API
  const generateContent = useCallback(async () => {
    if (isGenerating || !toolkit) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolkitType: session?.toolkitType,
          toolkitName: toolkit.name,
          steps: toolkit.steps.map(step => ({
            label: step.label,
            content: stepResponses[step.stepNumber] || ''
          })),
          thinkingLens: session?.thinkingLens || 'automatic',
          outputLabels,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setAiContent(data);
        if (data.sentenceOfTruth && !manualSentence) {
          setManualSentence(data.sentenceOfTruth);
          setSentenceOfTruth(sessionId, data.sentenceOfTruth);
        }
        setShowGenerationSuccess(true);
      }
    } catch (e) { console.error('Failed to generate:', e); }
    setIsGenerating(false);
  }, [stepResponses, session?.thinkingLens, session?.toolkitType, sessionId, manualSentence, setSentenceOfTruth, isGenerating, toolkit, outputLabels]);
  
  const debouncedSave = useCallback(
    debounce((stepNumber: number, value: string) => {
      updateSessionStep(sessionId, stepNumber, value);
    }, 500),
    [sessionId, updateSessionStep]
  );
  
  const [hasAutoGenerated, setHasAutoGenerated] = useState(false);
  
  useEffect(() => {
    const hasContent = Object.values(stepResponses).some((v) => v && v.trim().length > 50);
    if (hasContent && !isGenerating && !hasAutoGenerated && aiContent.insights.length === 0) {
      const timeout = setTimeout(() => {
        generateContent();
        setHasAutoGenerated(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [stepResponses, isGenerating, hasAutoGenerated, aiContent.insights.length]);
  
  const handleStepChange = (stepNumber: number, value: string) => {
    setStepResponses((prev) => ({ ...prev, [stepNumber]: value }));
    debouncedSave(stepNumber, value);
    if (value.length > 50) {
      setHasAutoGenerated(false);
    }
  };
  
  const handleLensChange = (lens: ThinkingModeId) => {
    setSessionLens(sessionId, lens);
    setTimeout(() => generateContent(), 500);
  };
  
  // Voice Recording
  const startRecording = async (stepNumber: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob, stepNumber);
      };
      
      mediaRecorder.start();
      setIsRecording(stepNumber);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording !== null) {
      mediaRecorderRef.current.stop();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecording(null);
      setRecordingTime(0);
    }
  };
  
  const transcribeAudio = async (audioBlob: Blob, stepNumber: number) => {
    setIsGenerating(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio }),
        });
        if (response.ok) {
          const { text } = await response.json();
          if (text) {
            const currentContent = stepResponses[stepNumber] || '';
            const newContent = currentContent ? `${currentContent}\n\n${text}` : text;
            handleStepChange(stepNumber, newContent);
          }
        }
        setIsGenerating(false);
      };
    } catch (err) {
      console.error('Transcription failed:', err);
      setIsGenerating(false);
    }
  };
  
  // File Upload
  const handleFileUpload = async (stepNumber: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(files)) {
      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        if (file.type.startsWith('image/')) reader.readAsDataURL(file);
        else reader.readAsText(file);
      });
      
      newFiles.push({ name: file.name, type: file.type, content, size: file.size });
      
      const extractedText = await extractFileContent(file, content);
      if (extractedText && !file.type.startsWith('image/')) {
        const currentContent = stepResponses[stepNumber] || '';
        const newContent = currentContent 
          ? `${currentContent}\n\n--- From ${file.name} ---\n${extractedText}`
          : `--- From ${file.name} ---\n${extractedText}`;
        handleStepChange(stepNumber, newContent);
      }
    }
    
    setStepFiles(prev => ({
      ...prev,
      [stepNumber]: [...(prev[stepNumber] || []), ...newFiles]
    }));
  };
  
  const extractFileContent = async (file: File, content: string): Promise<string> => {
    if (file.type === 'text/plain' || file.type === 'text/markdown') return content;
    if (file.type === 'application/json') {
      try { return JSON.stringify(JSON.parse(content), null, 2); } catch { return content; }
    }
    if (file.type.startsWith('image/')) return `[Image uploaded: ${file.name}]`;
    if (file.type === 'application/pdf') return `[PDF uploaded: ${file.name}]`;
    return content;
  };
  
  const removeFile = (stepNumber: number, fileName: string) => {
    setStepFiles(prev => ({
      ...prev,
      [stepNumber]: (prev[stepNumber] || []).filter(f => f.name !== fileName)
    }));
  };
  
  // Lens hints
  const getLensHint = (step: typeof toolkit.steps[0]) => {
    const lens = session?.thinkingLens || 'automatic';
    if (lens === 'automatic') return null;
    return step.lensHints?.[lens] || null;
  };
  
  // Export functions
  const generateExportContent = (format: 'markdown' | 'html') => {
    const lines = [`# ${toolkit?.name}: ${workspace?.title || 'Session'}`, '', `**Thinking Lens:** ${session?.thinkingLens || 'Automatic'}`, `**Date:** ${new Date().toLocaleDateString()}`, ''];
    toolkit?.steps.forEach((step) => { lines.push(`## Step ${step.stepNumber}: ${step.label}`, '', stepResponses[step.stepNumber] || '(Not filled)', ''); });
    lines.push(`## ${outputLabels.primary}`, '');
    allInsights.forEach((insight, i) => { lines.push(`${i + 1}. ${insight}`); });
    lines.push('', `## ${outputLabels.secondary}`, '', manualSentence || aiContent.sentenceOfTruth || '(Not yet defined)', '');
    lines.push(`## ${outputLabels.action}`, '');
    aiContent.necessaryMoves.forEach((move, i) => { lines.push(`${i + 1}. ${move}`); });
    return lines.join('\n');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateExportContent('markdown'));
    setExportStatus('Copied to clipboard');
    setTimeout(() => setExportStatus(null), 2000);
  };

  const handleDownloadMarkdown = () => {
    const content = generateExportContent('markdown');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${toolkit?.name?.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus('Downloaded');
    setTimeout(() => setExportStatus(null), 2000);
  };

  const handleExportPDF = () => {
    window.print();
    setExportStatus('Print dialog opened');
    setTimeout(() => setExportStatus(null), 2000);
  };

  // Manual insights
  const handleAddManualInsight = () => setManualInsights([...manualInsights, '']);
  const handleManualInsightChange = (index: number, value: string) => {
    const updated = [...manualInsights];
    updated[index] = value;
    setManualInsights(updated);
  };
  const handleRemoveManualInsight = (index: number) => setManualInsights(manualInsights.filter((_, i) => i !== index));

  const allInsights = [...aiContent.insights, ...manualInsights.filter(i => i.trim())];
  
  if (!session || !toolkit) return <div className="flex items-center justify-center h-96"><p className="text-fresco-graphite-light">Session not found</p></div>;
  
  const categoryIcon = CATEGORY_ICONS[toolkit.category];
  
  return (
    <div className="flex h-full bg-fresco-white">
      {/* Main Column */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-8 py-10">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-8">
              <button type="button" onClick={() => onBack?.()} className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors">
                <ChevronLeft className="w-4 h-4" /><span>Back to {workspace?.title || 'Workspace'}</span>
              </button>
              <ThinkingLensSelector value={session.thinkingLens} onChange={handleLensChange} recommendedModes={toolkit.primaryModes} />
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <img src={categoryIcon} alt={toolkit.category} className="w-4 h-4 opacity-60 icon-theme" />
              <span className="fresco-label capitalize">{toolkit.category}</span>
            </div>
            <h1 className="text-fresco-3xl font-medium text-fresco-black tracking-tight mb-3">{toolkit.name}</h1>
            <p className="text-fresco-base text-fresco-graphite-mid">{toolkit.subtitle}</p>
          </div>
          
          {/* Steps */}
          <div className="space-y-10">
            {toolkit.steps.map((step, index) => (
              <motion.div key={step.stepNumber} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <div className="fresco-step-label">Step {step.stepNumber} — {step.label}</div>
                <p className="text-fresco-lg text-fresco-black mb-4">{step.prompt}</p>
                
                {/* Input area with voice and file buttons */}
                <div className="relative">
                  <textarea
                    value={stepResponses[step.stepNumber] || ''}
                    onChange={(e) => handleStepChange(step.stepNumber, e.target.value)}
                    placeholder={step.placeholder}
                    className="fresco-input-lg pr-24"
                    style={{ minHeight: step.minHeight || 120 }}
                  />
                  
                  {/* Input mode buttons */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <button
                      onClick={() => isRecording === step.stepNumber ? stopRecording() : startRecording(step.stepNumber)}
                      className={cn(
                        "p-2 rounded-full transition-all",
                        isRecording === step.stepNumber 
                          ? "bg-red-500 text-white animate-pulse" 
                          : "bg-fresco-light-gray text-fresco-graphite-mid hover:bg-fresco-border hover:text-fresco-black"
                      )}
                      title={isRecording === step.stepNumber ? "Stop recording" : "Record voice"}
                    >
                      {isRecording === step.stepNumber ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={() => fileInputRefs.current[step.stepNumber]?.click()}
                      className="p-2 rounded-full bg-fresco-light-gray text-fresco-graphite-mid hover:bg-fresco-border hover:text-fresco-black transition-all"
                      title="Upload file"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <input
                      ref={el => fileInputRefs.current[step.stepNumber] = el}
                      type="file"
                      multiple
                      accept=".txt,.md,.csv,.json,.pdf,image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(step.stepNumber, e.target.files)}
                    />
                  </div>
                </div>
                
                {/* Recording indicator */}
                {isRecording === step.stepNumber && (
                  <div className="mt-2 flex items-center gap-2 text-fresco-sm text-red-500">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                  </div>
                )}
                
                {/* Uploaded files */}
                {stepFiles[step.stepNumber]?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {stepFiles[step.stepNumber].map((file) => (
                      <div key={file.name} className="flex items-center gap-2 px-3 py-1.5 bg-fresco-light-gray rounded-full text-fresco-xs text-fresco-graphite-soft">
                        {file.type.startsWith('image/') ? <FileType className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button onClick={() => removeFile(step.stepNumber, file.name)} className="text-fresco-graphite-light hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Lens hint */}
                {getLensHint(step) && <p className="mt-3 text-fresco-sm text-fresco-graphite-light italic">💡 {getLensHint(step)}</p>}
              </motion.div>
            ))}
          </div>
          
          <div className="mt-16 pt-8 border-t border-fresco-border-light">
            <p className="text-fresco-xs text-fresco-graphite-light">Saved {session.updatedAt ? formatRelativeTime(session.updatedAt) : 'just now'}</p>
          </div>
        </div>
      </div>
      
      {/* Output Panel */}
      <div className="w-[340px] border-l border-fresco-border-light bg-fresco-off-white overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black">Output</h2>
            {isGenerating && <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-light"><Loader2 className="w-4 h-4 animate-spin" /><span>Thinking...</span></div>}
          </div>
          
          {/* Primary Output (Insights) */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="fresco-label">{outputLabels.primary}</span>
              <div className="flex items-center gap-1">
                <button onClick={handleAddManualInsight} className="p-1.5 text-fresco-graphite-light hover:text-fresco-black rounded transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {allInsights.length === 0 && !isGenerating ? (
              <div className="py-6 text-center">
                <p className="text-fresco-sm text-fresco-graphite-light">Fill in the steps to generate {outputLabels.primary.toLowerCase()}...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {aiContent.insights.map((insight, i) => (
                  <div key={`ai-${i}`} className="p-3 bg-fresco-light-gray rounded-fresco text-fresco-sm text-fresco-graphite-soft">{insight}</div>
                ))}
                {manualInsights.map((insight, i) => (
                  <div key={`manual-${i}`} className="relative group">
                    <input type="text" value={insight} onChange={(e) => handleManualInsightChange(i, e.target.value)} placeholder="Add your insight..."
                      className="w-full p-3 bg-fresco-light-gray rounded-fresco text-fresco-sm text-fresco-graphite-soft border-none focus:ring-1 focus:ring-fresco-border outline-none" />
                    <button onClick={() => handleRemoveManualInsight(i)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-fresco-graphite-light hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Secondary Output (Sentence/Statement) */}
          <div className="mb-8">
            <span className="fresco-label block mb-4">{outputLabels.secondary}</span>
            <SentenceOfTruth
              value={manualSentence || aiContent.sentenceOfTruth}
              onChange={(val) => { setManualSentence(val); setSentenceOfTruth(sessionId, val); }}
              isLocked={session.sentenceOfTruth?.isLocked || false}
              onToggleLock={() => toggleSentenceLock(sessionId)}
              placeholder={`Your ${outputLabels.secondary.toLowerCase()} will appear here...`}
            />
          </div>
          
          {/* Action Output (Necessary Moves) */}
          <div className="mb-8">
            <span className="fresco-label block mb-4">{outputLabels.action}</span>
            {aiContent.necessaryMoves.length === 0 ? (
              <p className="text-fresco-sm text-fresco-graphite-light">Generate output to see suggested {outputLabels.action.toLowerCase()}...</p>
            ) : (
              <div className="space-y-2">
                {aiContent.necessaryMoves.map((move, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-fresco-light-gray dark:bg-gray-800 rounded-fresco">
                    <div className="w-5 h-5 rounded-full border border-fresco-border dark:border-gray-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-fresco-xs text-fresco-graphite-light">{i + 1}</span>
                    </div>
                    <p className="text-fresco-sm text-fresco-graphite-soft">{move}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Next Toolkit CTA */}
          {session && (
            <NextToolkitCTA
              currentToolkit={session.toolkitType}
              isReady={aiContent.insights.length > 0}
              onStartToolkit={(type) => console.log('Start toolkit:', type)}
              onViewWorkspace={onBack}
            />
          )}
          
          {/* Export Session Button */}
          <div className="pt-6 border-t border-fresco-border-light">
            <button 
              onClick={() => setShowExportModal(true)} 
              className="fresco-btn w-full"
            >
              <Download className="w-4 h-4" />
              <span>Export Session</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Generation Success Animation */}
      <GenerationSuccess
        show={showGenerationSuccess}
        onComplete={() => setShowGenerationSuccess(false)}
        insightCount={aiContent.insights.length}
        hasTruth={!!aiContent.sentenceOfTruth}
        actionCount={aiContent.necessaryMoves.length}
      />
      
      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowExportModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-fresco-lg p-6 max-w-md w-full mx-4 shadow-fresco-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-fresco-lg font-medium text-fresco-black">Export Session</h3>
                <button onClick={() => setShowExportModal(false)} className="p-1 text-fresco-graphite-light hover:text-fresco-black dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              {exportStatus && <div className="mb-4 p-3 bg-fresco-light-gray dark:bg-gray-800 rounded-fresco text-fresco-sm text-fresco-black flex items-center gap-2"><Check className="w-4 h-4" />{exportStatus}</div>}
              <div className="space-y-3">
                <button onClick={handleCopy} className="w-full flex items-center gap-3 p-4 border border-fresco-border dark:border-gray-700 rounded-fresco hover:bg-fresco-light-gray dark:hover:bg-gray-800 transition-colors">
                  <Copy className="w-5 h-5 text-fresco-graphite-mid" /><div className="text-left"><p className="text-fresco-base text-fresco-black">Copy to Clipboard</p><p className="text-fresco-sm text-fresco-graphite-light">Copy as formatted text</p></div>
                </button>
                <button onClick={handleDownloadMarkdown} className="w-full flex items-center gap-3 p-4 border border-fresco-border dark:border-gray-700 rounded-fresco hover:bg-fresco-light-gray dark:hover:bg-gray-800 transition-colors">
                  <FileText className="w-5 h-5 text-fresco-graphite-mid" /><div className="text-left"><p className="text-fresco-base text-fresco-black">Download Markdown</p><p className="text-fresco-sm text-fresco-graphite-light">Save as .md file</p></div>
                </button>
                <button onClick={handleExportPDF} className="w-full flex items-center gap-3 p-4 border border-fresco-border dark:border-gray-700 rounded-fresco hover:bg-fresco-light-gray dark:hover:bg-gray-800 transition-colors">
                  <FileDown className="w-5 h-5 text-fresco-graphite-mid" /><div className="text-left"><p className="text-fresco-base text-fresco-black">Export PDF</p><p className="text-fresco-sm text-fresco-graphite-light">Print or save as PDF</p></div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
