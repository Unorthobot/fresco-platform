// FRESCO Houses API — /api/houses/[house]
// Receives a user input + optional context, runs all 3 agents for the house in parallel,
// then runs the orchestrator merge to produce a single HouseResult.
// Agents are NEVER named in the response to the client.

import { NextRequest, NextResponse } from 'next/server';
import { HOUSE_AGENTS, type HouseId, type AgentOutput } from '@/lib/agents';
import { buildMergePrompt, buildHouseResult, mergeAgentOutputsLocally } from '@/lib/orchestrator';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface HouseRequest {
  userInput: string;
  context?: string;
  thinkingLens?: string;
  url?: string;
}

async function runAgent(
  agentSystemPrompt: string,
  userInput: string,
  agentId: string,
  context?: string,
  url?: string
): Promise<AgentOutput> {
  const contextSection = context ? `\n\nWORKSPACE CONTEXT (from prior sessions):\n${context}` : '';
  const urlSection = url ? `\n\nURL BEING EVALUATED: ${url}` : '';

  const userMessage = `${contextSection}${urlSection}\n\nUSER INPUT:\n${userInput}\n\nAnalyse this and return your JSON findings.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: agentSystemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Agent ${agentId} API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Agent ${agentId} returned no JSON`);

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    agentId,
    findings: parsed.findings || [],
    signal: parsed.signal || '',
    flags: parsed.flags || [],
    moves: parsed.moves || [],
  };
}

async function runOrchestrationMerge(
  house: HouseId,
  agentOutputs: AgentOutput[],
  userInput: string
) {
  const mergePrompt = buildMergePrompt(house, agentOutputs, userInput);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: mergePrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Merge API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Merge returned no JSON');

  return JSON.parse(jsonMatch[0]);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { house: string } }
) {
  try {
    const house = params.house as HouseId;
    const validHouses: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

    if (!validHouses.includes(house)) {
      return NextResponse.json({ error: `Invalid house: ${house}` }, { status: 400 });
    }

    const body: HouseRequest = await request.json();

    if (!body.userInput || body.userInput.trim().length < 10) {
      return NextResponse.json({ error: 'userInput required (min 10 chars)' }, { status: 400 });
    }

    const agents = HOUSE_AGENTS[house];

    // No API key — return a minimal fallback
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({
        house,
        verdict: 'INVESTIGATE FURTHER',
        verdictRationale: 'Add your Anthropic API key in Settings to enable AI-powered house analysis.',
        sentenceOfTruth: 'Configure ANTHROPIC_API_KEY to unlock full orchestration.',
        keyIssues: ['API key not configured — go to Settings to add your Anthropic key.'],
        necessaryMoves: ['Add ANTHROPIC_API_KEY to your environment variables.'],
        suggestedNextHouse: null,
        suggestedNextHouseReason: '',
        outputLabel: house.charAt(0).toUpperCase() + house.slice(1),
      });
    }

    // Run all 3 agents in parallel
    const agentResults = await Promise.allSettled(
      agents.map(agent =>
        runAgent(agent.systemPrompt, body.userInput, agent.id, body.context, body.url)
      )
    );

    // Collect successful agent outputs; build stubs for failures
    const agentOutputs: AgentOutput[] = agentResults.map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      console.error(`Agent ${agents[i].id} failed:`, result.reason);
      return {
        agentId: agents[i].id,
        findings: [],
        signal: '',
        flags: [],
        moves: [],
      };
    });

    // If all agents failed, use local merge
    const hasAnyOutput = agentOutputs.some(a => a.findings.length > 0 || a.signal);
    if (!hasAnyOutput) {
      const fallback = mergeAgentOutputsLocally(house, agentOutputs);
      return NextResponse.json(fallback);
    }

    // Run orchestration merge
    try {
      const mergeResponse = await runOrchestrationMerge(house, agentOutputs, body.userInput);
      const result = buildHouseResult(house, mergeResponse);
      return NextResponse.json(result);
    } catch (mergeError) {
      console.error('Merge failed, using local merge:', mergeError);
      const fallback = mergeAgentOutputsLocally(house, agentOutputs);
      return NextResponse.json(fallback);
    }

  } catch (error) {
    console.error('Houses route error:', error);
    return NextResponse.json({ error: 'House analysis failed' }, { status: 500 });
  }
}
