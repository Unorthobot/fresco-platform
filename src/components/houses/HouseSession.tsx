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
}

interface ConversationStep {
  id: string;
  question: string;
  hint: string;
  placeholder: string;
  minHeight?: number;
  agent?: string; // which agent this feeds
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'GO':                  { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'PIVOT':               { bg: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  'INVESTIGATE FURTHER': { bg: 'bg-blue-50',    text: 'text-blue-800',    border: 'border-blue-200',    dot: 'bg-blue-500' },
  'STOP':                { bg: 'bg-red-50',      text: 'text-red-800',     border: 'border-red-200',     dot: 'bg-red-500' },
};

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
  onActivate, showAgent = false,
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
            <p className="text-fresco-sm text-fresco-graphite-mid line-clamp-2 leading-relaxed">{value}</p>
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
              {voice.recording && (
                <p className="mt-1.5 text-fresco-xs text-red-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                  {Math.floor(voice.time / 60)}:{(voice.time % 60).toString().padStart(2, '0')}
                </p>
              )}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── House conversation configs ───────────────────────────────────────────────

const INVESTIGATE_STEPS: ConversationStep[] = [
  // ── Insight Stack ──
  {
    id: 'situation',
    question: 'What are you looking at?',
    hint: 'Set the scene. What situation, problem, or data are you trying to make sense of?',
    placeholder: "e.g. Our users keep dropping off after signup. We have 3 months of data and 12 customer interviews that seem to point in different directions.",
    minHeight: 100,
    agent: 'Insight Stack',
  },
  {
    id: 'observations',
    question: 'What are you noticing?',
    hint: "Dump your raw observations — data points, things people said, behaviours you've seen. Don't interpret yet.",
    placeholder: "e.g. 60% drop-off at step 3. Users say it's 'confusing' but can't say why. Power users skip it entirely. Mobile drop-off is 2× desktop. Same 2 fields in every support ticket.",
    minHeight: 160,
    agent: 'Insight Stack',
  },
  {
    id: 'patterns',
    question: 'What keeps coming up?',
    hint: 'Look across your observations. What themes, clusters, or repeating signals do you see?',
    placeholder: "e.g. Every churned user mentioned confusion in the first week. Retained users all found one core feature within 48 hours. The confusion always clusters around the same moment.",
    minHeight: 120,
    agent: 'Insight Stack',
  },
  {
    id: 'contradictions',
    question: "What doesn't add up?",
    hint: "Where do things contradict each other? What surprised you? What's broken or missing?",
    placeholder: "e.g. High NPS but still churning. Users say they love the product but don't come back. Power users behave completely differently from everyone else.",
    minHeight: 120,
    agent: 'Insight Stack',
  },
  {
    id: 'truth',
    question: "What's the real truth here?",
    hint: "Complete this sentence: 'The evidence shows that...' Don't be safe — say what the data is actually pointing to.",
    placeholder: "e.g. The evidence shows that users aren't confused by the UI — they're confused about whether the product is for them. The onboarding is answering the wrong question.",
    minHeight: 120,
    agent: 'Insight Stack',
  },
  // ── Belief Mapper ──
  {
    id: 'assumptions',
    question: 'What do people assume here?',
    hint: "What do people take for granted? List the unspoken rules, shortcuts, and assumptions — even ones you think are wrong.",
    placeholder: "e.g. 'Users will read the onboarding.' 'Confused users will ask for help.' 'The drop-off is a UX problem.' 'Power users are our best signal.'",
    minHeight: 140,
    agent: 'Belief Mapper',
  },
  {
    id: 'assumption_chains',
    question: 'How do these assumptions affect each other?',
    hint: 'Pick any two assumptions: does believing one make the other more or less likely? Try: "Because people believe X, they also tend to..."',
    placeholder: "e.g. Because we believe the drop-off is a UX problem, we keep redesigning instead of questioning whether we're targeting the right users. The two assumptions lock each other in.",
    minHeight: 140,
    agent: 'Belief Mapper',
  },
  {
    id: 'ignored',
    question: "What's being ignored or taken for granted?",
    hint: 'What important thing is nobody saying? What assumption has never been tested? What would change everything if it turned out to be wrong?',
    placeholder: "e.g. Nobody has questioned whether the free plan attracts the right users at all. We've assumed the problem is activation — maybe it's acquisition.",
    minHeight: 120,
    agent: 'Belief Mapper',
  },
  {
    id: 'new_model',
    question: 'What should guide decisions instead?',
    hint: 'What clearer way of thinking should replace the old assumptions? Write it as a simple rule or principle.',
    placeholder: "e.g. Instead of 'fix the onboarding', the principle should be: 'only let in users who already understand what this does'. Acquisition filter beats activation fix.",
    minHeight: 120,
    agent: 'Belief Mapper',
  },
  // ── Position Builder ──
  {
    id: 'who',
    question: 'Who is this position about?',
    hint: 'Describe the specific person or group this position is built around. The more specific, the sharper the output.',
    placeholder: "e.g. A mid-level product manager at a fast-growing startup who has budget but no time to evaluate tools properly.",
    minHeight: 100,
    agent: 'Position Builder',
  },
  {
    id: 'real_need',
    question: 'What do they actually need?',
    hint: "What is the real, unmet need behind their behaviour? Not what they ask for — what they actually need.",
    placeholder: "e.g. They need to feel confident in their decisions without spending hours doing research they don't have time for. They want to look smart, not be smart.",
    minHeight: 120,
    agent: 'Position Builder',
  },
  {
    id: 'hard_to_argue',
    question: 'What makes this hard to argue with?',
    hint: 'What fact, pattern, or reality makes your position difficult to dismiss? What would you say to a sceptic?',
    placeholder: "e.g. Most PMs are evaluated on speed of delivery, not quality of decisions — so anything that slows them down feels like a threat, even if it would help them.",
    minHeight: 120,
    agent: 'Position Builder',
  },
  {
    id: 'so_what',
    question: 'So what changes?',
    hint: 'If this truth is real, what must be done? Articulate the strategic consequence.',
    placeholder: "e.g. If this is true, we should lead with speed and confidence — not depth and comprehensiveness. The product should feel like a shortcut, not a process.",
    minHeight: 120,
    agent: 'Position Builder',
  },
];

const INNOVATE_STEPS: ConversationStep[] = [
  // ── Flow Board ──
  {
    id: 'start',
    question: 'Where does this start?',
    hint: 'Describe the trigger or starting point — the moment this flow or experience begins.',
    placeholder: "e.g. A new user lands on the app after clicking a paid ad. They have no account yet and don't know what the product does.",
    minHeight: 100,
    agent: 'Flow Board',
  },
  {
    id: 'steps',
    question: 'What are the key steps?',
    hint: 'List the major stages in order. What actually happens between start and end?',
    placeholder: "e.g. 1. Landing page → 2. Signup form → 3. Email verification → 4. Onboarding checklist → 5. First core action.",
    minHeight: 160,
    agent: 'Flow Board',
  },
  {
    id: 'breakdown',
    question: 'Where does it break down?',
    hint: 'Where do people slow down, drop off, or get confused? What causes the most friction?',
    placeholder: "e.g. 60% drop off at email verification. Onboarding checklist has 8 steps — most users complete 2. First core action is buried 3 screens deep.",
    minHeight: 120,
    agent: 'Flow Board',
  },
  {
    id: 'success',
    question: 'What does success look like?',
    hint: 'Describe the ideal version of this flow. What does a perfect run look like?',
    placeholder: "e.g. User signs up, verifies in one click, completes 1 core action within 5 minutes, and comes back the next day.",
    minHeight: 100,
    agent: 'Flow Board',
  },
  // ── Experiment Brief ──
  {
    id: 'hypothesis',
    question: 'What do you believe will fix it?',
    hint: 'State the belief you want to test. Vague hypotheses produce vague results.',
    placeholder: "e.g. We believe replacing email verification with SMS will increase confirmation rate by 20%, because the delay is killing momentum at the highest-friction moment.",
    minHeight: 120,
    agent: 'Experiment Brief',
  },
  {
    id: 'test',
    question: 'How will you test it?',
    hint: 'What is the smallest, fastest experiment that could prove or disprove this belief?',
    placeholder: "e.g. A/B test SMS vs email verification for 2 weeks, 50/50 split. Measure confirmation rate and fraud rate.",
    minHeight: 120,
    agent: 'Experiment Brief',
  },
  {
    id: 'pass_fail',
    question: 'What does pass/fail look like?',
    hint: "Define the exact numbers or outcomes that would tell you the experiment worked — or didn't.",
    placeholder: "e.g. Success: +15% confirmation rate. Failure: <5% difference. If negative, kill SMS and reconsider the whole verification step.",
    minHeight: 120,
    agent: 'Experiment Brief',
  },
  {
    id: 'wrong',
    question: 'What could make this wrong?',
    hint: 'What assumptions are baked into this test? What external factors could skew the results?',
    placeholder: "e.g. Assumes current traffic is representative. Risk: seasonal drop. Assumes SMS delivery rate is high in our key markets.",
    minHeight: 120,
    agent: 'Experiment Brief',
  },
  // ── Strategy Sketchbook ──
  {
    id: 'options',
    question: 'What are your real options?',
    hint: "List at least 3 strategic paths. Include options you're tempted to dismiss.",
    placeholder: "e.g. A: remove verification entirely (fastest, highest fraud risk). B: magic link (medium lift, 1-week build). C: social login (highest lift, 6-week build). D: keep current, add progress indicator.",
    minHeight: 160,
    agent: 'Strategy Sketchbook',
  },
  {
    id: 'option_costs',
    question: 'What does each option cost?',
    hint: 'For each option: what do you gain, what do you give up, and what does it require you to believe?',
    placeholder: "e.g. Magic link: faster for users, but requires believing email open rate is our bottleneck. Social login: highest UX lift but 6 weeks and requires trusting Google/Apple auth.",
    minHeight: 160,
    agent: 'Strategy Sketchbook',
  },
  {
    id: 'recommendation',
    question: "What do you recommend — and what would have to be true for you to be wrong?",
    hint: 'Make the call. Then name the assumption that, if false, would invalidate it.',
    placeholder: "e.g. Recommend magic link: fastest path to meaningful lift with low risk. Wrong if: our drop-off isn't actually at verification but at the step before.",
    minHeight: 140,
    agent: 'Strategy Sketchbook',
  },
];

const VALIDATE_STEPS: ConversationStep[] = [
  // ── Experience Scorecard ──
  {
    id: 'subject',
    question: 'What are you evaluating?',
    hint: 'Name the specific product, feature, or touchpoint. Be precise — broad evaluations produce useless scores.',
    placeholder: "e.g. The onboarding flow for new free users — specifically from signup to first completed action.",
    minHeight: 100,
    agent: 'Experience Scorecard',
  },
  {
    id: 'criteria',
    question: 'What will you score it on?',
    hint: 'Define 3–5 criteria that matter for this experience. Be specific about what good looks like for each.',
    placeholder: "e.g. 1. Time-to-first-value (under 5 mins = 10/10). 2. Clarity of next step. 3. Emotional tone. 4. Error recovery. 5. Mobile usability.",
    minHeight: 140,
    agent: 'Experience Scorecard',
  },
  {
    id: 'scores',
    question: 'Score each criterion — and explain why.',
    hint: 'Rate each out of 10. Back scores with evidence — user feedback, data, or direct observation.',
    placeholder: "e.g. Time-to-value: 4/10 — average user takes 12 minutes. Clarity: 6/10 — most find the CTA but miss the secondary action. Emotional tone: 7/10 — friendly but loses confidence at step 3.",
    minHeight: 160,
    agent: 'Experience Scorecard',
  },
  {
    id: 'fixes',
    question: 'What needs fixing first?',
    hint: 'Based on your scores, what are the 2–3 highest-leverage improvements?',
    placeholder: "e.g. 1. Reduce onboarding to 3 steps — biggest drop-off point. 2. Add progress indicator. 3. Send day-1 email with a single CTA.",
    minHeight: 120,
    agent: 'Experience Scorecard',
  },
  // ── Influence Map ──
  {
    id: 'audience',
    question: 'Who are you trying to move?',
    hint: 'Describe the specific audience. What do they currently believe, and why do they believe it?',
    placeholder: "e.g. CFOs at mid-market SaaS companies. They believe AI tools are a cost, not an investment — because they've seen hype without ROI.",
    minHeight: 120,
    agent: 'Influence Map',
  },
  {
    id: 'desired_action',
    question: 'What do you want them to do?',
    hint: 'State the exact belief, feeling, or action you want to produce. Be specific about the outcome.',
    placeholder: "e.g. We want them to approve a 3-month pilot budget — because they believe the ROI is measurable within 90 days.",
    minHeight: 100,
    agent: 'Influence Map',
  },
  {
    id: 'blockers',
    question: "What's in the way?",
    hint: "What objections, fears, or competing beliefs will block the change? Include the ones that are hard to counter.",
    placeholder: "e.g. 'We tried something similar and it failed.' 'Our team won\'t adopt it.' 'I need board approval for anything over $50k.'",
    minHeight: 140,
    agent: 'Influence Map',
  },
  {
    id: 'move_them',
    question: 'How will you move them?',
    hint: 'What specific messages, proof points, or experiences will overcome each barrier? Map it directly.',
    placeholder: "e.g. Lead with a 90-day ROI guarantee. Show a case study from a similar company. Let them speak to a reference customer before signing.",
    minHeight: 140,
    agent: 'Influence Map',
  },
  // ── Results Tracker ──
  {
    id: 'measuring',
    question: 'What are you measuring?',
    hint: 'Name the specific thing being measured. What is it and why does its performance matter right now?',
    placeholder: "e.g. Our paid acquisition funnel for the SMB segment — we've spent $40k this quarter and aren't sure it's working.",
    minHeight: 100,
    agent: 'Results Tracker',
  },
  {
    id: 'targets',
    question: 'What are you tracking — and what are the targets?',
    hint: "List the specific metrics with targets or benchmarks. If you don't have a target, set one now.",
    placeholder: "e.g. CAC (target: under $800). Trial-to-paid conversion (target: 15%). Time-to-close (target: under 21 days). MQL volume (target: 120/mo).",
    minHeight: 140,
    agent: 'Results Tracker',
  },
  {
    id: 'actuals',
    question: 'What are the actual numbers?',
    hint: 'Fill in the real results against each target. This only works if the numbers are accurate.',
    placeholder: "e.g. CAC: $1,240 vs $800 target. Trial-to-paid: 9% vs 15% target. Time-to-close: 34 days vs 21. MQL volume: 88 vs 120.",
    minHeight: 140,
    agent: 'Results Tracker',
  },
  {
    id: 'changes',
    question: 'What needs to change?',
    hint: 'Based on the gap between targets and results — what specific actions will close the gap? Who owns each one?',
    placeholder: "e.g. 1. Pause Google Ads — high CAC, low quality. 2. A/B test pricing page — conversion gap. 3. Review ICP — we may be targeting the wrong segment.",
    minHeight: 140,
    agent: 'Results Tracker',
  },
];

const EVALUATE_STEPS_SINGLE: ConversationStep[] = [
  {
    id: 'subject',
    question: 'What page are you evaluating?',
    hint: 'Describe it: goal, audience, and what you know about performance.',
    placeholder: "e.g. Pricing page for mid-market SaaS buyers. Goal: book a demo. Conversion: 2.1%. Users spend 45s avg. 70% scroll past pricing without clicking.",
    minHeight: 140,
    agent: 'Page Scorecard',
  },
  {
    id: 'score_criteria',
    question: 'What will you score it on?',
    hint: 'Name the dimensions: clarity, trust, friction, CTA strength, value prop. Be specific about what good looks like.',
    placeholder: "e.g. Clarity (does value come through in 5s?), Trust (are there proof points?), CTA (is the action clear and low-friction?), Cognitive load (too much competing?).",
    minHeight: 120,
    agent: 'Page Scorecard',
  },
  {
    id: 'concerns',
    question: "What do you think isn't working?",
    hint: "Your hypothesis about what's failing — and what a good outcome looks like.",
    placeholder: "e.g. The headline feels generic — it doesn't speak to our specific buyer. CTA says 'Book a demo' but buyers at this stage want to try before talking to sales. Success = 4%+ conversion.",
    minHeight: 120,
    agent: 'Variant Lens',
  },
];

const EVALUATE_STEPS_JOURNEY: ConversationStep[] = [
  {
    id: 'subject',
    question: 'Describe the flow step by step.',
    hint: 'What happens at each stage? Include what you know about performance at each step.',
    placeholder: "e.g. Step 1 (landing): explains value, 8s avg. Step 2 (pricing): 60% scroll, 2.1% click CTA. Step 3 (signup): 40% complete. Step 4 (onboarding): 30% reach first action.",
    minHeight: 180,
    agent: 'Journey Trace',
  },
  {
    id: 'trust_drops',
    question: 'Where does trust drop or friction accumulate?',
    hint: "What's your read on where the journey breaks down — and what's the emotional state of the user at each stage?",
    placeholder: "e.g. Trust drops between pricing and signup — the CTA doesn't match the intent of someone still evaluating. Friction accumulates in onboarding — too many steps before first value.",
    minHeight: 140,
    agent: 'Journey Trace',
  },
  {
    id: 'transitions',
    question: 'Where are the weakest transitions?',
    hint: "Which step-to-step handoffs feel broken? What question does the user have at each transition that isn't answered?",
    placeholder: "e.g. The jump from pricing to signup feels abrupt — there's no reassurance. Users who click 'Get started' expect to see the product, not a signup form.",
    minHeight: 120,
    agent: 'Journey Trace',
  },
];

const EVALUATE_STEPS_COMPARISON: ConversationStep[] = [
  {
    id: 'version_a',
    question: 'Describe Version A (current).',
    hint: 'What does it say, how is it structured, and what do you know about its performance?',
    placeholder: "e.g. Headline: 'Built for teams'. CTA: 'Book a demo'. No social proof above fold. Conversion: 2.1%. Avg time on page: 45s.",
    minHeight: 140,
    agent: 'Variant Lens',
  },
  {
    id: 'version_b',
    question: 'Describe Version B (challenger).',
    hint: "What changed and what's the hypothesis behind those changes?",
    placeholder: "e.g. Headline: 'Close deals 40% faster'. CTA: 'Start free trial'. 3 customer quotes above fold. Hypothesis: reducing commitment friction will lift conversion to 4%+.",
    minHeight: 140,
    agent: 'Variant Lens',
  },
  {
    id: 'delta_focus',
    question: 'What do you want the analysis to focus on?',
    hint: 'Which differences matter most — and what specific question do you need answered?',
    placeholder: "e.g. Is the CTA change likely to help or confuse? Is the social proof credible enough to move a first-time visitor? Which version reduces decision friction more?",
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
  const getUnlockedUpTo = () => {
    let i = 0;
    while (i < steps.length) {
      if ((values[steps[i].id] || '').trim().length > 0) {
        i++;
      } else {
        break;
      }
    }
    return Math.min(i + 1, steps.length); // always show one ahead
  };

  const unlockedUpTo = getUnlockedUpTo();

  // Only auto-advance when user explicitly leaves a field (onBlur)
  const handleBlur = (stepId: string) => {
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx === activeIdx && (values[stepId] || '').trim().length > 0 && activeIdx < steps.length - 1) {
      setActiveIdx(activeIdx + 1);
    }
  };

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        const isVisible = idx < unlockedUpTo;
        const isActive = idx === activeIdx;
        const isAnswered = (values[step.id] || '').trim().length > 0 && !isActive;
        const isLocked = !isVisible;

        if (!isVisible) return null;

        return (
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
          />
        );
      })}

      {/* Progress indicator */}
      {unlockedUpTo > 1 && (
        <div className="flex items-center gap-1 pt-1">
          {steps.map((_, idx) => (
            <div key={idx} className={cn(
              'h-0.5 flex-1 rounded-full transition-all',
              (values[steps[idx].id] || '').trim().length > 0 ? 'bg-fresco-black' :
              idx === activeIdx ? 'bg-fresco-graphite-light' : 'bg-fresco-border'
            )} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Evaluate mode selector ───────────────────────────────────────────────────

function EvaluateFlow({
  values, onChange, url, onUrlChange,
}: {
  values: Record<string, string>;
  onChange: (k: string, v: string) => void;
  url: string;
  onUrlChange: (v: string) => void;
}) {
  const [mode, setMode] = useState<'single' | 'journey' | 'comparison'>('single');

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
      {/* Goal — always first */}
      <QuestionCard
        step={{
          id: 'goal',
          question: 'What are you trying to understand?',
          hint: 'What do you want to know about how this performs?',
          placeholder: "e.g. Why our pricing page isn't converting, and what the highest-leverage changes are before we commit to a redesign.",
          minHeight: 80,
        }}
        value={values.goal || ''}
        onChange={v => onChange('goal', v)}
        isActive={!values.goal || values.goal.trim().length === 0}
        isAnswered={(values.goal || '').trim().length > 0}
        isLocked={false}
        onActivate={() => {}}
      />

      {/* Mode selector */}
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide font-medium mb-3">
          What are you evaluating?
        </p>
        <div className="flex gap-2">
          {([
            { id: 'single',     label: 'A single page' },
            { id: 'journey',    label: 'A multi-step flow' },
            { id: 'comparison', label: 'Two versions' },
          ] as const).map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                'px-3 py-1.5 text-fresco-sm rounded-none border transition-all',
                mode === m.id
                  ? 'bg-fresco-black text-white border-fresco-black'
                  : 'bg-transparent text-fresco-graphite-mid border-fresco-border hover:border-fresco-black hover:text-fresco-black'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* URL input */}
      <div>
        <p className="text-fresco-xs text-fresco-graphite-light uppercase tracking-wide font-medium mb-2">
          {mode === 'journey' ? 'URLs (one per line, optional)' : 'URL (optional)'}
        </p>
        {mode === 'journey' ? (
          <textarea
            value={url}
            onChange={e => onUrlChange(e.target.value)}
            placeholder={"https://yoursite.com/step-1\nhttps://yoursite.com/step-2\nhttps://yoursite.com/step-3"}
            className="w-full px-4 py-3 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black font-mono"
            style={{ minHeight: 72 }}
          />
        ) : (
          <input
            type="url"
            value={url}
            onChange={e => onUrlChange(e.target.value)}
            placeholder="https://yoursite.com/page"
            className="w-full h-10 px-4 text-fresco-sm text-fresco-black bg-fresco-white border border-fresco-border rounded-none focus:outline-none focus:ring-1 focus:ring-fresco-black font-mono"
          />
        )}
      </div>

      {/* Mode-specific questions */}
      <ConversationFlow steps={steps} values={values} onChange={onChange} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HouseSession({ houseId, workspaceId, sessionId, onBack, onNavigateToHouse }: HouseSessionProps) {
  const { sessions, workspaces } = useFrescoStore();
  const db = useDBWrite();

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
        house: houseId, fitLabel: ao.fitLabel ?? meta.output, fitStrength: ao.fitStrength ?? 'Undecided',
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
  const [isRunning, setIsRunning] = useState(false);
  const [agentEvents, setAgentEvents] = useState<AgentStreamEvent[]>([]);
  const [result, setResult] = useState<HouseResult | null>(() => getPersistedResult());
  const [hasCopied, setHasCopied] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const setValue = (k: string, v: string) => setValues(prev => ({ ...prev, [k]: v }));

  // Gate on first meaningful answer
  const primaryField = houseId === 'investigate' ? 'situation'
    : houseId === 'innovate' ? 'start'
    : houseId === 'validate' ? 'subject'
    : 'goal';
  const canRun = !isRunning && (values[primaryField] || '').trim().length >= 10;

  const buildUserInput = () => {
    const order: Record<HouseId, string[]> = {
      investigate: ['situation', 'observations', 'patterns', 'contradictions', 'truth', 'assumptions', 'assumption_chains', 'ignored', 'new_model', 'who', 'real_need', 'hard_to_argue', 'so_what'],
      innovate:    ['start', 'steps', 'breakdown', 'success', 'hypothesis', 'test', 'pass_fail', 'wrong', 'options', 'option_costs', 'recommendation'],
      validate:    ['subject', 'criteria', 'scores', 'fixes', 'audience', 'desired_action', 'blockers', 'move_them', 'measuring', 'targets', 'actuals', 'changes'],
      evaluate:    ['goal', 'subject', 'score_criteria', 'concerns', 'trust_drops', 'transitions', 'version_a', 'version_b', 'delta_focus'],
    };
    return order[houseId]
      .map(k => (values[k] || '').trim())
      .filter(Boolean)
      .join('\n\n');
  };

  const handleRun = useCallback(async () => {
    if (!canRun) return;
    setIsRunning(true); setResult(null); setAgentEvents([]);
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
              if (ev.type === 'agent') {
                setAgentEvents(prev => [...prev, {
                  displayName: ev.displayName, signal: ev.signal,
                  summary: ev.summary || '', confidence: ev.confidence || 'medium',
                }]);
              } else if (ev.type === 'verdict') {
                const { type: _, ...vd } = ev;
                setResult(vd as HouseResult);
                await persistResult(vd as HouseResult);
              }
            } catch { /* skip */ }
          }
        }
      } else {
        const data = await response.json();
        if (data.verdict) { setResult(data); await persistResult(data); }
      }
    } catch (err) { console.error('House run failed:', err); }
    setIsRunning(false);
  }, [canRun, values, url, houseId, sessions, workspaceId, sessionId]);

  const persistResult = async (data: HouseResult) => {
    if (!session) return;
    await db.saveAIOutputs(sessionId, {
      insights: data.keyIssues, sentenceOfTruth: data.sentenceOfTruth, necessaryMoves: data.necessaryMoves,
    });
    useFrescoStore.getState().updateSession(sessionId, {
      aiOutputs: {
        houseResult: data, verdict: data.verdict, fitLabel: (data as any).fitLabel, fitStrength: (data as any).fitStrength,
        verdictRationale: data.verdictRationale, keyIssues: data.keyIssues, necessaryMoves: data.necessaryMoves,
        sentenceOfTruth: data.sentenceOfTruth, suggestedNextHouse: data.suggestedNextHouse,
        suggestedNextHouseReason: data.suggestedNextHouseReason, outputLabel: data.outputLabel,
      },
    } as any);
  };

  const generateExportText = () => {
    if (!result) return '';
    return [
      `# ${meta.name} — ${result.outputLabel}`,
      `Workspace: ${workspace?.title || 'Unknown'} · ${new Date().toLocaleDateString()}`,
      '', '## Input', buildUserInput(),
      '', `## Verdict: ${result.verdict}`, result.verdictRationale,
      '', '## Sentence of Truth', result.sentenceOfTruth,
      '', '## Key Issues', ...result.keyIssues.map((x, i) => `${i + 1}. ${x}`),
      '', '## Necessary Moves', ...result.necessaryMoves.map((x, i) => `${i + 1}. ${x}`),
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
    <div className="flex flex-col md:flex-row h-full bg-fresco-white">

      {/* ── LEFT / MIDDLE: Conversation input ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="max-w-[640px] mx-auto px-4 md:px-8 py-6 md:py-10">

          {/* Back + header */}
          <div className="mb-10">
            <button type="button" onClick={onBack}
              className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-mid hover:text-fresco-black transition-colors mb-8">
              <ChevronLeft className="w-4 h-4" />
              Back to {workspace?.title || 'Workspace'}
            </button>
            <div className="flex items-center gap-2 mb-3">
              <img src={meta.icon} alt={meta.name} className="w-4 h-4 opacity-60 icon-theme"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <span className="fresco-label capitalize">{meta.name}</span>
              <span className="fresco-label text-fresco-graphite-light">→ {meta.output}</span>
            </div>
            <h1 className="text-fresco-3xl font-medium text-fresco-black tracking-tight mb-2">{meta.name}</h1>
            <p className="text-fresco-base text-fresco-graphite-mid max-w-lg">{meta.description}</p>
          </div>

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
              <EvaluateFlow values={values} onChange={setValue} url={url} onUrlChange={setUrl} />
            )}
          </div>

          {/* Run */}
          <button onClick={handleRun} disabled={!canRun}
            className={cn('fresco-btn w-full', !canRun && 'opacity-40 cursor-not-allowed pointer-events-none')}>
            {isRunning
              ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Running analysis…</span></>
              : <><Sparkles className="w-4 h-4" /><span>Run {meta.name}</span></>
            }
          </button>
          {!canRun && !isRunning && (
            <p className="text-center text-fresco-xs text-fresco-graphite-light mt-2">
              Answer the first question to run the analysis
            </p>
          )}
        </div>
      </div>

      {/* ── RIGHT: Output ──────────────────────────────────────────────────── */}
      <div className="w-full md:w-[360px] max-h-[60vh] md:max-h-none border-t md:border-t-0 md:border-l border-fresco-border-light bg-fresco-off-white overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-fresco-lg font-medium text-fresco-black">Output</h2>
            {isRunning && (
              <div className="flex items-center gap-2 text-fresco-sm text-fresco-graphite-light">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Analysing…</span>
              </div>
            )}
          </div>

          {!result && agentEvents.length === 0 && !isRunning && (
            <div className="py-12 text-center">
              <img src={meta.icon} alt="" className="w-8 h-8 mx-auto mb-4 opacity-20 icon-theme"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <p className="text-fresco-sm text-fresco-graphite-light">
                Answer the questions and run {meta.name} to see your output here.
              </p>
            </div>
          )}

          {/* Streaming agents */}
          <AnimatePresence>
            {(isRunning || (!result && agentEvents.length > 0)) && agentEvents.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-6 space-y-3">
                <span className="fresco-label block mb-3">Thinking…</span>
                {agentEvents.map((ev, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-fresco-light-gray border-l-2 border-fresco-black/20">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-fresco-black" />
                        <span className="text-fresco-xs font-medium text-fresco-graphite-mid uppercase tracking-wide">{ev.displayName}</span>
                      </div>
                      <span className={cn('text-fresco-xs px-1.5 py-0.5 rounded-full',
                        ev.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                        ev.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-fresco-border text-fresco-graphite-light'
                      )}>{ev.confidence}</span>
                    </div>
                    <p className="text-fresco-sm text-fresco-graphite-soft leading-relaxed">{ev.signal}</p>
                  </motion.div>
                ))}
                {isRunning && agentEvents.length < 3 && (
                  <div className="p-3 bg-fresco-light-gray border-l-2 border-fresco-border animate-pulse">
                    <div className="h-3 w-24 bg-fresco-border rounded mb-2" /><div className="h-3 w-full bg-fresco-border rounded" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Final result */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <span className="fresco-label block mb-3">Verdict</span>
                  <div className={cn('px-4 py-3 border', vs?.bg, vs?.text, vs?.border)}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', vs?.dot)} />
                        <span className="text-fresco-lg font-bold">{result.verdict}</span>
                      </div>
                      {(result as any).fitStrength && (
                        <span className="text-fresco-xs opacity-70">
                          {(result as any).fitLabel}: {(result as any).fitStrength}
                        </span>
                      )}
                    </div>
                    <p className="text-fresco-sm opacity-80">{result.verdictRationale}</p>
                  </div>
                </div>

                <div>
                  <span className="fresco-label block mb-3">Sentence of Truth</span>
                  <div className="p-4 bg-fresco-black">
                    <p className="text-fresco-base text-white font-medium leading-relaxed italic">"{result.sentenceOfTruth}"</p>
                  </div>
                </div>

                <div>
                  <span className="fresco-label block mb-3">Key Issues</span>
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
                  <span className="fresco-label block mb-3">Necessary Moves</span>
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

                {result.suggestedNextHouse && (
                  <div className="pt-2">
                    <span className="fresco-label block mb-3">Suggested Next Step</span>
                    <div className="p-4 border border-fresco-border">
                      <div className="flex items-center gap-2 mb-2">
                        <img src={HOUSE_META[result.suggestedNextHouse].icon} alt=""
                          className="w-4 h-4 icon-theme opacity-60"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <span className="text-fresco-sm font-medium text-fresco-black capitalize">
                          {result.suggestedNextHouse}
                        </span>
                      </div>
                      <p className="text-fresco-xs text-fresco-graphite-mid mb-3">{result.suggestedNextHouseReason}</p>
                      <button onClick={() => onNavigateToHouse?.(result.suggestedNextHouse!)}
                        className="flex items-center gap-2 text-fresco-sm font-medium text-fresco-black hover:text-fresco-graphite transition-colors">
                        Open {HOUSE_META[result.suggestedNextHouse].name} <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-fresco-border-light">
                  <button onClick={() => setShowExportModal(true)} className="fresco-btn w-full">
                    <Download className="w-4 h-4" /><span>Export</span>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setShowExportModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-fresco-lg p-6 max-w-md w-full mx-4 shadow-fresco-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-fresco-lg font-medium text-fresco-black">Export</h3>
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
    </div>
  );
}
