// FRESCO Orchestration API
// Reads completed sessions in a workspace and recommends which HOUSE to run next.
// Agents are background-only — this layer never mentions them.
// The UI only sees houses.

import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

type HouseId = 'investigate' | 'innovate' | 'validate' | 'evaluate';

interface SessionSummary {
  house: HouseId;
  sentenceOfTruth?: string;
  insights?: string[];
  necessaryMoves?: string[];
  hasOutput: boolean;
}

interface OrchestrationRequest {
  workspaceTitle?: string;
  sessions: SessionSummary[];
}

interface OrchestrationResponse {
  nextHouse: HouseId;
  recommendation: string;   // one direct sentence: what to do
  reasoning: string;        // 2-3 sentences: why, based on what sessions reveal
  urgency: 'high' | 'medium' | 'low';
  houseProgress: Record<HouseId, { completed: boolean }>;
}

const HOUSE_NAMES: Record<HouseId, string> = {
  investigate: 'Investigate',
  innovate: 'Innovate',
  validate: 'Validate',
  evaluate: 'Evaluate',
};

const HOUSE_OUTPUTS: Record<HouseId, string> = {
  investigate: 'Problem–Solution Fit',
  innovate: 'Product–Market Fit',
  validate: 'Commercial Viability',
  evaluate: 'Performance Readiness',
};

function computeHouseProgress(sessions: SessionSummary[]): Record<HouseId, { completed: boolean }> {
  return {
    investigate: { completed: sessions.some(s => s.house === 'investigate' && s.hasOutput) },
    innovate:    { completed: sessions.some(s => s.house === 'innovate'    && s.hasOutput) },
    validate:    { completed: sessions.some(s => s.house === 'validate'    && s.hasOutput) },
    evaluate:    { completed: sessions.some(s => s.house === 'evaluate'    && s.hasOutput) },
  };
}

function rulesBasedOrchestration(
  sessions: SessionSummary[],
  houseProgress: Record<HouseId, { completed: boolean }>
): OrchestrationResponse {
  const houses: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];
  const sessionsWithOutput = sessions.filter(s => s.hasOutput).length;

  // Find first incomplete house in order
  for (const house of houses) {
    if (!houseProgress[house].completed) {
      const prevIndex = houses.indexOf(house) - 1;
      const prevDone = prevIndex < 0 || houseProgress[houses[prevIndex]].completed;
      if (prevDone || house === 'investigate') {
        return {
          nextHouse: house,
          recommendation: `Find out: ${HOUSE_OUTPUTS[house]}`,
          reasoning: house === 'investigate'
            ? 'Start here. Define the real problem before moving toward solutions.'
            : `You have ${sessionsWithOutput} completed session${sessionsWithOutput !== 1 ? 's' : ''}. That's the logical next question.`,
          urgency: house === 'investigate' ? 'high' : 'medium',
          houseProgress,
        };
      }
    }
  }

  // All houses done — suggest re-running Investigate with new insight
  return {
    nextHouse: 'investigate',
    recommendation: 'Re-test whether the problem is real — your latest findings may reveal it was framed incorrectly.',
    reasoning: 'You\'ve completed all four houses. The most valuable next move is to loop back to Investigate with the perspective you\'ve now gained.',
    urgency: 'low',
    houseProgress,
  };
}

async function callOrchestrationAPI(
  body: OrchestrationRequest,
  houseProgress: Record<HouseId, { completed: boolean }>
): Promise<OrchestrationResponse> {
  const { sessions, workspaceTitle } = body;

  const sessionsWithOutput = sessions.filter(s => s.hasOutput);

  const sessionContext = sessionsWithOutput.map(s => {
    const lines = [`House: ${HOUSE_NAMES[s.house]}`];
    if (s.sentenceOfTruth) lines.push(`Sentence of Truth: "${s.sentenceOfTruth}"`);
    if (s.insights?.length) lines.push(`Key insights: ${s.insights.slice(0, 2).join(' | ')}`);
    if (s.necessaryMoves?.length) lines.push(`Necessary moves: ${s.necessaryMoves.slice(0, 2).join(' | ')}`);
    return lines.join('\n');
  }).join('\n\n---\n\n');

  const progressContext = (Object.keys(houseProgress) as HouseId[]).map(h =>
    `${HOUSE_NAMES[h]} (${HOUSE_OUTPUTS[h]}): ${houseProgress[h].completed ? 'Complete' : 'Not started'}`
  ).join('\n');

  const systemPrompt = `You are FRESCO's workspace orchestrator. You read completed sessions and recommend which HOUSE to run next.

The four houses:
- Investigate → Problem–Solution Fit
- Innovate → Product–Market Fit  
- Validate → Commercial Viability
- Evaluate → Performance Readiness

This is a loop, not a line. Your job is to look at what the sessions REVEAL and recommend the highest-leverage next house — which may not be the next one in sequence.

Rules:
- Recommend a HOUSE, not a toolkit or agent. Agents are invisible to the user.
- If Investigate reveals unclear problem definition → run Investigate again
- If Innovate reveals no validated path → push to Validate before building
- If Validate reveals the original problem was wrong → route back to Investigate
- If Evaluate reveals design issues → route to Innovate
- If Evaluate reveals commercial issues → route to Validate
- Be specific: reference what the sessions actually revealed

nextHouse is internal routing — the user never sees it. The recommendation
the user reads must lead with the QUESTION to answer next, never the house
name ("Find out whether people actually want this" — not "Run Innovate").

Respond ONLY with valid JSON:
{
  "nextHouse": "investigate|innovate|validate|evaluate",
  "recommendation": "One direct sentence framing the next question to answer — no house names",
  "reasoning": "2-3 sentences: what the sessions reveal that makes this the right move",
  "urgency": "high|medium|low"
}`;

  const userMessage = `Workspace: "${workspaceTitle || 'Untitled'}"

House progress:
${progressContext}

Session outputs:
${sessionContext || 'No sessions with output yet.'}

Which house should they run next?`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in orchestration response');

  const parsed = JSON.parse(jsonMatch[0]);
  return { ...parsed, houseProgress };
}

export async function POST(request: NextRequest) {
  try {
    const body: OrchestrationRequest = await request.json();

    if (!body.sessions || !Array.isArray(body.sessions)) {
      return NextResponse.json({ error: 'sessions array required' }, { status: 400 });
    }

    const houseProgress = computeHouseProgress(body.sessions);

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(rulesBasedOrchestration(body.sessions, houseProgress));
    }

    const sessionsWithOutput = body.sessions.filter(s => s.hasOutput);
    if (sessionsWithOutput.length === 0) {
      return NextResponse.json(rulesBasedOrchestration(body.sessions, houseProgress));
    }

    try {
      const result = await callOrchestrationAPI(body, houseProgress);
      return NextResponse.json(result);
    } catch (err) {
      console.error('Orchestration API error, using rules:', err);
      return NextResponse.json(rulesBasedOrchestration(body.sessions, houseProgress));
    }

  } catch (error) {
    console.error('Orchestrate route error:', error);
    return NextResponse.json({ error: 'Orchestration failed' }, { status: 500 });
  }
}
