'use client';

// FRESCO HouseSession — v2
// Middle panel: guided contextual fields per house (from HOUSE_FIELDS)
// Right panel: streams each agent signal as it arrives, then shows merged verdict

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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDBWrite } from '@/lib/useDBSync';
import { useFrescoStore } from '@/lib/store';
import { HOUSE_META, HOUSE_FIELDS, type HouseId } from '@/lib/agents';
import type { HouseResult } from '@/lib/orchestrator';

interface HouseSessionProps {
  houseId: HouseId;
  workspaceId: string;
  sessionId: string;
  onBack?: () => void;
  onNavigateToHouse?: (houseId: HouseId) => void;
}

interface AgentStreamEvent {
  displayName: string;
  signal: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low';
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'GO':                  { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'PIVOT':               { bg: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  'INVESTIGATE FURTHER': { bg: 'bg-blue-50',    text: 'text-blue-800',    border: 'border-blue-200',    dot: 'bg-blue-500' },
  'STOP':                { bg: 'bg-red-50',      text: 'text-red-800',     border: 'border-red-200',     dot: 'bg-red-500' },
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
  const fields = HOUSE_FIELDS[houseId];

  // ── Restore persisted result ──────────────────────────────────────────────
  const getPersistedResult = (): HouseResult | null => {
    if (!session) return null;
    const ao = (session as any).aiOutputs;
    if (ao?.houseResult) return ao.houseResult as HouseResult;
    if (ao?.sentenceOfTruth && ao?.keyIssues?.length) {
      return {
        house: houseId,
        fitLabel: ao.fitLabel ?? meta.output,
        fitStrength: ao.fitStrength ?? 'Undecided',
        verdict: ao.verdict ?? 'INVESTIGATE FURTHER',
        verdictRationale: ao.verdictRationale ?? '',
        sentenceOfTruth: ao.sentenceOfTruth,
        keyIssues: ao.keyIssues ?? [],
        necessaryMoves: ao.necessaryMoves ?? [],
        suggestedNextHouse: ao.suggestedNextHouse ?? null,
        suggestedNextHouseReason: ao.suggestedNextHouseReason ?? '',
        outputLabel: ao.outputLabel ?? meta.output,
      };
    }
    return null;
  };

  // ── State ─────────────────────────────────────────────────────────────────
  // Guided field values keyed by field.id
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [url, setUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  // Streaming state
  const [agentEvents, setAgentEvents] = useState<AgentStreamEvent[]>([]);
  const [result, setResult] = useState<HouseResult | null>(() => getPersistedResult());

  // Export / copy
  const [hasCopied, setHasCopied] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState<string | null>(null); // field id being recorded
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Required field must have content
  const requiredField = fields.find(f => f.required);
  const canRun = !isRunning && !!(requiredField && (fieldValues[requiredField.id] || '').trim().length >= 10);

  // ── Build combined input from fields ──────────────────────────────────────
  const buildUserInput = () => {
    return fields
      .map(f => {
        const val = (fieldValues[f.id] || '').trim();
        if (!val) return null;
        return `${f.label}\n${val}`;
      })
      .filter(Boolean)
      .join('\n\n');
  };

  // ── Run ───────────────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (!canRun) return;
    setIsRunning(true);
    setResult(null);
    setAgentEvents([]);

    const userInput = buildUserInput();

    try {
      // Build workspace context from prior sessions
      const priorSessions = sessions.filter(s => s.workspaceId === workspaceId && s.id !== sessionId);
      const context = priorSessions
        .filter(s => s.sentenceOfTruth?.content || (s.insights && s.insights.length > 0))
        .slice(0, 3)
        .map(s => {
          const lines: string[] = [];
          if (s.sentenceOfTruth?.content) lines.push(`Core finding: "${s.sentenceOfTruth.content}"`);
          if (s.insights?.length) lines.push(`Insights: ${s.insights.slice(0, 2).map((i: any) => i.content || i).join('; ')}`);
          return lines.join('\n');
        })
        .join('\n---\n');

      const body: Record<string, string> = { userInput };
      if (context) body.context = context;
      if (url.trim()) body.url = url.trim();

      const response = await fetch(`/api/houses/${houseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Request failed');

      const contentType = response.headers.get('content-type') || '';

      // ── Streaming SSE response ────────────────────────────────────────────
      if (contentType.includes('text/event-stream')) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'agent') {
                setAgentEvents(prev => [...prev, {
                  displayName: event.displayName,
                  signal: event.signal,
                  summary: event.summary || '',
                  confidence: event.confidence || 'medium',
                }]);
              } else if (event.type === 'verdict') {
                const { type, ...verdictData } = event;
                const houseResult = verdictData as HouseResult;
                setResult(houseResult);
                await persistResult(houseResult, userInput);
              }
            } catch { /* skip malformed events */ }
          }
        }
      } else {
        // Non-streaming fallback (no API key path)
        const data = await response.json();
        if (data.type === 'verdict' || data.verdict) {
          setResult(data as HouseResult);
          await persistResult(data as HouseResult, userInput);
        }
      }
    } catch (err) {
      console.error('House run failed:', err);
    }

    setIsRunning(false);
  }, [canRun, fieldValues, url, houseId, sessions, workspaceId, sessionId, session, db]);

  const persistResult = async (data: HouseResult, userInput: string) => {
    if (!session) return;
    await db.saveAIOutputs(sessionId, {
      insights: data.keyIssues,
      sentenceOfTruth: data.sentenceOfTruth,
      necessaryMoves: data.necessaryMoves,
    });
    useFrescoStore.getState().updateSession(sessionId, {
      aiOutputs: {
        houseResult: data,
        verdict: data.verdict,
        verdictRationale: data.verdictRationale,
        keyIssues: data.keyIssues,
        necessaryMoves: data.necessaryMoves,
        sentenceOfTruth: data.sentenceOfTruth,
        suggestedNextHouse: data.suggestedNextHouse,
        suggestedNextHouseReason: data.suggestedNextHouseReason,
        outputLabel: data.outputLabel,
      },
    } as any);
  };

  // ── Voice recording ───────────────────────────────────────────────────────
  const startRecording = async (fieldId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: reader.result }),
            });
            if (res.ok) {
              const { text } = await res.json();
              if (text) setFieldValues(prev => ({
                ...prev,
                [fieldId]: prev[fieldId] ? `${prev[fieldId]}\n\n${text}` : text,
              }));
            }
          };
        } catch { /* ignore */ }
      };
      recorder.start();
      setIsRecording(fieldId);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { alert('Could not access microphone.'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(null);
    setRecordingTime(0);
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const generateExportText = () => {
    if (!result) return '';
    const inputLines = fields
      .filter(f => fieldValues[f.id]?.trim())
      .map(f => `### ${f.label}\n${fieldValues[f.id].trim()}`);

    return [
      `# ${meta.name} — ${result.outputLabel}`,
      `**Workspace:** ${workspace?.title || 'Unknown'}`,
      `**Date:** ${new Date().toLocaleDateString()}`,
      '',
      '## Input',
      ...inputLines,
      '',
      `## Verdict: ${result.verdict}`,
      result.verdictRationale,
      '',
      '## Sentence of Truth',
      result.sentenceOfTruth,
      '',
      '## Key Issues',
      ...result.keyIssues.map((issue, i) => `${i + 1}. ${issue}`),
      '',
      '## Necessary Moves',
      ...result.necessaryMoves.map((move, i) => `${i + 1}. ${move}`),
    ].join('\n');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateExportText());
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generateExportText()], { type: 'text/markdown' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${houseId}-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const verdictStyle = result ? (VERDICT_STYLES[result.verdict] || VERDICT_STYLES['INVESTIGATE FURTHER']) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row h-full bg-fresco-white">

      {/* ── MIDDLE: Guided fields ─────────────────────────────────────────── */}
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

          {/* Guided fields */}
          <div className="space-y-8">
            {fields.map((field, idx) => {
              const isGoalField = field.id === 'goal';
              // Split "Label (Agent Name)" into label + agent tag for non-goal fields
              const agentMatch = !isGoalField && field.label.match(/^(.+?)\s+\((.+?)\)$/);
              const fieldLabel = agentMatch ? agentMatch[1] : field.label;
              const agentTag = agentMatch ? agentMatch[2] : null;

              return (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={isGoalField ? '' : 'pt-2'}
              >
                {/* Divider before first agent field */}
                {idx === 1 && (
                  <div className="flex items-center gap-3 mb-6 -mt-2">
                    <div className="flex-1 h-px bg-fresco-border-light" />
                    <span className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wider">Tell each engine what it needs</span>
                    <div className="flex-1 h-px bg-fresco-border-light" />
                  </div>
                )}

                <div className="flex items-center gap-2 mb-1">
                  <div className={isGoalField ? 'text-fresco-xl font-medium text-fresco-black' : 'fresco-step-label'}>
                    {isGoalField ? field.label : (field.required ? fieldLabel : `${fieldLabel} (optional)`)}
                  </div>
                  {agentTag && (
                    <span className="text-fresco-xs text-fresco-graphite-light bg-fresco-light-gray px-2 py-0.5 rounded-full font-normal">
                      {agentTag}
                    </span>
                  )}
                </div>
                {isGoalField ? (
                  <p className="text-fresco-base text-fresco-graphite-mid mb-3">{field.prompt}</p>
                ) : (
                  <p className="text-fresco-sm text-fresco-graphite-mid mb-3">{field.prompt}</p>
                )}
                <p className="text-fresco-sm text-fresco-graphite-mid mb-3">{field.prompt}</p>
                <div className="relative">
                  <textarea
                    value={fieldValues[field.id] || ''}
                    onChange={e => setFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="fresco-input-lg pr-24"
                    style={{ minHeight: field.minHeight }}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <button
                      onClick={() => isRecording === field.id ? stopRecording() : startRecording(field.id)}
                      className={cn(
                        'p-2 rounded-full transition-all',
                        isRecording === field.id
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-fresco-light-gray text-fresco-graphite-mid hover:bg-fresco-border hover:text-fresco-black'
                      )}
                      title={isRecording === field.id ? 'Stop recording' : 'Record voice'}
                    >
                      {isRecording === field.id ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => fileInputRefs.current[field.id]?.click()}
                      className="p-2 rounded-full bg-fresco-light-gray text-fresco-graphite-mid hover:bg-fresco-border hover:text-fresco-black transition-all"
                      title="Upload file"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <input
                      ref={el => { fileInputRefs.current[field.id] = el; }}
                      type="file"
                      multiple
                      accept=".txt,.md,.csv,.json"
                      className="hidden"
                      onChange={async e => {
                        const files = e.target.files;
                        if (!files) return;
                        for (const file of Array.from(files)) {
                          const text = await new Promise<string>(res => {
                            const reader = new FileReader();
                            reader.onload = ev => res(ev.target?.result as string);
                            reader.readAsText(file);
                          });
                          setFieldValues(prev => ({
                            ...prev,
                            [field.id]: prev[field.id] ? `${prev[field.id]}\n\n--- From ${file.name} ---\n${text}` : text,
                          }));
                        }
                      }}
                    />
                  </div>
                </div>
                {isRecording === field.id && (
                  <div className="mt-2 flex items-center gap-2 text-fresco-sm text-red-500">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                  </div>
                )}
              </motion.div>
              );
            })}

            {/* URL — Evaluate only */}
            {houseId === 'evaluate' && (
              <div>
                <div className="fresco-step-label mb-1">URL to evaluate (optional)</div>
                <p className="text-fresco-sm text-fresco-graphite-mid mb-3">Paste a live URL and it will be included in the evaluation context.</p>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://yoursite.com/page"
                  className="w-full h-11 px-4 text-fresco-base text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black transition-all"
                />
              </div>
            )}

            {/* Run CTA */}
            <div className="pt-2">
              <button
                onClick={handleRun}
                disabled={!canRun}
                className={cn(
                  'fresco-btn w-full',
                  !canRun && 'opacity-40 cursor-not-allowed pointer-events-none'
                )}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Running analysis…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run {meta.name}</span>
                  </>
                )}
              </button>
              {!canRun && !isRunning && (
                <p className="text-center text-fresco-xs text-fresco-graphite-light mt-2">
                  Tell us what you're trying to do to run the analysis
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Streaming output ───────────────────────────────────────── */}
      <div className="w-full md:w-[360px] max-h-[60vh] md:max-h-none border-t md:border-t-0 md:border-l border-fresco-border-light bg-fresco-off-white overflow-y-auto">
        <div className="p-6">

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black">Output</h2>
            {isRunning && (
              <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-light">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analysing…</span>
              </div>
            )}
          </div>

          {/* Empty state */}
          {!result && agentEvents.length === 0 && !isRunning && (
            <div className="py-12 text-center">
              <img
                src={meta.icon}
                alt={meta.name}
                className="w-8 h-8 mx-auto mb-4 opacity-20 icon-theme"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <p className="text-fresco-sm text-fresco-graphite-light">
                Fill in the fields and run {meta.name} to see your {meta.output} output here.
              </p>
            </div>
          )}

          {/* Streaming agent signals */}
          <AnimatePresence>
            {(isRunning || (!result && agentEvents.length > 0)) && agentEvents.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-6 space-y-3"
              >
                <span className="fresco-label block mb-3">Agents thinking…</span>
                {agentEvents.map((event, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-fresco-light-gray rounded-none border-l-2 border-fresco-black/20"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-fresco-black flex-shrink-0" />
                        <span className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wide">
                          {event.displayName}
                        </span>
                      </div>
                      <span className={`text-fresco-xs px-1.5 py-0.5 rounded-full ${
                        event.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                        event.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-fresco-border text-fresco-graphite-light'
                      }`}>
                        {event.confidence}
                      </span>
                    </div>
                    <p className="text-fresco-sm text-fresco-graphite-soft leading-relaxed">
                      {event.signal}
                    </p>
                  </motion.div>
                ))}
                {isRunning && agentEvents.length < 3 && (
                  <div className="p-3 bg-fresco-light-gray rounded-none border-l-2 border-fresco-border animate-pulse">
                    <div className="h-3 w-24 bg-fresco-border rounded mb-2" />
                    <div className="h-3 w-full bg-fresco-border rounded" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Final merged result */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Verdict */}
                <div>
                  <span className="fresco-label block mb-3">Verdict</span>
                  <div className={cn(
                    'px-4 py-3 border rounded-none',
                    verdictStyle?.bg, verdictStyle?.text, verdictStyle?.border
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', verdictStyle?.dot)} />
                        <span className="text-fresco-lg font-bold">{result.verdict}</span>
                      </div>
                      {(result as any).fitStrength && (
                        <span className="text-fresco-xs font-medium opacity-70">
                          {(result as any).fitLabel}: {(result as any).fitStrength}
                        </span>
                      )}
                    </div>
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

                {/* Suggested next house */}
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
                        <span>Open {HOUSE_META[result.suggestedNextHouse].name}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Export */}
                <div className="pt-2 border-t border-fresco-border-light">
                  <button onClick={() => setShowExportModal(true)} className="fresco-btn w-full">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Export modal */}
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
                  <Download className="w-5 h-5 text-fresco-graphite-mid" />
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
