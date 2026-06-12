'use client';

// WP1 — Clarify (spec Moment 2). "Here's what I took from your
// description": extracted answers as editable confirm cards, the (≤3)
// genuinely missing questions below with their reasons, the house badge
// with override, and the original prompt pinned. Single column on mobile
// by construction.

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Pencil, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HOUSE_META, type HouseId } from '@/lib/agents';
import {
  questionsFor,
  type AnswerSource,
  type EvaluateMode,
  type RouterResult,
} from '@/lib/houseQuestions';

export interface ClarifiedAnswer {
  answer: string;
  source: AnswerSource;
  confirmed: boolean;
}

interface ClarifyScreenProps {
  prompt: string;
  router: RouterResult;
  isStarting: boolean;
  onRun: (payload: {
    prompt: string;
    house: HouseId;
    evaluateMode: EvaluateMode | null;
    answers: Record<string, ClarifiedAnswer>;
    router: RouterResult;
  }) => void;
  onEditPrompt: (newPrompt: string, reroute: boolean) => void;
  onBack: () => void;
}

const HOUSE_OPTIONS: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

export function ClarifyScreen({ prompt, router, isStarting, onRun, onEditPrompt, onBack }: ClarifyScreenProps) {
  const [house, setHouse] = useState<HouseId>(router.house);
  const [evaluateMode] = useState<EvaluateMode | null>(router.evaluateMode);
  const [showHousePicker, setShowHousePicker] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState(prompt);

  // Answers: extracted ones start unconfirmed; editing flips source to
  // 'user'. Gap questions start empty with source 'user'.
  const [answers, setAnswers] = useState<Record<string, ClarifiedAnswer>>(() => {
    const initial: Record<string, ClarifiedAnswer> = {};
    for (const [id, ex] of Object.entries(router.extracted)) {
      initial[id] = { answer: ex.answer, source: 'extracted', confirmed: false };
    }
    return initial;
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Re-route is non-destructive: when a prompt edit produces a new router
  // result, fresh extractions land but the user's own answers and edits
  // always win over them.
  useEffect(() => {
    setHouse(router.house);
    setAnswers(prev => {
      const next: Record<string, ClarifiedAnswer> = {};
      for (const [id, ex] of Object.entries(router.extracted)) {
        next[id] = { answer: ex.answer, source: 'extracted', confirmed: false };
      }
      for (const [id, a] of Object.entries(prev)) {
        if (a.source === 'user' && a.answer.trim()) next[id] = a;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const canonical = useMemo(() => questionsFor(house, evaluateMode), [house, evaluateMode]);
  const extractedIds = canonical.filter(q => router.extracted[q.id]).map(q => q.id);
  // House override invalidates extractions that don't map to the new house.
  const visibleExtracted = extractedIds.filter(id => answers[id]);
  const followups = house === router.house
    ? router.followups
    : canonical
        .filter(q => !answers[q.id]?.answer)
        .slice(0, 3)
        .map(q => ({ questionId: q.id, question: q.question, reason: 'Needed after switching the analysis type.' }));

  const questionTextOf = (id: string) => canonical.find(q => q.id === id)?.question || id;

  const setAnswer = (id: string, answer: string, source: AnswerSource) =>
    setAnswers(prev => ({ ...prev, [id]: { answer, source, confirmed: source === 'user' ? true : prev[id]?.confirmed || false } }));

  const confirmAnswer = (id: string) =>
    setAnswers(prev => ({ ...prev, [id]: { ...prev[id], confirmed: true } }));

  const primaryAnswered = Object.values(answers).some(a => a.answer.trim().length >= 3);
  const canRun = primaryAnswered && !isStarting;

  const handleRun = () => {
    if (!canRun) return;
    // Anything left unconfirmed counts as tacitly confirmed at run time —
    // one tap on "Run" is the confirmation for the whole set (spec: a rich
    // prompt goes straight to a single confirm step).
    const confirmedAll = Object.fromEntries(
      Object.entries(answers)
        .filter(([, a]) => a.answer.trim())
        .map(([id, a]) => [id, { ...a, confirmed: true }])
    );
    onRun({ prompt, house, evaluateMode, answers: confirmedAll, router });
  };

  return (
    <div className="min-h-screen fresco-grid-bg-subtle">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">

        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors mb-6"
        >
          ← Start over
        </button>

        {/* Pinned original prompt — visible from here to the verdict */}
        <div className="sticky top-0 z-30 -mx-4 md:mx-0 bg-fresco-white border border-fresco-border-light px-4 py-3 mb-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fresco-graphite-light mb-1">
                Your decision
              </p>
              {editingPrompt ? (
                <div>
                  <textarea
                    value={promptDraft}
                    onChange={e => setPromptDraft(e.target.value)}
                    className="w-full text-fresco-sm text-fresco-black bg-fresco-light-gray border-none p-2 focus:outline-none resize-none leading-relaxed"
                    style={{ minHeight: 80 }}
                    autoFocus
                  />
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => { setEditingPrompt(false); onEditPrompt(promptDraft.trim(), true); }}
                      className="text-fresco-xs font-medium text-fresco-black hover:opacity-70"
                    >
                      Save &amp; re-route
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingPrompt(false); onEditPrompt(promptDraft.trim(), false); }}
                      className="text-fresco-xs text-fresco-graphite-mid hover:text-fresco-black"
                    >
                      Save, keep answers
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPromptDraft(prompt); setEditingPrompt(false); }}
                      className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className={cn(
                    'text-fresco-sm text-fresco-black leading-relaxed cursor-pointer',
                    !promptExpanded && 'line-clamp-2'
                  )}
                  onClick={() => setPromptExpanded(v => !v)}
                  title={promptExpanded ? 'Collapse' : 'Expand'}
                >
                  {prompt}
                </p>
              )}
            </div>
            {!editingPrompt && (
              <button
                type="button"
                onClick={() => { setPromptDraft(prompt); setEditingPrompt(true); }}
                className="p-1 text-fresco-graphite-light hover:text-fresco-black transition-colors flex-shrink-0"
                title="Edit your decision"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* House badge — small, after routing, override for power users */}
        <div className="relative mb-8">
          <button
            type="button"
            onClick={() => setShowHousePicker(v => !v)}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-fresco-graphite-light hover:text-fresco-black transition-colors"
          >
            RUNNING AS · {HOUSE_META[house].name.toUpperCase()}
            <span className="ml-2 underline underline-offset-2">change</span>
          </button>
          <AnimatePresence>
            {showHousePicker && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute top-6 left-0 z-40 bg-fresco-white border border-fresco-border shadow-lg"
              >
                {HOUSE_OPTIONS.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => { setHouse(h); setShowHousePicker(false); }}
                    className={cn(
                      'block w-full text-left px-4 py-2.5 text-fresco-sm hover:bg-fresco-light-gray transition-colors',
                      h === house ? 'text-fresco-black font-medium' : 'text-fresco-graphite-mid'
                    )}
                  >
                    {HOUSE_META[h].name}
                    <span className="block text-fresco-xs text-fresco-graphite-light">{HOUSE_META[h].output}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Extracted answers — confirm cards */}
        {visibleExtracted.length > 0 && (
          <div className="mb-10">
            <h2 className="text-fresco-lg font-medium text-fresco-black mb-1">
              Here&rsquo;s what I took from your description
            </h2>
            <p className="text-fresco-sm text-fresco-graphite-light mb-4">
              Tap to confirm, or edit anything I got wrong.
            </p>
            <div className="space-y-3">
              {visibleExtracted.map(id => {
                const a = answers[id];
                const isEditing = editingId === id;
                return (
                  <div
                    key={id}
                    className={cn(
                      'border bg-fresco-white transition-colors',
                      a.confirmed ? 'border-fresco-black' : 'border-fresco-border'
                    )}
                  >
                    <div className="px-4 pt-3">
                      <p className="text-fresco-xs text-fresco-graphite-light">{questionTextOf(id)}</p>
                    </div>
                    {isEditing ? (
                      <div className="px-4 pb-3 pt-1">
                        <textarea
                          value={a.answer}
                          onChange={e => setAnswer(id, e.target.value, 'user')}
                          className="w-full text-fresco-sm text-fresco-black bg-fresco-light-gray border-none p-2 focus:outline-none resize-none leading-relaxed"
                          style={{ minHeight: 70 }}
                          autoFocus
                          onBlur={() => setEditingId(null)}
                        />
                      </div>
                    ) : (
                      <p
                        className="px-4 pb-3 pt-1 text-fresco-sm text-fresco-black leading-relaxed cursor-text"
                        onClick={() => setEditingId(id)}
                      >
                        {a.answer}
                      </p>
                    )}
                    <div className="flex items-center justify-between border-t border-fresco-border-light px-4 py-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fresco-graphite-light">
                        {a.source === 'extracted' ? 'FROM YOUR DESCRIPTION' : 'EDITED BY YOU'}
                      </span>
                      {a.confirmed ? (
                        <span className="flex items-center gap-1 text-fresco-xs text-fresco-black">
                          <Check className="w-3 h-3" /> Confirmed
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => confirmAnswer(id)}
                          className="text-fresco-xs font-medium text-fresco-graphite-mid hover:text-fresco-black transition-colors"
                        >
                          Looks right
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gap questions — max 3, each with its reason */}
        {followups.length > 0 && (
          <div className="mb-10">
            <h2 className="text-fresco-lg font-medium text-fresco-black mb-1">
              {visibleExtracted.length > 0 ? 'A few things I couldn’t find' : 'Tell me a little more'}
            </h2>
            <p className="text-fresco-sm text-fresco-graphite-light mb-4">
              {followups.length === 1 ? 'One question' : `${followups.length} questions`} — each one sharpens the verdict.
            </p>
            <div className="space-y-5">
              {followups.map(f => (
                <div key={f.questionId}>
                  <p className="text-fresco-base font-medium text-fresco-black mb-1">{f.question}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fresco-graphite-light mb-2">
                    NEEDED FOR · {f.reason}
                  </p>
                  <textarea
                    value={answers[f.questionId]?.answer || ''}
                    onChange={e => setAnswer(f.questionId, e.target.value, 'user')}
                    placeholder="A sentence or two is enough"
                    className="w-full px-3 py-2.5 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border focus:outline-none focus:border-fresco-black transition-colors resize-none leading-relaxed"
                    style={{ minHeight: 80 }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Run */}
        <div className="sticky bottom-0 -mx-4 md:mx-0 bg-fresco-white border-t border-fresco-border-light px-4 md:px-0 py-4">
          <button
            type="button"
            onClick={handleRun}
            disabled={!canRun}
            className={cn('fresco-btn w-full', !canRun && 'opacity-40 cursor-not-allowed')}
          >
            {isStarting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Setting up…</span></>
            ) : (
              <><span>Run the analysis</span><ArrowRight className="w-4 h-4" /></>
            )}
          </button>
          {followups.length === 0 && visibleExtracted.length > 0 && (
            <p className="text-center text-fresco-xs text-fresco-graphite-light mt-2">
              Your description covered everything — confirm and run.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
