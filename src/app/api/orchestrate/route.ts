// FRESCO Orchestration API
// Reads completed sessions in a workspace and recommends what house / toolkit to run next.
// This is the house-first orchestration layer — it looks across all sessions and surfaces
// the highest-leverage next move rather than just chaining toolkits linearly.

import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

type HouseId = 'investigate' | 'innovate' | 'validate' | 'evaluate';

interface SessionSummary {
  toolkit: string;
  toolkitName: string;
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
  nextToolkit: string;
  nextToolkitName: string;
  recommendation: string;
  reasoning: string;
  urgency: 'high' | 'medium' | 'low';
  houseProgress: Record<HouseId, { total: number; completed: number }>;
}

// House → toolkit mapping for orchestrator to reference
const HOUSE_TOOLKITS: Record<HouseId, string[]> = {
  investigate: ['insight_stack', 'pov_generator', 'mental_model_mapper'],
  innovate: ['flow_board', 'experiment_brief', 'strategy_sketchbook'],
  validate: ['ux_scorecard', 'persuasion_canvas', 'performance_grid'],
  evaluate: ['decision_matrix', 'risk_radar', 'signal_checker'],
};

const TOOLKIT_NAMES: Record<string, string> = {
  insight_stack: 'Insight Stack',
  pov_generator: 'Position Builder',
  mental_model_mapper: 'Belief Mapper',
  flow_board: 'Flow Board',
  experiment_brief: 'Experiment Brief',
  strategy_sketchbook: 'Strategy Sketchbook',
  ux_scorecard: 'Experience Scorecard',
  persuasion_canvas: 'Influence Map',
  performance_grid: 'Results Tracker',
  decision_matrix: 'Decision Matrix',
  risk_radar: 'Risk Radar',
  signal_checker: 'Signal Checker',
};

const HOUSE_NAMES: Record<HouseId, string> = {
  investigate: 'Investigate',
  innovate: 'Innovate',
  validate: 'Validate',
  evaluate: 'Evaluate',
};

function getHouseForToolkit(toolkit: string): HouseId {
  for (const [house, toolkits] of Object.entries(HOUSE_TOOLKITS)) {
    if (toolkits.includes(toolkit)) return house as HouseId;
  }
  return 'investigate';
}

function computeHouseProgress(sessions: SessionSummary[]): Record<HouseId, { total: number; completed: number }> {
  const progress: Record<HouseId, { total: number; completed: number }> = {
    investigate: { total: 3, completed: 0 },
    innovate: { total: 3, completed: 0 },
    validate: { total: 3, completed: 0 },
    evaluate: { total: 3, completed: 0 },
  };
  const seen = new Set<string>();
  for (const session of sessions) {
    if (!seen.has(session.toolkit)) {
      seen.add(session.toolkit);
      const house = getHouseForToolkit(session.toolkit);
      progress[house].completed = Math.min(3, progress[house].completed + 1);
    }
  }
  return progress;
}

// Rule-based fallback when no API key is available
function rulesBasedOrchestration(
  sessions: SessionSummary[],
  houseProgress: Record<HouseId, { total: number; completed: number }>
): OrchestrationResponse {
  const usedToolkits = new Set(sessions.map(s => s.toolkit));
  const houses: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

  // Find the first incomplete house in order
  for (const house of houses) {
    const toolkits = HOUSE_TOOLKITS[house];
    const unusedInHouse = toolkits.find(t => !usedToolkits.has(t));
    if (unusedInHouse) {
      // Determine if we should suggest this house based on readiness
      const prevHouseIndex = houses.indexOf(house) - 1;
      const prevHouse = prevHouseIndex >= 0 ? houses[prevHouseIndex] : null;
      const prevHouseComplete = prevHouse ? houseProgress[prevHouse].completed >= 1 : true;

      if (prevHouseComplete || house === 'investigate') {
        const sessionsWithOutput = sessions.filter(s => s.hasOutput).length;
        return {
          nextHouse: house,
          nextToolkit: unusedInHouse,
          nextToolkitName: TOOLKIT_NAMES[unusedInHouse] || unusedInHouse,
          recommendation: `Run ${TOOLKIT_NAMES[unusedInHouse]} in the ${HOUSE_NAMES[house]} house`,
          reasoning: house === 'investigate'
            ? 'Start by building a clear picture of the problem before moving toward solutions.'
            : `You have ${sessionsWithOutput} session${sessionsWithOutput !== 1 ? 's' : ''} with output. The ${HOUSE_NAMES[house]} house is your next step.`,
          urgency: house === 'evaluate' ? 'high' : 'medium',
          houseProgress,
        };
      }
    }
  }

  // All toolkits used — recommend synthesis
  return {
    nextHouse: 'evaluate',
    nextToolkit: 'signal_checker',
    nextToolkitName: 'Signal Checker',
    recommendation: 'Run a final Signal Checker to confirm your evidence before committing',
    reasoning: 'You\'ve worked through all four houses. Use Signal Checker to pressure-test your conclusions before any major commitment.',
    urgency: 'high',
    houseProgress,
  };
}

async function callOrchestrationAPI(
  body: OrchestrationRequest,
  houseProgress: Record<HouseId, { total: number; completed: number }>
): Promise<OrchestrationResponse> {
  const { sessions, workspaceTitle } = body;

  const sessionsWithOutput = sessions.filter(s => s.hasOutput);
  const usedToolkits = new Set(sessions.map(s => s.toolkit));
  const houses: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

  // Build session context for Claude
  const sessionContext = sessionsWithOutput.map(s => {
    let ctx = `### ${s.toolkitName} (${HOUSE_NAMES[s.house]} house)`;
    if (s.sentenceOfTruth) ctx += `\nCore Finding: "${s.sentenceOfTruth}"`;
    if (s.insights && s.insights.length > 0) ctx += `\nKey Insights: ${s.insights.slice(0, 2).join(' | ')}`;
    if (s.necessaryMoves && s.necessaryMoves.length > 0) ctx += `\nNext Moves: ${s.necessaryMoves.slice(0, 2).join(' | ')}`;
    return ctx;
  }).join('\n\n');

  const houseStatusContext = houses.map(h => {
    const p = houseProgress[h];
    const unused = HOUSE_TOOLKITS[h].filter(t => !usedToolkits.has(t));
    return `${HOUSE_NAMES[h]}: ${p.completed}/${p.total} toolkits used. Available: ${unused.map(t => TOOLKIT_NAMES[t]).join(', ') || 'none'}`;
  }).join('\n');

  const systemPrompt = `You are FRESCO's orchestration intelligence. Your job is to analyse a workspace's thinking sessions and recommend the single highest-leverage next move.

You understand the Four Houses of thinking:
- INVESTIGATE: Build clarity on the problem. Toolkits: Insight Stack, Position Builder, Belief Mapper
- INNOVATE: Design solutions. Toolkits: Flow Board, Experiment Brief, Strategy Sketchbook  
- VALIDATE: Test assumptions. Toolkits: Experience Scorecard, Influence Map, Results Tracker
- EVALUATE: Commit decisively. Toolkits: Decision Matrix, Risk Radar, Signal Checker

Orchestration principles:
1. Don't just follow the linear sequence — look at what the sessions REVEAL about what's missing
2. If Investigate sessions show assumptions not yet challenged → go to Investigate first
3. If Innovate sessions show solutions with no validation → push to Validate
4. If the user has strong opinions but no evidence → push to Investigate
5. If there are clear solutions but no decision has been made → push to Evaluate
6. The Evaluate house is the decision-making house — recommend it when the user has enough clarity to commit

Respond ONLY with valid JSON in this exact format:
{
  "nextHouse": "investigate|innovate|validate|evaluate",
  "nextToolkit": "toolkit_id",
  "nextToolkitName": "Toolkit Display Name",
  "recommendation": "One sentence: what to do and why (direct, not generic)",
  "reasoning": "2-3 sentences explaining what the existing sessions reveal that makes this the right next move",
  "urgency": "high|medium|low"
}

Available toolkit IDs: insight_stack, pov_generator, mental_model_mapper, flow_board, experiment_brief, strategy_sketchbook, ux_scorecard, persuasion_canvas, performance_grid, decision_matrix, risk_radar, signal_checker`;

  const userMessage = `Workspace: "${workspaceTitle || 'Untitled'}"

House Progress:
${houseStatusContext}

Sessions with output:
${sessionContext || 'No sessions with AI output yet.'}

What is the highest-leverage next move for this workspace?`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  
  // Parse JSON from response
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

    // Always compute house progress from sessions
    const houseProgress = computeHouseProgress(body.sessions);

    // If no API key, use rules-based orchestration
    if (!ANTHROPIC_API_KEY) {
      const result = rulesBasedOrchestration(body.sessions, houseProgress);
      return NextResponse.json(result);
    }

    // If no sessions with output yet, use rules (save API call)
    const sessionsWithOutput = body.sessions.filter(s => s.hasOutput);
    if (sessionsWithOutput.length === 0) {
      const result = rulesBasedOrchestration(body.sessions, houseProgress);
      return NextResponse.json(result);
    }

    try {
      const result = await callOrchestrationAPI(body, houseProgress);
      return NextResponse.json(result);
    } catch (err) {
      console.error('Orchestration API error, falling back to rules:', err);
      const result = rulesBasedOrchestration(body.sessions, houseProgress);
      return NextResponse.json(result);
    }

  } catch (error) {
    console.error('Orchestrate route error:', error);
    return NextResponse.json({ error: 'Orchestration failed' }, { status: 500 });
  }
}
