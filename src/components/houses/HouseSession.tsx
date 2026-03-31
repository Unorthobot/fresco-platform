'use client';

// FRESCO HouseSession
// The new 3-panel session UI for house-based thinking.
// Left: navigation (existing LeftNavRail — unchanged)
// Middle: single input field + house context
// Right: structured output (Verdict, Sentence of Truth, Key Issues, Necessary Moves)
//
// Agents are INVISIBLE here. The UI only shows house name, input, and merged output.

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Sparkles,
  Loader2,
  ArrowRight,
  Copy,
  Check,
  Download,
  X,
  Mic,
  MicOff,
  Upload,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDBWrite } from '@/lib/useDBSync';
import { useFrescoStore } from '@/lib/store';
import { HOUSE_META, type HouseId } from '@/lib/agents';
import type { HouseResult } from '@/lib/orchestrator';

interface HouseSessionProps {
  houseId: HouseId;
  workspaceId: string;
  sessionId: string;
  onBack?: () => void;
  onNavigateToHouse?: (houseId: HouseId) => void;
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'GO': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  'PIVOT': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'INVESTIGATE FURTHER': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  'STOP': { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
};

const HOUSE_NAMES: Record<HouseId, string> = {
  investigate: 'Investigate',
  innovate: 'Innovate',
  validate: 'Validate',
  evaluate: 'Evaluate',
};

export function HouseSession({
  houseId,
  workspaceId,
  sessionId,
  onBack,
  onNavigateToHouse,
}: HouseSessionProps) {
  const { sessions, workspaces } = useFrescoStore();
  const db = useDBWrite();

  const session = sessions.find(s => s.id === sessionId);
  const workspace = workspaces.find(w => w.id === workspaceId);
  const meta = HOUSE_META[houseId];

  // Middle panel state
  const [userInput, setUserInput] = useState('');
  const [url, setUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  // Right panel state
  const [result, setResult] = useState<HouseResult | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canRun = userInput.trim().length >= 20 && !isRunning;

  const handleRun = useCallback(async () => {
    if (!canRun) return;
    setIsRunning(true);
    setResult(null);

    try {
      // Build workspace context from other sessions
      const workspaceSessions = sessions.filter(s => s.workspaceId === workspaceId && s.id !== sessionId);
      const context = workspaceSessions
        .filter(s => s.sentenceOfTruth?.content || (s.insights && s.insights.length > 0))
        .slice(0, 3)
        .map(s => {
          const lines = [];
          if (s.sentenceOfTruth?.content) lines.push(`Core finding: "${s.sentenceOfTruth.content}"`);
          if (s.insights?.length) lines.push(`Insights: ${s.insights.slice(0, 2).map((i: any) => i.content || i).join('; ')}`);
          return lines.join('\n');
        })
        .join('\n---\n');

      const body: Record<string, string> = { userInput: userInput.trim() };
      if (context) body.context = context;
      if (url.trim()) body.url = url.trim();

      const response = await fetch(`/api/houses/${houseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data: HouseResult = await response.json();
        setResult(data);

        // Persist to session store as AI outputs
        if (session) {
          await db.saveAIOutputs(sessionId, {
            insights: data.keyIssues,
            sentenceOfTruth: data.sentenceOfTruth,
            necessaryMoves: data.necessaryMoves,
          });
        }
      }
    } catch (err) {
      console.error('House run failed:', err);
    }

    setIsRunning(false);
  }, [canRun, userInput, url, houseId, sessions, workspaceId, sessionId, session, db]);

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        setIsRunning(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64 = reader.result as string;
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64 }),
            });
            if (res.ok) {
              const { text } = await res.json();
              if (text) setUserInput(prev => prev ? `${prev}\n\n${text}` : text);
            }
            setIsRunning(false);
          };
        } catch { setIsRunning(false); }
      };
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { alert('Could not access microphone. Please check permissions.'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const text = await new Promise<string>(res => {
        const reader = new FileReader();
        reader.onload = e => res(e.target?.result as string);
        reader.readAsText(file);
      });
      setUserInput(prev => prev ? `${prev}\n\n--- From ${file.name} ---\n${text}` : `--- From ${file.name} ---\n${text}`);
    }
  };

  const generateExportText = () => {
    if (!result) return '';
    const lines = [
      `# ${meta.name} House — ${result.outputLabel}`,
      `**Workspace:** ${workspace?.title || 'Unknown'}`,
      `**Date:** ${new Date().toLocaleDateString()}`,
      '',
      `## Input`,
      userInput,
      '',
      `## Verdict: ${result.verdict}`,
      result.verdictRationale,
      '',
      `## Sentence of Truth`,
      result.sentenceOfTruth,
      '',
      `## Key Issues`,
      ...result.keyIssues.map((issue, i) => `${i + 1}. ${issue}`),
      '',
      `## Necessary Moves`,
      ...result.necessaryMoves.map((move, i) => `${i + 1}. ${move}`),
    ];
    return lines.join('\n');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateExportText());
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = generateExportText();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${houseId}-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus('Downloaded');
    setTimeout(() => setExportStatus(null), 2000);
  };

  const verdictStyle = result ? (VERDICT_STYLES[result.verdict] || VERDICT_STYLES['INVESTIGATE FURTHER']) : null;

  return (
    <div className="flex flex-col md:flex-row h-full bg-fresco-white">

      {/* ─── MIDDLE PANEL: Input ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="max-w-[680px] mx-auto px-4 md:px-8 py-6 md:py-10">

          {/* Header */}
          <div className="mb-10">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors mb-8"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to {workspace?.title || 'Workspace'}</span>
            </button>

            <div className="flex items-center gap-2 mb-3">
              <img
                src={meta.icon}
                alt={meta.name}
                className="w-4 h-4 opacity-60 icon-theme"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="fresco-label capitalize">{meta.name}</span>
              <span className="fresco-label text-fresco-graphite-light">→ {meta.output}</span>
            </div>

            <h1 className="text-fresco-3xl font-medium text-fresco-black tracking-tight mb-3">
              {meta.name}
            </h1>
            <p className="text-fresco-base text-fresco-graphite-mid max-w-lg">
              {meta.description}
            </p>
          </div>

          {/* Input area */}
          <div className="space-y-6">
            <div>
              <label className="fresco-step-label block mb-3">{meta.inputLabel}</label>
              <div className="relative">
                <textarea
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  placeholder={meta.inputPlaceholder}
                  className="fresco-input-lg pr-24"
                  style={{ minHeight: 220 }}
                />
                {/* Voice + file buttons */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                      'p-2 rounded-full transition-all',
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-fresco-light-gray text-fresco-graphite-mid hover:bg-fresco-border hover:text-fresco-black'
                    )}
                    title={isRecording ? 'Stop recording' : 'Record voice'}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full bg-fresco-light-gray text-fresco-graphite-mid hover:bg-fresco-border hover:text-fresco-black transition-all"
                    title="Upload file"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.md,.csv,.json"
                    className="hidden"
                    onChange={e => handleFileUpload(e.target.files)}
                  />
                </div>
              </div>
              {isRecording && (
                <div className="mt-2 flex items-center gap-2 text-fresco-sm text-red-500">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                </div>
              )}
            </div>

            {/* URL input — Evaluate house only */}
            {houseId === 'evaluate' && (
              <div>
                <label className="fresco-step-label block mb-3">URL to evaluate (optional)</label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://yoursite.com/page"
                  className="w-full h-11 px-4 text-fresco-base text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black transition-all"
                />
                <p className="mt-2 text-fresco-xs text-fresco-graphite-light">
                  Enter a URL to include it in the evaluation context.
                </p>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleRun}
              disabled={!canRun}
              className={cn(
                'w-full h-12 flex items-center justify-center gap-3 text-fresco-base font-medium transition-all rounded-none',
                canRun
                  ? 'bg-fresco-black text-white hover:bg-fresco-graphite cursor-pointer'
                  : 'bg-fresco-light-gray text-fresco-graphite-light cursor-not-allowed'
              )}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running {meta.name} analysis...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run {meta.name}</span>
                </>
              )}
            </button>

            {!canRun && !isRunning && (
              <p className="text-center text-fresco-xs text-fresco-graphite-light">
                Add at least 20 characters to run the analysis
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Output ─────────────────────────────────────────── */}
      <div className="w-full md:w-[360px] max-h-[60vh] md:max-h-none border-t md:border-t-0 md:border-l border-fresco-border-light bg-fresco-off-white overflow-y-auto">
        <div className="p-6">

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black">Output</h2>
            {isRunning && (
              <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-light">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analysing...</span>
              </div>
            )}
          </div>

          {!result && !isRunning && (
            <div className="py-10 text-center">
              <img
                src={meta.icon}
                alt={meta.name}
                className="w-8 h-8 mx-auto mb-4 opacity-20 icon-theme"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <p className="text-fresco-sm text-fresco-graphite-light">
                Run {meta.name} to see your {meta.output} output here.
              </p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Verdict */}
                <div>
                  <span className="fresco-label block mb-3">Verdict</span>
                  <div className={cn(
                    'px-4 py-3 border rounded-none',
                    verdictStyle?.bg,
                    verdictStyle?.text,
                    verdictStyle?.border
                  )}>
                    <div className="text-fresco-lg font-bold mb-1">{result.verdict}</div>
                    <p className="text-fresco-sm opacity-80">{result.verdictRationale}</p>
                  </div>
                </div>

                {/* Sentence of Truth */}
                <div>
                  <span className="fresco-label block mb-3">Sentence of Truth</span>
                  <div className="p-4 bg-fresco-black rounded-none">
                    <p className="text-fresco-base text-white font-medium leading-relaxed italic">
                      "{result.sentenceOfTruth}"
                    </p>
                  </div>
                </div>

                {/* Key Issues */}
                <div>
                  <span className="fresco-label block mb-3">Key Issues</span>
                  <div className="space-y-2">
                    {result.keyIssues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-fresco-light-gray rounded-none">
                        <div className="w-5 h-5 rounded-full border border-fresco-border flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-fresco-xs text-fresco-graphite-light">{i + 1}</span>
                        </div>
                        <p className="text-fresco-sm text-fresco-graphite-soft">{issue}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Necessary Moves */}
                <div>
                  <span className="fresco-label block mb-3">Necessary Moves</span>
                  <div className="space-y-2">
                    {result.necessaryMoves.map((move, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-fresco-light-gray rounded-none">
                        <div className="w-5 h-5 rounded-full bg-fresco-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-fresco-xs text-white font-medium">{i + 1}</span>
                        </div>
                        <p className="text-fresco-sm text-fresco-graphite-soft">{move}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Next Step */}
                {result.suggestedNextHouse && (
                  <div className="pt-2">
                    <span className="fresco-label block mb-3">Suggested Next Step</span>
                    <div className="p-4 border border-fresco-border rounded-none">
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={HOUSE_META[result.suggestedNextHouse].icon}
                          alt={result.suggestedNextHouse}
                          className="w-4 h-4 icon-theme opacity-60"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span className="text-fresco-sm font-medium text-fresco-black capitalize">
                          {result.suggestedNextHouse} house
                        </span>
                      </div>
                      <p className="text-fresco-xs text-fresco-graphite-mid mb-3">
                        {result.suggestedNextHouseReason}
                      </p>
                      <button
                        onClick={() => onNavigateToHouse?.(result.suggestedNextHouse!)}
                        className="flex items-center gap-2 text-fresco-sm font-medium text-fresco-black hover:text-fresco-graphite transition-colors"
                      >
                        <span>Open {HOUSE_NAMES[result.suggestedNextHouse]}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Export */}
                <div className="pt-2 border-t border-fresco-border-light">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="fresco-btn w-full"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-fresco-lg p-6 max-w-md w-full mx-4 shadow-fresco-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-fresco-lg font-medium text-fresco-black">Export</h3>
                <button onClick={() => setShowExportModal(false)} className="p-1 text-fresco-graphite-light hover:text-fresco-black transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {exportStatus && (
                <div className="mb-4 p-3 bg-fresco-light-gray rounded-fresco text-fresco-sm text-fresco-black flex items-center gap-2">
                  <Check className="w-4 h-4" />{exportStatus}
                </div>
              )}
              <div className="space-y-3">
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center gap-3 p-4 border border-fresco-border rounded-fresco hover:bg-fresco-light-gray transition-colors"
                >
                  {hasCopied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-fresco-graphite-mid" />}
                  <div className="text-left">
                    <p className="text-fresco-base text-fresco-black">Copy to Clipboard</p>
                    <p className="text-fresco-sm text-fresco-graphite-light">Copy as formatted text</p>
                  </div>
                </button>
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center gap-3 p-4 border border-fresco-border rounded-fresco hover:bg-fresco-light-gray transition-colors"
                >
                  <FileText className="w-5 h-5 text-fresco-graphite-mid" />
                  <div className="text-left">
                    <p className="text-fresco-base text-fresco-black">Download Markdown</p>
                    <p className="text-fresco-sm text-fresco-graphite-light">Save as .md file</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


