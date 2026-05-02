// FRESCO Lens Reframe API — /api/houses/reframe
// Re-runs only the synthesis/merge call with a lens-shaped system prompt.

import { NextRequest, NextResponse } from 'next/server';
import type { HouseId } from '@/lib/agents';
import type { AgentOutput } from '@/lib/orchestrator';
import { buildHouseResult, HOUSE_FIT_LABELS } from '@/lib/orchestrator';
import { REFRAME_TOOL_SCHEMA } from '@/lib/orchestrator/schemas';

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

  // Build agent summaries defensively — older stashed outputs may be missing
  // fields. Coerce arrays/strings so a client format drift doesn't crash here.
  const agentSummaries = agentOutputs.map((a, i) => {
    const name = (a as any).displayName || (a as any).agentId || `Agent ${i + 1}`;
    const summary = (a as any).summary || '';
    const signal = (a as any).signal || 'unclear';
    const risks = Array.isArray((a as any).risks) ? (a as any).risks : [];
    const risksLine = risks.length ? risks.join('; ') : '(none stated)';
    const findings = Array.isArray((a as any).key_findings) ? (a as any).key_findings.slice(0, 3).join(' | ') : '';
    return `Agent ${i + 1} (${name})\n  Summary: ${summary}\n  Signal: ${signal}\n  Risks: ${risksLine}${findings ? `\n  Key findings: ${findings}` : ''}`;
  }).join('\n\n');

  const systemPrompt = `You are FRESCO's synthesis engine. You re-synthesise three agent outputs through a specific intellectual lens. The lens shapes WHICH facts get foregrounded and HOW they connect — it does not invent new evidence.

Rules:
- Strong → GO. Weak → PIVOT or STOP. Undecided → INVESTIGATE FURTHER.
- Never combine Strong with STOP. Never combine Weak with GO.`;

  const userMessage = `USER INPUT
${userInput || '(none provided)'}

AGENT OUTPUTS
${agentSummaries}

LENS INSTRUCTION
${lensInstruction}

FIT LABEL
${HOUSE_FIT_LABELS[house]}

Call the submit_reframe tool with your lens-shaped synthesis.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        tools: [{
          name: 'submit_reframe',
          description: 'Submit the lens-shaped re-synthesis.',
          input_schema: REFRAME_TOOL_SCHEMA,
        }],
        tool_choice: { type: 'tool', name: 'submit_reframe' },
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[reframe] Anthropic ${res.status}:`, errBody.slice(0, 500));
      return NextResponse.json({ error: `Anthropic ${res.status}: ${errBody.slice(0, 200)}` }, { status: 500 });
    }
    const data = await res.json();
    const toolUse = data.content?.find((b: { type: string }) => b.type === 'tool_use');
    if (!toolUse?.input) {
      console.error('[reframe] No tool_use in response. Full body:', JSON.stringify(data).slice(0, 500));
      return NextResponse.json({ error: 'Model returned no tool_use' }, { status: 500 });
    }
    const parsed = toolUse.input as Record<string, unknown>;

    // Enforce consistency
    // Tool-use schema guarantees these fields are present; cast to access.
    const p = parsed as Record<string, any>;
    const fitStrength = p.fitStrength || 'Undecided';
    let verdict = p.verdict || 'INVESTIGATE FURTHER';
    if (fitStrength === 'Strong' && verdict !== 'GO') verdict = 'GO';
    if (fitStrength === 'Weak' && verdict === 'GO') verdict = 'PIVOT';
    if (fitStrength === 'Undecided' && verdict === 'GO') verdict = 'INVESTIGATE FURTHER';

    // Tool-use schema guarantees fitStrength/verdict/verdictRationale/
    // sentenceOfTruth/keyIssues/necessaryMoves are present (REFRAME_TOOL_SCHEMA
    // marks them required). TS can't narrow through the spread, so we cast
    // at the call site rather than littering the file with non-null assertions.
    const mergePayload = { ...p, fitStrength, verdict } as Parameters<typeof buildHouseResult>[1];
    return NextResponse.json({ ...buildHouseResult(house, mergePayload), lens });
  } catch (err) {
    console.error('[reframe] Unhandled error:', err);
    const msg = err instanceof Error ? err.message : 'Reframe failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
