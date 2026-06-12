import { NextRequest, NextResponse } from 'next/server';
import type { HouseId } from '@/lib/agents';
import {
  HOUSE_QUESTIONS,
  questionsFor,
  ROUTER_CONFIDENCE_FLOOR,
  MAX_FOLLOWUPS,
  type EvaluateMode,
  type RouterResult,
} from '@/lib/houseQuestions';

// POST /api/route-decision — WP1 routing call (spec Moment 2).
// One fast classify + extract + gap pass. Guests allowed: routing spends
// no run (the quota gate stays at run time), it just shapes the session.
// Time budget <3s perceived — Haiku, temperature 0, hard 8s timeout with
// a graceful investigate fallback so the UI never hangs.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
export const maxDuration = 30;

const ROUTER_MODEL = 'claude-haiku-4-5-20251001';
const VALID_HOUSES: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];
const VALID_MODES: EvaluateMode[] = ['single', 'journey', 'comparison'];

function buildRegistryBlock(): string {
  const lines: string[] = [];
  for (const house of ['investigate', 'innovate', 'validate'] as const) {
    lines.push(`${house}:`);
    for (const q of HOUSE_QUESTIONS[house]) lines.push(`  ${q.id} — ${q.question}`);
  }
  for (const mode of VALID_MODES) {
    lines.push(`evaluate (${mode}):`);
    for (const q of HOUSE_QUESTIONS.evaluate[mode]) lines.push(`  ${q.id} — ${q.question}`);
  }
  return lines.join('\n');
}

const SYSTEM_PROMPT = `You are Fresco's routing engine. A founder describes a decision in free text.
You do three things in one pass.

1. CLASSIFY which analysis applies:
- investigate — "is the problem real?" Unclear cause, conflicting signals,
  deciding what is actually happening.
- innovate — "what should we build or change?" Solution design, options on
  the table, how to fix a known problem.
- validate — "will it work, should we commit?" A specific commitment is
  pending and the evidence needs pressure-testing.
- evaluate — "how is it performing?" An existing page, flow, or feature with
  numbers, diagnosing a gap. If evaluate, also pick a mode: single (one
  page), journey (multi-step flow), comparison (two versions).

Rate your classification confidence 0-1. When genuinely torn between two
houses, prefer investigate.

2. EXTRACT answers to the chosen house's canonical questions from the
founder's text. Compress their own words; never invent facts they did not
state. Rate each extraction 0-1 for how completely their text answers the
question. Omit questions their text does not touch.

3. IDENTIFY GAPS — canonical questions with no meaningful answer in the
text. For each, write a one-line reason this question matters for THIS
specific decision: second person, concrete, no framework vocabulary. Order
by importance to the verdict. Mark at most ${MAX_FOLLOWUPS} as followups. A rich
prompt yields zero followups — do not manufacture questions.

Return ONLY JSON, no markdown fences:
{"house":"investigate|innovate|validate|evaluate",
 "evaluateMode":"single|journey|comparison or null",
 "confidence":0.0,
 "extracted":{"<questionId>":{"answer":"...","confidence":0.0}},
 "gaps":["<questionId>"],
 "followups":[{"questionId":"...","reason":"..."}]}

Canonical questions:
${buildRegistryBlock()}`;

// The house's opening question is always answered by the prompt itself —
// "What are you trying to figure out?" IS what they just typed. Re-asking
// it made the clarify screen feel like it ignored the user (beta: Javier;
// repeated in post-launch testing).
const PRIMARY_FIELD: Record<HouseId, string> = {
  investigate: 'situation',
  innovate: 'start',
  validate: 'subject',
  evaluate: 'goal',
};

/** Safe fallback when the model fails, times out, or returns junk. */
function fallbackResult(input: string): RouterResult {
  const questions = HOUSE_QUESTIONS.investigate;
  const primary = PRIMARY_FIELD.investigate;
  const rest = questions.filter(q => q.id !== primary);
  return {
    house: 'investigate',
    evaluateMode: null,
    confidence: 0,
    extracted: { [primary]: { answer: input, confidence: 0.3 } },
    gaps: rest.map(q => q.id),
    followups: rest.slice(0, MAX_FOLLOWUPS).map(q => ({
      questionId: q.id,
      question: q.question,
      reason: q.whyItMatters,
    })),
  };
}

/** Validate + normalise raw model output into a trustworthy RouterResult. */
function normalise(raw: unknown, input: string): RouterResult {
  const r = raw as Record<string, unknown>;
  let house = VALID_HOUSES.includes(r.house as HouseId) ? (r.house as HouseId) : 'investigate';
  let evaluateMode: EvaluateMode | null =
    house === 'evaluate' && VALID_MODES.includes(r.evaluateMode as EvaluateMode)
      ? (r.evaluateMode as EvaluateMode)
      : house === 'evaluate' ? 'single' : null;
  const confidence = typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : 0;

  // Low confidence → investigate is the safest opening (spec Moment 2.4).
  if (confidence < ROUTER_CONFIDENCE_FLOOR) {
    house = 'investigate';
    evaluateMode = null;
  }

  const canonical = questionsFor(house, evaluateMode);
  const validIds = new Set(canonical.map(q => q.id));
  const textOf = new Map(canonical.map(q => [q.id, q.question]));

  // Extractions: keep only valid ids with non-empty string answers. When we
  // forced a house switch, overlapping ids (e.g. 'subject') survive; the
  // rest are dropped and re-surface as gaps below.
  const extracted: RouterResult['extracted'] = {};
  if (r.extracted && typeof r.extracted === 'object') {
    for (const [id, val] of Object.entries(r.extracted as Record<string, unknown>)) {
      if (!validIds.has(id)) continue;
      const v = val as { answer?: unknown; confidence?: unknown };
      if (typeof v?.answer !== 'string' || !v.answer.trim()) continue;
      extracted[id] = {
        answer: v.answer.trim(),
        confidence: typeof v.confidence === 'number' ? Math.max(0, Math.min(1, v.confidence)) : 0.5,
      };
    }
  }

  // The prompt itself always answers the house's primary question. If the
  // model didn't extract it, seed it — the clarify screen must never ask
  // the user to repeat what they just typed.
  const primary = PRIMARY_FIELD[house];
  const promptSeededPrimary = !extracted[primary];
  if (promptSeededPrimary) {
    extracted[primary] = { answer: input, confidence: 0.3 };
  }

  // Gaps = canonical questions without an extraction (derived, not trusted).
  const gaps = canonical.map(q => q.id).filter(id => !extracted[id]);

  // Followups: model's ordering and reasons, but canonical text, valid ids,
  // gaps only, hard cap. Default reasons come from the registry's
  // whyItMatters — never a generic line.
  const whyOf = new Map(canonical.map(q => [q.id, q.whyItMatters]));
  const modelFollowups = Array.isArray(r.followups) ? (r.followups as Array<Record<string, unknown>>) : [];
  let followups = modelFollowups
    .filter(f => typeof f?.questionId === 'string' && validIds.has(f.questionId as string) && !extracted[f.questionId as string])
    .map(f => ({
      questionId: f.questionId as string,
      question: textOf.get(f.questionId as string) || '',
      reason: typeof f.reason === 'string' && f.reason.trim()
        ? f.reason.trim()
        : whyOf.get(f.questionId as string) || 'sharpens the verdict',
    }))
    .slice(0, MAX_FOLLOWUPS);

  // Thin prompt (model extracted nothing real, named no followups): ask the
  // top remaining questions with their registry reasons. Rich prompts with
  // incidental gaps still go straight to confirm, per spec.
  const onlySeededPrimary = promptSeededPrimary && Object.keys(extracted).length === 1;
  if (followups.length === 0 && gaps.length > 0 && onlySeededPrimary) {
    followups = canonical
      .filter(q => gaps.includes(q.id))
      .slice(0, MAX_FOLLOWUPS)
      .map(q => ({ questionId: q.id, question: q.question, reason: q.whyItMatters }));
  }

  return { house, evaluateMode, confidence, extracted, gaps, followups };
}

export async function POST(req: NextRequest) {
  let input = '';
  try {
    const body = await req.json();
    input = String(body.input || '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (input.length < 10) {
    return NextResponse.json({ error: 'Describe the decision in a sentence or two first.' }, { status: 400 });
  }
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(fallbackResult(input));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ROUTER_MODEL,
        max_tokens: 1200,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: input.slice(0, 8000) }],
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) return NextResponse.json(fallbackResult(input));

    const data = await res.json();
    const text: string = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json(fallbackResult(input));

    return NextResponse.json(normalise(JSON.parse(jsonMatch[0]), input));
  } catch {
    clearTimeout(timeout);
    return NextResponse.json(fallbackResult(input));
  }
}
