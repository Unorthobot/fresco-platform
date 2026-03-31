// FRESCO Orchestrator
// Receives outputs from all agents in a house.
// Merges them into a single structured result.
// This is the only thing the UI ever sees — agent IDs are never surfaced.

import type { HouseId, AgentOutput } from '@/lib/agents';

export interface HouseResult {
  house: HouseId;
  verdict: string;                // GO / PIVOT / INVESTIGATE FURTHER / STOP
  verdictRationale: string;       // 1–2 sentence explanation of the verdict
  sentenceOfTruth: string;        // Single most important insight across all agents
  keyIssues: string[];            // 3–5 consolidated issues (deduped across agents)
  necessaryMoves: string[];       // 3–5 prioritised actions (deduped across agents)
  suggestedNextHouse: HouseId | null;
  suggestedNextHouseReason: string;
  outputLabel: string;            // e.g. "Problem-Solution Fit"
}

const HOUSE_OUTPUT_LABELS: Record<HouseId, string> = {
  investigate: 'Problem-Solution Fit',
  innovate: 'Product-Market Fit',
  validate: 'Commercial Viability',
  evaluate: 'Experience Performance',
};

const NEXT_HOUSE: Record<HouseId, HouseId | null> = {
  investigate: 'innovate',
  innovate: 'validate',
  validate: 'evaluate',
  evaluate: null,
};

const NEXT_HOUSE_REASONS: Record<HouseId, string> = {
  investigate: 'You have a clearer problem definition. Move to Innovate to design solutions.',
  innovate: 'You have solution paths. Move to Validate to test them before committing.',
  validate: 'You have validation signals. Move to Evaluate to stress-test the experience.',
  evaluate: 'Full cycle complete.',
};

// Merge system prompt — takes all agent outputs and synthesises a final verdict
export function buildMergePrompt(house: HouseId, agentOutputs: AgentOutput[], userInput: string): string {
  const houseName = house.charAt(0).toUpperCase() + house.slice(1);
  const outputLabel = HOUSE_OUTPUT_LABELS[house];

  const agentSummaries = agentOutputs.map(a => {
    return `### ${a.agentId}
Signal: ${a.signal}
Findings: ${a.findings.join(' | ')}
Flags: ${a.flags.join(' | ')}
Moves: ${a.moves.join(' | ')}`;
  }).join('\n\n');

  return `You are FRESCO's ${houseName} orchestrator. Three specialist agents have analysed the user's input from different angles.
Your job: synthesise their outputs into a single, honest, actionable result for the ${outputLabel} phase.

USER INPUT:
${userInput}

AGENT OUTPUTS:
${agentSummaries}

Synthesise these into a verdict. Rules:
- VERDICT must be one of: "GO", "PIVOT", "INVESTIGATE FURTHER", or "STOP"
  - GO: the evidence supports moving forward with confidence
  - PIVOT: there's a better direction — name it
  - INVESTIGATE FURTHER: not enough signal yet to commit
  - STOP: the evidence strongly suggests this path is wrong
- SENTENCE OF TRUTH: ONE powerful statement that captures what is most true about this situation — the thing the user sensed but hadn't articulated. Make it feel like an "aha moment".
- KEY ISSUES: 3–5 consolidated issues from across the agents. Deduplicate. Keep the most important. Be specific to the user's actual content.
- NECESSARY MOVES: 3–5 concrete, specific actions the user should take. Prioritised. Not generic.
- VERDICT RATIONALE: 1–2 sentences explaining why this verdict — reference their specific situation.

Respond ONLY with valid JSON:
{
  "verdict": "GO | PIVOT | INVESTIGATE FURTHER | STOP",
  "verdictRationale": "1-2 sentences specific to their situation",
  "sentenceOfTruth": "Single powerful statement",
  "keyIssues": ["issue 1", "issue 2", "issue 3"],
  "necessaryMoves": ["move 1", "move 2", "move 3"]
}`;
}

// Client-side merge fallback — used when API call fails
export function mergeAgentOutputsLocally(
  house: HouseId,
  agentOutputs: AgentOutput[]
): HouseResult {
  // Collect all signals, findings, flags, moves
  const allSignals = agentOutputs.map(a => a.signal).filter(Boolean);
  const allFindings = agentOutputs.flatMap(a => a.findings);
  const allFlags = agentOutputs.flatMap(a => a.flags);
  const allMoves = agentOutputs.flatMap(a => a.moves);

  // Deduplicate by taking first occurrence of similar items (simple approach)
  const dedup = (arr: string[], max: number) => {
    const seen = new Set<string>();
    return arr.filter(item => {
      const key = item.toLowerCase().slice(0, 30);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, max);
  };

  return {
    house,
    verdict: 'INVESTIGATE FURTHER',
    verdictRationale: 'Multiple perspectives have been analysed. Review the key issues and necessary moves before committing.',
    sentenceOfTruth: allSignals[0] || 'The real insight is in the tension between what you know and what you\'re assuming.',
    keyIssues: dedup(allFlags, 5),
    necessaryMoves: dedup(allMoves, 5),
    suggestedNextHouse: NEXT_HOUSE[house],
    suggestedNextHouseReason: NEXT_HOUSE_REASONS[house],
    outputLabel: HOUSE_OUTPUT_LABELS[house],
  };
}

// Build final HouseResult from the Claude merge response
export function buildHouseResult(
  house: HouseId,
  mergeResponse: {
    verdict: string;
    verdictRationale: string;
    sentenceOfTruth: string;
    keyIssues: string[];
    necessaryMoves: string[];
  }
): HouseResult {
  return {
    house,
    verdict: mergeResponse.verdict,
    verdictRationale: mergeResponse.verdictRationale,
    sentenceOfTruth: mergeResponse.sentenceOfTruth,
    keyIssues: mergeResponse.keyIssues.slice(0, 5),
    necessaryMoves: mergeResponse.necessaryMoves.slice(0, 5),
    suggestedNextHouse: NEXT_HOUSE[house],
    suggestedNextHouseReason: NEXT_HOUSE_REASONS[house],
    outputLabel: HOUSE_OUTPUT_LABELS[house],
  };
}
