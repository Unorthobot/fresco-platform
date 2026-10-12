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
  type RouterFollowup,
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
    url: string;
  }) => void;
  onEditPrompt: (newPrompt: string, reroute: boolean) => void;
  onBack: () => void;
}

const HOUSE_OPTIONS: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

// True when an extracted answer is the founder's own sentence handed back
// with cosmetic changes rather than a reading of it. Printing such an answer
// puts their paragraph on screen a second time and proves nothing, so the
// card shows only the question it answered. An answer that genuinely
// reframes or condenses the input falls through and is printed in full,
// which is precisely when it is worth checking.
function isRestatement(answer: string, source: string): boolean {
  const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const a = words(answer);
  if (a.length < 8) return false;
  // Length first: a condensation is not a restatement however much of its
  // vocabulary it borrows.
  const src = words(source);
  if (a.length < src.length * 0.6) return false;
  const pool = new Set(src);
  const shared = a.filter(w => pool.has(w)).length;
  return shared / a.length >= 0.8;
}

export function ClarifyScreen({ prompt, router, isStarting, onRun, onEditPrompt, onBack }: ClarifyScreenProps) {
  const [house, setHouse] = useState<HouseId>(router.house);
  const [evaluateMode, setEvaluateMode] = useState<EvaluateMode | null>(router.evaluateMode);
  const [url, setUrl] = useState('');
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
    setEvaluateMode(router.evaluateMode);
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
  // Typed explicitly: the house-override branch builds plain literals, and
  // without the annotation TypeScript infers the narrower of the two shapes
  // and loses `options`. That branch has no router candidates by definition,
  // since the router analysed a different house.
  const followups: RouterFollowup[] = house === router.house && evaluateMode === router.evaluateMode
    ? router.followups
    : canonical
        .filter(q => !answers[q.id]?.answer)
        .slice(0, 3)
        .map(q => ({ questionId: q.id, question: q.question, reason: q.whyItMatters, options: [] }));

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
    onRun({ prompt, house, evaluateMode, answers: confirmedAll, router, url: url.trim() });
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
                    onClick={() => { setHouse(h); setEvaluateMode(h === 'evaluate' ? (evaluateMode || 'single') : null); setShowHousePicker(false); }}
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

          {/* Evaluate mode — the legacy flow let users say what kind of
              evaluation this is; the router guesses but must be overridable */}
          {house === 'evaluate' && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {([
                ['single', 'Single page', 'One page or feature'],
                ['journey', 'Multi-step flow', 'A funnel or sequence'],
                ['comparison', 'Two versions', 'A/B or current vs target'],
              ] as const).map(([m, label, desc]) => {
                const active = (evaluateMode || 'single') === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEvaluateMode(m)}
                    className={cn(
                      'px-3 py-2 border text-left transition-colors',
                      active
                        ? 'border-fresco-black bg-fresco-black text-white'
                        : 'border-fresco-border text-fresco-graphite-mid hover:border-fresco-black hover:text-fresco-black'
                    )}
                  >
                    <span className="block text-fresco-xs font-medium">{label}</span>
                    <span className={cn('block text-[10px]', active ? 'text-white/60' : 'text-fresco-graphite-light')}>{desc}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Extracted answers — confirm cards */}
        {visibleExtracted.length > 0 && (
          <div className="mb-10">
            <h2 className="text-fresco-lg font-medium text-fresco-black mb-1">
              Here&rsquo;s what I took from your description
            </h2>
            {/* Their own paragraph, with the parts the engine drew on marked
                in place. Restating extractions as cards alone proves nothing;
                showing WHERE each one came from is what answers "did it
                actually read me". Spans are verified against the real text
                both here and server-side, so a near-miss highlights nothing
                rather than highlighting the wrong words. */}
            {(() => {
              const spans = visibleExtracted
                .map(id => ({ id, source: (router.extracted[id] as { source?: string } | undefined)?.source }))
                .filter((x): x is { id: string; source: string } => {
                  if (!x.source || x.source.length < 6) return false;
                  // Partial as well as verbatim. A span covering most of the
                  // input underlines the whole paragraph, which looks broken
                  // and says nothing about what was read as what.
                  if (x.source.length > prompt.length * 0.7) return false;
                  return prompt.toLowerCase().includes(x.source.toLowerCase());
                });

              // Resolve to non-overlapping ranges, longest first so a nested
              // span cannot split a larger one mid-highlight.
              type Range = { start: number; end: number; id: string };
              const ranges: Range[] = [];
              [...spans].sort((a, b) => b.source.length - a.source.length).forEach(sp => {
                const at = prompt.toLowerCase().indexOf(sp.source.toLowerCase());
                if (at === -1) return;
                const end = at + sp.source.length;
                if (ranges.some(r => at < r.end && end > r.start)) return;
                ranges.push({ start: at, end, id: sp.id });
              });
              // Marks covering nearly everything say nothing about what was
              // read as what, so they are discarded and the coverage summary
              // below runs instead.
              const covered = ranges.reduce((n, r) => n + (r.end - r.start), 0);
              const markable = spans.length > 0 && ranges.length > 0 && covered <= prompt.length * 0.85;
              ranges.sort((a, b) => a.start - b.start);

              // Nothing differential to mark. Reprinting the paragraph here
              // would be its third appearance on this screen, after the
              // decision card above and the answer card below, so only the
              // coverage count survives: it is the one fact neither of those
              // already states. Which questions were answered is visible in
              // the cards themselves.
              if (!markable) {
                const answered = visibleExtracted.length;
                // With no follow-ups left, the line introducing the cards
                // already says the brief was complete, so a count here is a
                // third way of saying one thing.
                if (!answered || followups.length === 0) return null;
                return (
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fresco-graphite-light mb-4">
                    {answered === 1
                      ? 'All of this answered one question'
                      : `This answered ${answered} of ${canonical.length} questions`}
                  </p>
                );
              }

              const parts: Array<{ text: string; id?: string }> = [];
              let cursor = 0;
              ranges.forEach(r => {
                if (r.start > cursor) parts.push({ text: prompt.slice(cursor, r.start) });
                parts.push({ text: prompt.slice(r.start, r.end), id: r.id });
                cursor = r.end;
              });
              if (cursor < prompt.length) parts.push({ text: prompt.slice(cursor) });

              return (
                <div className="mb-5 p-4 border border-fresco-border-light bg-fresco-white">
                  <p className="text-fresco-sm text-fresco-black leading-loose">
                    {parts.map((part, i) => part.id ? (
                      // An inline span, not a button: a button is
                      // inline-block and will not break across lines, so a
                      // long mark inside a paragraph laid out as its own box.
                      <span
                        key={i}
                        role="button"
                        tabIndex={0}
                        title={`Answers: ${questionTextOf(part.id)}`}
                        onClick={() => setEditingId(part.id!)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingId(part.id!); } }}
                        className="cursor-pointer bg-fresco-light-gray border-b border-fresco-graphite-light hover:border-fresco-black hover:bg-fresco-warm-gray transition-colors"
                      >
                        {part.text}
                      </span>
                    ) : (
                      <span key={i}>{part.text}</span>
                    ))}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fresco-graphite-light mt-3">
                    Underlined · what the engine drew on. Tap any of it to correct.
                  </p>
                </div>
              );
            })()}
            {/* A complete brief is worth acknowledging — it rewards the
                behaviour that produces the best verdicts. */}
            <p className="text-fresco-sm text-fresco-graphite-light mb-4">
              {followups.length === 0
                ? 'You gave the engine everything it needs — no questions left. Confirm, or edit anything it got wrong.'
                : 'Tap to confirm, or edit anything I got wrong.'}
            </p>
            <div className="space-y-3">
              {visibleExtracted.map(id => {
                const a = answers[id];
                const isEditing = editingId === id;
                // Only collapse what the engine itself produced. Anything the
                // founder has typed is always shown back to them.
                const restated = a.source === 'extracted' && isRestatement(a.answer, prompt);
                return (
                  <div
                    key={id}
                    className={cn(
                      'border bg-fresco-white transition-colors',
                      a.confirmed ? 'border-fresco-black' : 'border-fresco-border'
                    )}
                  >
                    <div className={cn('px-4 pt-3', restated && 'pb-3')}>
                      <p
                        className={cn('text-fresco-xs text-fresco-graphite-light', restated && 'cursor-text')}
                        onClick={restated ? () => setEditingId(id) : undefined}
                      >
                        {questionTextOf(id)}
                      </p>
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
                    ) : restated ? null : (
                      <p
                        className="px-4 pb-3 pt-1 text-fresco-sm text-fresco-black leading-relaxed cursor-text"
                        onClick={() => setEditingId(id)}
                      >
                        {a.answer}
                      </p>
                    )}
                    <div className="flex items-center justify-between border-t border-fresco-border-light px-4 py-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fresco-graphite-light">
                        {a.source !== 'extracted' ? 'EDITED BY YOU' : restated ? 'ANSWERED IN YOUR OWN WORDS' : 'FROM YOUR DESCRIPTION'}
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
                  {/* Candidate answers, when the router had something concrete
                      to offer. Tapping one FILLS the box rather than selecting
                      it: recognising a plausible answer is far easier than
                      composing one from nothing, but it has to stay the
                      founder's sentence, editable and theirs to overwrite.
                      Hidden once they have written anything, so it never
                      competes with their own words. */}
                  {!!f.options?.length && !(answers[f.questionId]?.answer || '').trim() && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {f.options.map((opt, oi) => (
                        <button
                          key={oi}
                          type="button"
                          onClick={() => setAnswer(f.questionId, opt, 'user')}
                          className="text-left text-fresco-xs text-fresco-graphite-mid bg-fresco-white border border-fresco-border px-2.5 py-1.5 hover:border-fresco-black hover:text-fresco-black transition-colors"
                        >
                          {opt}
                        </button>
                      ))}
                      <span className="self-center text-[10px] text-fresco-graphite-light ml-0.5">
                        or write your own
                      </span>
                    </div>
                  )}
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

        {/* Optional URL — for Evaluate this is what grounds the analysis in
            real page data; useful context for the other houses too */}
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fresco-graphite-light mb-2">
            {house === 'evaluate' ? 'Page URL · strongly recommended' : 'URL · optional'}
          </p>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder={house === 'evaluate'
              ? 'thepage.com/pricing — the analysis reads the actual page'
              : 'A reference page, competitor, or doc link'}
            className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border focus:outline-none focus:border-fresco-black transition-colors"
          />
          {house === 'evaluate' && !url.trim() && (
            <p className="text-fresco-xs text-fresco-graphite-light mt-1.5">
              Without a URL the verdict relies only on your description of the page.
            </p>
          )}
        </div>

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
        </div>

      </div>
    </div>
  );
}
