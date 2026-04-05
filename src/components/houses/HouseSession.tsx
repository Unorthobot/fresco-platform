'use client';

// FRESCO HouseSession — v4
// One question at a time. Each answer collapses and the next appears.
// The interaction IS the thinking — not a form to fill.
//
// Investigate: conversation — each answer unlocks the next question
// Innovate:    sequential build — steps revealed as the previous is answered  
// Validate:    structured drill-down — scorecard + audience + numbers in sequence
// Evaluate:    content-first — mode selector, then the right questions per mode

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Sparkles, Loader2, ArrowRight,
  Copy, Check, Download, X, Mic, MicOff, Upload, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDBWrite } from '@/lib/useDBSync';
import { useFrescoStore } from '@/lib/store';
import { HOUSE_META, type HouseId } from '@/lib/agents';
import type { HouseResult } from '@/lib/orchestrator';
import { PricingModal } from '@/components/ui/PricingModal';
import { useAIGeneration } from '@/lib/useAIGeneration';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  structured_artifact?: string;
}

interface ConversationStep {
  id: string;
  question: string;
  hint: string;
  placeholder: string;
  minHeight?: number;
  agent?: string;
  inputType?: 'textarea' | 'chips' | 'contradictions' | 'options' | 'passfail' | 'metrics' | 'sliders' | 'synthesis' | 'singleline' | 'numberedsteps' | 'testbrief' | 'audienceprofile' | 'barriermoves' | 'optioncosts' | 'evaluatebrief' | 'prioritychips';
  sliderLabels?: string[]; // for sliders inputType — one label per slider
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  'GO':                  { bg: 'bg-fresco-light-gray', text: 'text-fresco-black', border: 'border-fresco-border', dot: 'bg-fresco-black', label: 'text-fresco-graphite-mid' },
  'PIVOT':               { bg: 'bg-fresco-light-gray', text: 'text-fresco-black', border: 'border-fresco-border', dot: 'bg-fresco-black', label: 'text-fresco-graphite-mid' },
  'INVESTIGATE FURTHER': { bg: 'bg-fresco-light-gray', text: 'text-fresco-black', border: 'border-fresco-border', dot: 'bg-fresco-black', label: 'text-fresco-graphite-mid' },
  'Needs more signal':   { bg: 'bg-fresco-light-gray', text: 'text-fresco-black', border: 'border-fresco-border', dot: 'bg-fresco-black', label: 'text-fresco-graphite-mid' },
  'STOP':                { bg: 'bg-fresco-light-gray', text: 'text-fresco-black', border: 'border-fresco-border', dot: 'bg-fresco-black', label: 'text-fresco-graphite-mid' },
};

// ─── Chip / tag input ────────────────────────────────────────────────────────
// For discrete items: assumptions, patterns, signals

function ChipInput({ value, onChange, placeholder, onInteract }: {
  value: string; onChange: (v: string) => void; placeholder?: string; onInteract?: () => void;
}) {
  const chips = value ? value.split('\n').filter(Boolean) : [];
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...chips, trimmed].join('\n'));
    setDraft('');
  };

  const remove = (i: number) => {
    onChange(chips.filter((_, idx) => idx !== i).join('\n'));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3 min-h-[2rem]">
        <AnimatePresence>
          {chips.map((chip, i) => (
            <motion.span
              key={chip + i}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-fresco-light-gray border border-fresco-border text-fresco-sm text-fresco-black rounded-none"
            >
              {chip}
              <button type="button" onClick={() => remove(i)} className="text-fresco-graphite-light hover:text-fresco-black transition-colors ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder || 'Type and press Enter to add'}
          className="flex-1 h-10 px-4 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black transition-all"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="h-10 px-4 text-fresco-sm border border-fresco-border text-fresco-graphite-mid hover:border-fresco-black hover:text-fresco-black transition-all disabled:opacity-30"
        >
          Add
        </button>
      </div>
      {chips.length === 0 && (
        <p className="mt-2 text-fresco-xs text-fresco-graphite-light">Add each item separately — aim for 3 or more</p>
      )}
      {chips.length > 0 && chips.length < 3 && (
        <p className="mt-1.5 text-fresco-xs text-fresco-graphite-light">{3 - chips.length} more recommended</p>
      )}
      {chips.length > 0 && (
        <button
          type="button"
          onClick={() => { if (draft.trim()) add(); onInteract?.(); }}
          className="mt-3 text-fresco-xs font-medium text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1"
        >
          Done adding <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Contradiction pairs ──────────────────────────────────────────────────────
// "We assumed X / But actually Y"

interface ContradictionPair { assumed: string; actually: string; }

function ContradictionInput({ value, onChange, onInteract }: {
  value: string; onChange: (v: string) => void; onInteract?: () => void;
}) {
  const parse = (): ContradictionPair[] => {
    try { return value ? JSON.parse(value) : []; } catch { return []; }
  };
  const serialize = (pairs: ContradictionPair[]) => JSON.stringify(pairs);

  const pairs = parse();

  const addPair = () => onChange(serialize([...pairs, { assumed: '', actually: '' }]));

  const updatePair = (i: number, field: 'assumed' | 'actually', v: string) => {
    const next = pairs.map((p, idx) => idx === i ? { ...p, [field]: v } : p);
    onChange(serialize(next));
  };

  const removePair = (i: number) => onChange(serialize(pairs.filter((_, idx) => idx !== i)));

  return (
    <div className="space-y-3">
      {pairs.length === 0 && (
        <p className="text-fresco-sm text-fresco-graphite-light py-2">Add a contradiction — where do the facts conflict with your assumptions?</p>
      )}
      {pairs.map((pair, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-2 relative group"
        >
          <div>
            <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">We assumed</p>
            <input
              value={pair.assumed}
              onChange={e => updatePair(i, 'assumed', e.target.value)}
              placeholder="e.g. Users want more features"
              className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black"
            />
          </div>
          <div>
            <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">But actually</p>
            <input
              value={pair.actually}
              onChange={e => updatePair(i, 'actually', e.target.value)}
              placeholder="e.g. They churn when we add them"
              className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black"
            />
          </div>
          <button
            type="button"
            onClick={() => removePair(i)}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-fresco-border text-fresco-graphite-light hover:bg-fresco-black hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      ))}
      <button
        type="button"
        onClick={addPair}
        className="text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1.5"
      >
        <span className="text-lg leading-none">+</span> Add contradiction
      </button>
      {pairs.length > 0 && (
        <button type="button" onClick={() => onInteract?.()}
          className="mt-1 text-fresco-xs font-medium text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1">
          Done <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Option cards ─────────────────────────────────────────────────────────────
// For strategic options — each is a card with a label + description

interface OptionCard { label: string; description: string; }

function OptionCardsInput({ value, onChange, onInteract }: {
  value: string; onChange: (v: string) => void; onInteract?: () => void;
}) {
  const parse = (): OptionCard[] => {
    try { return value ? JSON.parse(value) : []; } catch { return []; }
  };
  const serialize = (cards: OptionCard[]) => JSON.stringify(cards);
  const cards = parse();
  const letters = 'ABCDEFGH';

  const addCard = () => onChange(serialize([...cards, { label: '', description: '' }]));
  const updateCard = (i: number, field: 'label' | 'description', v: string) => {
    onChange(serialize(cards.map((c, idx) => idx === i ? { ...c, [field]: v } : c)));
  };
  const removeCard = (i: number) => onChange(serialize(cards.filter((_, idx) => idx !== i)));

  return (
    <div className="space-y-3">
      {cards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-fresco-border p-4 relative group"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="w-6 h-6 rounded-full bg-fresco-black text-white text-fresco-xs font-medium flex items-center justify-center flex-shrink-0">
              {letters[i] || i + 1}
            </span>
            <input
              value={card.label}
              onChange={e => updateCard(i, 'label', e.target.value)}
              placeholder={`Option ${letters[i] || i + 1} — short name`}
              className="flex-1 text-fresco-base font-medium text-fresco-black bg-transparent border-b border-fresco-border-light focus:outline-none focus:border-fresco-black pb-0.5"
            />
          </div>
          <textarea
            value={card.description}
            onChange={e => updateCard(i, 'description', e.target.value)}
            placeholder="Describe this option — what it involves, what it gains, what it gives up"
            className="w-full text-fresco-sm text-fresco-graphite-soft bg-transparent border-none resize-none focus:outline-none leading-relaxed"
            style={{ minHeight: 60 }}
          />
          <button
            type="button"
            onClick={() => removeCard(i)}
            className="absolute top-3 right-3 w-5 h-5 rounded-full bg-fresco-border text-fresco-graphite-light hover:bg-red-100 hover:text-red-500 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      ))}
      {cards.length === 0 && (
        <p className="text-fresco-sm text-fresco-graphite-light py-2">Add each option as a separate card — aim for at least 3.</p>
      )}
      <button
        type="button"
        onClick={addCard}
        className="text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1.5"
      >
        <span className="text-lg leading-none">+</span> Add option
      </button>
      {cards.length > 0 && (
        <button type="button" onClick={() => onInteract?.()}
          className="mt-1 text-fresco-xs font-medium text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1">
          Done <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Pass / Fail input ────────────────────────────────────────────────────────

function PassFailInput({ value, onChange, onInteract }: {
  value: string; onChange: (v: string) => void; onInteract?: () => void;
}) {
  const parse = () => {
    try { return value ? JSON.parse(value) : { pass: '', fail: '' }; } catch { return { pass: '', fail: '' }; }
  };
  const data = parse();
  const update = (field: 'pass' | 'fail', v: string) =>
    onChange(JSON.stringify({ ...data, [field]: v }));

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <p className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wide">Pass — this would prove it works</p>
        </div>
        <textarea
          value={data.pass}
          onChange={e => update('pass', e.target.value)}
          placeholder="e.g. +15% confirmation rate in treatment group over 2 weeks"
          className="w-full px-3 py-2.5 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
          style={{ minHeight: 90 }}
        />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <p className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wide">Fail — this would kill it</p>
        </div>
        <textarea
          value={data.fail}
          onChange={e => update('fail', e.target.value)}
          placeholder="e.g. &lt;5% difference after 2 weeks — stop and reconsider"
          className="w-full px-3 py-2.5 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-red-300 resize-none"
          style={{ minHeight: 90 }}
        />
      </div>
    </div>
  );
}

// ─── Metrics table ────────────────────────────────────────────────────────────

function MetricsInput({ value, onChange, onInteract }: {
  value: string; onChange: (v: string) => void; onInteract?: () => void;
}) {
  interface MetricRow { metric: string; target: string; actual: string; }
  const parse = (): MetricRow[] => {
    try {
      const parsed = value ? JSON.parse(value) : [];
      const rows = Array.isArray(parsed) ? parsed.map((r: MetricRow) => ({
        metric: r.metric === 'N/A' ? '' : (r.metric || ''),
        target: r.target === 'N/A' ? '' : (r.target || ''),
        actual: r.actual === 'N/A' ? '' : (r.actual || ''),
      })) : [];
      return rows.length > 0 ? rows : [{ metric: '', target: '', actual: '' }];
    }
    catch { return [{ metric: '', target: '', actual: '' }]; }
  };
  const rows = parse();
  const hasContent = rows.some(r => r.metric.trim());
  const update = (i: number, field: keyof MetricRow, v: string) => {
    onChange(JSON.stringify(rows.map((r, idx) => idx === i ? { ...r, [field]: v } : r)));
  };
  const addRow = () => onChange(JSON.stringify([...rows, { metric: '', target: '', actual: '' }]));
  const removeRow = (i: number) => onChange(JSON.stringify(rows.filter((_, idx) => idx !== i)));

  return (
    <div>
      <div className="border border-fresco-border overflow-hidden">
        <div className="grid grid-cols-3 bg-fresco-light-gray border-b border-fresco-border px-0">
          {['Metric', 'Target', 'Actual'].map(h => (
            <div key={h} className="px-4 py-2 text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wide border-r border-fresco-border-light last:border-0">{h}</div>
          ))}
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-3 border-b border-fresco-border-light last:border-0 group relative">
            {(['metric', 'target', 'actual'] as const).map((field, fi) => (
              <input
                key={field}
                value={row[field]}
                onChange={e => update(i, field, e.target.value)}
                placeholder={fi === 0 ? 'e.g. CAC' : fi === 1 ? 'e.g. < $800' : 'e.g. $1,240'}
                className={cn(
                  'px-4 py-3 text-fresco-sm text-fresco-black bg-transparent focus:outline-none focus:bg-fresco-light-gray transition-colors',
                  fi < 2 && 'border-r border-fresco-border-light'
                )}
              />
            ))}
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-fresco-border text-fresco-graphite-light hover:bg-red-100 hover:text-red-500 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <button
          type="button"
          onClick={addRow}
          className="text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1.5"
        >
          <span className="text-lg leading-none">+</span> Add metric
        </button>
        {hasContent && (
          <button
            type="button"
            onClick={() => onInteract?.()}
            className="text-fresco-xs font-medium text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1"
          >
            Done <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Slider ratings ───────────────────────────────────────────────────────────
// For scoring criteria — each criterion gets a 1–10 slider + optional note

function SliderRatings({ value, onChange, labels, onInteract }: {
  value: string; onChange: (v: string) => void; labels: string[]; onInteract?: () => void;
}) {
  // #6 — auto-advance 2s after last interaction when all criteria have notes
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleAdvance = (rows: {note: string}[]) => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (rows.every(r => r.note?.trim())) {
      idleTimer.current = setTimeout(() => onInteract?.(), 2000);
    }
  };
  useEffect(() => () => { if (idleTimer.current) clearTimeout(idleTimer.current); }, []);
  interface SliderRow { label: string; score: number; note: string; }
  const parse = (): SliderRow[] => {
    try {
      const parsed = value ? JSON.parse(value) : [];
      return labels.map((label, i) => parsed[i] || { label, score: 5, note: '' });
    } catch {
      return labels.map(label => ({ label, score: 5, note: '' }));
    }
  };
  const rows = parse();
  const update = (i: number, field: 'score' | 'note', v: string | number) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [field]: v } : r);
    onChange(JSON.stringify(next));
    if (field === 'note') scheduleAdvance(next);
  };

  return (
    <div className="space-y-4">
      {rows.map((row, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-fresco-sm font-medium text-fresco-black">{row.label}</p>
            <span className={cn(
              'text-fresco-sm font-bold tabular-nums w-8 text-right',
              row.score >= 7 ? 'text-emerald-600' : row.score >= 4 ? 'text-amber-600' : 'text-red-500'
            )}>{row.score}/10</span>
          </div>
          <input
            type="range"
            min={1} max={10} step={1}
            value={row.score}
            onChange={e => update(i, 'score', parseInt(e.target.value))}
            className="w-full h-1.5 accent-fresco-black cursor-pointer"
          />
          <input
            value={row.note}
            onChange={e => update(i, 'note', e.target.value)}
            placeholder="Why this score? Back it with evidence."
            className="w-full h-9 px-3 text-fresco-sm text-fresco-graphite-soft bg-fresco-light-gray border-none rounded-none focus:outline-none focus:bg-fresco-white focus:ring-1 focus:ring-fresco-border transition-all"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Challenge Panel ──────────────────────────────────────────────────────────
// Reads user inputs before Run. Asks the question they avoided.

interface ChallengeQuestion {
  question: string;
  why: string;
}

function ChallengePanel({ questions, onRespond, onDismiss }: {
  questions: ChallengeQuestion[];
  onRespond: (responses: Record<string, string>) => void;
  onDismiss: () => void;
}) {
  const [responses, setResponses] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    onRespond(responses);
  };

  const allAnswered = questions.every((_, i) => (responses[i] || '').trim().length > 0);
  const anyAnswered = questions.some((_, i) => (responses[i] || '').trim().length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="border border-fresco-black bg-fresco-white p-5 space-y-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="fresco-label block mb-1">One thing before we run</span>
          <p className="text-fresco-sm text-fresco-graphite-mid">
            {questions.length === 1
              ? "Something worth thinking through before you run."
              : 'Two things worth thinking through before you run.'}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors flex-shrink-0 mt-0.5"
        >
          Skip
        </button>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="space-y-2">
            <p className="text-fresco-sm font-medium text-fresco-black">{q.question}</p>
            <p className="text-fresco-xs text-fresco-graphite-light">{q.why}</p>
            <textarea
              value={responses[i] || ''}
              onChange={e => setResponses(prev => ({ ...prev, [i]: e.target.value }))}
              placeholder="Answer here — 2-3 sentences is enough"
              className="w-full fresco-input-lg"
              style={{ minHeight: 80 }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSubmit}
          disabled={!anyAnswered}
          className="fresco-btn disabled:opacity-40"
        >
          <span>{allAnswered ? 'Add to analysis' : 'Add partial answers'}</span>
        </button>
        <button
          onClick={onDismiss}
          className="text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors"
        >
          Skip, run without answers
        </button>
      </div>
    </motion.div>
  );
}

// ─── Editable Sentence of Truth ──────────────────────────────────────────────
// The AI suggests. The user owns.

function EditableSentenceOfTruth({ value, onSave }: {
  value: string;
  onSave: (edited: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [userVersion, setUserVersion] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setUserVersion(trimmed);
    onSave(trimmed);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setDraft(userVersion || value);
    setEditing(false);
  };

  const displayValue = userVersion || value;
  const isEdited = userVersion && userVersion !== value;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="fresco-label">Sentence of Truth</span>
        <div className="flex items-center gap-3">
          {isEdited && (
            <button
              onClick={() => setShowOriginal(v => !v)}
              className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors"
            >
              {showOriginal ? 'Show yours' : 'Show AI original'}
            </button>
          )}
          {!editing && (
            <button
              onClick={() => { setDraft(displayValue); setEditing(true); }}
              className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors flex items-center gap-1"
            >
              ✎ {isEdited ? 'Edit yours' : 'Make it yours'}
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="bg-fresco-black p-4">
          <textarea
            ref={textRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="w-full bg-transparent text-white text-fresco-base font-medium leading-relaxed italic resize-none border-none outline-none"
            style={{ minHeight: 80 }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
            <button onClick={handleSave} className="text-fresco-xs font-medium text-white hover:opacity-70 transition-opacity">
              Save — Enter
            </button>
            <button onClick={handleCancel} className="text-fresco-xs text-white/50 hover:text-white/80 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          className="p-4 bg-fresco-black relative group cursor-pointer"
          onClick={() => !showOriginal && (() => { setDraft(displayValue); setEditing(true); })()}
          title={showOriginal ? '' : 'Click to edit'}
        >
          <p className="text-fresco-base text-white font-medium leading-relaxed italic group-hover:opacity-90 transition-opacity">
            "{showOriginal ? value : displayValue}"
          </p>
          {isEdited && !showOriginal && (
            <span className="absolute top-3 right-3 text-fresco-xs text-white/30">yours</span>
          )}
          {saved && (
            <span className="absolute top-3 right-3 text-fresco-xs text-white/50">saved</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Voice recording hook ─────────────────────────────────────────────────────

function useVoice(onText: (t: string) => void) {
  const [recording, setRecording] = useState(false);
  const [time, setTime] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const start = async () => {
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
          const res = await fetch('/api/transcribe', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: reader.result }),
          });
          if (res.ok) { const { text } = await res.json(); if (text) onText(text); }
        };
      };
      rec.start();
      setRecording(true); setTime(0);
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    } catch { alert('Microphone access denied.'); }
  };

  const stop = () => {
    recRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false); setTime(0);
  };

  return { recording, time, start, stop };
}

// ─── Single question card ─────────────────────────────────────────────────────
// The core interaction unit. Shows question + textarea.
// When answered (blur or content present), collapses to show a preview.

function QuestionCard({
  step, value, onChange, onBlur, isActive, isAnswered, isLocked,
  onActivate, showAgent = false, criteriaValue = '', secondaryValue = '',
}: {
  step: ConversationStep;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  isActive: boolean;
  isAnswered: boolean;
  isLocked: boolean;
  onActivate: () => void;
  showAgent?: boolean;
  criteriaValue?: string;
  secondaryValue?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoice(t => onChange(value ? `${value}\n\n${t}` : t));
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isActive && textRef.current) {
      textRef.current.focus();
    }
  }, [isActive]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isLocked ? 0.35 : 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'border rounded-none transition-colors',
        isActive ? 'border-fresco-black' : isAnswered ? 'border-fresco-border' : 'border-fresco-border-light',
        isLocked && 'pointer-events-none select-none'
      )}
    >
      {/* Collapsed answered state */}
      {isAnswered && !isActive && (
        <button
          type="button"
          onClick={onActivate}
          className="w-full flex items-start justify-between px-4 py-3 text-left group"
        >
          <div className="flex-1 pr-4 min-w-0">
            <p className="text-fresco-xs text-fresco-graphite-light mb-0.5">{step.question}</p>
            {step.inputType === 'chips' || step.inputType === 'prioritychips' ? (
              <p className="text-fresco-sm text-fresco-graphite-mid">
                {value.split('\n').filter(Boolean).length} item{value.split('\n').filter(Boolean).length !== 1 ? 's' : ''} added
              </p>
            ) : step.inputType === 'numberedsteps' ? (
              <p className="text-fresco-sm text-fresco-graphite-mid">
                {value.split('\n').filter(Boolean).length} step{value.split('\n').filter(Boolean).length !== 1 ? 's' : ''} mapped
              </p>
            ) : step.inputType === 'contradictions' ? (
              <div>
                {(() => {
                  try {
                    const pairs = JSON.parse(value).filter((p: any) => p.assumed?.trim());
                    if (pairs.length === 0) return <p className="text-fresco-sm text-fresco-graphite-mid">No contradictions yet</p>;
                    return <p className="text-fresco-sm text-fresco-graphite-mid line-clamp-1">"{pairs[0].assumed}" → "{pairs[0].actually}"{pairs.length > 1 ? ` +${pairs.length - 1} more` : ''}</p>;
                  } catch { return <p className="text-fresco-sm text-fresco-graphite-mid">Contradictions mapped</p>; }
                })()}
              </div>
            ) : step.inputType === 'options' ? (
              <p className="text-fresco-sm text-fresco-graphite-mid line-clamp-1">
                {(() => {
                  try {
                    const cards = JSON.parse(value).filter((c: any) => c.label?.trim());
                    return cards.map((c: any) => c.label).join(', ') || `${cards.length} options`;
                  } catch { return 'Options defined'; }
                })()}
              </p>
            ) : step.inputType === 'optioncosts' ? (
              <p className="text-fresco-sm text-fresco-graphite-mid">Trade-offs mapped for each option</p>
            ) : step.inputType === 'passfail' ? (
              <p className="text-fresco-sm text-fresco-graphite-mid">Pass &amp; fail conditions defined</p>
            ) : step.inputType === 'metrics' ? (
              <p className="text-fresco-sm text-fresco-graphite-mid">
                {(() => { try { return JSON.parse(value).filter((r: any) => r.metric).length; } catch { return 0; } })()} metric{(() => { try { return JSON.parse(value).filter((r: any) => r.metric).length !== 1; } catch { return true; } })() ? 's' : ''} tracked
              </p>
            ) : step.inputType === 'sliders' ? (
              <p className="text-fresco-sm text-fresco-graphite-mid">
                {(() => { try { const rows = JSON.parse(value); const avg = rows.reduce((s: number, r: any) => s + r.score, 0) / rows.length; return `Avg score: ${avg.toFixed(1)}/10`; } catch { return 'Scored'; } })()}
              </p>
            ) : step.inputType === 'testbrief' ? (
              <p className="text-fresco-sm text-fresco-graphite-mid">
                {(() => { try { const p = JSON.parse(value); return p.method ? p.method.slice(0, 60) : 'Test brief filled in'; } catch { return 'Test brief filled in'; } })()}
              </p>
            ) : step.inputType === 'audienceprofile' ? (
              <p className="text-fresco-sm text-fresco-graphite-mid">
                {(() => { try { const p = JSON.parse(value); return p.who ? p.who.slice(0, 60) : 'Audience defined'; } catch { return 'Audience defined'; } })()}
              </p>
            ) : step.inputType === 'barriermoves' ? (
              <p className="text-fresco-sm text-fresco-graphite-mid">
                {(() => { try { return JSON.parse(value).filter((p: any) => p.barrier).length; } catch { return 0; } })()} barrier{(() => { try { return JSON.parse(value).filter((p: any) => p.barrier).length !== 1; } catch { return true; } })() ? 's' : ''} mapped
              </p>
            ) : step.inputType === 'evaluatebrief' ? (
              <p className="text-fresco-sm text-fresco-graphite-mid">
                {(() => { try { const p = JSON.parse(value); return p.goal ? p.goal.slice(0, 60) : 'Brief filled in'; } catch { return 'Brief filled in'; } })()}
              </p>
            ) : (
              <p className="text-fresco-sm text-fresco-graphite-mid line-clamp-2 leading-relaxed">
                {value.split('\n')[0] || value}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-fresco-black" />
            <ChevronDown className="w-3.5 h-3.5 text-fresco-graphite-light group-hover:text-fresco-black transition-colors" />
          </div>
        </button>
      )}

      {/* Active / unanswered state */}
      {(isActive || !isAnswered) && !isLocked && (
        <div className="px-4 py-4">
          <div className="flex items-start justify-between mb-1">
            <p className={cn(
              'font-medium leading-snug',
              isActive ? 'text-fresco-base text-fresco-black' : 'text-fresco-sm text-fresco-graphite-mid'
            )}>
              {step.question}
            </p>
            {showAgent && step.agent && (
              <span className="text-fresco-xs text-fresco-graphite-light bg-fresco-light-gray px-2 py-0.5 rounded-full ml-3 flex-shrink-0 mt-0.5">
                {step.agent}
              </span>
            )}
          </div>
          {isActive && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
              <p className="text-fresco-sm text-fresco-graphite-light mb-3">{step.hint}</p>

              {/* Specialised controls — no voice/file for structured inputs */}
              {step.inputType === 'chips' && (
                <ChipInput value={value} onChange={onChange} placeholder={step.placeholder} onInteract={onBlur} />
              )}
              {step.inputType === 'contradictions' && (
                <ContradictionInput value={value} onChange={onChange} onInteract={onBlur} />
              )}
              {step.inputType === 'options' && (
                <OptionCardsInput value={value} onChange={onChange} onInteract={onBlur} />
              )}
              {step.inputType === 'passfail' && (
                <PassFailInput value={value} onChange={onChange} onInteract={onBlur} />
              )}
              {step.inputType === 'metrics' && (
                <MetricsInput value={value} onChange={onChange} onInteract={onBlur} />
              )}
              {step.inputType === 'numberedsteps' && (
                <NumberedStepsInput value={value} onChange={onChange} placeholder={step.placeholder} onInteract={onBlur} />
              )}
              {step.inputType === 'testbrief' && (
                <TestBriefInput value={value} onChange={onChange} onInteract={onBlur} />
              )}
              {step.inputType === 'audienceprofile' && (
                <AudienceProfileInput value={value} onChange={onChange} onInteract={onBlur} />
              )}
              {step.inputType === 'barriermoves' && (
                <BarrierMovesInput value={value} onChange={onChange} blockers={secondaryValue || criteriaValue} onInteract={onBlur} />
              )}
              {step.inputType === 'optioncosts' && (
                <OptionCostsInput value={value} onChange={onChange} optionsValue={secondaryValue || criteriaValue} onInteract={onBlur} />
              )}
              {step.inputType === 'evaluatebrief' && (
                <EvaluateBriefInput value={value} onChange={onChange} onInteract={onBlur} />
              )}
              {step.inputType === 'prioritychips' && (
                <PriorityChipsInput value={value} onChange={onChange} placeholder={step.placeholder} onInteract={onBlur} />
              )}
              {step.inputType === 'sliders' && (() => {
                const source = secondaryValue || criteriaValue;
                const rawLabels = source
                  ? source.split('\n').filter(Boolean)
                    .map((l: string) => l.replace(/^\d+[\.\)]\s*/, '').split('(')[0].trim())
                    .filter(Boolean)
                  : [];
                const labels = rawLabels.length >= 2 ? rawLabels.slice(0, 5)
                  : (step.sliderLabels || ['Criterion 1', 'Criterion 2', 'Criterion 3']);
                return <SliderRatings value={value} onChange={onChange} labels={labels} onInteract={onBlur} />;
              })()}

              {/* Default textarea — with voice + file */}
              {(!step.inputType || step.inputType === 'textarea' || step.inputType === 'synthesis') && (
                <div className="relative">
                  <textarea
                    ref={textRef}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder={step.placeholder}
                    className="fresco-input-lg pr-20"
                    style={{ minHeight: step.minHeight || 120 }}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={voice.recording ? voice.stop : voice.start}
                      className={cn('p-1.5 rounded-full transition-all',
                        voice.recording ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-fresco-light-gray text-fresco-graphite-mid hover:bg-fresco-border hover:text-fresco-black'
                      )}
                      title={voice.recording ? 'Stop' : 'Voice input'}
                    >
                      {voice.recording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="p-1.5 rounded-full bg-fresco-light-gray text-fresco-graphite-mid hover:bg-fresco-border hover:text-fresco-black transition-all"
                      title="Upload file"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                    <input ref={fileRef} type="file" multiple accept=".txt,.md,.csv,.json" className="hidden"
                      onChange={async e => {
                        for (const file of Array.from(e.target.files || [])) {
                          const text = await new Promise<string>(res => {
                            const r = new FileReader();
                            r.onload = ev => res(ev.target?.result as string);
                            r.readAsText(file);
                          });
                          onChange(value ? `${value}\n\n--- From ${file.name} ---\n${text}` : text);
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {voice.recording && (
                <p className="mt-1.5 text-fresco-xs text-red-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                  {Math.floor(voice.time / 60)}:{(voice.time % 60).toString().padStart(2, '0')}
                </p>
              )}
              {!voice.recording && !value && (
                <p className="mt-1.5 text-fresco-xs text-fresco-graphite-light">
                  Tip: use the mic icon to speak your answer, or upload a file
                </p>
              )}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Serialise structured inputs to readable text for agents ─────────────────

function getInputTypeForId(id: string, allSteps: ConversationStep[]): ConversationStep['inputType'] {
  return allSteps.find(s => s.id === id)?.inputType;
}

function serializeStructuredField(type: ConversationStep['inputType'], v: string): string {
  if (!type || type === 'textarea' || type === 'synthesis' || type === 'singleline') return v.trim();
  if (type === 'chips' || type === 'prioritychips' || type === 'numberedsteps') {
    const items = v.split('\n').filter(Boolean);
    return type === 'numberedsteps' ? items.map((s, i) => `${i + 1}. ${s}`).join('\n') : items.join(', ');
  }
  try {
    const p = JSON.parse(v);
    if (type === 'contradictions') return p.filter((x: any) => x.assumed?.trim()).map((x: any) => `We assumed: ${x.assumed} / But actually: ${x.actually}`).join('\n');
    if (type === 'options') return p.filter((x: any) => x.label?.trim()).map((x: any, i: number) => `Option ${String.fromCharCode(65 + i)} — ${x.label}: ${x.description}`).join('\n');
    if (type === 'optioncosts') return p.filter((x: any) => x.label?.trim()).map((x: any) => `${x.label}: gains ${x.gains}, gives up ${x.givesUp}`).join('\n');
    if (type === 'passfail') return [p.pass ? `Pass: ${p.pass}` : '', p.fail ? `Fail: ${p.fail}` : ''].filter(Boolean).join('\n');
    if (type === 'metrics') return p.filter((r: any) => r.metric?.trim()).map((r: any) => `${r.metric}: target ${r.target}, actual ${r.actual}`).join('\n');
    if (type === 'sliders') return p.filter((r: any) => r.label).map((r: any) => `${r.label}: ${r.score}/10${r.note ? ` — ${r.note}` : ''}`).join('\n');
    if (type === 'testbrief') return [p.method ? `Method: ${p.method}` : '', p.duration ? `Duration: ${p.duration}` : '', p.sample ? `Sample: ${p.sample}` : ''].filter(Boolean).join('\n');
    if (type === 'audienceprofile') return [p.who ? `Who: ${p.who}` : '', p.believes ? `They believe: ${p.believes}` : '', p.why ? `Why: ${p.why}` : ''].filter(Boolean).join('\n');
    if (type === 'barriermoves') return p.filter((x: any) => x.barrier?.trim()).map((x: any) => `Barrier: ${x.barrier} → Move: ${x.move}`).join('\n');
    if (type === 'evaluatebrief') return [p.goal ? `Goal: ${p.goal}` : '', p.audience ? `Audience: ${p.audience}` : '', p.metric ? `Current metric: ${p.metric}` : ''].filter(Boolean).join('\n');
    return v;
  } catch { return v; }
}

// ─── Numbered step builder ────────────────────────────────────────────────────

function NumberedStepsInput({ value, onChange, placeholder, onInteract }: {
  value: string; onChange: (v: string) => void; placeholder?: string; onInteract?: () => void;
}) {
  const savedItems = value ? value.split('\n').filter(Boolean) : [];
  const [count, setCount] = useState(Math.max(1, savedItems.length));

  const update = (i: number, v: string) => {
    const next = Array.from({ length: count }, (_, idx) => savedItems[idx] || '');
    next[i] = v;
    onChange(next.filter(Boolean).join('\n'));
  };

  const add = () => {
    setCount(c => c + 1);
    // Do NOT call onInteract here — user is still adding steps
  };

  const remove = (i: number) => {
    const next = savedItems.filter((_, idx) => idx !== i);
    onChange(next.join('\n'));
    setCount(c => Math.max(1, c - 1));
  };

  const displayItems = Array.from({ length: count }, (_, i) => savedItems[i] || '');

  return (
    <div className="space-y-2">
      {displayItems.map((item, i) => (
        <div key={i} className="flex items-center gap-2 group">
          <span className="w-5 h-5 rounded-full border border-fresco-border flex items-center justify-center text-fresco-xs text-fresco-graphite-light flex-shrink-0">{i + 1}</span>
          <input value={item} onChange={e => update(i, e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder={i === 0 ? (placeholder || 'First step…') : `Step ${i + 1}…`}
            className="flex-1 h-9 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black" />
          {count > 1 && (
            <button type="button" onClick={() => remove(i)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-3.5 h-3.5 text-fresco-graphite-light hover:text-red-400" />
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={add} className="text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1.5 ml-7">
        <span className="text-base leading-none">+</span> Add step
      </button>
      {savedItems.length > 0 && (
        <button
          type="button"
          onClick={() => onInteract?.()}
          className="mt-2 ml-7 text-fresco-xs font-medium text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1"
        >
          Done adding steps <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Test brief ───────────────────────────────────────────────────────────────

function TestBriefInput({ value, onChange, onInteract }: { value: string; onChange: (v: string) => void; onInteract?: () => void }) {
  const parse = () => { try { return value ? JSON.parse(value) : {}; } catch { return {}; } };
  const data = parse();
  const update = (field: string, v: string) => onChange(JSON.stringify({ ...data, [field]: v }));
  return (
    <div className="space-y-3">
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">Method — what will you do?</p>
        <input value={data.method || ''} onChange={e => update('method', e.target.value)}
          placeholder="e.g. A/B test SMS vs email verification, 50/50 split"
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">Duration</p>
          <input value={data.duration || ''} onChange={e => update('duration', e.target.value)}
            placeholder="e.g. 2 weeks"
            className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black" />
        </div>
        <div>
          <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">Sample / split</p>
          <input value={data.sample || ''} onChange={e => update('sample', e.target.value)}
            placeholder="e.g. All new signups"
            className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black" />
        </div>
      </div>
      <button type="button" onClick={() => onInteract?.()}
        className="mt-3 text-fresco-xs font-medium text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1">
        Done <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Audience profile ─────────────────────────────────────────────────────────

function AudienceProfileInput({ value, onChange, onInteract }: { value: string; onChange: (v: string) => void; onInteract?: () => void }) {
  const parse = () => { try { return value ? JSON.parse(value) : {}; } catch { return {}; } };
  const data = parse();
  const update = (field: string, v: string) => onChange(JSON.stringify({ ...data, [field]: v }));
  return (
    <div className="space-y-3">
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">Who exactly?</p>
        <input value={data.who || ''} onChange={e => update('who', e.target.value)}
          placeholder="e.g. CFOs at mid-market SaaS companies, $5M–$50M ARR"
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black" />
      </div>
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">What do they currently believe?</p>
        <input value={data.believes || ''} onChange={e => update('believes', e.target.value)}
          placeholder="e.g. AI tools are a cost centre, not an investment"
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black" />
      </div>
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">Why do they believe it?</p>
        <input value={data.why || ''} onChange={e => update('why', e.target.value)}
          placeholder="e.g. They've seen AI hype without measurable ROI"
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black" />
      </div>
      <button type="button" onClick={() => onInteract?.()}
        className="mt-3 text-fresco-xs font-medium text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1">
        Done <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Barrier → move pairs ─────────────────────────────────────────────────────

function BarrierMovesInput({ value, onChange, blockers, onInteract }: {
  value: string; onChange: (v: string) => void; blockers: string; onInteract?: () => void;
}) {
  const parse = () => { try { return value ? JSON.parse(value) : []; } catch { return []; } };
  const chipList = blockers ? blockers.split('\n').filter(Boolean) : [];
  const rawPairs: { barrier: string; move: string }[] = parse();
  const pairs = rawPairs.length > 0 ? rawPairs : chipList.map(b => ({ barrier: b, move: '' }));

  const update = (i: number, field: 'barrier' | 'move', v: string) =>
    onChange(JSON.stringify(pairs.map((p, idx) => idx === i ? { ...p, [field]: v } : p)));
  const add = () => onChange(JSON.stringify([...pairs, { barrier: '', move: '' }]));
  const remove = (i: number) => onChange(JSON.stringify(pairs.filter((_, idx) => idx !== i)));

  return (
    <div className="space-y-3">
      {pairs.map((pair, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="p-3 border border-fresco-border-light space-y-2 relative group">
          <div>
            <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1">Barrier</p>
            <input value={pair.barrier} onChange={e => update(i, 'barrier', e.target.value)}
              placeholder="e.g. We tried something similar and it failed"
              className="w-full h-9 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border-light rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black" />
          </div>
          <div>
            <p className="text-fresco-xs text-emerald-600 uppercase tracking-wide mb-1">How you'll move them past it</p>
            <input value={pair.move} onChange={e => update(i, 'move', e.target.value)}
              placeholder="e.g. Show a case study from a similar company"
              className="w-full h-9 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-emerald-200 rounded-none focus:outline-none focus:ring-1 focus:ring-emerald-400" />
          </div>
          <button type="button" onClick={() => remove(i)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="w-3.5 h-3.5 text-fresco-graphite-light hover:text-red-400" />
          </button>
        </motion.div>
      ))}
      <button type="button" onClick={add}
        className="text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1.5">
        <span className="text-base leading-none">+</span> Add barrier
      </button>
      {pairs.length > 0 && (
        <button type="button" onClick={() => onInteract?.()}
          className="mt-1 text-fresco-xs font-medium text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1">
          Done <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Option costs ─────────────────────────────────────────────────────────────

function OptionCostsInput({ value, onChange, optionsValue, onInteract }: {
  value: string; onChange: (v: string) => void; optionsValue: string; onInteract?: () => void;
}) {
  interface CostRow { label: string; gains: string; givesUp: string; }
  const letters = 'ABCDEFGH';
  const parseOptions = (): {label: string}[] => { try { return optionsValue ? JSON.parse(optionsValue) : []; } catch { return []; } };
  const parse = (): CostRow[] => { try { return value ? JSON.parse(value) : []; } catch { return []; } };
  const options = parseOptions();
  const saved = parse();

  const rows: CostRow[] = options.length > 0
    ? options.map((opt, i) => ({ label: opt.label || `Option ${letters[i]}`, gains: saved[i]?.gains || '', givesUp: saved[i]?.givesUp || '' }))
    : saved.length > 0 ? saved : [{ label: 'Option A', gains: '', givesUp: '' }];

  const update = (i: number, field: 'gains' | 'givesUp', v: string) =>
    onChange(JSON.stringify(rows.map((r, idx) => idx === i ? { ...r, [field]: v } : r)));

  return (
    <div className="space-y-4">
      {rows.map((row, i) => (
        <div key={i} className="border border-fresco-border-light p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-fresco-black text-white text-fresco-xs font-medium flex items-center justify-center">{letters[i]}</span>
            <span className="text-fresco-sm font-medium text-fresco-black">{row.label}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-fresco-xs text-emerald-600 uppercase tracking-wide mb-1.5">What you gain</p>
              <textarea value={row.gains} onChange={e => update(i, 'gains', e.target.value)}
                placeholder="e.g. Fastest to ship, proven pattern"
                className="w-full px-3 py-2 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border-light rounded-none focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
                style={{ minHeight: 64 }} />
            </div>
            <div>
              <p className="text-fresco-xs text-amber-600 uppercase tracking-wide mb-1.5">What you give up</p>
              <textarea value={row.givesUp} onChange={e => update(i, 'givesUp', e.target.value)}
                placeholder="e.g. Higher fraud risk, no fallback"
                className="w-full px-3 py-2 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border-light rounded-none focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                style={{ minHeight: 64 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Evaluate brief ───────────────────────────────────────────────────────────

function EvaluateBriefInput({ value, onChange, onInteract }: { value: string; onChange: (v: string) => void; onInteract?: () => void }) {
  const parse = () => { try { return value ? JSON.parse(value) : {}; } catch { return {}; } };
  const data = parse();
  const update = (field: string, v: string) => onChange(JSON.stringify({ ...data, [field]: v }));
  return (
    <div className="space-y-3">
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">Goal of this page/flow</p>
        <input value={data.goal || ''} onChange={e => update('goal', e.target.value)}
          placeholder="e.g. Get mid-market buyers to book a demo"
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black" />
      </div>
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">Who's the audience?</p>
        <input value={data.audience || ''} onChange={e => update('audience', e.target.value)}
          placeholder="e.g. SaaS buyers at $10M–$100M ARR, evaluating 3–5 tools"
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black" />
      </div>
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">Current performance</p>
        <input value={data.metric || ''} onChange={e => update('metric', e.target.value)}
          placeholder="e.g. 2.1% conversion, 45s avg time, 70% scroll past pricing"
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black" />
      </div>
      <button type="button" onClick={() => onInteract?.()}
        className="mt-3 text-fresco-xs font-medium text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1">
        Done <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Priority chips ───────────────────────────────────────────────────────────

function PriorityChipsInput({ value, onChange, placeholder, onInteract }: {
  value: string; onChange: (v: string) => void; placeholder?: string; onInteract?: () => void;
}) {
  const items = value ? value.split('\n').filter(Boolean) : [];
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()].join('\n'));
    setDraft('');
    // Do NOT advance — user may want to add more
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i).join('\n'));

  return (
    <div>
      <div className="space-y-2 mb-3">
        {items.map((item, i) => (
          <motion.div key={item + i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 group">
            <span className="w-5 h-5 rounded-full bg-fresco-black text-white text-fresco-xs font-medium flex items-center justify-center flex-shrink-0">{i + 1}</span>
            <span className="flex-1 text-fresco-sm text-fresco-black">{item}</span>
            <button type="button" onClick={() => remove(i)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-3.5 h-3.5 text-fresco-graphite-light hover:text-red-400" />
            </button>
          </motion.div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder || 'Add item and press Enter'}
          className="flex-1 h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black" />
        <button type="button" onClick={add} disabled={!draft.trim()}
          className="h-10 px-4 text-fresco-sm border border-fresco-border text-fresco-graphite-mid hover:border-fresco-black hover:text-fresco-black transition-all disabled:opacity-30">
          Add
        </button>
      </div>
      {items.length > 0 && (
        <button
          type="button"
          onClick={() => { if (draft.trim()) add(); onInteract?.(); }}
          className="mt-3 text-fresco-xs font-medium text-fresco-graphite-mid hover:text-fresco-black transition-colors flex items-center gap-1"
        >
          Done adding <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── House conversation configs ───────────────────────────────────────────────

const INVESTIGATE_STEPS: ConversationStep[] = [
  // ── Insight Stack ──
  {
    id: 'situation',
    question: 'What are you looking at?',
    hint: 'What are you trying to make sense of?',
    placeholder: "e.g. Users keep dropping off after signup — 3 months of data, 12 interviews, and it still isn't clear why.",
    minHeight: 100,
    agent: 'Insight Stack',
  },
  {
    id: 'observations',
    question: 'What are you noticing?',
    hint: "What are you seeing? Data, quotes, behaviours — don't interpret yet.",
    placeholder: "e.g. 60% drop-off at step 3. Users say 'confusing' but can't say why. Same 2 fields in every support ticket.",
    minHeight: 160,
    agent: 'Insight Stack',
  },
  {
    id: 'patterns',
    inputType: 'chips',
    question: 'What keeps coming up?',
    hint: 'What pattern keeps showing up?',
    placeholder: "e.g. Every churned user mentions confusion in week 1. Retained users find one core feature within 48 hours.",
    minHeight: 120,
    agent: 'Insight Stack',
  },
  {
    id: 'contradictions',
    inputType: 'contradictions',
    question: "What doesn't add up?",
    hint: "What doesn't fit? What surprised you?",
    placeholder: "e.g. High NPS but still churning. Users say they love it but don't come back.",
    minHeight: 120,
    agent: 'Insight Stack',
  },
  {
    id: 'truth',
    question: "What's the real truth here?",
    hint: "What is the evidence actually pointing to? Don't be safe.",
    placeholder: "e.g. Users aren't confused by the UI — they're confused about whether the product is for them.",
    minHeight: 120,
    agent: 'Insight Stack',
  },
  // ── Belief Mapper ──
  {
    id: 'assumptions',
    inputType: 'chips',
    question: 'What do people assume here?',
    hint: "What are the unspoken rules everyone is working from?",
    placeholder: "e.g. 'Users will read the onboarding.' 'The drop-off is a UX problem.' 'Power users are our best signal.'",
    minHeight: 140,
    agent: 'Belief Mapper',
  },
  {
    id: 'assumption_chains',
    question: 'How do these assumptions affect each other?',
    hint: 'How do these beliefs reinforce each other?',
    placeholder: "e.g. Because we believe the drop-off is UX, we keep redesigning instead of questioning whether we have the right users.",
    minHeight: 140,
    agent: 'Belief Mapper',
  },
  {
    id: 'ignored',
    question: "What's being ignored or taken for granted?",
    hint: "What has nobody questioned? What would change everything if it were wrong?",
    placeholder: "e.g. Nobody has questioned whether the free plan attracts the right users. Maybe it's an acquisition problem, not activation.",
    minHeight: 120,
    agent: 'Belief Mapper',
  },
  {
    id: 'new_model',
    question: 'What should guide decisions instead?',
    hint: 'What should guide decisions instead?',
    placeholder: "e.g. Instead of 'fix onboarding', the rule becomes: only let in users who already understand what this does.",
    minHeight: 120,
    agent: 'Belief Mapper',
  },
  // ── Position Builder ── (synthesis — one question after deep investigation)
  {
    id: 'position_synthesis',
    inputType: 'synthesis' as const,
    question: 'So what does this mean?',
    hint: "Who is this really about, and what should change?",
    placeholder: "e.g. This is really about mid-level PMs who need to feel confident. Lead with certainty, not depth.",
    minHeight: 140,
    agent: 'Position Builder',
  },
];

const INNOVATE_STEPS: ConversationStep[] = [
  // ── Flow Board ──
  {
    id: 'start',
    question: 'Where does this start?',
    hint: 'What triggers this flow?',
    placeholder: "e.g. A new user lands from a paid ad — no account, no idea what the product does.",
    minHeight: 100,
    agent: 'Flow Board',
  },
  {
    id: 'steps',
    inputType: 'numberedsteps' as const,
    question: 'What are the key steps?',
    hint: 'What are the key stages?',
    placeholder: "e.g. Landing → Signup → Email verification → Onboarding → First core action.",
    minHeight: 160,
    agent: 'Flow Board',
  },
  {
    id: 'breakdown',
    question: 'Where does it break down?',
    hint: 'Where do people slow down or drop off?',
    placeholder: "e.g. 60% drop off at email verification. Most users complete 2 of 8 onboarding steps.",
    minHeight: 120,
    agent: 'Flow Board',
  },
  {
    id: 'success',
    question: 'What does success look like?',
    hint: 'What does a perfect run look like?',
    placeholder: "e.g. Signs up, verifies in one click, completes one core action in 5 minutes, returns the next day.",
    minHeight: 100,
    agent: 'Flow Board',
  },
  // ── Experiment Brief ──
  {
    id: 'hypothesis',
    question: 'What do you believe will fix it?',
    hint: 'What do you believe will fix it?',
    placeholder: "e.g. SMS verification will lift confirmation rate by 20% — the delay is killing momentum.",
    minHeight: 120,
    agent: 'Experiment Brief',
  },
  {
    id: 'test',
    inputType: 'testbrief' as const,
    question: 'How will you test it?',
    hint: 'What is the fastest test that could prove or disprove this?',
    placeholder: "e.g. A/B test SMS vs email for 2 weeks, 50/50 split. Measure confirmation rate.",
    minHeight: 120,
    agent: 'Experiment Brief',
  },
  {
    id: 'pass_fail',
    inputType: 'passfail' as const,
    question: 'What does pass/fail look like?',
    hint: 'What numbers would tell you it worked?',
    placeholder: "e.g. Pass: +15% confirmation rate. Fail: under 5% difference.",
    minHeight: 120,
    agent: 'Experiment Brief',
  },
  {
    id: 'wrong',
    question: 'What could make this wrong?',
    hint: 'What could make this wrong?',
    placeholder: "e.g. Assumes current traffic is representative. Risk: seasonal shift. SMS delivery may vary by market.",
    minHeight: 120,
    agent: 'Experiment Brief',
  },
  // ── Strategy Sketchbook ──
  {
    id: 'options',
    inputType: 'options',
    question: 'What are your real options?',
    hint: 'What are the real options — including the ones you want to dismiss?',
    placeholder: "e.g. A: remove verification (fast, risky). B: magic link (1-week build). C: social login (6-week build). D: keep current, add progress bar.",
    minHeight: 160,
    agent: 'Strategy Sketchbook',
  },
  {
    id: 'option_costs',
    inputType: 'optioncosts' as const,
    question: 'What does each option cost?',
    hint: 'What does each option cost — in time, risk, or assumptions?',
    placeholder: "e.g. Magic link: fast, but only works if email open rate is the real bottleneck. Social login: biggest lift, 6 weeks, depends on Google/Apple.",
    minHeight: 160,
    agent: 'Strategy Sketchbook',
  },
  {
    id: 'recommendation',
    question: "What do you recommend — and what would have to be true for you to be wrong?",
    hint: 'Make the call — and say what would have to be true for you to be wrong.',
    placeholder: "e.g. Magic link — fastest path, low risk. Wrong if: drop-off isn't at verification but the step before.",
    minHeight: 140,
    agent: 'Strategy Sketchbook',
  },
];

const VALIDATE_STEPS: ConversationStep[] = [
  // ── Experience Scorecard ──
  {
    id: 'subject',
    question: 'What are you evaluating?',
    hint: 'What specifically are you evaluating?',
    placeholder: "e.g. The onboarding flow for new free users — signup to first completed action.",
    minHeight: 100,
    agent: 'Experience Scorecard',
  },
  {
    id: 'criteria',
    inputType: 'chips' as const,
    question: 'What will you score it on?',
    hint: 'What criteria actually matter here?',
    placeholder: "e.g. Time-to-value, clarity of next step, emotional tone, error recovery, mobile usability.",
    minHeight: 140,
    agent: 'Experience Scorecard',
  },
  {
    id: 'scores',
    inputType: 'sliders',
    sliderLabels: ['Criterion 1', 'Criterion 2', 'Criterion 3', 'Criterion 4', 'Criterion 5'],
    question: 'Score each criterion — and explain why.',
    hint: 'Rate each out of 10. What evidence supports your score?',
    placeholder: "e.g. Time-to-value: 4/10 — avg 12 minutes. Clarity: 6/10 — CTA found but secondary action missed.",
    minHeight: 160,
    agent: 'Experience Scorecard',
  },
  {
    id: 'fixes',
    inputType: 'prioritychips' as const,
    question: 'What needs fixing first?',
    hint: 'What should change first?',
    placeholder: "e.g. Reduce onboarding to 3 steps. Add a progress indicator. Send a day-1 email with one CTA.",
    minHeight: 120,
    agent: 'Experience Scorecard',
  },
  // ── Influence Map ──
  {
    id: 'audience',
    inputType: 'audienceprofile' as const,
    question: 'Who are you trying to move?',
    hint: 'Who are they, and what do they currently believe?',
    placeholder: "e.g. CFOs at mid-market SaaS. They see AI as a cost, not an investment — too much hype, no ROI.",
    minHeight: 120,
    agent: 'Influence Map',
  },
  {
    id: 'desired_action',
    question: 'What do you want them to do?',
    hint: 'What do you want them to do or believe?',
    placeholder: "e.g. Approve a 3-month pilot — because they believe the ROI is measurable within 90 days.",
    minHeight: 100,
    agent: 'Influence Map',
  },
  {
    id: 'blockers',
    inputType: 'chips' as const,
    question: "What's in the way?",
    hint: "What will stop them?",
    placeholder: "e.g. 'We tried this before.' 'The team won't adopt it.' 'I need board approval over $50k.'",
    minHeight: 140,
    agent: 'Influence Map',
  },
  {
    id: 'move_them',
    inputType: 'barriermoves' as const,
    question: 'How will you move them?',
    hint: 'What will move them past each blocker?',
    placeholder: "e.g. Lead with a 90-day ROI guarantee. Show a case study. Let them speak to a reference customer.",
    minHeight: 140,
    agent: 'Influence Map',
  },
  // ── Results Tracker ──
  {
    id: 'measuring',
    question: 'What are you measuring?',
    hint: 'What are you measuring, and why does it matter now?',
    placeholder: "e.g. Paid acquisition funnel for SMB — $40k spent this quarter and unclear if it's working.",
    minHeight: 100,
    agent: 'Results Tracker',
  },
  {
    id: 'targets',
    inputType: 'metrics' as const,
    question: 'What are you tracking — and what are the targets?',
    hint: "What are you tracking, and what's the target?",
    placeholder: "e.g. CAC → under $800. Trial-to-paid → 15%. Time-to-close → 21 days. MQL volume → 120/mo.",
    minHeight: 140,
    agent: 'Results Tracker',
  },
  {
    id: 'actuals',
    question: 'What are the actual numbers?',
    hint: 'What are the actual numbers?',
    placeholder: "e.g. CAC: $1,240 vs $800. Trial-to-paid: 9% vs 15%. Time-to-close: 34 days vs 21.",
    minHeight: 140,
    agent: 'Results Tracker',
  },
  {
    id: 'changes',
    inputType: 'prioritychips' as const,
    question: 'What needs to change?',
    hint: 'What needs to change to close the gap?',
    placeholder: "e.g. Pause Google Ads — high CAC. A/B test pricing page. Review ICP — may be wrong segment.",
    minHeight: 140,
    agent: 'Results Tracker',
  },
];

const EVALUATE_STEPS_SINGLE: ConversationStep[] = [
  {
    id: 'subject',
    inputType: 'evaluatebrief' as const,
    question: 'What page are you evaluating?',
    hint: 'What is it, who is it for, and what do you know about performance?',
    placeholder: "e.g. Pricing page for mid-market SaaS buyers. Goal: book a demo. Conversion: 2.1%. 70% scroll past without clicking.",
    minHeight: 140,
    agent: 'Page Scorecard',
  },
  {
    id: 'score_criteria',
    inputType: 'chips' as const,
    question: 'What will you score it on?',
    hint: 'What dimensions matter — clarity, trust, friction, CTA strength?',
    placeholder: "e.g. Clarity (value in 5s?), Trust (proof points?), CTA (clear and low-friction?), Cognitive load.",
    minHeight: 120,
    agent: 'Page Scorecard',
  },
  {
    id: 'concerns',
    question: "What do you think isn't working?",
    hint: "What do you think isn't working?",
    placeholder: "e.g. Headline feels generic. 'Book a demo' CTA asks too much — buyers want to try first. Goal: 4%+ conversion.",
    minHeight: 120,
    agent: 'Variant Lens',
  },
];

const EVALUATE_STEPS_JOURNEY: ConversationStep[] = [
  {
    id: 'subject',
    question: 'Describe the flow step by step.',
    hint: 'What happens at each step, and what do you know about performance?',
    placeholder: "e.g. Landing: 8s avg. Pricing: 60% scroll, 2.1% click. Signup: 40% complete. Onboarding: 30% reach first action.",
    minHeight: 180,
    agent: 'Journey Trace',
  },
  {
    id: 'trust_drops',
    question: 'Where does trust drop or friction accumulate?',
    hint: "Where does it break down emotionally?",
    placeholder: "e.g. Trust drops between pricing and signup — CTA doesn't match the intent. Friction builds in onboarding before first value.",
    minHeight: 140,
    agent: 'Journey Trace',
  },
  {
    id: 'transitions',
    question: 'Where are the weakest transitions?',
    hint: "Where do the handoffs feel broken?",
    placeholder: "e.g. Pricing to signup feels abrupt — no reassurance. Users expect to see the product, not a form.",
    minHeight: 120,
    agent: 'Journey Trace',
  },
];

const EVALUATE_STEPS_COMPARISON: ConversationStep[] = [
  {
    id: 'version_a',
    question: 'Describe Version A (current).',
    hint: 'What is the current version — copy, structure, performance?',
    placeholder: "e.g. Headline: 'Built for teams'. CTA: 'Book a demo'. No social proof above fold. Conversion: 2.1%.",
    minHeight: 140,
    agent: 'Variant Lens',
  },
  {
    id: 'version_b',
    question: 'Describe Version B (challenger).',
    hint: "What changed, and what's the hypothesis?",
    placeholder: "e.g. Headline: 'Close deals 40% faster'. CTA: 'Start free trial'. 3 quotes above fold. Hypothesis: less friction → 4%+ conversion.",
    minHeight: 140,
    agent: 'Variant Lens',
  },
  {
    id: 'delta_focus',
    question: 'What do you want the analysis to focus on?',
    hint: 'What do you specifically need to know?',
    placeholder: "e.g. Does the CTA change help or confuse? Is the social proof credible enough? Which reduces decision friction more?",
    minHeight: 100,
    agent: 'Variant Lens',
  },
];

// ─── Conversation flow component ─────────────────────────────────────────────

function ConversationFlow({
  steps, values, onChange,
}: {
  steps: ConversationStep[];
  values: Record<string, string>;
  onChange: (k: string, v: string) => void;
}) {
  // Track which step is active
  const [activeIdx, setActiveIdx] = useState(0);

  // Unlock next step when current has meaningful content (20+ chars)
  // ── Helpers for structured inputs ──────────────────────────────────────
  const allSteps = [...INVESTIGATE_STEPS, ...INNOVATE_STEPS, ...VALIDATE_STEPS,
    ...EVALUATE_STEPS_SINGLE, ...EVALUATE_STEPS_JOURNEY, ...EVALUATE_STEPS_COMPARISON];

  const hasValue = (id: string): boolean => {
    const v = values[id] || '';
    const type = allSteps.find(s => s.id === id)?.inputType;
    if (!type || type === 'textarea' || type === 'synthesis' || type === 'singleline') return v.trim().length > 0;
    if (type === 'chips' || type === 'prioritychips' || type === 'numberedsteps') return v.split('\n').filter(Boolean).length > 0;
    try {
      const parsed = JSON.parse(v);
      if (type === 'contradictions') return parsed.some((p: any) => p.assumed?.trim());
      if (type === 'options') return parsed.length > 0 && !!parsed[0]?.label?.trim();
      if (type === 'optioncosts') return parsed.some((r: any) => r.gains?.trim() || r.givesUp?.trim());
      if (type === 'passfail') return !!(parsed.pass?.trim() || parsed.fail?.trim());
      if (type === 'metrics') return parsed.some((r: any) => r.metric?.trim() && r.metric !== 'N/A');
      if (type === 'sliders') return parsed.some((r: any) => r.note?.trim());
      if (type === 'testbrief') return !!(parsed.method?.trim());
      if (type === 'audienceprofile') return !!(parsed.who?.trim());
      if (type === 'barriermoves') return parsed.some((p: any) => p.barrier?.trim() || p.move?.trim());
      if (type === 'evaluatebrief') return !!(parsed.goal?.trim() || parsed.audience?.trim() || parsed.metric?.trim());
      return false;
    } catch { return false; }
  };

  const getUnlockedUpTo = () => {
    let i = 0;
    while (i < steps.length) {
      if (hasValue(steps[i].id)) i++;
      else break;
    }
    return Math.min(i + 1, steps.length);
  };

  const unlockedUpTo = getUnlockedUpTo();

  // Only auto-advance when user explicitly leaves a field (onBlur)
  const handleBlur = (stepId: string) => {
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx === activeIdx && hasValue(stepId) && activeIdx < steps.length - 1) {
      setActiveIdx(activeIdx + 1);
    }
  };

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        const isVisible = idx < unlockedUpTo;
        const isActive = idx === activeIdx;
        // #5 — Show agent divider when agent changes from previous step
        const prevAgent = idx > 0 ? steps[idx - 1].agent : null;
        const showAgentDivider = isVisible && step.agent && step.agent !== prevAgent && idx > 0;
        const isAnswered = hasValue(step.id) && !isActive;
        const isLocked = !isVisible;

        if (!isVisible) return null;

        return (
          <>
          {showAgentDivider && (
            <div className="flex items-center gap-3 py-2 mb-1">
              <div className="flex-1 h-px bg-fresco-border-light" />
              <span className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wider">{step.agent}</span>
              <div className="flex-1 h-px bg-fresco-border-light" />
            </div>
          )}
          <QuestionCard
            key={step.id}
            step={step}
            value={values[step.id] || ''}
            onChange={v => onChange(step.id, v)}
            onBlur={() => handleBlur(step.id)}
            isActive={isActive}
            isAnswered={isAnswered}
            isLocked={isLocked}
            onActivate={() => setActiveIdx(idx)}
            showAgent={true}
            criteriaValue={values['criteria'] || ''}
            secondaryValue={
              step.id === 'move_them' ? (values['blockers'] || '') :
              step.id === 'option_costs' ? (values['options'] || '') :
              step.id === 'scores' ? (values['criteria'] || '') :
              ''
            }
          />
          </>
        );
      })}

      {/* #2 — Progress with agent context */}
      {unlockedUpTo > 1 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-fresco-xs text-fresco-graphite-light">
              {steps.filter(s => hasValue(s.id)).length} of {steps.length}
              {steps[activeIdx]?.agent ? <span className="text-fresco-graphite-light"> · {steps[activeIdx].agent}</span> : ''}
            </span>
            <span className="text-fresco-xs text-fresco-graphite-light">
              {Math.round((steps.filter(s => hasValue(s.id)).length / steps.length) * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            {steps.map((step, idx) => (
              <div key={idx} className={cn(
                'h-0.5 flex-1 rounded-full transition-all duration-300',
                hasValue(step.id) ? 'bg-fresco-black' :
                idx === activeIdx ? 'bg-fresco-graphite-light' : 'bg-fresco-border'
              )} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── URL tag input ────────────────────────────────────────────────────────────

function UrlTagInput({ urls, onChange, maxUrls, label }: {
  urls: string[];
  onChange: (urls: string[]) => void;
  maxUrls: number;
  label: string;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (raw: string): { url: string; warning: string | null } => {
    const u = raw.trim();
    const normalised = u.startsWith('http') ? u : `https://${u}`;
    if (normalised.includes('/#/')) return { url: normalised, warning: 'Hash-based URL — JS-rendered, may not fetch. Describe the page instead.' };
    return { url: normalised, warning: null };
  };

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    // Handle paste of multiple URLs
    const lines = trimmed.split(/[\n,\s]+/).map(l => l.trim()).filter(Boolean);
    const toAdd = lines.filter(l => !urls.includes(l)).slice(0, maxUrls - urls.length);
    if (toAdd.length > 0) onChange([...urls, ...toAdd]);
    setDraft('');
  };

  const remove = (i: number) => onChange(urls.filter((_, idx) => idx !== i));

  const canAdd = urls.length < maxUrls;

  return (
    <div>
      <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide font-medium mb-2">{label}</p>

      {/* Existing URL chips */}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {urls.map((u, i) => {
            const { warning } = validate(u);
            return (
              <div key={i} className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-fresco-xs border max-w-full',
                warning ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-fresco-border bg-fresco-light-gray text-fresco-black'
              )}>
                <span className="truncate max-w-[220px] font-mono" title={u}>{u.replace(/^https?:\/\//, '')}</span>
                {warning && <span className="text-amber-500 flex-shrink-0" title={warning}>⚠</span>}
                <button type="button" onClick={() => remove(i)} className="flex-shrink-0 hover:text-red-500 transition-colors ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline warning for any flagged URLs */}
      {urls.some(u => validate(u).warning) && (
        <p className="mb-2 text-fresco-xs text-amber-600">
          {urls.find(u => validate(u).warning) && validate(urls.find(u => validate(u).warning)!).warning}
        </p>
      )}

      {/* Add input */}
      {canAdd ? (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            onPaste={e => {
              // Handle paste immediately
              const pasted = e.clipboardData.getData('text');
              if (pasted.includes('\n') || pasted.includes(',')) {
                e.preventDefault();
                const lines = pasted.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
                const toAdd = lines.filter(l => !urls.includes(l)).slice(0, maxUrls - urls.length);
                if (toAdd.length > 0) onChange([...urls, ...toAdd]);
              }
            }}
            placeholder={urls.length === 0 ? 'https://yoursite.com/page' : 'Add another URL…'}
            className="flex-1 h-9 px-3 text-fresco-xs text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black font-mono"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className="h-9 px-3 text-fresco-xs border border-fresco-border text-fresco-graphite-mid hover:border-fresco-black hover:text-fresco-black transition-all disabled:opacity-30"
          >
            Add
          </button>
        </div>
      ) : (
        <p className="text-fresco-xs text-fresco-graphite-light">Max {maxUrls} URL{maxUrls !== 1 ? 's' : ''} for this mode</p>
      )}

      {/* Confirmation when valid URLs present */}
      {urls.length > 0 && urls.every(u => !validate(u).warning) && (
        <p className="mt-1.5 text-fresco-xs text-fresco-graphite-light">
          Fresco will fetch {urls.length === 1 ? 'this page' : `these ${urls.length} pages`} and pass the content to the agents.
        </p>
      )}
    </div>
  );
}

// ─── Evaluate mode selector ───────────────────────────────────────────────────

function EvaluateFlow({
  values, onChange, url, onUrlChange, mode, onModeChange,
}: {
  values: Record<string, string>;
  onChange: (k: string, v: string) => void;
  url: string;
  onUrlChange: (v: string) => void;
  mode: 'single' | 'journey' | 'comparison';
  onModeChange: (m: 'single' | 'journey' | 'comparison') => void;
}) {
  const setMode = onModeChange;
  const [goalAnswered, setGoalAnswered] = useState(false);

  const steps = {
    single: EVALUATE_STEPS_SINGLE,
    journey: EVALUATE_STEPS_JOURNEY,
    comparison: EVALUATE_STEPS_COMPARISON,
  }[mode];

  // Reset values when mode changes
  const prevMode = useRef(mode);
  useEffect(() => {
    if (prevMode.current !== mode) {
      ['subject', 'concerns', 'version_a', 'version_b'].forEach(k => onChange(k, ''));
      prevMode.current = mode;
    }
  }, [mode]);

  return (
    <div className="space-y-6">
      {/* #12 — Mode selector first, prominent, required */}
      <div className="p-4 border-2 border-fresco-black bg-fresco-white">
        <p className="text-fresco-xs font-medium text-fresco-black uppercase tracking-wide mb-1">
          Start here — what are you evaluating?
        </p>
        <p className="text-fresco-xs text-fresco-graphite-light mb-3">Choose your mode — this determines which questions you'll answer.</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'single',     label: 'Single page',    desc: 'One page or feature' },
            { id: 'journey',    label: 'Multi-step flow', desc: 'A funnel or sequence' },
            { id: 'comparison', label: 'Two versions',    desc: 'A/B or current vs target' },
          ] as const).map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                'flex flex-col items-start p-3 text-left border transition-all',
                mode === m.id
                  ? 'bg-fresco-black text-white border-fresco-black'
                  : 'bg-transparent text-fresco-graphite-mid border-fresco-border hover:border-fresco-black hover:text-fresco-black'
              )}
            >
              <span className="text-fresco-sm font-medium">{m.label}</span>
              <span className={cn('text-fresco-xs mt-0.5', mode === m.id ? 'text-white/70' : 'text-fresco-graphite-light')}>{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Goal — after mode is chosen */}
      <QuestionCard
        step={{
          id: 'goal',
          question: 'What are you trying to understand?',
          hint: 'What specifically do you want to understand?',
          placeholder: "e.g. Why the pricing page isn't converting — and the highest-leverage changes before a redesign.",
          minHeight: 80,
        }}
        value={values.goal || ''}
        onChange={v => onChange('goal', v)}
        onBlur={() => { if ((values.goal || '').trim().length > 0) setGoalAnswered(true); }}
        isActive={!goalAnswered}
        isAnswered={goalAnswered && (values.goal || '').trim().length > 0}
        isLocked={false}
        onActivate={() => setGoalAnswered(false)}
      />

      {/* URL input — tag-based for all modes */}
      <UrlTagInput
        urls={url ? url.split('\n').map(u => u.trim()).filter(Boolean) : []}
        onChange={urls => onUrlChange(urls.join('\n'))}
        maxUrls={mode === 'journey' ? 5 : 1}
        label={mode === 'journey' ? 'Page URLs (optional)' : 'URL (optional)'}
      />

      {/* Mode-specific questions */}
      <ConversationFlow steps={steps} values={values} onChange={onChange} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HouseSession({ houseId, workspaceId, sessionId, onBack, onNavigateToHouse }: HouseSessionProps) {
  const { sessions, workspaces } = useFrescoStore();
  const db = useDBWrite();
  const { canGenerate, isLimitReached, currentUsage, limit, incrementUsage } = useAIGeneration();
  const [showPricingModal, setShowPricingModal] = useState(false);

  const session = sessions.find(s => s.id === sessionId);
  const workspace = workspaces.find(w => w.id === workspaceId);
  const meta = HOUSE_META[houseId];

  // Restore persisted result
  const getPersistedResult = (): HouseResult | null => {
    if (!session) return null;
    const ao = (session as any).aiOutputs;
    if (ao?.houseResult) return ao.houseResult as HouseResult;
    if (ao?.sentenceOfTruth && ao?.keyIssues?.length) {
      return {
        house: houseId, fitLabel: ao.fitLabel ?? meta.output, fitStrength: ao.fitStrength ?? 'Mixed',
        verdict: ao.verdict ?? 'INVESTIGATE FURTHER', verdictRationale: ao.verdictRationale ?? '',
        sentenceOfTruth: ao.sentenceOfTruth, keyIssues: ao.keyIssues ?? [],
        necessaryMoves: ao.necessaryMoves ?? [], suggestedNextHouse: ao.suggestedNextHouse ?? null,
        suggestedNextHouseReason: ao.suggestedNextHouseReason ?? '', outputLabel: ao.outputLabel ?? meta.output,
      };
    }
    return null;
  };

  const [values, setValues] = useState<Record<string, string>>({});
  const [url, setUrl] = useState('');
  const [evaluateMode, setEvaluateMode] = useState<'single' | 'journey' | 'comparison'>('single');
  const [isRunning, setIsRunning] = useState(false);
  const [showStartOver, setShowStartOver] = useState(false);
  const [agentEvents, setAgentEvents] = useState<AgentStreamEvent[]>([]);
  const [storedAgentOutputs, setStoredAgentOutputs] = useState<any[]>([]);
  const [pageFetchMessage, setPageFetchMessage] = useState<string | null>(null);
  const [activeLens, setActiveLens] = useState<string | null>(null);
  const [isReframing, setIsReframing] = useState(false);
  const [showLensPicker, setShowLensPicker] = useState(false);
  const [result, setResult] = useState<HouseResult | null>(() => getPersistedResult());
  const [runError, setRunError] = useState<string | null>(null);
  const [userVerdict, setUserVerdict] = useState<string | null>(null);
  const [showVerdictOverride, setShowVerdictOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Challenge step state
  const [challengeQuestions, setChallengeQuestions] = useState<ChallengeQuestion[]>([]);
  const [challengeResponses, setChallengeResponses] = useState<Record<string, string>>({});
  const [challengeDismissed, setChallengeDismissed] = useState(false);
  const [isFetchingChallenge, setIsFetchingChallenge] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const setValue = (k: string, v: string) => setValues(prev => ({ ...prev, [k]: v }));

  // Gate on first meaningful answer
  const primaryField = houseId === 'investigate' ? 'situation'
    : houseId === 'innovate' ? 'start'
    : houseId === 'validate' ? 'subject'
    : 'goal';
  const canRun = !isRunning && (values[primaryField] || '').trim().length >= 3;

  const buildUserInput = () => {
    // Evaluate uses only the fields relevant to the selected mode
    const evaluateModeFields: Record<string, string[]> = {
      single:     ['goal', 'subject', 'score_criteria', 'concerns'],
      journey:    ['goal', 'subject', 'trust_drops', 'transitions'],
      comparison: ['goal', 'version_a', 'version_b', 'delta_focus'],
    };
    const order: Record<HouseId, string[]> = {
      investigate: ['situation', 'observations', 'patterns', 'contradictions', 'truth', 'assumptions', 'assumption_chains', 'ignored', 'new_model', 'position_synthesis'],
      innovate:    ['start', 'steps', 'breakdown', 'success', 'hypothesis', 'test', 'pass_fail', 'wrong', 'options', 'option_costs', 'recommendation'],
      validate:    ['subject', 'criteria', 'scores', 'fixes', 'audience', 'desired_action', 'blockers', 'move_them', 'measuring', 'targets', 'actuals', 'changes'],
      evaluate:    evaluateModeFields[evaluateMode] || evaluateModeFields.single,
    };
    const allSteps = [...INVESTIGATE_STEPS, ...INNOVATE_STEPS, ...VALIDATE_STEPS,
      ...EVALUATE_STEPS_SINGLE, ...EVALUATE_STEPS_JOURNEY, ...EVALUATE_STEPS_COMPARISON];

    const fieldLines = order[houseId]
      .map(k => serializeStructuredField(getInputTypeForId(k, allSteps), values[k] || ''))
      .filter(Boolean)
      .join('\n\n');

    // For Evaluate, prepend mode and URL(s) so agents always know the context
    let input = fieldLines;
    if (houseId === 'evaluate') {
      const modeLabel = evaluateMode === 'single' ? 'Single page' : evaluateMode === 'journey' ? 'Multi-step flow' : 'Two versions (A/B)';
      const urlLines = url.trim()
        ? url.split('\n').map(u => u.trim()).filter(Boolean)
            .map(u => (u.startsWith('http') ? u : `https://${u}`))
            .join(', ')
        : null;
      const header = [
        `Mode: ${modeLabel}`,
        urlLines ? `URL(s): ${urlLines}` : null,
      ].filter(Boolean).join('\n');
      input = header + (fieldLines ? '\n\n' + fieldLines : '');
    }

    // Append challenge responses if any were given
    const answered = Object.entries(challengeResponses)
      .filter(([, v]) => v.trim())
      .map(([i, v]) => {
        const q = challengeQuestions[parseInt(i)];
        return q ? `Q: ${q.question}\nA: ${v.trim()}` : null;
      })
      .filter(Boolean);
    if (answered.length > 0) {
      input += '\n\n## Additional context (answered before running):\n' + answered.join('\n\n');
    }
    return input;
  };

  // Challenge — use refs to avoid stale closure issues
  const challengeFetchedRef = useRef(false);
  const challengeQuestionsRef = useRef<ChallengeQuestion[]>([]);
  const challengeDismissedRef = useRef(false);
  useEffect(() => { challengeQuestionsRef.current = challengeQuestions; }, [challengeQuestions]);
  useEffect(() => { challengeDismissedRef.current = challengeDismissed; }, [challengeDismissed]);

  const handleRunWithChallenge = useCallback(() => {
    if (!canRun || isRunning) return;
    handleRunRef.current();
  }, [canRun, isRunning]);

  const handleRun = useCallback(async () => {
    if (!canRun) return;
    // Check generation limit
    if (!canGenerate) { setShowPricingModal(true); return; }
    setIsRunning(true); setResult(null); setRunError(null); setAgentEvents([]); setStoredAgentOutputs([]); setPageFetchMessage(null);
    const userInput = buildUserInput();

    try {
      const priorSessions = sessions.filter(s => s.workspaceId === workspaceId && s.id !== sessionId);
      const context = priorSessions
        .filter(s => s.sentenceOfTruth?.content || s.insights?.length)
        .slice(0, 3)
        .map(s => {
          const lines: string[] = [];
          if (s.sentenceOfTruth?.content) lines.push(`Core finding: "${s.sentenceOfTruth.content}"`);
          if (s.insights?.length) lines.push(`Insights: ${s.insights.slice(0, 2).map((i: any) => i.content || i).join('; ')}`);
          return lines.join('\n');
        }).join('\n---\n');

      const body: Record<string, string> = { userInput };
      if (context) body.context = context;
      if (url.trim()) body.url = url.trim();

      const response = await fetch(`/api/houses/${houseId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Request failed');

      if ((response.headers.get('content-type') || '').includes('text/event-stream')) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const ev = JSON.parse(line.slice(6));
              if (ev.type === 'pageFetch') {
                if (ev.message) setPageFetchMessage(ev.message);
              } else if (ev.type === 'agent') {
                setAgentEvents(prev => [...prev, {
                  displayName: ev.displayName, signal: ev.signal,
                  summary: ev.summary || '', confidence: ev.confidence || 'medium',
                  structured_artifact: ev.structured_artifact || undefined,
                }]);
                // Store full output for lens reframe
                setStoredAgentOutputs(prev => [...prev, {
                  agentId: ev.displayName,
                  displayName: ev.displayName,
                  summary: ev.summary || '',
                  key_findings: ev.key_findings || [],
                  signal: ev.signal || '',
                  confidence: ev.confidence || 'medium',
                  risks: ev.risks || [],
                  recommendations: ev.recommendations || [],
                }]);
              } else if (ev.type === 'verdict') {
                const { type: _, ...vd } = ev;
                setResult(vd as HouseResult);
                await persistResult(vd as HouseResult);
                incrementUsage();
              }
            } catch { /* skip */ }
          }
        }
      } else {
        const data = await response.json();
        if (data.verdict) { setResult(data); await persistResult(data); }
      }
    } catch (err) {
      console.error('House run failed:', err);
      setRunError('Something went wrong. Check your connection and try again.');
    }
    setIsRunning(false);
  }, [canRun, values, url, houseId, sessions, workspaceId, sessionId]);

  // Stable ref so handleRunWithChallenge always calls the latest handleRun
  const handleRunRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => { handleRunRef.current = handleRun; }, [handleRun]);

  const persistResult = async (data: HouseResult) => {
    if (!session) return;
    await db.saveAIOutputs(sessionId, {
      insights: data.keyIssues, sentenceOfTruth: data.sentenceOfTruth, necessaryMoves: data.necessaryMoves,
    });
    // #15 — use Sentence of Truth as session title (truncated to 60 chars)
    const autoTitle = data.sentenceOfTruth
      ? data.sentenceOfTruth.replace(/^["'""]|["'""]$/g, '').slice(0, 60) + (data.sentenceOfTruth.length > 60 ? '…' : '')
      : null;
    useFrescoStore.getState().updateSession(sessionId, {
      ...(autoTitle ? { title: autoTitle } : {}),
      aiOutputs: {
        houseResult: data, verdict: data.verdict, fitLabel: (data as any).fitLabel, fitStrength: (data as any).fitStrength,
        verdictRationale: data.verdictRationale, keyIssues: data.keyIssues, necessaryMoves: data.necessaryMoves,
        sentenceOfTruth: data.sentenceOfTruth, suggestedNextHouse: data.suggestedNextHouse,
        suggestedNextHouseReason: data.suggestedNextHouseReason, outputLabel: data.outputLabel,
      },
    } as any);
  };

  const handleReframe = async (lens: string) => {
    if (!result || storedAgentOutputs.length === 0) return;
    setIsReframing(true);
    setShowLensPicker(false);
    setActiveLens(lens);
    try {
      const res = await fetch('/api/houses/reframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          house: houseId,
          lens,
          agentOutputs: storedAgentOutputs,
          userInput: buildUserInput(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data as HouseResult);
        await persistResult(data as HouseResult);
      }
    } catch { /* silently fail — keep current result */ }
    setIsReframing(false);
  };

  const generateExportText = () => {
    if (!result) return '';
    return [
      `# ${meta.name} — ${result.outputLabel}`,
      `Workspace: ${workspace?.title || 'Unknown'} · ${new Date().toLocaleDateString()}`,
      '', '## Input', buildUserInput(),
      '', `## Verdict: ${result.verdict === 'INVESTIGATE FURTHER' ? 'Needs more signal' : result.verdict}`, result.verdictRationale,
      '', '## Sentence of Truth', result.sentenceOfTruth,
      '', "## What's going wrong", ...result.keyIssues.map((x, i) => `${i + 1}. ${x}`),
      '', '## What to do now', ...result.necessaryMoves.map((x, i) => `${i + 1}. ${x}`),
    ].join('\n');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateExportText());
    setHasCopied(true); setTimeout(() => setHasCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generateExportText()], { type: 'text/markdown' });
    const u = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: u, download: `${houseId}-${Date.now()}.md` }).click();
    URL.revokeObjectURL(u);
  };

  const vs = result ? (VERDICT_STYLES[result.verdict] || VERDICT_STYLES['INVESTIGATE FURTHER']) : null;

  return (
    <>
    <div className="flex flex-col md:flex-row h-full bg-fresco-white">

      {/* ── LEFT / MIDDLE: Conversation input ─────────────────────────────── */}
      <motion.div
        animate={{ flexBasis: result ? '320px' : undefined, maxWidth: result ? '320px' : undefined }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className={cn("flex-1 flex flex-col overflow-hidden", result && "border-r border-fresco-border-light flex-shrink-0")}
        style={{ minWidth: result ? 260 : undefined }}
      >
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[640px] mx-auto px-4 md:px-8 py-6 md:py-10">

          {/* Back + header */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-8">
              <button type="button" onClick={onBack}
                className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors">
                <ChevronLeft className="w-4 h-4" />
                Back to {workspace?.title || 'Workspace'}
              </button>
              {(result || Object.values(values).some(v => v?.trim())) && (
                <button type="button" onClick={() => setShowStartOver(true)}
                  className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors">
                  Start over
                </button>
              )}
            </div>
            <AnimatePresence>
              {showStartOver && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-6 p-4 border border-fresco-border bg-fresco-white">
                  <p className="text-fresco-sm text-fresco-black mb-3">Clear all answers and start this session fresh?</p>
                  <div className="flex gap-3">
                    <button onClick={() => {
                      Object.keys(values).forEach(k => setValue(k, ''));
                      setResult(null); setAgentEvents([]); setChallengeQuestions([]);
                      setChallengeResponses({}); setChallengeDismissed(false);
                      setShowStartOver(false);
                    }} className="text-fresco-sm font-medium text-red-500 hover:text-red-700 transition-colors">
                      Yes, clear everything
                    </button>
                    <button onClick={() => setShowStartOver(false)} className="text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors">
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-2 mb-3">
              <img src={meta.icon} alt={meta.name} className="w-4 h-4 opacity-60 icon-theme"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="fresco-label capitalize">{meta.name}</span>
            </div>
            <h1 className="text-fresco-3xl font-medium text-fresco-black tracking-tight mb-1">{meta.name}</h1>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light bg-fresco-light-gray border border-fresco-border px-2.5 py-0.5 rounded-full">
                {(meta as any).formalLabel}
              </span>
              <span className="text-fresco-xs text-fresco-graphite-light">{meta.output}</span>
            </div>
            <p className="text-fresco-sm text-fresco-graphite-mid max-w-lg">{meta.description}</p>
          </div>

          {/* Top progress strip — visible before first answer */}
          {houseId !== 'evaluate' && (() => {
            const allSteps = houseId === 'investigate' ? INVESTIGATE_STEPS : houseId === 'innovate' ? INNOVATE_STEPS : VALIDATE_STEPS;
            const answered = allSteps.filter(s => (values[s.id] || '').trim().length > 0).length;
            const pct = Math.round((answered / allSteps.length) * 100);
            if (answered === 0) return null;
            return (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-fresco-xs text-fresco-graphite-light">{answered} of {allSteps.length} answered</span>
                  <span className="text-fresco-xs text-fresco-graphite-light">{pct}%</span>
                </div>
                <div className="flex gap-0.5">
                  {allSteps.map((step, idx) => (
                    <div key={idx} className={cn(
                      'h-0.5 flex-1 transition-all duration-300',
                      (values[step.id] || '').trim().length > 0 ? 'bg-fresco-black' : 'bg-fresco-border'
                    )} />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* House-specific conversation */}
          <div className="mb-8">
            {houseId === 'investigate' && (
              <ConversationFlow steps={INVESTIGATE_STEPS} values={values} onChange={setValue} />
            )}
            {houseId === 'innovate' && (
              <ConversationFlow steps={INNOVATE_STEPS} values={values} onChange={setValue} />
            )}
            {houseId === 'validate' && (
              <ConversationFlow steps={VALIDATE_STEPS} values={values} onChange={setValue} />
            )}
            {houseId === 'evaluate' && (
              <EvaluateFlow values={values} onChange={setValue} url={url} onUrlChange={setUrl} mode={evaluateMode} onModeChange={setEvaluateMode} />
            )}
          </div>
        </div>
        </div>

        {/* #3 — Sticky Run footer */}
        <div className="border-t border-fresco-border-light bg-fresco-white px-4 md:px-8 py-4">
          <div className="max-w-[640px] mx-auto">
            <AnimatePresence>
              {false && canRun && !result && !isRunning && challengeQuestions.length > 0 && !challengeDismissed && (
                <ChallengePanel
                  key="challenge"
                  questions={challengeQuestions}
                  onRespond={responses => {
                    setChallengeResponses(responses);
                    setChallengeDismissed(true);
                    handleRun();
                  }}
                  onDismiss={() => {
                    setChallengeDismissed(true);
                    handleRun();
                  }}
                />
              )}
            </AnimatePresence>

            <button
              onClick={handleRunWithChallenge}
              disabled={!canRun || isRunning}
              className={cn('fresco-btn w-full', (!canRun || isRunning) && 'opacity-40 cursor-not-allowed')}>
              {isRunning
                ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Working through it…</span></>
                : <><Sparkles className="w-4 h-4" /><span>Get a verdict</span></>
              }
            </button>
            {!canRun && !isRunning && !runError && (
              <p className="text-center text-fresco-xs text-fresco-graphite-light mt-2">
                Start answering to unlock the run button
              </p>
            )}
            {runError && !isRunning && (
              <div className="mt-2 p-2.5 bg-red-50 border border-red-200 flex items-start gap-2">
                <span className="text-red-500 text-fresco-xs flex-shrink-0 mt-0.5">!</span>
                <p className="text-fresco-xs text-red-700">{runError}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── RIGHT: Output ──────────────────────────────────────────────────── */}
      <motion.div
        animate={{ flex: result ? '1 1 0%' : '0 0 360px', minWidth: 320 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="flex flex-col border-t border-fresco-border-light bg-fresco-off-white overflow-hidden md:border-t-0 md:border-l"
      >
        <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-fresco-lg font-medium text-fresco-black">Results</h2>
              {result && (
                <p className="text-fresco-xs text-fresco-graphite-light mt-0.5">
                  {meta.name} · <span className="text-fresco-graphite-light">{(meta as any).formalLabel}</span>
                  <span className="text-fresco-graphite-light/60"> — {meta.output}</span>
                </p>
              )}
            </div>
            {isRunning && (
              <div className="flex items-center gap-2 text-fresco-xs text-fresco-graphite-light">
                <Loader2 className="w-3 h-3 animate-spin" /><span>Working…</span>
              </div>
            )}
          </div>

          {(result as any)?._error && (
            <div className="py-6 px-4 border border-red-200 bg-red-50 mb-4">
              <p className="text-fresco-sm font-medium text-red-700 mb-1">Analysis didn't complete</p>
              <p className="text-fresco-xs text-red-600">Something went wrong during the run. Check your connection and try again.</p>
            </div>
          )}

          {!result && agentEvents.length === 0 && !isRunning && (
            <div className="py-8 text-center">
              <img src={meta.icon} alt="" className="w-8 h-8 mx-auto mb-4 opacity-20 icon-theme"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              {canRun ? (
                <div>
                  <p className="text-fresco-sm text-fresco-graphite-mid font-medium mb-1">Ready to go</p>
                  <p className="text-fresco-xs text-fresco-graphite-light">You'll get a verdict, a sentence of truth, what's going wrong, and what to do next.</p>
                </div>
              ) : (
                <div>
                  <p className="text-fresco-sm text-fresco-graphite-light mb-3">Answer the questions on the left — your results appear here.</p>
                  <div className="space-y-1 text-left inline-block">
                    {['Verdict', 'Sentence of Truth', 'What\'s going wrong', 'What to do now'].map(item => (
                      <div key={item} className="flex items-center gap-2 text-fresco-xs text-fresco-graphite-light/50">
                        <div className="w-1 h-1 rounded-full bg-fresco-graphite-light/30" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Streaming agents */}
          <AnimatePresence>
            {(isRunning || (!result && agentEvents.length > 0)) && agentEvents.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-6 space-y-3">
                <span className="fresco-label block mb-3">Working through it…</span>
                {pageFetchMessage && (
                  <div className="mb-3 flex items-center gap-2 text-fresco-xs text-fresco-graphite-mid p-2 bg-fresco-light-gray">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {pageFetchMessage}
                  </div>
                )}
                {/* Completed agents — compact check marks */}
                {agentEvents.slice(0, -1).map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 text-fresco-xs text-fresco-graphite-light py-1">
                    <div className="w-3 h-3 rounded-full bg-fresco-black flex items-center justify-center flex-shrink-0">
                      <svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5L2.8 4L6 1" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span>{ev.displayName}</span>
                  </div>
                ))}
                {/* Current agent — expanded */}
                {agentEvents.length > 0 && (() => {
                  const ev = agentEvents[agentEvents.length - 1];
                  return (
                    <motion.div key={agentEvents.length} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-fresco-light-gray border-l-2 border-fresco-black">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-fresco-black animate-pulse" />
                        <span className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wide">{ev.displayName}</span>
                      </div>
                      <p className="text-fresco-sm text-fresco-graphite-soft leading-relaxed">{ev.signal}</p>
                    </motion.div>
                  );
                })()}
                {isRunning && agentEvents.length < 3 && (
                  <div className="p-3 bg-fresco-light-gray border-l-2 border-fresco-border">
                    <div className="h-2 w-20 bg-fresco-border rounded mb-2 animate-pulse" />
                    <div className="h-2 w-full bg-fresco-border rounded animate-pulse" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Final result */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                {/* SENTENCE OF TRUTH — first, most emotionally valuable */}
                <EditableSentenceOfTruth
                  value={result.sentenceOfTruth}
                  onSave={edited => db.setSentenceOfTruth(sessionId, edited)}
                />

                {/* VERDICT — decision second */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="fresco-label">Verdict</span>
                    {!showVerdictOverride && (
                      <button
                        onClick={() => setShowVerdictOverride(true)}
                        className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors underline underline-offset-2">
                        Override
                      </button>
                    )}
                  </div>
                  {/* System verdict */}
                  <div className={cn('px-4 py-3 border', vs?.bg, vs?.text, vs?.border)}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', vs?.dot)} />
                        <span className="text-fresco-lg font-bold">{result.verdict === 'INVESTIGATE FURTHER' ? 'Needs more signal' : result.verdict}</span>
                        <span className="text-fresco-xs opacity-50 font-normal">system</span>
                      </div>
                      {(result as any).fitStrength && (
                        <span className="text-fresco-xs opacity-70">
                          {(result as any).fitLabel}: {(result as any).fitStrength === 'Undecided' ? 'Mixed' : (result as any).fitStrength}
                        </span>
                      )}
                    </div>
                    <p className="text-fresco-sm opacity-80">{result.verdictRationale}</p>
                  </div>
                  {/* User override */}
                  {showVerdictOverride && !userVerdict && (
                    <div className="mt-2 p-3 border border-fresco-border bg-fresco-light-gray">
                      <p className="text-fresco-xs text-fresco-graphite-mid mb-2">Your call — what do you think?</p>
                      <div className="grid grid-cols-4 gap-1.5 mb-3">
                        {(['GO', 'PIVOT', 'STOP', 'INVESTIGATE FURTHER'] as const).map(v => (
                          <button key={v}
                            onClick={() => setUserVerdict(v)}
                            className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider border border-fresco-border bg-white hover:border-fresco-black hover:bg-fresco-black hover:text-white transition-all">
                            {v === 'INVESTIGATE FURTHER' ? 'MORE SIGNAL' : v}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setShowVerdictOverride(false)}
                        className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}
                  {showVerdictOverride && userVerdict && (
                    <div className="mt-2 p-3 border border-fresco-black bg-fresco-light-gray">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-fresco-xs font-medium uppercase tracking-wider">{userVerdict === 'INVESTIGATE FURTHER' ? 'NEEDS MORE SIGNAL' : userVerdict}</span>
                          <span className="text-fresco-xs text-fresco-graphite-light">your call</span>
                        </div>
                        <button onClick={() => { setUserVerdict(null); setOverrideReason(''); }}
                          className="text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors">
                          Change
                        </button>
                      </div>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={e => setOverrideReason(e.target.value)}
                        placeholder="Why are you overriding? (optional)"
                        className="w-full text-fresco-xs bg-white border border-fresco-border px-2 py-1.5 focus:outline-none focus:border-fresco-black transition-colors placeholder:text-fresco-graphite-light"
                      />
                    </div>
                  )}
                </div>

                {/* POV Statement — Investigate only */}
                {(result as any).povStatement && (
                  <div>
                    <span className="fresco-label block mb-3">Your position</span>
                    <div className="p-4 border-l-4 border-fresco-black bg-fresco-light-gray">
                      <p className="text-fresco-base font-medium text-fresco-black leading-relaxed">
                        {(result as any).povStatement}
                      </p>
                    </div>
                  </div>
                )}

                {/* Suggested next step */}
                {result.suggestedNextHouse && (
                  <div className="p-4 border border-fresco-black/10 bg-fresco-light-gray flex items-center justify-between gap-3">
                    <div>
                      <p className="text-fresco-xs text-fresco-graphite-light mb-0.5">Run this next</p>
                      <p className="text-fresco-sm font-medium text-fresco-black capitalize">{HOUSE_META[result.suggestedNextHouse].name}</p>
                      <p className="text-fresco-xs text-fresco-graphite-mid mt-0.5">{result.suggestedNextHouseReason}</p>
                    </div>
                    <button onClick={() => onNavigateToHouse?.(result.suggestedNextHouse!)}
                      className="flex-shrink-0 flex items-center gap-1.5 text-fresco-xs font-medium text-fresco-black border border-fresco-black px-3 py-1.5 hover:bg-fresco-black hover:text-white transition-colors">
                      Open <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Belief Mapper mental model callout — Investigate only */}
                {houseId === 'investigate' && (() => {
                  const bmEvent = agentEvents.find(e => e.displayName === 'Belief Mapper');
                  if (!bmEvent?.structured_artifact) return null;
                  return (
                    <div>
                      <span className="fresco-label block mb-3">The belief driving this</span>
                      <div className="p-4 border border-fresco-border bg-fresco-white flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-fresco-black rounded-full flex-shrink-0 mt-1.5" />
                        <p className="text-fresco-sm text-fresco-black font-medium">{bmEvent.structured_artifact}</p>
                      </div>
                      <p className="text-fresco-xs text-fresco-graphite-light mt-2">
                        This is the assumption behind how the situation has been framed.
                      </p>
                    </div>
                  );
                })()}

                <div>
                  <span className="fresco-label block mb-3">What's going wrong</span>
                  <div className="space-y-2">
                    {result.keyIssues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-fresco-light-gray">
                        <div className="w-5 h-5 rounded-full border border-fresco-border flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-fresco-xs text-fresco-graphite-light">{i + 1}</span>
                        </div>
                        <p className="text-fresco-sm text-fresco-graphite-soft">{issue}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="fresco-label block mb-3">What to do now</span>
                  <div className="space-y-2">
                    {result.necessaryMoves.map((move, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-fresco-light-gray">
                        <div className="w-5 h-5 rounded-full bg-fresco-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-fresco-xs text-white font-medium">{i + 1}</span>
                        </div>
                        <p className="text-fresco-sm text-fresco-graphite-soft">{move}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-fresco-border-light space-y-3">

                  {/* Post-run upgrade nudge — free plan only */}
                  {limit !== -1 && limit > 0 && (
                    <div className={cn(
                      'p-3 border',
                      currentUsage >= limit
                        ? 'border-fresco-black bg-fresco-black text-white'
                        : 'border-fresco-border bg-fresco-light-gray'
                    )}>
                      {currentUsage >= limit ? (
                        <>
                          <p className="text-fresco-sm font-medium text-white mb-1">You've used all your free runs</p>
                          <p className="text-fresco-xs text-white/70 mb-3">Upgrade to keep analysing across all four houses.</p>
                          <button onClick={() => setShowPricingModal(true)}
                            className="w-full py-2 bg-white text-fresco-black text-fresco-xs font-medium hover:bg-fresco-light-gray transition-colors">
                            See plans →
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-fresco-xs text-fresco-graphite-mid">
                            {limit - currentUsage} of {limit} free house run{limit !== 1 ? 's' : ''} remaining this month.
                          </p>
                          <button onClick={() => setShowPricingModal(true)}
                            className="text-fresco-xs text-fresco-graphite-mid hover:text-fresco-black transition-colors mt-1 underline underline-offset-2">
                            Upgrade for unlimited →
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Lens reframe */}
                  {storedAgentOutputs.length > 0 && (
                    <div>
                      {!showLensPicker ? (
                        <button
                          onClick={() => setShowLensPicker(true)}
                          disabled={isReframing}
                          className="w-full flex items-center justify-between px-4 py-2.5 border border-fresco-border text-fresco-sm text-fresco-graphite-mid hover:border-fresco-black hover:text-fresco-black transition-colors"
                        >
                          <span>{isReframing ? 'Reframing…' : activeLens ? `Lens: ${activeLens.charAt(0).toUpperCase() + activeLens.slice(1)} — change` : 'See this from a different angle →'}</span>
                          {isReframing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        </button>
                      ) : (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="border border-fresco-black p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-fresco-xs font-medium text-fresco-black uppercase tracking-wide">Choose a thinking lens</p>
                            <button onClick={() => setShowLensPicker(false)} className="text-fresco-graphite-light hover:text-fresco-black"><X className="w-3.5 h-3.5" /></button>
                          </div>
                          <p className="text-fresco-xs text-fresco-graphite-light mb-3">Re-runs the synthesis with a different analytical frame. Same agent findings, different perspective.</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: 'critical',   label: 'Critical',    desc: 'Assumptions & evidence' },
                              { id: 'systems',    label: 'Systems',     desc: 'Loops & root causes' },
                              { id: 'design',     label: 'Design',      desc: 'Human & experience' },
                              { id: 'product',    label: 'Product',     desc: 'Build decisions' },
                              { id: 'strategic',  label: 'Strategic',   desc: 'Competitive direction' },
                              { id: 'analytical', label: 'Analytical',  desc: 'Data & measurement' },
                              { id: 'futures',    label: 'Futures',     desc: 'Trajectory & signals' },
                              { id: 'economic',   label: 'Economic',    desc: 'Incentives & value' },
                            ].map(lens => (
                              <button
                                key={lens.id}
                                onClick={() => handleReframe(lens.id)}
                                className={cn(
                                  'flex flex-col items-start p-2.5 border text-left transition-all',
                                  activeLens === lens.id
                                    ? 'bg-fresco-black text-white border-fresco-black'
                                    : 'border-fresco-border hover:border-fresco-black hover:bg-fresco-light-gray'
                                )}
                              >
                                <span className={cn('text-fresco-xs font-medium', activeLens === lens.id ? 'text-white' : 'text-fresco-black')}>{lens.label}</span>
                                <span className={cn('text-[10px] mt-0.5', activeLens === lens.id ? 'text-white/70' : 'text-fresco-graphite-light')}>{lens.desc}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Export */}
                  <button onClick={() => setShowExportModal(true)} className="fresco-btn w-full">
                    <Download className="w-4 h-4" /><span>Save results</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Export modal — inside right panel motion.div but outside scroll */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setShowExportModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-fresco-lg p-6 max-w-md w-full mx-4 shadow-fresco-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-fresco-lg font-medium text-fresco-black">Save your results</h3>
                <button onClick={() => setShowExportModal(false)}><X className="w-5 h-5 text-fresco-graphite-light" /></button>
              </div>
              <div className="space-y-3">
                <button onClick={handleCopy}
                  className="w-full flex items-center gap-3 p-4 border border-fresco-border rounded-fresco hover:bg-fresco-light-gray transition-colors">
                  {hasCopied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-fresco-graphite-mid" />}
                  <div className="text-left">
                    <p className="text-fresco-base text-fresco-black">Copy to clipboard</p>
                    <p className="text-fresco-sm text-fresco-graphite-light">Formatted text</p>
                  </div>
                </button>
                <button onClick={handleDownload}
                  className="w-full flex items-center gap-3 p-4 border border-fresco-border rounded-fresco hover:bg-fresco-light-gray transition-colors">
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
      </motion.div>
    </div>
    <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} triggerHouse={meta.name} />
    </>
  );
}
