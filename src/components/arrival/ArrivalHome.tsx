'use client';

// WP1 — Arrival (spec Moment 1). One input, full focus. No house picker,
// no workspace creation, no framework vocabulary on the front door.

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Paperclip, Loader2, ArrowRight, Clock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useFrescoStore } from '@/lib/store';
import { getGuestRunCount, GUEST_RUN_LIMIT } from '@/lib/guestRuns';
import { formatRelativeTime } from '@/lib/utils';
import type { RouterResult } from '@/lib/houseQuestions';
import { HOUSE_META, type HouseId } from '@/lib/agents';
import { getRevisitCadence, isDueToRevisit, type RevisitCadence } from '@/lib/reminders';
import { ExampleSessionModal } from './ExampleSessionModal';

// Verdict accent tokens — the one chromatic note. Dot only; the label stays
// monochrome so the log reads calm at a glance.
const VERDICT_ACCENT: Record<string, string> = {
  'GO': 'var(--verdict-go-accent)',
  'PIVOT': 'var(--verdict-pivot-accent)',
  'STOP': 'var(--verdict-stop-accent)',
  'INVESTIGATE FURTHER': 'var(--verdict-signal-accent)',
};

const PLACEHOLDER =
  "e.g. We've spent six weeks redesigning onboarding, but drop-off happens before step 3 even loads. Do we keep going or stop?";

const EXAMPLE_CHIPS = [
  'Should we build this feature?',
  'Pivot or stay the course?',
  'Is this idea worth a month?',
];

interface ArrivalHomeProps {
  onRouted: (input: string, result: RouterResult) => void;
  onNavigateToSession?: (sessionId: string, workspaceId: string) => void;
}

export function ArrivalHome({ onRouted, onNavigateToSession }: ArrivalHomeProps) {
  const { data: authSession, status } = useSession();
  const { user, getRecentSessions } = useFrescoStore();
  const [input, setInput] = useState('');
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showExample, setShowExample] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [guestRunsUsed, setGuestRunsUsed] = useState(0);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Voice input — same MediaRecorder → /api/transcribe path the session
  // screens use (Nombulelo praised it; spec keeps it as a quiet icon).
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [cadence, setCadence] = useState<RevisitCadence>('off');

  useEffect(() => {
    try {
      setIsFirstRun(!localStorage.getItem('fresco-has-run'));
      setGuestRunsUsed(getGuestRunCount());
      setCadence(getRevisitCadence());
    } catch { /* SSR/storage guard */ }
  }, []);

  const isGuest = status !== 'authenticated';
  const subscription = user?.subscription || 'free';
  const isUnlimited = !isGuest && subscription !== 'free';
  const monthlyLimit = 3;
  const runsUsed = isGuest
    ? guestRunsUsed
    : Math.min(user?.aiGenerationsThisMonth || 0, monthlyLimit);
  const runsLeft = Math.max(0, (isGuest ? GUEST_RUN_LIMIT : monthlyLimit) - runsUsed);

  // Decision log (WP4) — past verdicts, most recent first. A session counts
  // once it has produced a verdict; in-progress sessions stay out of the log.
  const decisions = getRecentSessions(20)
    .filter(s => (s as any).aiOutputs?.verdict || (s as any).aiOutputs?.houseResult?.verdict)
    .slice(0, 6);

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          try {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: reader.result }),
            });
            if (res.ok) {
              const { text } = await res.json();
              if (text) setInput(prev => (prev ? `${prev}\n\n${text}` : text));
            }
          } catch { /* leave input as-is */ }
        };
      };
      rec.start();
      setRecording(true);
    } catch {
      setRouteError('Microphone access denied.');
    }
  };

  const stopVoice = () => {
    recRef.current?.stop();
    setRecording(false);
  };

  const handleFile = async (file: File) => {
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/extract-file', { method: 'POST', body: formData });
      const { text } = await res.json();
      if (text) setInput(prev => (prev ? `${prev}\n\n--- From ${file.name} ---\n${text}` : text));
    } catch {
      setRouteError(`Couldn't read ${file.name}.`);
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (trimmed.length < 10 || isRouting) return;
    setIsRouting(true);
    setRouteError(null);
    try {
      const res = await fetch('/api/route-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Routing failed (${res.status})`);
      }
      const result: RouterResult = await res.json();
      onRouted(trimmed, result);
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : 'Something went wrong — try again.');
      setIsRouting(false);
    }
    // No setIsRouting(false) on success — the parent navigates away and we
    // don't want a flash of the re-enabled state.
  };

  return (
    <div className="min-h-screen fresco-grid-bg-subtle flex flex-col">
      {/* Quota telemetry — mono voice, top right */}
      <div className="flex justify-end px-4 md:px-8 pt-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fresco-graphite-light">
          {isUnlimited
            ? 'VERDICTS · UNLIMITED'
            : `VERDICTS LEFT THIS MONTH · ${runsLeft} OF ${isGuest ? GUEST_RUN_LIMIT : monthlyLimit}`}
        </span>
      </div>

      {/* Centred input — the front door */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-8 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <h1 className="text-fresco-2xl md:text-fresco-3xl font-medium text-fresco-black tracking-tight mb-6 text-center">
            What decision are you trying to make?
          </h1>

          <div className="relative">
            <textarea
              ref={textRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={PLACEHOLDER}
              className="w-full px-4 pt-4 pb-12 text-fresco-base text-fresco-black bg-fresco-white border border-fresco-border focus:outline-none focus:border-fresco-black transition-colors resize-none leading-relaxed"
              style={{ minHeight: 150 }}
              disabled={isRouting}
            />
            {/* Quiet icons inside the field — voice + doc upload */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1">
              <button
                type="button"
                onClick={recording ? stopVoice : startVoice}
                title={recording ? 'Stop recording' : 'Speak instead'}
                className={
                  recording
                    ? 'p-1.5 text-red-500 animate-pulse'
                    : 'p-1.5 text-fresco-graphite-light hover:text-fresco-black transition-colors'
                }
              >
                {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                title="Attach a document"
                className="p-1.5 text-fresco-graphite-light hover:text-fresco-black transition-colors"
                disabled={extracting}
              >
                {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={input.trim().length < 10 || isRouting}
              className="absolute bottom-3 right-3 h-9 px-4 bg-fresco-black text-white text-fresco-sm font-medium flex items-center gap-2 hover:bg-fresco-graphite transition-colors disabled:opacity-30"
            >
              {isRouting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Reading…</span></>
              ) : (
                <><span>Think it through</span><ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>

          {routeError && (
            <p className="mt-2 text-fresco-xs text-red-600">{routeError}</p>
          )}

          {/* Example chips — the lightweight guided example */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {EXAMPLE_CHIPS.map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => { setInput(chip + ' — '); textRef.current?.focus(); }}
                className="px-3 py-1.5 text-fresco-xs text-fresco-graphite-mid bg-fresco-white border border-fresco-border hover:border-fresco-black hover:text-fresco-black transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* First-run safety net — read-only sample, spends no run */}
          {isFirstRun && (
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => setShowExample(true)}
                className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black underline underline-offset-4 transition-colors"
              >
                See an example session
              </button>
            </div>
          )}

          {/* Decision log (WP4 / spec Moment 5) — every verdict you've reached,
              one row each: the decision, its verdict, which analysis, when.
              Click to revisit; "run again" re-tests with new evidence. The
              structural thing a chat can't do. */}
          {decisions.length > 0 && (
            <div className="mt-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fresco-graphite-light mb-3">
                Your decisions
              </p>
              <div className="border border-fresco-border-light bg-fresco-white divide-y divide-fresco-border-light">
                {decisions.map(s => {
                  const verdict = (s as any).aiOutputs?.verdict || (s as any).aiOutputs?.houseResult?.verdict;
                  const accent = VERDICT_ACCENT[verdict] || VERDICT_ACCENT['INVESTIGATE FURTHER'];
                  const houseType = (s as any).houseType as HouseId | undefined;
                  const houseName = houseType ? HOUSE_META[houseType]?.name : null;
                  // Lead with the decision the user faced (their prompt), not
                  // the engine's sentence of truth — this is a log of decisions.
                  const line = (s as any).routerOutput?.prompt
                    || (s as any).title
                    || (s as any).sentenceOfTruth?.content
                    || 'Untitled decision';
                  const dueToRevisit = isDueToRevisit(s.updatedAt as any, cadence);
                  return (
                    <div
                      key={s.id}
                      className="group flex items-center justify-between px-4 py-3 hover:bg-fresco-light-gray transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => onNavigateToSession?.(s.id, s.workspaceId)}
                        className="flex items-start gap-3 min-w-0 flex-1 text-left"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: accent }} />
                        <span className="min-w-0">
                          <span className="block text-fresco-sm text-fresco-black truncate">{line}</span>
                          <span className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[10px] uppercase tracking-wide text-fresco-graphite-mid">
                              {verdict === 'INVESTIGATE FURTHER' ? 'MORE SIGNAL' : verdict}
                            </span>
                            {houseName && (
                              <>
                                <span className="text-fresco-graphite-light/40 text-[10px]">·</span>
                                <span className="text-[10px] text-fresco-graphite-light">{houseName}</span>
                              </>
                            )}
                            <span className="text-fresco-graphite-light/40 text-[10px]">·</span>
                            <span className="text-[10px] text-fresco-graphite-light flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatRelativeTime(new Date(s.updatedAt))}
                            </span>
                            {dueToRevisit && (
                              <>
                                <span className="text-fresco-graphite-light/40 text-[10px]">·</span>
                                <span className="font-mono text-[10px] uppercase tracking-wide text-fresco-black">due to revisit ↻</span>
                              </>
                            )}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigateToSession?.(s.id, s.workspaceId)}
                        className="flex-shrink-0 ml-3 text-fresco-xs text-fresco-graphite-light opacity-0 group-hover:opacity-100 hover:text-fresco-black transition-all flex items-center gap-1"
                      >
                        Open <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <ExampleSessionModal isOpen={showExample} onClose={() => setShowExample(false)} />
    </div>
  );
}
