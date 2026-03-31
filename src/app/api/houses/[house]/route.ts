// FRESCO Houses API — /api/houses/[house]
// Streaming SSE response:
//   1. Each agent result sent as it completes (parallel execution)
//   2. Final merged verdict sent last
//
// Event types:
//   { type: 'agent', displayName, signal, findings }  — one per agent as it finishes
//   { type: 'verdict', ...HouseResult }               — final merged output
//   { type: 'error', message }                        — on failure

import { NextRequest } from 'next/server';
import { HOUSE_AGENTS, type HouseId, type AgentOutput } from '@/lib/agents';
import { buildMergePrompt, buildHouseResult, mergeAgentOutputsLocally } from '@/lib/orchestrator';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function runAgent(
  agent: { id: string; displayName: string; systemPrompt: string },
  userInput: string,
  context?: string,
  url?: string,
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
      system: agent.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) throw new Error(`Agent ${agent.id} API error: ${response.status}`);

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Agent ${agent.id} returned no JSON`);

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    agentId: agent.id,
    displayName: agent.displayName,
    findings: parsed.findings || [],
    signal: parsed.signal || '',
    flags: parsed.flags || [],
    moves: parsed.moves || [],
  };
}

async function runMerge(house: HouseId, agentOutputs: AgentOutput[], userInput: string) {
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
  if (!response.ok) throw new Error(`Merge API error: ${response.status}`);
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
  const house = params.house as HouseId;
  const validHouses: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

  if (!validHouses.includes(house)) {
    return new Response(JSON.stringify({ error: `Invalid house: ${house}` }), { status: 400 });
  }

  const body = await request.json();
  const userInput: string = body.userInput || '';
  const context: string | undefined = body.context;
  const url: string | undefined = body.url;

  if (!userInput || userInput.trim().length < 10) {
    return new Response(JSON.stringify({ error: 'userInput required (min 10 chars)' }), { status: 400 });
  }

  // No API key — return a non-streaming fallback
  if (!ANTHROPIC_API_KEY) {
    const fallback = {
      type: 'verdict',
      house,
      verdict: 'INVESTIGATE FURTHER',
      verdictRationale: 'Add your Anthropic API key in Settings to enable AI-powered house analysis.',
      sentenceOfTruth: 'Configure ANTHROPIC_API_KEY to unlock full orchestration.',
      keyIssues: ['API key not configured — go to Settings to add your Anthropic key.'],
      necessaryMoves: ['Add ANTHROPIC_API_KEY to your environment variables.'],
      suggestedNextHouse: null,
      suggestedNextHouseReason: '',
      outputLabel: house.charAt(0).toUpperCase() + house.slice(1),
    };
    return new Response(JSON.stringify(fallback), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const agents = HOUSE_AGENTS[house];

  // Streaming SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const agentOutputs: AgentOutput[] = [];
        const agentPromises = agents.map(agent =>
          runAgent(agent, userInput.trim(), context, url)
            .then(output => {
              agentOutputs.push(output);
              // Stream this agent's result as it finishes
              send({
                type: 'agent',
                displayName: output.displayName,
                signal: output.signal,
                findings: output.findings.slice(0, 2), // top 2 findings for preview
              });
              return output;
            })
            .catch(err => {
              console.error(`Agent ${agent.id} failed:`, err);
              const stub: AgentOutput = {
                agentId: agent.id,
                displayName: agent.displayName,
                findings: [],
                signal: '',
                flags: [],
                moves: [],
              };
              agentOutputs.push(stub);
              return stub;
            })
        );

        await Promise.all(agentPromises);

        // Run merge once all agents are done
        const hasOutput = agentOutputs.some(a => a.signal || a.findings.length > 0);
        let verdictData;
        if (hasOutput) {
          try {
            const mergeResponse = await runMerge(house, agentOutputs, userInput.trim());
            verdictData = buildHouseResult(house, mergeResponse);
          } catch {
            verdictData = mergeAgentOutputsLocally(house, agentOutputs);
          }
        } else {
          verdictData = mergeAgentOutputsLocally(house, agentOutputs);
        }

        send({ type: 'verdict', ...verdictData });
      } catch (err) {
        console.error('House stream error:', err);
        send({ type: 'error', message: 'Analysis failed. Please try again.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
