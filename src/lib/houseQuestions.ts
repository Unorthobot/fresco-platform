// Canonical question registry — single source of truth for the WP1 router
// and the clarify screen. The ids are stable contract values: they are the
// stepResponses JSON keys in the DB and the step ids in HouseSession, so
// values confirmed on the clarify screen flow into the existing run
// pipeline with no translation.
//
// HouseSession keeps its own richer step definitions (hints, placeholders,
// input types) — those are presentation. This file is the routing contract.

import type { HouseId } from '@/lib/agents';

export type EvaluateMode = 'single' | 'journey' | 'comparison';

export interface CanonicalQuestion {
  id: string;
  question: string;
  /** Default one-line reason shown when the router doesn't supply a
      contextual one — mono voice, second person, no framework vocabulary. */
  whyItMatters: string;
}

export const HOUSE_QUESTIONS: Record<Exclude<HouseId, 'evaluate'>, CanonicalQuestion[]> & {
  evaluate: Record<EvaluateMode, CanonicalQuestion[]>;
} = {
  investigate: [
    { id: 'situation', question: 'What are you trying to figure out?', whyItMatters: 'names the decision the verdict has to answer' },
    { id: 'observations', question: 'What have you actually observed?', whyItMatters: 'separates what is actually happening from what you suspect' },
    { id: 'assumptions', question: 'What do you believe is causing it — and what are you assuming?', whyItMatters: 'the analysis pressure-tests your theory — it needs to know what it is' },
    { id: 'position_synthesis', question: 'What would change your mind?', whyItMatters: 'a verdict you can act on names the evidence that would flip it' },
  ],
  innovate: [
    { id: 'start', question: 'What are you trying to build or improve — and who is it for?', whyItMatters: 'anchors who this is for and what they do today instead' },
    { id: 'breakdown', question: 'Walk through how it works today. Where do things go wrong?', whyItMatters: 'the analysis needs the failure points, not just the goal' },
    { id: 'options', question: 'What are your real options — and what constraints are you working within?', whyItMatters: 'a verdict needs real alternatives to judge between' },
    { id: 'constraint', question: "What's the one thing you're most unsure about?", whyItMatters: 'the riskiest unknown decides what to test first' },
  ],
  validate: [
    { id: 'subject', question: 'What are you about to commit to — and what would make you confident it\'s the right call?', whyItMatters: 'names the commitment being pressure-tested' },
    { id: 'criteria', question: 'What evidence do you have that real people actually want this?', whyItMatters: 'evidence quality decides how much weight the verdict can bear' },
    { id: 'audience', question: "What's the best argument against doing this — and how do you respond to it?", whyItMatters: 'the strongest counter-argument is the main stress test' },
    { id: 'actuals', question: 'What would a successful test look like in 2–4 weeks?', whyItMatters: 'a pass-fail line keeps the decision honest' },
  ],
  evaluate: {
    single: [
      { id: 'goal', question: 'What are you evaluating, and what should it achieve?', whyItMatters: "what 'working' means decides how the numbers get read" },
      { id: 'subject', question: 'What is this page supposed to do — and what are the actual numbers?', whyItMatters: 'the gap between target and actual is what gets analysed' },
      { id: 'score_criteria', question: 'What do you think is causing the gap?', whyItMatters: 'your diagnosis is the hypothesis the analysis tests' },
      { id: 'concerns', question: "What would a 50% improvement look like — and what would prove you're wrong about the cause?", whyItMatters: 'names the change worth betting on — and its disproof' },
    ],
    journey: [
      { id: 'goal', question: 'What are you evaluating, and what should it achieve?', whyItMatters: "what 'working' means decides how the numbers get read" },
      { id: 'subject', question: 'Walk through the flow step by step — with the numbers at each stage.', whyItMatters: 'the analysis traces the flow you describe, step by step' },
      { id: 'trust_drops', question: "At each step, what's the question the user is asking that the page doesn't answer?", whyItMatters: 'unanswered user questions are where flows leak' },
      { id: 'transitions', question: 'What is the one break that, if fixed, would most improve the flow — and what would prove you wrong?', whyItMatters: 'the highest-leverage break focuses the verdict' },
    ],
    comparison: [
      { id: 'goal', question: 'What are you evaluating, and what should it achieve?', whyItMatters: "what 'working' means decides how the numbers get read" },
      { id: 'version_a', question: 'Describe Version A — and what it was trying to do.', whyItMatters: 'judging the delta needs the logic behind both versions' },
      { id: 'version_b', question: 'Describe Version B — and the hypothesis behind it.', whyItMatters: 'the hypothesis behind the change is what gets tested' },
      { id: 'delta_focus', question: 'Before you see the numbers — what result would tell you Version B wins, what would tell you A wins, and what would leave you genuinely unsure?', whyItMatters: 'pre-committed thresholds prevent rationalising the result' },
    ],
  },
};

export function questionsFor(house: HouseId, evaluateMode?: EvaluateMode | null): CanonicalQuestion[] {
  if (house === 'evaluate') {
    return HOUSE_QUESTIONS.evaluate[evaluateMode || 'single'];
  }
  return HOUSE_QUESTIONS[house];
}

// ── Router contract ──────────────────────────────────────────────────────

export type AnswerSource = 'extracted' | 'user';

export interface ExtractedAnswer {
  answer: string;
  confidence: number;
}

export interface RouterFollowup {
  questionId: string;
  question: string; // canonical text, substituted server-side
  reason: string;
}

export interface RouterResult {
  house: HouseId;
  evaluateMode: EvaluateMode | null;
  confidence: number;
  extracted: Record<string, ExtractedAnswer>;
  gaps: string[];
  followups: RouterFollowup[];
}

/** Below this classification confidence the server forces investigate. */
export const ROUTER_CONFIDENCE_FLOOR = 0.55;
export const MAX_FOLLOWUPS = 3;
