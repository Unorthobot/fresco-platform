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
import { VerdictVisual } from '@/components/ui/VerdictVisual';
import { ScoreRadar } from '@/components/ui/ScoreRadar';
import { MetricsBar } from '@/components/ui/MetricsBar';
import { JourneyFunnel } from '@/components/ui/JourneyFunnel';
import { SystemsOutput, CrossHouseSystems,
  IcebergSection, IfNothingChangesSection, LeverageMapSection, InterventionForecastSection,
  PredictedOutcomeSection, InfluenceMapSection, SystemProjectionSection,
  ArchetypeSection, BehaviorOverTimeSection, CausalLoopSection, StockFlowSection,
  IPOSection, SensitivitySection, ScenarioSection,
} from '@/components/ui/SystemsOutput';
import { generatePDFReport, generateHTMLDeck } from '@/lib/reportGenerator';
import { useSession } from 'next-auth/react';
import { incrementGuestRunCount } from '@/lib/guestRuns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HouseSessionProps {
  houseId: HouseId;
  workspaceId: string;
  sessionId: string;
  onBack?: () => void;
  onNavigateToHouse?: (houseId: HouseId, fromSessionId?: string) => void;
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

// Verdict colour tokens — the ONE place in the whole UI where colour appears.
// Each key resolves to CSS variables defined in globals.css (theme-aware).
// 'accent' drives borders, dots, and labels. 'tint' is the soft fill used for
// subtle card backgrounds. Greyscale stays everywhere else in the app.
const VERDICT_COLOURS: Record<string, { accent: string; tint: string }> = {
  'GO':                  { accent: 'var(--verdict-go-accent)',     tint: 'var(--verdict-go-tint)' },
  'PIVOT':               { accent: 'var(--verdict-pivot-accent)',  tint: 'var(--verdict-pivot-tint)' },
  'STOP':                { accent: 'var(--verdict-stop-accent)',   tint: 'var(--verdict-stop-tint)' },
  'INVESTIGATE FURTHER': { accent: 'var(--verdict-signal-accent)', tint: 'var(--verdict-signal-tint)' },
};

// Helper — returns verdict accent/tint with INVESTIGATE FURTHER fallback
const verdictColour = (v?: string) => VERDICT_COLOURS[v || ''] || VERDICT_COLOURS['INVESTIGATE FURTHER'];

// Maps each agent to its thinking phase. Makes the Stanford d-School double
// diamond structure visible in the UI — diverge (explore widely) vs converge
// (synthesise a position). Investigate and Innovate follow the classic double
// diamond. Validate is interrogative (not truly divergent — it pressure-tests
// a pending decision). Evaluate is diagnostic (observes, then focuses).
const AGENT_PHASES: Record<string, { phase: string; label: string }> = {
  // Investigate — first diamond: problem understanding
  'Insight Stack':         { phase: 'diverge',     label: 'Exploring reality' },
  'Belief Mapper':         { phase: 'diverge',     label: 'Exposing assumptions' },
  'Position Builder':      { phase: 'converge',    label: 'Synthesising position' },
  // Innovate — second diamond: solution design
  'Flow Board':            { phase: 'diverge',     label: 'Mapping the system' },
  'Strategy Sketchbook':   { phase: 'diverge',     label: 'Generating options' },
  'Experiment Brief':      { phase: 'converge',    label: 'Synthesising direction' },
  // Validate — interrogative (convergent by design)
  'Experience Scorecard':  { phase: 'interrogate', label: 'Interrogating evidence' },
  'Influence Map':         { phase: 'interrogate', label: 'Stress-testing barriers' },
  'Results Tracker':       { phase: 'converge',    label: 'Synthesising verdict' },
  // Evaluate — diagnostic (observe, then focus)
  'Page Scorecard':        { phase: 'observe',     label: 'Observing reality' },
  'Variant Lens':          { phase: 'observe',     label: 'Comparing signal' },
  'Journey Trace':         { phase: 'converge',    label: 'Finding the lever' },
};

const PHASE_STYLES: Record<string, { label: string; symbol: string }> = {
  diverge:     { label: 'Diverge',     symbol: '◇' },
  converge:    { label: 'Converge',    symbol: '◆' },
  interrogate: { label: 'Interrogate', symbol: '◉' },
  observe:     { label: 'Observe',     symbol: '◐' },
};

// ─── Starter phrases ─────────────────────────────────────────────────────────
// Short sentence stems the user can click to insert at the start of an empty
// textarea. Reduces articulation friction — starting a sentence is the hardest
// part. Keyed by step id so each question gets its own set of stems.
const STARTER_PHRASES: Record<string, string[]> = {
  // Investigate
  situation:           ["I'm trying to figure out…", "The decision I'm facing is…", "I need to understand whether…"],
  observations:        ["What I've actually seen is…", "The data shows…", "Users have told me…"],
  assumptions:         ["I think it's because…", "My best guess is…", "I'm assuming that…"],
  position_synthesis:  ["If I found out that…", "It would change my mind if…", "The one thing that would flip my view is…"],

  // Innovate
  start:       ["I'm trying to build…", "I want to improve…", "The problem I'm solving is…"],
  breakdown:   ["Today the flow goes…", "Where it breaks down is…", "The biggest stuck point is…"],
  constraint:  ["I'm most unsure about…", "What I can't verify yet is…", "The riskiest assumption is…"],

  // Validate
  subject:   ["I'm about to commit to…", "We're planning to…", "The decision on the table is…"],
  criteria:  ["The real signals I have are…", "I know for a fact that…", "People have actually…"],
  audience:  ["A sceptic would say…", "The strongest case against is…", "The uncomfortable truth might be…"],

  // Evaluate
  trust_drops:  ["Trust drops when…", "The moment users hesitate is…", "Confidence breaks at…"],
  transitions:  ["The break that matters most is…", "If I could only fix one thing…", "The highest-leverage change is…"],
  score_criteria: ["My diagnosis is…", "What I think is happening is…", "I've already tried…"],
  concerns:     ["The single change I'd bet on is…", "The one thing most likely to move the metric is…"],
  version_a:    ["Version A is trying to…", "The belief behind A is…", "A says to users…"],
  version_b:    ["Version B tries to…", "We changed it because…", "B is betting that…"],
  delta_focus:  ["A clear winner would look like…", "An ambiguous result would be…", "What would leave me uncertain is…"],
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
          className="flex-1 h-10 px-4 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black transition-all"
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
              className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black"
            />
          </div>
          <div>
            <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">But actually</p>
            <input
              value={pair.actually}
              onChange={e => updatePair(i, 'actually', e.target.value)}
              placeholder="e.g. They churn when we add them"
              className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black"
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
  step, value, onChange, onBlur, onAttach, isActive, isAnswered, isLocked,
  onActivate, showAgent = false, criteriaValue = '', secondaryValue = '',
  stepNumber, totalSteps, priorSummary,
}: {
  step: ConversationStep;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  onAttach?: (stepId: string, content: string) => void;
  isActive: boolean;
  isAnswered: boolean;
  isLocked: boolean;
  onActivate: () => void;
  showAgent?: boolean;
  criteriaValue?: string;
  secondaryValue?: string;
  stepNumber?: number;
  totalSteps?: number;
  priorSummary?: { question: string; preview: string } | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoice(t => onChange(value ? `${value}\n\n${t}` : t));
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = useState<{name: string; content: string; status: 'loading'|'ready'|'error'}[]>([]);

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
          {/* Thread context — show what the user established in prior answers */}
          {isActive && priorSummary && (
            <details className="mb-3 group">
              <summary className="cursor-pointer list-none flex items-start gap-2 text-fresco-xs text-fresco-graphite-light hover:text-fresco-graphite-mid transition-colors">
                <span className="text-fresco-graphite-light/70 flex-shrink-0 mt-0.5">↑</span>
                <span className="flex-1">
                  <span className="font-medium">Earlier:</span> “{priorSummary.preview}”
                </span>
              </summary>
              <div className="mt-2 pl-4 border-l border-fresco-border-light">
                <p className="text-fresco-xs text-fresco-graphite-light mb-1">{priorSummary.question}</p>
                <p className="text-fresco-xs text-fresco-graphite-mid whitespace-pre-wrap leading-relaxed">{priorSummary.preview}</p>
              </div>
            </details>
          )}
          {/* Progress marker — only when active so it doesn't clutter */}
          {isActive && stepNumber !== undefined && totalSteps !== undefined && totalSteps > 1 && (
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light">
                Question {stepNumber} of {totalSteps}
              </p>
              {stepNumber === totalSteps && (
                <p className="text-[10px] text-fresco-graphite-light">Last one</p>
              )}
              {stepNumber === totalSteps - 1 && totalSteps > 2 && (
                <p className="text-[10px] text-fresco-graphite-light">One more after this</p>
              )}
            </div>
          )}
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
                  {/* Starter phrases — appear only when the field is empty, to reduce cold-start friction */}
                  {!value.trim() && STARTER_PHRASES[step.id] && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="text-[10px] uppercase tracking-wider text-fresco-graphite-light/70 self-center mr-1">Start with:</span>
                      {STARTER_PHRASES[step.id].map(phrase => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => {
                            onChange(phrase + ' ');
                            requestAnimationFrame(() => {
                              textRef.current?.focus();
                              const end = textRef.current?.value.length ?? 0;
                              textRef.current?.setSelectionRange(end, end);
                            });
                          }}
                          className="text-fresco-xs text-fresco-graphite-mid bg-fresco-light-gray hover:bg-fresco-border hover:text-fresco-black transition-colors px-2 py-0.5 border border-fresco-border-light"
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  )}
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
                      title="Upload image or text file"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                    <input ref={fileRef} type="file" multiple
                      accept="image/*,.txt,.md,.csv,.json,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      className="hidden"
                      onChange={async e => {
                        const files = Array.from(e.target.files || []);
                        for (const file of files) {
                          const ext = file.name.split('.').pop()?.toLowerCase() || '';
                          const isImage = file.type.startsWith('image/');

                          if (isImage) {
                            // Use Claude vision to extract text/description from image
                            const base64 = await new Promise<string>(res => {
                              const r = new FileReader();
                              r.onload = ev => res((ev.target?.result as string).split(',')[1]);
                              r.readAsDataURL(file);
                            });
                            try {
                              const resp = await fetch('/api/extract-file', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'image', base64, mediaType: file.type, name: file.name }),
                              });
                              const { text } = await resp.json();
                              onChange(value ? `${value}

--- From ${file.name} ---
${text}` : text);
                            } catch {
                              onChange(value ? `${value}

[Image: ${file.name} — could not extract content]` : `[Image: ${file.name}]`);
                            }
                          } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)) {
                            // Send to extraction API
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const resp = await fetch('/api/extract-file', {
                                method: 'POST',
                                body: formData,
                              });
                              const { text } = await resp.json();
                              onChange(value ? `${value}

--- From ${file.name} ---
${text}` : text);
                            } catch {
                              onChange(value ? `${value}

[File: ${file.name} — could not extract content]` : `[File: ${file.name}]`);
                            }
                          } else {
                            // Plain text files
                            const text = await new Promise<string>(res => {
                              const r = new FileReader();
                              r.onload = ev => res(ev.target?.result as string);
                              r.readAsText(file);
                            });
                            onChange(value ? `${value}

--- From ${file.name} ---
${text}` : text);
                          }
                        }
                        // Reset input so same file can be re-selected
                        if (fileRef.current) fileRef.current.value = '';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Attachment pills */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {attachments.map((att, i) => (
                    <div key={i} className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 text-fresco-xs border max-w-[200px]',
                      att.status === 'loading' ? 'border-fresco-border text-fresco-graphite-light bg-fresco-light-gray animate-pulse' :
                      att.status === 'error' ? 'border-red-200 text-red-600 bg-red-50' :
                      'border-fresco-border text-fresco-graphite-mid bg-fresco-light-gray'
                    )}>
                      <span className="truncate flex-1 min-w-0">
                        {att.status === 'loading' ? 'Reading…' : att.name}
                      </span>
                      {att.status === 'ready' && (
                        <button
                          type="button"
                          onClick={() => setAttachments(prev => {
                              const next = prev.filter((_, idx) => idx !== i);
                              const allContent = next.filter(a => a.status === 'ready' && a.content).map(a => a.content).join('\n\n');
                              onAttach?.(step.id, allContent);
                              return next;
                            })}
                          className="flex-shrink-0 text-fresco-graphite-light hover:text-fresco-black transition-colors ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {att.status === 'error' && <span className="flex-shrink-0 text-[10px]">✗</span>}
                    </div>
                  ))}
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
            className="flex-1 h-9 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black" />
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
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">Duration</p>
          <input value={data.duration || ''} onChange={e => update('duration', e.target.value)}
            placeholder="e.g. 2 weeks"
            className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black" />
        </div>
        <div>
          <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">Sample / split</p>
          <input value={data.sample || ''} onChange={e => update('sample', e.target.value)}
            placeholder="e.g. All new signups"
            className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black" />
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
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black" />
      </div>
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">What do they currently believe?</p>
        <input value={data.believes || ''} onChange={e => update('believes', e.target.value)}
          placeholder="e.g. AI tools are a cost centre, not an investment"
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black" />
      </div>
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">Why do they believe it?</p>
        <input value={data.why || ''} onChange={e => update('why', e.target.value)}
          placeholder="e.g. They've seen AI hype without measurable ROI"
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black" />
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
              className="w-full h-9 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border-light rounded-none focus:outline-none focus:border-fresco-black" />
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
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black" />
      </div>
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">Who's the audience?</p>
        <input value={data.audience || ''} onChange={e => update('audience', e.target.value)}
          placeholder="e.g. SaaS buyers at $10M–$100M ARR, evaluating 3–5 tools"
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black" />
      </div>
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide mb-1.5">Current performance</p>
        <input value={data.metric || ''} onChange={e => update('metric', e.target.value)}
          placeholder="e.g. 2.1% conversion, 45s avg time, 70% scroll past pricing"
          className="w-full h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black" />
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
          className="flex-1 h-10 px-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black" />
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
  {
    id: 'situation',
    question: "What are you trying to figure out?",
    hint: "Name the decision you're trying to make.",
    placeholder: "e.g. Drop-off after signup is climbing and we're about to commit to a redesign. Before we do, I need to understand whether it's a product problem, a messaging problem, or an acquisition problem — because the fix is completely different for each.",
    minHeight: 120,
    agent: 'Insight Stack',
  },
  {
    id: 'observations',
    question: "What have you actually observed?",
    hint: "Just the facts — no guessing yet.",
    placeholder: "e.g. Step 3 drop-off: 60% this month, up from 45% in January. Power users skip it entirely. Mobile drop-off 2x desktop. Same two field names in every support ticket for 6 months. Users who complete it have 3x retention at day-30.",
    minHeight: 180,
    agent: 'Insight Stack',
  },
  {
    id: 'assumptions',
    question: "What do you believe is causing it — and what are you assuming?",
    hint: "Your theory, plus what you're assuming is true.",
    placeholder: "e.g. I think the fields are asking for information users don't have at that point. But I'm assuming the fields are actually necessary — nobody has questioned that in 2 years. I'm also assuming the problem is at step 3 rather than earlier in the funnel.",
    minHeight: 160,
    agent: 'Belief Mapper',
  },
  {
    id: 'position_synthesis',
    question: "What would change your mind?",
    hint: "One finding that would flip your view.",
    inputType: 'synthesis' as const,
    placeholder: "e.g. If drop-off was consistent across all user types I'd reconsider whether it's the fields at all. If power users (who skip step 3) had worse retention, that would change everything. If the problem started before step 3, the redesign is solving the wrong thing entirely.",
    minHeight: 140,
    agent: 'Position Builder',
  },
];

const INNOVATE_STEPS: ConversationStep[] = [
  {
    id: 'start',
    question: "What are you trying to build or improve — and who is it for?",
    hint: "Who's it for, and what do they do today instead?",
    placeholder: "e.g. Redesign onboarding for SMB customers who currently take 6 days to reach first value. They're signing up because they saw a specific feature in a demo — but onboarding never shows them that feature. They churn before getting there.",
    minHeight: 140,
    agent: 'Flow Board',
  },
  {
    id: 'breakdown',
    question: "Walk through how it works today. Where do things go wrong?",
    hint: "Walk through the flow. Where's the worst stuck point?",
    placeholder: "e.g. Invite → signup → email verification (40% drop — unexpected step) → empty dashboard (12 options, no guidance) → first project creation (takes 20 mins, should take 2). The verification drop is bad but the empty dashboard is where most churn actually happens.",
    minHeight: 180,
    agent: 'Flow Board',
  },
  {
    id: 'options',
    question: "What are your real options — and what constraints are you working within?",
    hint: "2–3 realistic options. Leave out what's not on the table.",
    placeholder: "e.g. Option A: Skip verification, add fraud detection (1 week, medium risk). Option B: Magic link instead of password (3 days, low risk, doesn't fix dashboard). Option C: Guided setup wizard (6 weeks, fixes the real problem but slow). Budget: 2 engineers, 3 weeks max.",
    inputType: 'options' as const,
    minHeight: 160,
    agent: 'Strategy Sketchbook',
  },
  {
    id: 'constraint',
    question: "What's the one thing you're most unsure about?",
    hint: "The one unknown that would break everything.",
    inputType: 'synthesis' as const,
    placeholder: "e.g. I don't actually know if the verification drop-off is the real problem or a symptom. If users are deciding to churn before they ever hit verification — during the demo or the invite email — then fixing verification changes nothing.",
    minHeight: 130,
    agent: 'Experiment Brief',
  },
];

const VALIDATE_STEPS: ConversationStep[] = [
  {
    id: 'subject',
    question: "What are you about to commit to — and what would make you confident it's the right call?",
    hint: "What's the decision, and what are you risking?",
    placeholder: "e.g. We're about to spend 3 months building an enterprise tier. For me to feel confident: at least 3 enterprise buyers willing to pay £500+/month, a clear use case differentiated from our SMB tier, and a pricing model that doesn't cannibalise existing revenue.",
    minHeight: 140,
    agent: 'Experience Scorecard',
  },
  {
    id: 'criteria',
    question: "What evidence do you have that real people actually want this?",
    hint: "Real signals vs what you're hoping for.",
    placeholder: "e.g. 4 enterprise inbound enquiries this quarter (real). Sales team says they hear it 'all the time' (assumed, not measured). 1 customer said they'd pay more for SSO (real but n=1). Our competitor launched enterprise last year (real signal but different market).",
    minHeight: 160,
    agent: 'Experience Scorecard',
  },
  {
    id: 'audience',
    question: "What's the best argument against doing this — and how do you respond to it?",
    hint: "The sharpest case against — and your honest response.",
    placeholder: "e.g. The strongest case against: we're building enterprise features because enterprise deals feel bigger, not because we've validated enterprise buyers need what we build. Our product is designed for speed — enterprise requires compliance and controls that would slow us down for everyone.",
    minHeight: 160,
    agent: 'Influence Map',
  },
  {
    id: 'actuals',
    question: "What would a successful test look like in 2–4 weeks?",
    hint: "Smallest test, measurable result, clear threshold.",
    placeholder: "e.g. Email the 4 inbound enterprise leads with a specific value prop and price point. Success: 2 of 4 agree to a paid pilot at £400+/month within 3 weeks. If we can't get 2 paid pilots from the warmest leads we have, we don't build the tier.",
    inputType: 'metrics' as const,
    minHeight: 140,
    agent: 'Results Tracker',
  },
];

const EVALUATE_STEPS_SINGLE: ConversationStep[] = [
  {
    id: 'subject',
    inputType: 'evaluatebrief' as const,
    question: 'What is this page supposed to do — and what are the actual numbers?',
    hint: "The action you want, the target, the reality.",
    placeholder: "e.g. Pricing page for mid-market SaaS buyers. Goal: book a demo. Target: 4% conversion. Actual: 2.1%. 45s avg time on page. 70% scroll past pricing without clicking the CTA. Drop-off highest on mobile.",
    minHeight: 160,
    agent: 'Page Scorecard',
  },
  {
    id: 'score_criteria',
    question: 'What do you think is causing the gap?',
    hint: "Your diagnosis, plus what you've already tried.",
    placeholder: "e.g. I think the headline is too generic — 'Built for teams' doesn't tell a mid-market buyer why they should care. We changed the CTA from 'Contact sales' to 'Book a demo' 2 months ago — no measurable lift. Haven't touched the headline or pricing structure.",
    minHeight: 160,
    agent: 'Page Scorecard',
  },
  {
    id: 'concerns',
    question: "What would a 50% improvement look like — and what would prove you're wrong about the cause?",
    hint: "The one change most likely to move the metric, and how you'd know if your diagnosis is off.",
    placeholder: "e.g. A 50% improvement gets us to ~3.2% conversion. I think the highest-leverage change is replacing 'Book a demo' with a lower-commitment CTA — 'See it in action' or 'Start free'. I'd be wrong if the new CTA gets the same click rate but downstream conversion drops — meaning the headline is the real bottleneck, not the ask.",
    minHeight: 140,
    agent: 'Variant Lens',
  },
];

const EVALUATE_STEPS_JOURNEY: ConversationStep[] = [
  {
    id: 'subject',
    question: 'Walk through the flow step by step — with the numbers at each stage.',
    hint: "Each step: what happens, the numbers, the why.",
    placeholder: "e.g. Landing page: 8s avg time, 65% bounce. Pricing: 60% scroll to bottom, 2.1% click CTA. Signup form: 40% complete, 60% abandon (mostly at company size field). Onboarding: 30% reach first meaningful action within 24hrs. 70% churn before day 7.",
    minHeight: 200,
    agent: 'Journey Trace',
  },
  {
    id: 'trust_drops',
    question: "At each step, what's the question the user is asking that the page doesn't answer?",
    hint: "Each step has a question in the user's head. Find the ones the flow doesn't answer.",
    placeholder: "e.g. Landing: 'Is this for me?' — page talks features, not who it's for. Pricing: 'Can I trust this?' — no social proof, no logos, no case studies. Signup: 'Is this worth 5 minutes of my time?' — form asks for company info before showing value. Onboarding: 'What do I do first?' — dashboard greets them with empty state and 12 buttons.",
    minHeight: 160,
    agent: 'Journey Trace',
  },
  {
    id: 'transitions',
    question: 'What is the one break that, if fixed, would most improve the flow — and what would prove you wrong?',
    hint: "The single highest-leverage fix, and how you'd know if your diagnosis is off.",
    placeholder: "e.g. The biggest break is between pricing and signup — feels like being sold to, not signed up. A frictionless signup would change everything. I'd be wrong if signup completion rises but day-7 retention stays flat — meaning the friction was filtering out unqualified users, not blocking qualified ones.",
    minHeight: 140,
    agent: 'Journey Trace',
  },
];

const EVALUATE_STEPS_COMPARISON: ConversationStep[] = [
  {
    id: 'version_a',
    question: 'Describe Version A — and what it was trying to do.',
    hint: "What it does, the belief behind it, the numbers if you have them.",
    placeholder: "e.g. Headline: 'Built for teams'. CTA: 'Book a demo'. Logic: enterprise buyers need to see a demo before committing. No social proof above fold. Conversion: 2.1%. Avg time on page: 45s.",
    minHeight: 160,
    agent: 'Variant Lens',
  },
  {
    id: 'version_b',
    question: 'Describe Version B — and the hypothesis behind it.',
    hint: "What changed, why, and what you expect.",
    placeholder: "e.g. Headline: 'Close deals 40% faster'. CTA: 'Start free trial'. Logic: buyers want proof before a sales conversation, not a demo first. 3 customer quotes above fold. Hypothesis: lower-commitment CTA + outcome-led headline → 4%+ conversion.",
    minHeight: 160,
    agent: 'Variant Lens',
  },
  {
    id: 'delta_focus',
    question: 'What result would change your decision — and what result would leave you uncertain?',
    hint: "What result means a winner, and what leaves you unsure.",
    placeholder: "e.g. Version B at 3.5%+ conversion = clear winner, roll it out. Below 2.5% = current is better, rethink the hypothesis. Between 2.5–3.5% = inconclusive — the CTA might be right but the headline isn't doing enough work.",
    minHeight: 140,
    agent: 'Variant Lens',
  },
];

// ─── Universal URL input ──────────────────────────────────────────────────────

function UniversalUrlInput({ url, onUrlChange }: { url: string; onUrlChange: (v: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded && !url) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-2 px-3 py-2 mt-3 text-fresco-xs text-fresco-graphite-light hover:text-fresco-black border border-dashed border-fresco-border hover:border-fresco-graphite-light transition-colors"
      >
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
        </svg>
        <span>Attach a URL — reference page, competitor, or doc link</span>
      </button>
    );
  }

  return (
    <div className="border border-fresco-border p-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-3 h-3 text-fresco-graphite-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
        </svg>
        <span className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide">Reference URL</span>
        {url && (
          <button onClick={() => { onUrlChange(''); setExpanded(false); }}
            className="ml-auto text-fresco-xs text-fresco-graphite-light hover:text-fresco-black transition-colors">
            Remove
          </button>
        )}
      </div>
      <input
        type="url"
        value={url}
        onChange={e => onUrlChange(e.target.value)}
        onBlur={() => { if (!url) setExpanded(false); }}
        autoFocus={!url}
        placeholder="https://…"
        className="w-full text-fresco-xs bg-fresco-light-gray border border-fresco-border px-3 py-2 focus:outline-none focus:border-fresco-black transition-colors placeholder:text-fresco-graphite-light"
      />
      {url && (
        <p className="text-[10px] text-fresco-graphite-light mt-1.5">
          Fresco will fetch this page and include it as reference material in the analysis.
        </p>
      )}
    </div>
  );
}

// ─── Conversation flow component ─────────────────────────────────────────────

function ConversationFlow({
  steps, values, onChange, onAttach,
}: {
  steps: ConversationStep[];
  values: Record<string, string>;
  onChange: (k: string, v: string) => void;
  onAttach?: (stepId: string, content: string) => void;
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

  // Advance to next step when user explicitly signals done (onBlur)
  const handleBlur = (stepId: string) => {
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx < 0 || !hasValue(stepId)) return;
    if (idx < steps.length - 1) {
      // Not the last step — advance to the next.
      setActiveIdx(idx + 1);
    } else {
      // Last step Done — deactivate so the step collapses to its answered
      // state. Without this, clicking Done on the final step appeared to do
      // nothing because activeIdx stayed pointed at it (isActive remained
      // true, isAnswered remained false, the input stayed expanded).
      setActiveIdx(steps.length);
    }
  };

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        const isVisible = idx < unlockedUpTo;
        const isActive = idx === activeIdx;
        // #5 — Show agent divider when agent changes from previous step
        const prevAgent = idx > 0 ? steps[idx - 1].agent : null;
        const showAgentDivider = false; // Agent labels removed — framework hints in questions instead
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
            stepNumber={idx + 1}
            totalSteps={steps.length}
            priorSummary={(() => {
              // Show the most recent answered step before this one, if any.
              // Gives the user thread context without forcing them to re-read.
              if (idx === 0) return null;
              for (let j = idx - 1; j >= 0; j--) {
                const prev = steps[j];
                const v = values[prev.id];
                if (!v) continue;
                // For structured types, try a lightweight preview
                let preview = v;
                if (prev.inputType === 'options') {
                  try {
                    const cards = JSON.parse(v).filter((c: any) => c.label?.trim());
                    preview = cards.map((c: any) => c.label).join(', ');
                  } catch { /* leave as-is */ }
                } else if (prev.inputType === 'metrics') {
                  try {
                    const rows = JSON.parse(v).filter((r: any) => r.metric?.trim());
                    preview = rows.map((r: any) => `${r.metric}: ${r.actual || '—'}`).join('; ');
                  } catch { /* leave as-is */ }
                } else if (prev.inputType === 'evaluatebrief') {
                  try {
                    const p = JSON.parse(v);
                    preview = [p.goal, p.audience, p.metric].filter(Boolean).join(' · ');
                  } catch { /* leave as-is */ }
                }
                // Trim to a single-line preview for the collapsed summary
                const oneLine = preview.replace(/\s+/g, ' ').trim();
                const truncated = oneLine.length > 120 ? oneLine.slice(0, 120) + '…' : oneLine;
                return { question: prev.question, preview: truncated };
              }
              return null;
            })()}
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
            className="flex-1 h-9 px-3 text-fresco-xs text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:border-fresco-black font-mono"
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
  values, onChange, url, onUrlChange, mode, onModeChange, onAttach,
}: {
  values: Record<string, string>;
  onChange: (k: string, v: string) => void;
  url: string;
  onUrlChange: (v: string) => void;
  mode: 'single' | 'journey' | 'comparison';
  onModeChange: (m: 'single' | 'journey' | 'comparison') => void;
  onAttach?: (stepId: string, content: string) => void;
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
          hint: 'What do you want to understand?',
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
        maxUrls={mode === 'journey' ? 5 : mode === 'comparison' ? 2 : 1}
        label={mode === 'journey' ? 'Page URLs (optional)' : mode === 'comparison' ? 'Version URLs — A first, B second (optional)' : 'URL (optional)'}
      />

      {/* Mode-specific questions */}
      <ConversationFlow steps={steps} values={values} onChange={onChange} onAttach={onAttach} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HouseSession({ houseId, workspaceId, sessionId, onBack, onNavigateToHouse }: HouseSessionProps) {
  const { sessions, workspaces } = useFrescoStore();
  const db = useDBWrite();
  const { canGenerate, isLimitReached, currentUsage, limit, incrementUsage } = useAIGeneration();
  const { status: authStatus } = useSession();
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

  // ─── Handoff detection ──────────────────────────────────────────────────────
  // When a user clicks 'Open' on the Run-this-next card, the parent stashes the
  // source session id in sessionStorage. We pick it up here and use it to seed
  // the new session with relevant context and a pre-filled first question.
  const handoff = (() => {
    try {
      const sourceSessionId = sessionStorage.getItem(`fresco-handoff-${sessionId}`);
      if (!sourceSessionId) return null;
      const sourceSession = sessions.find(s => s.id === sourceSessionId);
      if (!sourceSession) return null;
      const sourceHouse = (sourceSession as any).houseType as HouseId | undefined;
      const sourceResult = (sourceSession as any).aiOutputs?.houseResult as HouseResult | undefined;
      if (!sourceHouse || !sourceResult) return null;
      return { sourceSessionId, sourceHouse, sourceResult };
    } catch { return null; }
  })();

  // ─── First-question pre-fill (templated from handoff) ───────────────────────
  // Small helper that turns a prior session's output into a first-draft answer
  // for the new session's opening question. Templates are per target house.
  const buildPrefillForHouse = (target: HouseId, src: { sourceHouse: HouseId; sourceResult: HouseResult }): string => {
    const { sourceHouse, sourceResult } = src;
    const sourceName = HOUSE_META[sourceHouse].name;
    const truth = sourceResult.sentenceOfTruth?.trim() || '';
    const nextMove = (sourceResult.necessaryMoves || [])[0]?.trim() || '';
    switch (target) {
      case 'investigate':
        return truth ? `Following on from ${sourceName}, which concluded: "${truth}". I want to dig deeper into what's actually going on beneath that — what observations I actually have, what I'm assuming, and what would change my view.` : '';
      case 'innovate':
        return nextMove ? `The direction from ${sourceName} was: ${nextMove}. I want to turn this into 2–3 concrete options worth building, and figure out what I'd test first.` : truth ? `Based on ${sourceName}'s finding: "${truth}". I want to work out what to build or change next, and what constraints I'm working within.` : '';
      case 'validate':
        return nextMove ? `${sourceName} recommends: ${nextMove}. Before we commit, I want to pressure-test whether this will actually work — what evidence supports it, what's the strongest argument against, and what small test would change my mind.` : truth ? `Given the finding from ${sourceName}: "${truth}". I'm considering committing to a direction based on this. I want to check whether it will survive contact with reality before we spend time building.` : '';
      case 'evaluate':
        return truth ? `Building on ${sourceName} which found: "${truth}". Now I want to look at how things are actually performing against this, what's working, what isn't, and where the highest-leverage intervention is.` : '';
      default:
        return '';
    }
  };

  const getFirstStepId = (target: HouseId): string => {
    if (target === 'investigate') return 'situation';
    if (target === 'innovate') return 'start';
    if (target === 'validate') return 'subject';
    // Evaluate is special: it has a 'goal' field rendered above the mode-
    // specific steps (single/journey/comparison). The diagnostic input
    // semantically matches 'goal' ("What are you trying to understand?")
    // and unlike 'subject', it's present in all three modes. Seeding
    // 'subject' meant comparison mode silently dropped the seed entirely
    // because comparison's field order skips 'subject'.
    if (target === 'evaluate') return 'goal';
    return '';
  };

  const [values, setValues] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`fresco-inputs-${sessionId}`);
      const parsed = saved ? JSON.parse(saved) : {};
      // Two possible pre-fills, applied only when there are no saved values:
      //   1. Handoff — arrived via 'Run this next' from another session (rich)
      //   2. Seed    — arrived via home diagnostic, user's own typed input
      // Handoff takes priority because it carries structured prior context.
      if (Object.keys(parsed).length === 0) {
        const firstId = getFirstStepId(houseId);
        if (handoff && firstId) {
          const prefill = buildPrefillForHouse(houseId, handoff);
          if (prefill) return { [firstId]: prefill };
        }
        // No handoff — check for a diagnostic seed (user's own sentence)
        try {
          const seed = sessionStorage.getItem(`fresco-seed-${sessionId}`);
          if (seed && firstId) return { [firstId]: seed };
        } catch { /* ignore */ }
      }
      return parsed;
    } catch { return {}; }
  });
  const [attachmentContext, setAttachmentContext] = useState<Record<string, string>>({});

  const handleAttach = (stepId: string, content: string) => {
    setAttachmentContext(prev => content ? { ...prev, [stepId]: content } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== stepId)));
  };
  const [url, setUrl] = useState('');
  const [evaluateMode, setEvaluateMode] = useState<'single' | 'journey' | 'comparison'>('single');
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const outputScrollRef = useRef<HTMLDivElement>(null);
  const inputScrollRef = useRef<HTMLDivElement>(null);
  const [showStartOver, setShowStartOver] = useState(false);
  const [agentEvents, setAgentEvents] = useState<AgentStreamEvent[]>([]);
  const [storedAgentOutputs, setStoredAgentOutputs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(`fresco-agent-outputs-${sessionId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [pageFetchMessage, setPageFetchMessage] = useState<string | null>(null);
  const [activeLens, setActiveLens] = useState<string | null>(null);
  const [isReframing, setIsReframing] = useState(false);
  const [result, setResult] = useState<HouseResult | null>(() => getPersistedResult());
  const [runError, setRunError] = useState<string | null>(null);
  const [userVerdict, setUserVerdict] = useState<string | null>(null);
  const [showVerdictOverride, setShowVerdictOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [outputTab, setOutputTab] = useState<'decision' | 'analysis'>('decision');
  const [showTabTooltip, setShowTabTooltip] = useState(false);
  // Feature 5: first session detection — drives progressive question guidance
  const [isFirstSession] = useState(() => {
    try { return !localStorage.getItem('fresco-has-run'); } catch { return false; }
  });

  // Challenge step state
  const [challengeQuestions, setChallengeQuestions] = useState<ChallengeQuestion[]>([]);
  const [challengeResponses, setChallengeResponses] = useState<Record<string, string>>({});
  const [challengeDismissed, setChallengeDismissed] = useState(false);
  const [isFetchingChallenge, setIsFetchingChallenge] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const setValue = (k: string, v: string) => setValues(prev => {
    const next = { ...prev, [k]: v };
    try { localStorage.setItem(`fresco-inputs-${sessionId}`, JSON.stringify(next)); } catch {}
    return next;
  });

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
      investigate: ['situation', 'observations', 'assumptions', 'position_synthesis'],
      innovate:    ['start', 'breakdown', 'options', 'constraint'],
      validate:    ['subject', 'criteria', 'audience', 'actuals'],
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

    // Append attachment context — files attached by the user, kept separate from typed answers
    const attachmentLines = Object.entries(attachmentContext)
      .filter(([, content]) => content.trim())
      .map(([stepId, content]) => `[Attached to "${stepId}"]\n${content}`)
      .join('\n\n');
    if (attachmentLines) {
      input += `\n\n--- ATTACHED FILES (reference material) ---\n${attachmentLines}`;
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
    const abort = new AbortController();
    abortRef.current = abort;
    setIsRunning(true); setResult(null); setRunError(null); setAgentEvents([]); setStoredAgentOutputs([]); setPageFetchMessage(null); setOutputTab('decision');
    // Once the run starts, clear the handoff + seed markers so a refresh
    // doesn't re-seed. The values are already persisted to localStorage.
    try {
      sessionStorage.removeItem(`fresco-handoff-${sessionId}`);
      sessionStorage.removeItem(`fresco-seed-${sessionId}`);
    } catch {}
    const userInput = buildUserInput();

    try {
      // ─── Rich cross-session context ─────────────────────────────────────
      // Fresco should feel like a thinking partner that remembers prior work
      // in this workspace — not a series of disconnected forms.
      const priorSessions = sessions.filter(s => s.workspaceId === workspaceId && s.id !== sessionId);

      // For each prior session, extract a full digest (not just sentence-of-truth)
      const digestSession = (s: any): string | null => {
        const hr = s.aiOutputs?.houseResult as HouseResult | undefined;
        if (!hr) {
          // Legacy fallback — older sessions may only have sentenceOfTruth + insights
          const sot = s.sentenceOfTruth?.content;
          if (!sot && !s.insights?.length) return null;
          const label = s.houseType ? HOUSE_META[s.houseType as HouseId].name : (s.title || 'Earlier session');
          const lines = [`━━ ${label} ━━`];
          if (sot) lines.push(`Sentence of truth: "${sot}"`);
          if (s.insights?.length) lines.push(`Insights: ${s.insights.slice(0, 3).map((i: any) => i.content || i).join(' | ')}`);
          return lines.join('\n');
        }
        const label = HOUSE_META[hr.house as HouseId]?.name || hr.house;
        const lines = [`━━ ${label} · verdict: ${hr.verdict} ━━`];
        if (hr.sentenceOfTruth) lines.push(`Sentence of truth: "${hr.sentenceOfTruth}"`);
        if (hr.verdictRationale) lines.push(`Why that verdict: ${hr.verdictRationale}`);
        if (hr.keyIssues?.length) lines.push(`Key issues: ${hr.keyIssues.slice(0, 4).join(' | ')}`);
        if (hr.necessaryMoves?.length) lines.push(`Recommended next moves: ${hr.necessaryMoves.slice(0, 4).join(' | ')}`);
        if (hr.suggestedNextHouse) lines.push(`Recommended next house: ${HOUSE_META[hr.suggestedNextHouse]?.name || hr.suggestedNextHouse} — ${hr.suggestedNextHouseReason || ''}`.trim());
        return lines.join('\n');
      };

      const priorDigests = priorSessions
        .sort((a: any, b: any) => (new Date(b.updatedAt || b.createdAt).getTime()) - (new Date(a.updatedAt || a.createdAt).getTime()))
        .slice(0, 4)
        .map(digestSession)
        .filter(Boolean) as string[];

      // Handoff block: if this session was started from another via 'Open', call
      // it out explicitly so agents treat the previous finding as foundational.
      let handoffBlock = '';
      if (handoff) {
        const srcName = HOUSE_META[handoff.sourceHouse].name;
        const hr = handoff.sourceResult;
        handoffBlock = `━━ CONTINUED FROM ${srcName.toUpperCase()} ━━\n` +
          `This session was started directly from a ${srcName} session. Treat its output as foundational context — the user expects you to build on it, not re-derive what it already established.\n` +
          `${srcName} concluded with: "${hr.sentenceOfTruth}" (verdict: ${hr.verdict}).\n` +
          (hr.necessaryMoves?.length ? `Key next moves it recommended: ${hr.necessaryMoves.slice(0, 3).join(' | ')}\n` : '') +
          (hr.suggestedNextHouseReason ? `Why the user is now here: ${hr.suggestedNextHouseReason}` : '');
      }

      // Workspace summary (simple derived rollup across all sessions)
      const workspaceSummary = (() => {
        if (priorDigests.length === 0) return '';
        const verdicts = priorSessions
          .map((s: any) => s.aiOutputs?.houseResult?.verdict)
          .filter(Boolean);
        const verdictCounts = verdicts.reduce((acc: Record<string, number>, v: string) => { acc[v] = (acc[v] || 0) + 1; return acc; }, {});
        const verdictSummary = Object.entries(verdictCounts).map(([v, n]) => `${n}× ${v}`).join(', ');
        const housesRun = Array.from(new Set(priorSessions.map((s: any) => s.houseType).filter(Boolean))).map((h: any) => HOUSE_META[h as HouseId]?.name || h).join(', ');
        const lines = [`━━ WORKSPACE ROLLUP ━━`];
        if (housesRun) lines.push(`Houses already run in this workspace: ${housesRun}`);
        if (verdictSummary) lines.push(`Verdicts so far: ${verdictSummary}`);
        return lines.join('\n');
      })();

      const context = [handoffBlock, workspaceSummary, ...priorDigests].filter(Boolean).join('\n\n---\n\n');

      const body: Record<string, string> = { userInput };
      if (context) body.context = context;
      if (url.trim()) body.url = url.trim();
      // Tell the API explicitly which mode this Evaluate session is in.
      // Backend uses this to choose primary agent + label pages correctly.
      if (houseId === 'evaluate') body.evaluateMode = evaluateMode;

      const response = await fetch(`/api/houses/${houseId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abort.signal,
      });
      if (!response.ok) throw new Error('Request failed');

      if ((response.headers.get('content-type') || '').includes('text/event-stream')) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          if (abort.signal.aborted) { reader.cancel(); break; }
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
                setAgentEvents(prev => {
                  const next = [...prev, {
                    displayName: ev.displayName, signal: ev.signal,
                    summary: ev.summary || '', confidence: ev.confidence || 'medium',
                    structured_artifact: ev.structured_artifact || undefined,
                  }];
                  try { localStorage.setItem(`fresco-agent-outputs-${sessionId}`, JSON.stringify(next)); } catch {}
                  return next;
                });
                // Store full output for lens reframe
                setStoredAgentOutputs(prev => {
                  const next = [...prev, {
                    agentId: ev.displayName,
                    displayName: ev.displayName,
                    summary: ev.summary || '',
                    key_findings: ev.key_findings || [],
                    signal: ev.signal || '',
                    confidence: ev.confidence || 'medium',
                    risks: ev.risks || [],
                    recommendations: ev.recommendations || [],
                  }];
                  return next;
                });
              } else if (ev.type === 'verdict') {
                const { type: _, ...vd } = ev;
                setResult(vd as HouseResult);
                await persistResult(vd as HouseResult);
                // Increment the right counter for the right user type. Anonymous
                // → localStorage guest counter (since user-quota increment is a
                // no-op without state.user). Authenticated → store quota.
                if (authStatus === 'authenticated') {
                  incrementUsage();
                } else {
                  incrementGuestRunCount();
                }
                inputScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                outputScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                // Show tab tooltip on first ever result
                const hasSeenTooltip = localStorage.getItem('fresco-tab-tooltip-seen');
                if (!hasSeenTooltip) {
                  setTimeout(() => setShowTabTooltip(true), 800);
                }
                // Flag that this browser has run at least one session (used for guest empty state)
                try { localStorage.setItem('fresco-has-run', '1'); } catch {}
              }
            } catch { /* skip */ }
          }
        }
      } else {
        const data = await response.json();
        if (data.verdict) { setResult(data); await persistResult(data); inputScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); outputScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }
      }
    } catch (err) {
      // Don't treat a deliberate user abort as an error — Stop was clicked.
      const wasAbort = (err as any)?.name === 'AbortError' || abort.signal.aborted;
      if (!wasAbort) {
        console.error('House run failed:', err);
        setRunError('Something went wrong. Check your connection and try again.');
      }
    }
    setIsRunning(false);
  }, [canRun, values, url, houseId, sessions, workspaceId, sessionId]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
    setAgentEvents([]);
    setPageFetchMessage(null);
    setRunError(null);
  }, []);

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
    if (!result) {
      setRunError('Run a house first before applying a lens.');
      return;
    }
    if (storedAgentOutputs.length === 0) {
      setRunError('Lens reframe needs the original agent outputs. Re-run the house and the lenses will be available afterwards.');
      return;
    }
    setIsReframing(true);
    setActiveLens(lens);
    setRunError(null);
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
      if (!res.ok) {
        // Surface server errors instead of failing silently. Read the body
        // for a useful message; fall back to the status code.
        let serverMessage = '';
        try {
          const errBody = await res.json();
          serverMessage = errBody?.error || '';
        } catch { /* ignore */ }
        throw new Error(serverMessage || `Reframe failed (${res.status})`);
      }
      const data = await res.json();
      // Preserve systemsOutput from original result — lens only changes
      // verdict/issues/moves/sentenceOfTruth, not the systems intelligence
      const merged = {
        ...data,
        systemsOutput: (result as any).systemsOutput,
      };
      setResult(merged as HouseResult);
      await persistResult(merged as HouseResult);
      // Scroll the output panel to the top so the user sees the new verdict.
      // Lens picker now lives on the Decision tab; force-set it as the active
      // tab in case the user happened to switch to Analysis mid-reframe.
      setOutputTab('decision');
      requestAnimationFrame(() => {
        outputScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        inputScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } catch (err) {
      console.error('Reframe failed:', err);
      const msg = err instanceof Error ? err.message : 'Reframe failed';
      setRunError(`${msg}. Try a different lens or re-run the house.`);
      // Roll back the active lens since the change didn't actually land
      setActiveLens(null);
    } finally {
      setIsReframing(false);
    }
  };

  const generateExportText = () => {
    if (!result) return '';
    const so = (result as any).systemsOutput;
    const beliefMapper = agentEvents.find(e => e.displayName === 'Belief Mapper');
    const lines: string[] = [];

    // Header
    lines.push(`# ${meta.name} — ${result.outputLabel}`);
    lines.push(`Workspace: ${workspace?.title || 'Unknown'} · ${new Date().toLocaleDateString()}`);

    // Input
    lines.push('', '## Input', buildUserInput());

    // Decision
    lines.push('', `## Verdict: ${result.verdict === 'INVESTIGATE FURTHER' ? 'Needs more signal' : result.verdict}`, result.verdictRationale);
    lines.push('', '## Sentence of Truth', result.sentenceOfTruth);
    lines.push('', "## What's going wrong", ...result.keyIssues.map((x, i) => `${i + 1}. ${x}`));
    lines.push('', '## What to do now', ...result.necessaryMoves.map((x, i) => `${i + 1}. ${x}`));

    // Run this next
    if ((result as any).suggestedNextHouse) {
      lines.push('', '## Run this next', `**${(result as any).suggestedNextHouse.charAt(0).toUpperCase() + (result as any).suggestedNextHouse.slice(1)}** — ${(result as any).suggestedNextHouseReason || ''}`);
    }

    // — Beat 1: What's actually happening —
    const beat1: string[] = [];
    if (houseId === 'investigate' && (result as any).povStatement) {
      beat1.push('### Your point of view', (result as any).povStatement, '');
    }
    if (houseId === 'investigate' && beliefMapper?.structured_artifact) {
      beat1.push('### Core assumption', beliefMapper.structured_artifact, '_This is the belief being treated as fact. Challenge it before committing to a direction._', '');
    }
    if (houseId === 'investigate' && so?.icebergLevels) {
      beat1.push('### Iceberg analysis');
      const il = so.icebergLevels;
      if (il.event)       beat1.push(`- **Event** (visible): ${il.event}`);
      if (il.pattern)     beat1.push(`- **Pattern** (recurring): ${il.pattern}`);
      if (il.structure)   beat1.push(`- **Structure** (producing): ${il.structure}`);
      if (il.mentalModel) beat1.push(`- **Mental model** (belief): ${il.mentalModel}`);
      beat1.push('');
    }
    if (houseId === 'innovate' && so?.leverageMap?.length) {
      beat1.push('### Leverage map');
      so.leverageMap.forEach((m: any) => {
        beat1.push(`- **${m.option || ''}** (${m.leverageLevel || 'unknown leverage'}): ${m.impact || ''}`);
      });
      beat1.push('');
    }
    if (houseId === 'validate' && so?.funnelSimulation) {
      beat1.push('### Predicted outcome');
      const fs = so.funnelSimulation;
      if (fs.expected)  beat1.push(`- **Expected**: ${fs.expected}`);
      if (fs.bestCase)  beat1.push(`- **Best case**: ${fs.bestCase}`);
      if (fs.worstCase) beat1.push(`- **Worst case**: ${fs.worstCase}`);
      beat1.push('');
    }
    if (beat1.length) {
      lines.push('', "## What's actually happening", "_The surface read — what the situation looks like and what belief sits underneath it._", '', ...beat1);
    }

    // — Beat 2: Why it persists —
    const beat2: string[] = [];
    if (so?.currentStateSimulation) {
      beat2.push('### If nothing changes', `> ${so.currentStateSimulation}`, '');
    }
    if (so?.archetype?.name && so.archetype.name !== 'null') {
      beat2.push(`### System archetype: ${so.archetype.name}`);
      if (so.archetype.description) beat2.push(so.archetype.description);
      if (so.archetype.loop)        beat2.push(`**How it shows up here**: ${so.archetype.loop}`);
      if (so.archetype.escape)      beat2.push(`**How to break out**: ${so.archetype.escape}`);
      beat2.push('');
    }
    if (so?.behaviorOverTime?.length && so.behaviorOverTime.some((s: any) => s?.dataPoints?.length >= 2)) {
      beat2.push('### Behavior over time');
      so.behaviorOverTime.forEach((s: any) => {
        if (!s?.dataPoints?.length) return;
        beat2.push(`**${s.variable || 'Variable'}** (${s.unit || ''}) — trending ${s.trend || 'unknown'}`);
        s.dataPoints.forEach((p: any) => beat2.push(`- ${p.label}: ${p.value}`));
        if (s.projection?.length) {
          beat2.push('Projected:');
          s.projection.forEach((p: any) => beat2.push(`- ${p.label}: ${p.value}`));
        }
      });
      beat2.push('');
    }
    if (so?.causalLoop?.nodes?.length >= 2 && so?.causalLoop?.edges?.length) {
      beat2.push('### Causal loop diagram', '_How variables feed back on each other. Reinforcing loops compound over time; balancing loops push back._', '');
      beat2.push(`**Type**: ${so.causalLoop.loopType === 'reinforcing' ? 'Reinforcing — compounds over time' : so.causalLoop.loopType === 'balancing' ? 'Balancing — self-corrects' : 'Mixed'}`);
      so.causalLoop.edges.forEach((e: any) => {
        const sign = e.polarity === '+' ? '↑' : '↓';
        beat2.push(`- ${e.from || '?'} ${sign} ${e.to || '?'}${e.note ? ` (${e.note})` : ''}`);
      });
      if (so.causalLoop.dominantLoop) beat2.push('', `**Dominant loop**: ${so.causalLoop.dominantLoop}`);
      beat2.push('');
    }
    if (so?.stockFlow?.stocks?.length) {
      beat2.push('### Stock & flow');
      if (so.stockFlow.stocks?.length)   beat2.push('**Stocks**: ' + so.stockFlow.stocks.map((s: any) => s.name).filter(Boolean).join(', '));
      if (so.stockFlow.inflows?.length)  beat2.push('**Inflows**: ' + so.stockFlow.inflows.map((s: any) => s.name).filter(Boolean).join(', '));
      if (so.stockFlow.outflows?.length) beat2.push('**Outflows**: ' + so.stockFlow.outflows.map((s: any) => s.name).filter(Boolean).join(', '));
      if (so.stockFlow.keyConstraint)    beat2.push(`**Key constraint**: ${so.stockFlow.keyConstraint}`);
      beat2.push('');
    }
    if (houseId === 'innovate' && so?.interventionForecast) {
      beat2.push('### Intervention forecast');
      if (so.interventionForecast.immediate) beat2.push(`- **Immediate effect**: ${so.interventionForecast.immediate}`);
      if (so.interventionForecast.delayed)   beat2.push(`- **Over time**: ${so.interventionForecast.delayed}`);
      if (so.interventionForecast.risk)      beat2.push(`- **Watch for**: ${so.interventionForecast.risk}`);
      beat2.push('');
    }
    if (houseId === 'validate' && so?.influenceMap) {
      beat2.push('### Influence map');
      if (so.influenceMap.barrier)       beat2.push(`- **Real barrier**: ${so.influenceMap.barrier}`);
      if (so.influenceMap.lever)         beat2.push(`- **What overcomes it**: ${so.influenceMap.lever}`);
      if (so.influenceMap.proofRequired) beat2.push(`- **Proof required**: ${so.influenceMap.proofRequired}`);
      beat2.push('');
    }
    if (houseId === 'evaluate' && (so?.evolutionProjection || so?.doublLoopLearning || so?.kpiSystemMap)) {
      beat2.push('### System projection');
      if (so.evolutionProjection) beat2.push(`- **Evolution projection**: ${so.evolutionProjection}`);
      if (so.doublLoopLearning)   beat2.push(`- **Double-loop learning**: ${so.doublLoopLearning}`);
      if (so.kpiSystemMap)        beat2.push(`- **KPI system map**: ${so.kpiSystemMap}`);
      beat2.push('');
    }
    if (beat2.length) {
      lines.push('', '## Why it persists', '_The structural read — why this pattern keeps showing up if nothing changes._', '', ...beat2);
    }

    // — Beat 3: Where the leverage is —
    const beat3: string[] = [];
    if (so?.ipoMap && (so.ipoMap.inputs?.length || so.ipoMap.processes?.length || so.ipoMap.outputs?.length)) {
      beat3.push('### Input → Process → Output');
      if (so.ipoMap.inputs?.length)    beat3.push('**Inputs**: ' + so.ipoMap.inputs.map((i: any) => i.label).filter(Boolean).join('; '));
      if (so.ipoMap.processes?.length) beat3.push('**Processes**: ' + so.ipoMap.processes.map((i: any) => i.label).filter(Boolean).join('; '));
      if (so.ipoMap.outputs?.length)   beat3.push('**Outputs**: ' + so.ipoMap.outputs.map((i: any) => i.label).filter(Boolean).join('; '));
      if (so.ipoMap.bottleneck)        beat3.push(`**Bottleneck**: ${so.ipoMap.bottleneck}`);
      beat3.push('');
    }
    if (so?.sensitivityAnalysis?.variables?.length) {
      beat3.push('### Sensitivity analysis', '_If you could only change one thing, what would move the needle most?_', '');
      beat3.push(`**Outcome**: ${so.sensitivityAnalysis.outcomeVariable || 'outcome'}`);
      so.sensitivityAnalysis.variables.forEach((v: any) => {
        const dir = v.direction === 'helps' ? '↑ HELPS' : v.direction === 'hurts' ? '↓ HURTS' : '';
        beat3.push(`- **${v.name}** ${dir} (${v.impact ?? ''}/10)${v.note ? ` — ${v.note}` : ''}`);
      });
      beat3.push('');
    }
    if (so?.scenarioModel?.variables?.length) {
      beat3.push('### Scenario simulation');
      beat3.push(`**Outcome**: ${so.scenarioModel.outcomeVariable || 'outcome'}${so.scenarioModel.outcomeUnit ? ` (${so.scenarioModel.outcomeUnit})` : ''}`);
      if (so.scenarioModel.baselineValue !== undefined) beat3.push(`**Baseline**: ${so.scenarioModel.baselineValue}`);
      so.scenarioModel.variables.forEach((v: any) => {
        beat3.push(`- **${v.name}**: ${v.note || ''}`);
      });
      beat3.push('');
    }
    if (beat3.length) {
      lines.push('', '## Where the leverage is', '_The actionable read — which variables actually move the outcome._', '', ...beat3);
    }

    return lines.join('\n');
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


  // Plain English verdict labels — what the verdict actually means in context
  const VERDICT_PLAIN: Record<string, { headline: string; subline: string; tag: string }> = {
    'GO':                  { headline: 'Proceed with confidence',     subline: 'The evidence supports this direction. Commit and move forward.',           tag: 'GO' },
    'PIVOT':               { headline: 'Change direction first',      subline: "There's something worth pursuing here, but the approach needs to change before you commit.", tag: 'PIVOT' },
    'STOP':                { headline: "Don't proceed",              subline: "The evidence doesn't support this. Committing further would compound the problem.",         tag: 'STOP' },
    'INVESTIGATE FURTHER': { headline: 'You need more signal first',  subline: "The input isn't specific enough for a reliable verdict. Add evidence and run again.",  tag: 'NEEDS MORE SIGNAL' },
  };
  const verdictPlain = result ? (VERDICT_PLAIN[result.verdict] || VERDICT_PLAIN['INVESTIGATE FURTHER']) : null;

  return (
    <>
    <div className="flex flex-col md:flex-row h-full bg-fresco-white">

      {/* ── LEFT / MIDDLE: Conversation input ─────────────────────────────── */}
      <motion.div
        animate={{ flexBasis: result ? '440px' : undefined, maxWidth: result ? '440px' : undefined }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className={cn("flex-1 flex flex-col overflow-hidden", result && "border-r border-fresco-border-light flex-shrink-0")}
        style={{ minWidth: result ? 360 : undefined }}
      >
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto" ref={inputScrollRef}>
          <div className={cn("mx-auto py-6 md:py-10", result ? "px-4" : "max-w-[640px] px-4 md:px-8")}>

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
                      try { localStorage.removeItem(`fresco-inputs-${sessionId}`); } catch {}
                      setResult(null); setAgentEvents([]); setChallengeQuestions([]);
                      setChallengeResponses({}); setChallengeDismissed(false);
                      setStoredAgentOutputs([]); setActiveLens(null);
                      try { localStorage.removeItem(`fresco-agent-outputs-${sessionId}`); } catch {}
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
            {handoff && !result && (
              <div className="mb-6 px-4 py-3 border-l-2 border-fresco-black bg-fresco-light-gray">
                <p className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wider mb-1">Continued from {HOUSE_META[handoff.sourceHouse].name}</p>
                <p className="text-fresco-sm text-fresco-graphite-soft leading-relaxed">
                  {handoff.sourceResult.sentenceOfTruth && (
                    <>This session picks up from: <span className="text-fresco-black">"{handoff.sourceResult.sentenceOfTruth}"</span></>
                  )}
                </p>
                <p className="text-fresco-xs text-fresco-graphite-light mt-1.5">
                  The first question below is pre-filled — edit or keep as-is, then carry on.
                </p>
              </div>
            )}
            <div className="flex items-center gap-3 mb-1">
              <img src={meta.icon} alt="" className="w-6 h-6 opacity-60 icon-theme"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <h1 className="text-fresco-3xl font-medium text-fresco-black tracking-tight">{meta.name}</h1>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light bg-fresco-light-gray border border-fresco-border px-2.5 py-0.5 rounded-full">
                {(meta as any).formalLabel}
              </span>
              <span className="text-fresco-xs text-fresco-graphite-light">{meta.output}</span>
            </div>
            <p className="text-fresco-sm text-fresco-graphite-mid max-w-lg">{meta.description}</p>
            {/* Systems thinking mode indicator */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(houseId === 'investigate' ? ['Iceberg model', 'Mental models', 'Root cause', 'Causal loops'] :
                houseId === 'innovate'    ? ['Leverage points', 'Causal loops', 'Intervention mapping', 'Scenario simulation'] :
                houseId === 'validate'   ? ['Funnel simulation', 'Influence mapping', 'Sensitivity analysis', 'Experiment design'] :
                ['KPI system mapping', 'Feedback loops', 'Signal vs noise', 'Evolution projection']
              ).map(tool => (
                <span key={tool} className="text-[9px] font-medium uppercase tracking-wide text-fresco-graphite-light/60 bg-fresco-light-gray/60 border border-fresco-border/50 px-2 py-0.5 rounded-full">
                  {tool}
                </span>
              ))}
            </div>
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

          {/* Feature 5: First-session guidance banner */}
          {isFirstSession && !result && (
            <div className="mb-6 p-4 border border-fresco-border-light bg-fresco-off-white">
              <p className="text-fresco-xs font-medium text-fresco-black mb-1">Answer each question as honestly as you can</p>
              <p className="text-[11px] text-fresco-graphite-light leading-relaxed">The agents work best when you separate what you've actually observed from what you believe is causing it. Specifics beat generalities — real numbers, real quotes, real friction points.</p>
            </div>
          )}

          {/* House-specific conversation */}
          <div className="mb-8">
            {houseId === 'investigate' && (
              <><ConversationFlow steps={INVESTIGATE_STEPS} values={values} onChange={setValue} onAttach={handleAttach} /><UniversalUrlInput url={url} onUrlChange={setUrl} /></>
            )}
            {houseId === 'innovate' && (
              <><ConversationFlow steps={INNOVATE_STEPS} values={values} onChange={setValue} onAttach={handleAttach} /><UniversalUrlInput url={url} onUrlChange={setUrl} /></>
            )}
            {houseId === 'validate' && (
              <><ConversationFlow steps={VALIDATE_STEPS} values={values} onChange={setValue} onAttach={handleAttach} /><UniversalUrlInput url={url} onUrlChange={setUrl} /></>
            )}
            {houseId === 'evaluate' && (
              <EvaluateFlow values={values} onChange={setValue} url={url} onUrlChange={setUrl} mode={evaluateMode} onModeChange={setEvaluateMode} onAttach={handleAttach} />
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

            {isRunning ? (
              <div className="flex items-center gap-2">
                <button
                  disabled
                  className="fresco-btn flex-1 opacity-60 cursor-default">
                  <Loader2 className="w-4 h-4 animate-spin" /><span>Working through it…</span>
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  className="px-4 py-3 border border-fresco-border text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black hover:border-fresco-black transition-colors">
                  Stop
                </button>
              </div>
            ) : (
              <button
                onClick={handleRunWithChallenge}
                disabled={!canRun}
                className={cn('fresco-btn w-full', !canRun && 'opacity-40 cursor-not-allowed')}>
                <Sparkles className="w-4 h-4" /><span>Think it through</span>
              </button>
            )}
            {!canRun && !isRunning && !runError && (
              <p className="text-center text-fresco-xs text-fresco-graphite-light mt-2">
                Start answering to unlock this
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
        <div className="flex-1 overflow-y-auto" ref={outputScrollRef}>
        <div className="px-6 pt-6 pb-6">
          <div className="sticky top-0 z-30 -mx-6 px-6 pt-2 pb-3 mb-4 bg-fresco-off-white border-b border-fresco-border-light flex items-center justify-between">
            <div className="flex-1">
              {result ? (
                <div className="flex items-center gap-1 p-0.5 bg-fresco-light-gray w-fit">
                  <button
                    onClick={() => { setOutputTab('decision'); outputScrollRef.current?.scrollTo({ top: 0 }); }}
                    className={cn('px-3 py-1.5 text-fresco-xs font-medium transition-colors', outputTab === 'decision' ? 'bg-white text-fresco-black shadow-sm' : 'text-fresco-graphite-mid hover:text-fresco-black')}
                  >
                    Decision
                  </button>
                  <button
                    onClick={() => { setOutputTab('analysis'); outputScrollRef.current?.scrollTo({ top: 0 }); }}
                    className={cn('px-3 py-1.5 text-fresco-xs font-medium transition-colors', outputTab === 'analysis' ? 'bg-white text-fresco-black shadow-sm' : 'text-fresco-graphite-mid hover:text-fresco-black')}
                  >
                    Analysis
                  </button>
                </div>
              ) : (
                <h2 className="text-fresco-lg font-medium text-fresco-black">Analysis</h2>
              )}
              {/* Feature 2: First-run contextual card — replaces tooltip */}
              {showTabTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 border border-fresco-border bg-fresco-off-white"
                >
                  <div className="flex items-start justify-between px-4 pt-3 pb-2">
                    <p className="text-fresco-xs font-medium text-fresco-black">You have two views of this analysis</p>
                    <button
                      onClick={() => {
                        setShowTabTooltip(false);
                        localStorage.setItem('fresco-tab-tooltip-seen', 'true');
                      }}
                      className="text-fresco-graphite-light hover:text-fresco-black transition-colors ml-3 mt-0.5 flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-0 border-t border-fresco-border-light">
                    <button
                      onClick={() => {
                        setOutputTab('decision');
                        setShowTabTooltip(false);
                        localStorage.setItem('fresco-tab-tooltip-seen', 'true');
                        outputScrollRef.current?.scrollTo({ top: 0 });
                      }}
                      className="p-3 text-left border-r border-fresco-border-light hover:bg-fresco-light-gray transition-colors"
                    >
                      <p className="text-fresco-xs font-medium text-fresco-black mb-1">Decision</p>
                      <p className="text-[10px] text-fresco-graphite-light leading-relaxed">Verdict, key issues, what to do next. Start here.</p>
                    </button>
                    <button
                      onClick={() => {
                        setOutputTab('analysis');
                        setShowTabTooltip(false);
                        localStorage.setItem('fresco-tab-tooltip-seen', 'true');
                        outputScrollRef.current?.scrollTo({ top: 0 });
                      }}
                      className="p-3 text-left hover:bg-fresco-light-gray transition-colors"
                    >
                      <p className="text-fresco-xs font-medium text-fresco-black mb-1">Analysis</p>
                      <p className="text-[10px] text-fresco-graphite-light leading-relaxed">Archetypes, causal loops, scenario simulation. The structure beneath the verdict.</p>
                    </button>
                  </div>
                </motion.div>
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

          {/* Streaming agents — appears on isRunning so the space is reserved
              from frame zero. Without this, the block popped in only after the
              first agent event arrived, pushing everything below it down with
              an abrupt layout shift. Now the skeleton placeholder fills the
              space until the real content arrives. */}
          <AnimatePresence>
            {(isRunning || (!result && agentEvents.length > 0)) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="mb-6 space-y-3"
              >
                <span className="fresco-label block mb-3">Working through it…</span>
                {pageFetchMessage && (
                  <div className="mb-3 flex items-center gap-2 text-fresco-xs text-fresco-graphite-mid p-2 bg-fresco-light-gray">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {pageFetchMessage}
                  </div>
                )}
                {/* Completed agents — compact check marks */}
                {agentEvents.slice(0, -1).map((ev, i) => {
                  const phaseInfo = AGENT_PHASES[ev.displayName];
                  const phaseStyle = phaseInfo ? PHASE_STYLES[phaseInfo.phase] : null;
                  return (
                    <div key={i} className="flex items-center gap-2 text-fresco-xs text-fresco-graphite-light py-1">
                      <div className="w-3 h-3 rounded-full bg-fresco-black flex items-center justify-center flex-shrink-0">
                        <svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5L2.8 4L6 1" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span>{ev.displayName}</span>
                      {phaseStyle && (
                        <span className="text-fresco-graphite-light/50" title={phaseStyle.label}>
                          <span className="mx-1">·</span>{phaseStyle.symbol} {phaseStyle.label}
                        </span>
                      )}
                    </div>
                  );
                })}
                {/* Current agent — expanded */}
                {agentEvents.length > 0 && (() => {
                  const ev = agentEvents[agentEvents.length - 1];
                  return (
                    <motion.div key={agentEvents.length} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-fresco-light-gray border-l-2 border-fresco-black">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-fresco-black animate-pulse" />
                          <span className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wide">{ev.displayName}</span>
                        </div>
                        {(() => {
                          const phaseInfo = AGENT_PHASES[ev.displayName];
                          const phaseStyle = phaseInfo ? PHASE_STYLES[phaseInfo.phase] : null;
                          return phaseStyle ? (
                            <span className="text-[10px] font-medium text-fresco-graphite-light uppercase tracking-wider" title={phaseInfo?.label}>
                              {phaseStyle.symbol} {phaseStyle.label}
                            </span>
                          ) : null;
                        })()}
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

          {/* ── Lens primer — surfaces while the run is in progress to pre-frame
                what's about to land. Pre-teaches the lens feature so it doesn't
                arrive as an unexpected button cluster. Hides the moment the
                verdict lands. ─────────────────────────────────────────────── */}
          <AnimatePresence>
            {isRunning && !result && (
              <motion.div
                key="lens-primer"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: 0.5 }}
                className="mb-6 border border-fresco-border-light p-4"
              >
                <p className="fresco-label mb-2">Coming next</p>
                <p className="text-fresco-sm text-fresco-graphite-soft leading-relaxed mb-3">
                  Once the verdict lands, you can re-run the analysis through 8 different lenses — each foregrounds a distinct way of thinking.
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: 'Critical',   desc: 'Assumptions & evidence' },
                    { label: 'Systems',    desc: 'Loops & root causes' },
                    { label: 'Design',     desc: 'Human & experience' },
                    { label: 'Product',    desc: 'Build decisions' },
                    { label: 'Strategic',  desc: 'Competitive direction' },
                    { label: 'Analytical', desc: 'Data & measurement' },
                    { label: 'Futures',    desc: 'Trajectory & signals' },
                    { label: 'Economic',   desc: 'Incentives & value' },
                  ].map(lens => (
                    <span
                      key={lens.label}
                      title={lens.desc}
                      className="text-fresco-xs px-2 py-0.5 border border-fresco-border-light text-fresco-graphite-light"
                    >
                      {lens.label}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Final result */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div key={`result-${outputTab}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="space-y-6">

                {/* ── DECISION TAB ─────────────────────────────────────── */}
                {outputTab === 'decision' && (
                  <>
                {/* SENTENCE OF TRUTH */}
                <EditableSentenceOfTruth
                  value={result.sentenceOfTruth}
                  onSave={edited => db.setSentenceOfTruth(sessionId, edited)}
                />

                {/* VERDICT */}
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
                  {/* Verdict card: white body. Colour only on the 4px left
                      border and the pill — keeps the verdict readable and
                      treats colour as accent, not alarm. */}
                  <div
                    className="border border-fresco-border bg-white p-4"
                    style={{
                      borderLeftWidth: 4,
                      borderLeftColor: verdictColour(result.verdict).accent,
                    }}
                  >
                    {/* Plain English verdict headline */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-fresco-lg font-medium text-fresco-black leading-snug">
                          {verdictPlain?.headline}
                        </p>
                        <span
                          className="text-[10px] font-medium uppercase tracking-wider bg-fresco-light-gray border border-fresco-border px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 flex items-center gap-1.5"
                          style={{ color: verdictColour(result.verdict).accent }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: verdictColour(result.verdict).accent }} />
                          {result.verdict === 'INVESTIGATE FURTHER' ? 'NEEDS MORE SIGNAL' : result.verdict}
                        </span>
                      </div>
                      <p className="text-fresco-xs text-fresco-graphite-light">{verdictPlain?.subline}</p>
                    </div>
                    {/* Spectrum visualisation */}
                    <VerdictVisual
                      verdict={result.verdict}
                      fitStrength={(result as any).fitStrength}
                      fitLabel={(result as any).fitLabel}
                    />
                    {/* Rationale */}
                    <p className="text-fresco-sm text-fresco-graphite-soft leading-relaxed mt-4 pt-4 border-t border-fresco-border-light">
                      {result.verdictRationale}
                    </p>
                  </div>
                  {/* User override */}
                  {showVerdictOverride && !userVerdict && (
                    <div className="mt-2 p-3 border border-fresco-border bg-fresco-light-gray">
                      <p className="text-fresco-xs text-fresco-graphite-mid mb-2">Your call — what do you think?</p>
                      <div className="grid grid-cols-4 gap-1.5 mb-3">
                        {[
                          { v: 'GO' as const,                  label: 'Proceed',          sub: 'Strong signal' },
                          { v: 'PIVOT' as const,               label: 'Rethink first',    sub: 'Needs work' },
                          { v: 'STOP' as const,                label: 'Stop',             sub: 'Don\'t proceed' },
                          { v: 'INVESTIGATE FURTHER' as const, label: 'Need more signal', sub: 'Unclear yet' },
                        ].map(({ v, label, sub }) => (
                          <button key={v}
                            onClick={() => setUserVerdict(v)}
                            className="flex flex-col items-start p-2 border border-fresco-border bg-white hover:border-fresco-black hover:bg-fresco-black hover:text-white transition-all group text-left">
                            <span className="text-fresco-xs font-medium text-fresco-black group-hover:text-white">{label}</span>
                            <span className="text-[10px] text-fresco-graphite-light group-hover:text-white/70">{sub}</span>
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

                {/* SEE THIS FROM A DIFFERENT ANGLE — lens picker.
                    Sits between the verdict and the supporting reasoning. The user
                    can flip lenses to compare verdicts without leaving this tab. */}
                {storedAgentOutputs.length > 0 && (
                  <div>
                    <p className="fresco-label mb-1">See this from a different angle</p>
                    <p className="text-fresco-xs text-fresco-graphite-light mb-3 leading-relaxed">
                      Re-run the analysis through a distinct intellectual perspective.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
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
                          onClick={() => { handleReframe(lens.id); }}
                          disabled={isReframing}
                          title={lens.desc}
                          className={cn(
                            'text-fresco-xs px-2.5 py-1 border transition-all whitespace-nowrap',
                            activeLens === lens.id
                              ? 'bg-fresco-black text-white border-fresco-black'
                              : 'border-fresco-border-light text-fresco-graphite-mid hover:border-fresco-black hover:text-fresco-black hover:bg-fresco-light-gray',
                            isReframing && activeLens !== lens.id && 'opacity-40 cursor-not-allowed'
                          )}
                        >
                          {isReframing && activeLens === lens.id ? 'Reframing…' : lens.label}
                        </button>
                      ))}
                    </div>
                    {activeLens && (
                      <p className="text-fresco-xs text-fresco-graphite-light mt-3">
                        Currently viewing through the <span className="font-medium text-fresco-black capitalize">{activeLens}</span> lens
                        <button onClick={() => { setActiveLens(null); }} className="ml-2 underline underline-offset-2 hover:text-fresco-black transition-colors">clear</button>
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <span className="fresco-label block mb-3">Key issues</span>
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
                  <span className="fresco-label block mb-3">Recommended moves</span>
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

                {/* Next house suggestion */}
                {result.suggestedNextHouse && (
                  <div className="p-4 bg-fresco-light-gray flex items-center justify-between gap-3">
                    <div>
                      <p className="text-fresco-xs text-fresco-graphite-light mb-0.5">Run this next</p>
                      <p className="text-fresco-sm font-medium text-fresco-black">{HOUSE_META[result.suggestedNextHouse].name}</p>
                      <p className="text-fresco-xs text-fresco-graphite-mid mt-0.5">{result.suggestedNextHouseReason}</p>
                    </div>
                    <button onClick={() => onNavigateToHouse?.(result.suggestedNextHouse!, sessionId)}
                      className="flex-shrink-0 flex items-center gap-1.5 text-fresco-xs font-medium text-fresco-black border border-fresco-black px-3 py-1.5 hover:bg-fresco-black hover:text-white transition-colors">
                      Open <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

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

                  {/* Share / Export */}
                  <button onClick={() => setShowExportModal(true)} className="fresco-btn w-full">
                    <Copy className="w-4 h-4" /><span>Export</span>
                  </button>
                </div>
                  </>
                )} {/* end Decision tab */}

                {/* ── ANALYSIS TAB ─────────────────────────────────────── */}
                {outputTab === 'analysis' && (
                  <>
                  {(() => {
                    const so = (result as any).systemsOutput;
                    const bmEvent = agentEvents.find(e => e.displayName === 'Belief Mapper');
                    const hasCoreAssumption = houseId === 'investigate' && bmEvent?.structured_artifact;
                    const hasPov = houseId === 'investigate' && !!(result as any).povStatement;

                    // — Beat 1: What's actually happening (the surface read)
                    const beat1Items: React.ReactNode[] = [];
                    if (hasPov) beat1Items.push(
                      <div key="pov">
                        <span className="fresco-label block mb-3">Your point of view</span>
                        <div className="p-4 border-l-4 border-fresco-black bg-fresco-light-gray">
                          <p className="text-fresco-base font-medium text-fresco-black leading-relaxed">
                            {(result as any).povStatement}
                          </p>
                        </div>
                      </div>
                    );
                    if (hasCoreAssumption) beat1Items.push(
                      <div key="core-assumption">
                        <span className="fresco-label block mb-3">Core assumption</span>
                        <div className="p-4 border border-fresco-border bg-fresco-white flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-fresco-black rounded-full flex-shrink-0 mt-1.5" />
                          <p className="text-fresco-sm text-fresco-black font-medium">{bmEvent!.structured_artifact}</p>
                        </div>
                        <p className="text-fresco-xs text-fresco-graphite-light mt-2">
                          This is the belief being treated as fact. Challenge it before committing to a direction.
                        </p>
                      </div>
                    );
                    // Iceberg lives in beat 1 for Investigate — it's the surface→depth read
                    if (houseId === 'investigate' && so?.icebergLevels) beat1Items.push(<IcebergSection key="iceberg" systemsOutput={so} />);
                    // Innovate's leverage map lives in beat 1 — it's the option scan
                    if (houseId === 'innovate' && so?.leverageMap?.length) beat1Items.push(<LeverageMapSection key="leverage" systemsOutput={so} />);
                    // Validate's predicted outcome lives in beat 1
                    if (houseId === 'validate' && so?.funnelSimulation) beat1Items.push(<PredictedOutcomeSection key="outcome" systemsOutput={so} />);
                    // Evaluate has no POV/iceberg artefact — its surface read is the subject of evaluation itself
                    // (the page/flow being evaluated, or the two versions being compared).
                    if (houseId === 'evaluate') {
                      const subjectVal = values['subject']?.trim();
                      const versionA = values['version_a']?.trim();
                      const versionB = values['version_b']?.trim();
                      if (evaluateMode === 'comparison' && (versionA || versionB)) {
                        beat1Items.push(
                          <div key="eval-subject">
                            <span className="fresco-label block mb-3">What you&apos;re evaluating</span>
                            <div className="space-y-2">
                              {versionA && (
                                <div className="p-4 border border-fresco-border bg-fresco-white">
                                  <p className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light mb-1">Version A</p>
                                  <p className="text-fresco-sm text-fresco-black leading-relaxed whitespace-pre-wrap">{versionA}</p>
                                </div>
                              )}
                              {versionB && (
                                <div className="p-4 border border-fresco-border bg-fresco-white">
                                  <p className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light mb-1">Version B</p>
                                  <p className="text-fresco-sm text-fresco-black leading-relaxed whitespace-pre-wrap">{versionB}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      } else if (subjectVal) {
                        // Single-page or journey mode — surface the subject brief as plain prose.
                        // For 'single' mode the subject is JSON (evaluatebrief) — try to parse and render
                        // the goal/audience/metric structure; fall back to raw on parse failure.
                        let rendered: React.ReactNode;
                        try {
                          const parsed = JSON.parse(subjectVal);
                          if (parsed && typeof parsed === 'object' && (parsed.goal || parsed.audience || parsed.metric)) {
                            rendered = (
                              <div className="p-4 border border-fresco-border bg-fresco-white space-y-2">
                                {parsed.goal && (
                                  <div className="flex items-start gap-3">
                                    <span className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light w-20 flex-shrink-0 mt-0.5">Goal</span>
                                    <p className="text-fresco-sm text-fresco-black">{parsed.goal}</p>
                                  </div>
                                )}
                                {parsed.audience && (
                                  <div className="flex items-start gap-3">
                                    <span className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light w-20 flex-shrink-0 mt-0.5">Audience</span>
                                    <p className="text-fresco-sm text-fresco-black">{parsed.audience}</p>
                                  </div>
                                )}
                                {parsed.metric && (
                                  <div className="flex items-start gap-3">
                                    <span className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light w-20 flex-shrink-0 mt-0.5">Metric</span>
                                    <p className="text-fresco-sm text-fresco-black">{parsed.metric}</p>
                                  </div>
                                )}
                              </div>
                            );
                          } else { throw new Error('not a brief'); }
                        } catch {
                          rendered = (
                            <div className="p-4 border border-fresco-border bg-fresco-white">
                              <p className="text-fresco-sm text-fresco-black leading-relaxed whitespace-pre-wrap">{subjectVal}</p>
                            </div>
                          );
                        }
                        beat1Items.push(
                          <div key="eval-subject">
                            <span className="fresco-label block mb-3">What you&apos;re evaluating</span>
                            {rendered}
                          </div>
                        );
                      }
                    }

                    // — Beat 2: Why it persists (the structural read)
                    const beat2Items: React.ReactNode[] = [];
                    if (so?.currentStateSimulation) beat2Items.push(<IfNothingChangesSection key="if-nothing" systemsOutput={so} />);
                    if (so?.archetype?.name && so.archetype.name !== 'null') beat2Items.push(<ArchetypeSection key="archetype" systemsOutput={so} />);
                    if (so?.behaviorOverTime?.length) beat2Items.push(<BehaviorOverTimeSection key="bot" systemsOutput={so} />);
                    if (so?.causalLoop?.nodes?.length > 1) beat2Items.push(<CausalLoopSection key="causal" systemsOutput={so} />);
                    if (so?.stockFlow?.stocks?.length) beat2Items.push(<StockFlowSection key="stockflow" systemsOutput={so} />);
                    if (houseId === 'innovate' && so?.interventionForecast) beat2Items.push(<InterventionForecastSection key="intervention" systemsOutput={so} />);
                    if (houseId === 'validate' && so?.influenceMap) beat2Items.push(<InfluenceMapSection key="influence" systemsOutput={so} />);
                    if (houseId === 'evaluate' && (so?.evolutionProjection || so?.doublLoopLearning || so?.kpiSystemMap)) beat2Items.push(<SystemProjectionSection key="projection" systemsOutput={so} />);

                    // — Beat 3: Where the leverage is (the actionable read)
                    const beat3Items: React.ReactNode[] = [];
                    const hasIPO = so?.ipoMap && (so.ipoMap.inputs?.length > 0 || so.ipoMap.processes?.length > 0);
                    if (hasIPO) beat3Items.push(<IPOSection key="ipo" systemsOutput={so} />);
                    if (so?.sensitivityAnalysis?.variables?.length) beat3Items.push(<SensitivitySection key="sensitivity" systemsOutput={so} />);
                    if (so?.scenarioModel?.variables?.length) beat3Items.push(<ScenarioSection key="scenario" systemsOutput={so} />);

                    const beats: { title: string; subtitle: string; items: React.ReactNode[] }[] = [
                      { title: "What's actually happening", subtitle: 'The surface read — what the situation looks like and what belief sits underneath it.', items: beat1Items },
                      { title: 'Why it persists', subtitle: 'The structural read — why this pattern keeps showing up if nothing changes.', items: beat2Items },
                      { title: 'Where the leverage is', subtitle: 'The actionable read — which variables actually move the outcome.', items: beat3Items },
                    ];

                    return beats.filter(b => b.items.length > 0).map((beat, i) => (
                      <div key={i} className="pt-2">
                        <div className="mb-5">
                          <p className="text-fresco-xs font-medium uppercase tracking-wider text-fresco-graphite-light mb-1">Part {i + 1}</p>
                          <h3 className="text-fresco-base font-medium text-fresco-black mb-1">{beat.title}</h3>
                          <p className="text-fresco-xs text-fresco-graphite-light leading-relaxed">{beat.subtitle}</p>
                        </div>
                        <div className="space-y-5">
                          {beat.items}
                        </div>
                      </div>
                    ));
                  })()}

                  {/* Data visualisations — house-specific */}
                  {houseId === 'validate' && values['scores'] && (() => {
                    try {
                      const scores = JSON.parse(values['scores']);
                      if (Array.isArray(scores) && scores.length >= 3) {
                        return (
                          <div>
                            <span className="fresco-label block mb-3">Score breakdown</span>
                            <ScoreRadar scores={scores} />
                          </div>
                        );
                      }
                    } catch { }
                    return null;
                  })()}

                  {houseId === 'validate' && values['actuals'] && values['targets'] && (() => {
                    try {
                      const metrics = JSON.parse(values['actuals'] || values['targets']);
                      if (Array.isArray(metrics) && metrics.length > 0) {
                        return (
                          <div>
                            <span className="fresco-label block mb-3">Metrics: target vs actual</span>
                            <MetricsBar metrics={metrics} />
                          </div>
                        );
                      }
                    } catch { }
                    return null;
                  })()}

                  {houseId === 'evaluate' && evaluateMode === 'journey' && values['subject'] && (() => {
                    const text = values['subject'];
                    if (text && text.length > 20) {
                      return (
                        <div>
                          <span className="fresco-label block mb-3">Journey breakdown</span>
                          <JourneyFunnel subjectText={text} />
                        </div>
                      );
                    }
                    return null;
                  })()}
                  </>
                )} {/* end Analysis tab */}

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Share modal — PM-relevant options */}
      <AnimatePresence>
        {showExportModal && result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setShowExportModal(false)}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-fresco-base font-medium text-fresco-black">Export analysis</h3>
                <button onClick={() => setShowExportModal(false)}><X className="w-4 h-4 text-fresco-graphite-light" /></button>
              </div>

              {/* Verdict summary — coloured left border + neutral pill, white
                  body. Matches the Decision tab card treatment. */}
              <div
                className="mb-5 p-3 bg-white border border-fresco-border"
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: verdictColour(result.verdict).accent,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light">{meta.name}</span>
                  <span className="text-[10px] text-fresco-graphite-light/60">·</span>
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: verdictColour(result.verdict).accent }}
                  >
                    {result.verdict === 'INVESTIGATE FURTHER' ? 'NEEDS MORE SIGNAL' : result.verdict}
                  </span>
                </div>
                <p className="text-fresco-sm font-medium text-fresco-black leading-snug">{result.sentenceOfTruth?.slice(0, 100)}{(result.sentenceOfTruth?.length || 0) > 100 ? '…' : ''}</p>
              </div>

              <div className="space-y-2">
                {/* 0. PDF Report — comprehensive download */}
                <button onClick={() => {
                  {
                    const houseSteps = houseId === 'investigate' ? INVESTIGATE_STEPS
                      : houseId === 'innovate' ? INNOVATE_STEPS
                      : houseId === 'validate' ? VALIDATE_STEPS
                      : evaluateMode === 'journey' ? EVALUATE_STEPS_JOURNEY
                      : evaluateMode === 'comparison' ? EVALUATE_STEPS_COMPARISON
                      : EVALUATE_STEPS_SINGLE;
                    generatePDFReport({
                      houseName: meta.name,
                      formalLabel: (meta as any).formalLabel || meta.name,
                      result: result as any,
                      agentEvents: agentEvents,
                      inputs: houseSteps
                        .filter((s: any) => (values[s.id] || '').trim().length > 0)
                        .map((s: any) => ({
                          question: s.question,
                          answer: serializeStructuredField(s.inputType || 'textarea', values[s.id] || ''),
                        })),
                      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
                    });
                  }
                }}
                  className="w-full flex items-center gap-3 p-3 border border-fresco-black bg-fresco-black hover:bg-fresco-graphite transition-colors text-left">
                  <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <div>
                    <p className="text-fresco-sm font-medium text-white">Download full report (PDF)</p>
                    <p className="text-fresco-xs text-white/60">Complete analysis — Decision + Systems Intelligence — shareable anywhere</p>
                  </div>
                </button>

                {/* 0b. Deck compiler */}
                <button onClick={() => {
                  generateHTMLDeck({
                    houseName: meta.name,
                    formalLabel: (meta as any).formalLabel || meta.name,
                    result: result as any,
                    agentEvents: agentEvents,
                    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
                  });
                }}
                  className="w-full flex items-center gap-3 p-3 border border-fresco-border hover:border-fresco-black hover:bg-fresco-light-gray transition-colors text-left">
                  <svg className="w-4 h-4 text-fresco-graphite-mid flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
                  </svg>
                  <div>
                    <p className="text-fresco-sm font-medium text-fresco-black">Open as presentation</p>
                    <p className="text-fresco-xs text-fresco-graphite-light">Auto-compiled deck — opens in browser, navigate with arrow keys</p>
                  </div>
                </button>

                <div className="border-t border-fresco-border-light pt-2">

                {/* 1. Slack / Notion — primary, most common PM workflow */}
                <button onClick={() => {
                  const slackText = [
                    `*${meta.name} — ${verdictPlain?.headline}*`,
                    `*Insight:* ${result.sentenceOfTruth}`,
                    `*Why:* ${result.verdictRationale}`,
                    result.keyIssues.length ? `*Key issues:*\n${result.keyIssues.map((iss, n) => `${n + 1}. ${iss}`).join('\n')}` : '',
                    result.necessaryMoves.length ? `*Recommended moves:*\n${result.necessaryMoves.map((m, n) => `${n + 1}. ${m}`).join('\n')}` : '',
                  ].filter(Boolean).join('\n\n');
                  navigator.clipboard.writeText(slackText);
                  setHasCopied(true); setTimeout(() => setHasCopied(false), 2000);
                }}
                  className="w-full flex items-center gap-3 p-3 border border-fresco-black bg-fresco-black hover:bg-fresco-graphite transition-colors text-left">
                  {hasCopied ? <Check className="w-4 h-4 text-white flex-shrink-0" /> : <Copy className="w-4 h-4 text-white flex-shrink-0" />}
                  <div>
                    <p className="text-fresco-sm font-medium text-white">{hasCopied ? 'Copied!' : 'Copy for Slack or Notion'}</p>
                    <p className="text-fresco-xs text-white/60">Bold formatting — paste straight into a channel, page, or ticket</p>
                  </div>
                </button>

                {/* 2. One-liner for PRDs / standups */}
                <button onClick={() => {
                  const oneliner = `[${meta.name}] ${verdictPlain?.headline} — ${result.sentenceOfTruth}`;
                  navigator.clipboard.writeText(oneliner);
                  setHasCopied(true); setTimeout(() => setHasCopied(false), 2000);
                }}
                  className="w-full flex items-center gap-3 p-3 border border-fresco-border hover:border-fresco-black hover:bg-fresco-light-gray transition-colors text-left">
                  <svg className="w-4 h-4 text-fresco-graphite-mid flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                  </svg>
                  <div>
                    <p className="text-fresco-sm font-medium text-fresco-black">Copy one-liner</p>
                    <p className="text-fresco-xs text-fresco-graphite-light">Single sentence — for PRDs, roadmap comments, or standups</p>
                  </div>
                </button>

                {/* 3. Plain text */}
                <button onClick={handleCopy}
                  className="w-full flex items-center gap-3 p-3 border border-fresco-border hover:border-fresco-black hover:bg-fresco-light-gray transition-colors text-left">
                  <Copy className="w-4 h-4 text-fresco-graphite-mid flex-shrink-0" />
                  <div>
                    <p className="text-fresco-sm font-medium text-fresco-black">Copy plain text</p>
                    <p className="text-fresco-xs text-fresco-graphite-light">Unformatted — for emails or tools that don't support markdown</p>
                  </div>
                </button>

                {/* 4. Markdown — for technical users */}
                <button onClick={handleDownload}
                  className="w-full flex items-center gap-3 p-3 border border-fresco-border hover:border-fresco-black hover:bg-fresco-light-gray transition-colors text-left text-fresco-graphite-mid">
                  <Download className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="text-fresco-sm">Download as Markdown</p>
                    <p className="text-fresco-xs text-fresco-graphite-light">For Obsidian, Linear, or version-controlled docs</p>
                  </div>
                </button>
                </div>
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
