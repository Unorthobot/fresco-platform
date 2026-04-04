// FRESCO Lens Reframe API — /api/houses/reframe
// Re-runs only the synthesis/merge call with a lens-shaped system prompt.

import { NextRequest, NextResponse } from 'next/server';
import type { HouseId } from '@/lib/agents';
import type { AgentOutput } from '@/lib/orchestrator';
import { buildHouseResult, HOUSE_FIT_LABELS } from '@/lib/orchestrator';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const LENS_INSTRUCTIONS: Record<string, string> = {
  critical: `Apply a CRITICAL THINKING lens. Prioritise truth-testing and assumption recognition. The Sentence of Truth should name the most important unexamined assumption. Key Issues should surface where reasoning is fragile. At least one Necessary Move should be "validate this assumption before proceeding."`,
  systems: `Apply a SYSTEMS THINKING lens. Prioritise interconnections, feedback loops, and structural causes. The Sentence of Truth should name the system dynamic driving the situation. Key Issues should trace symptoms to structural roots. Necessary Moves should target the leverage point in the system.`,
  design: `Apply a DESIGN THINKING lens. Prioritise human context, unmet needs, and experience quality. The Sentence of Truth should name the human truth the evidence points to. Key Issues should surface where the experience breaks down for the person. Necessary Moves should improve the human experience.`,
  product: `Apply a PRODUCT THINKING lens. Prioritise feasibility, viability, and build decisions. The Sentence of Truth should be a product decision framing — what to build, cut, or change. Key Issues should be product decisions with trade-offs. Necessary Moves should be sequenced product actions.`,
  strategic: `Apply a STRATEGIC THINKING lens. Prioritise competitive positioning and long-term direction. The Sentence of Truth should name the non-obvious strategic insight. Key Issues should be framed as strategic risk or competitive exposure. Necessary Moves should create durable advantage.`,
  analytical: `Apply an ANALYTICAL THINKING lens. Prioritise data patterns and measurable gaps. The Sentence of Truth should be the single most evidence-backed finding. Key Issues should be ranked by severity with data signals. Necessary Moves should include explicit success criteria.`,
  futures: `Apply a FUTURES THINKING lens. Prioritise trajectory and second-order consequences. The Sentence of Truth should name where the current pattern leads if nothing changes. Key Issues should include early-warning signals. At least one Necessary Move should shape the future, not just respond to the present.`,
  economic: `Apply an ECONOMIC THINKING lens. Prioritise incentive structures and value exchange. The Sentence of Truth should name the economic dynamic or misaligned incentive. Key Issues should surface where value is leaking. Necessary Moves should be framed as economic trade-offs.`,
};

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

  const body = await request.json();
  const house = body.house as HouseId;
  const lens = body.lens as string;
  const agentOutputs: AgentOutput[] = body.agentOutputs || [];
  const userInput: string = body.userInput || '';

  if (!house || !lens || agentOutputs.length === 0) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const lensInstruction = LENS_INSTRUCTIONS[lens];
  if (!lensInstruction) return NextResponse.json({ error: `Unknown lens: ${lens}` }, { status: 400 });

  const agentSummaries = agentOutputs.map((a, i) =>
    `Agent ${i + 1} (${a.displayName}): ${a.summary} | Signal: ${a.signal} | Risks: ${a.risks.join(', ')}`
  ).join('\n');

  const prompt = `You are FRESCO's synthesis engine. Apply a specific thinking lens to synthesise agent findings.

USER INPUT: ${userInput}

AGENT OUTPUTS:
${agentSummaries}

LENS: ${lensInstruction}

FIT LABEL: ${HOUSE_FIT_LABELS[house]}

Rules: Strong→GO, Weak→PIVOT/STOP, Undecided→INVESTIGATE FURTHER. Never Strong+STOP, never Weak+GO.

Return ONLY valid JSON:
{"fitStrength":"Strong|Weak|Undecided","verdict":"GO|PIVOT|INVESTIGATE FURTHER|STOP","verdictRationale":"1-2 sentences","sentenceOfTruth":"Lens-shaped insight","keyIssues":["issue 1","issue 2","issue 3"],"necessaryMoves":["move 1","move 2","move 3"]}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    const parsed = JSON.parse(match[0]);

    // Enforce consistency
    const fitStrength = parsed.fitStrength || 'Undecided';
    let verdict = parsed.verdict || 'INVESTIGATE FURTHER';
    if (fitStrength === 'Strong' && verdict !== 'GO') verdict = 'GO';
    if (fitStrength === 'Weak' && verdict === 'GO') verdict = 'PIVOT';
    if (fitStrength === 'Undecided' && verdict === 'GO') verdict = 'INVESTIGATE FURTHER';

    return NextResponse.json({ ...buildHouseResult(house, { ...parsed, fitStrength, verdict }), lens });
  } catch (err) {
    console.error('Reframe error:', err);
    return NextResponse.json({ error: 'Reframe failed' }, { status: 500 });
  }
}
