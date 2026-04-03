// FRESCO Orchestrator
// Sequential agent execution per house.
// Each agent receives prior agents' outputs as context.
// Synthesis layer merges all outputs into a single HouseResult.
// Routing engine determines next house based on what was found.

import type { HouseId } from '@/lib/agents';

// ─── Agent data contract ─────────────────────────────────────────────────────

export interface AgentOutput {
  agentId: string;
  displayName: string;
  summary: string;                  // 1-sentence summary of what this agent found
  key_findings: string[];           // 2-4 specific findings
  signal: string;                   // Single most important signal (for streaming display)
  confidence: 'high' | 'medium' | 'low';
  risks: string[];                  // Risks or flags this agent identified
  recommendations: string[];        // Agent-specific recommendations
  structured_artifact?: string;     // Optional: named model, framework, or structure
}

// ─── House result ─────────────────────────────────────────────────────────────

export interface HouseResult {
  house: HouseId;
  // Core judgement — house-specific fit label
  fitLabel: string;                 // e.g. "Problem–Solution Fit"
  fitStrength: 'Strong' | 'Weak' | 'Undecided';
  // Legacy verdict for UI colour coding
  verdict: 'GO' | 'PIVOT' | 'INVESTIGATE FURTHER' | 'STOP';
  verdictRationale: string;
  // Outputs
  povStatement?: string;        // Investigate only: User/Context/Need/Insight POV
  sentenceOfTruth: string;
  keyIssues: string[];
  necessaryMoves: string[];
  // Routing
  suggestedNextHouse: HouseId | null;
  suggestedNextHouseReason: string;
  // Meta
  outputLabel: string;
}

// ─── House configuration ──────────────────────────────────────────────────────

export const HOUSE_FIT_LABELS: Record<HouseId, string> = {
  investigate: 'Problem–Solution Fit',
  innovate: 'Product–Market Fit',
  validate: 'Commercial Viability',
  evaluate: 'Performance Reality',
};

export const HOUSE_OUTPUT_LABELS: Record<HouseId, string> = {
  investigate: 'Problem–Solution Fit',
  innovate: 'Product–Market Fit',
  validate: 'Commercial and Market Viability',
  evaluate: 'Performance Reality',
};

// Sequential agent order per house (from spec)
// Investigate: Insight Stack → Belief Mapper → Position Builder
// Innovate:    Flow Board → Strategy Sketchbook → Experiment Brief
// Validate:    Experience Scorecard → Influence Map → Results Tracker
// Evaluate:    Page Intelligence → Comparison → Journey Intelligence
export const AGENT_SEQUENCE: Record<HouseId, string[]> = {
  investigate: ['InsightStackAgent', 'BeliefMapperAgent', 'PositionBuilderAgent'],
  innovate:    ['FlowBoardAgent', 'StrategySketchbookAgent', 'ExperimentBriefAgent'],
  validate:    ['ExperienceScorecardAgent', 'InfluenceMapAgent', 'ResultsTrackerAgent'],
  evaluate:    ['PageScorecardAgent', 'VariantLensAgent', 'JourneyTraceAgent'],
};

// ─── Cross-house routing logic ────────────────────────────────────────────────

export interface RoutingDecision {
  nextHouse: HouseId | null;
  reason: string;
}

export function determineNextHouse(
  house: HouseId,
  fitStrength: 'Strong' | 'Weak' | 'Undecided',
  verdict: string,
  keyIssues: string[]
): RoutingDecision {
  // The spec: houses are a loop, not a line
  // Evaluate can route back to any house depending on findings
  
  const issuesText = keyIssues.join(' ').toLowerCase();

  if (house === 'investigate') {
    return fitStrength === 'Strong'
      ? { nextHouse: 'innovate', reason: 'Problem is well-defined. Move to Innovate to shape the right solution path.' }
      : { nextHouse: 'investigate', reason: 'The problem needs more clarity before solutioning. Run another Investigate cycle with sharper input.' };
  }

  if (house === 'innovate') {
    return fitStrength === 'Strong'
      ? { nextHouse: 'validate', reason: 'A promising solution path exists. Move to Validate to test viability before committing.' }
      : { nextHouse: 'investigate', reason: 'The solution isn\'t clear yet — this often means the problem definition needs sharpening. Return to Investigate.' };
  }

  if (house === 'validate') {
    return fitStrength === 'Strong'
      ? { nextHouse: 'evaluate', reason: 'Viability is confirmed. Move to Evaluate to assess the live experience.' }
      : verdict === 'PIVOT'
      ? { nextHouse: 'innovate', reason: 'The concept needs rethinking. Return to Innovate to explore alternative solution paths.' }
      : { nextHouse: 'investigate', reason: 'Viability concerns suggest the problem itself may be misunderstood. Return to Investigate.' };
  }

  if (house === 'evaluate') {
    // Evaluate can loop back to any house
    const needsRedesign = issuesText.includes('design') || issuesText.includes('flow') || issuesText.includes('ux') || issuesText.includes('journey');
    const needsStrategy = issuesText.includes('positioning') || issuesText.includes('market') || issuesText.includes('commercial') || issuesText.includes('viability');
    const needsUnderstanding = issuesText.includes('problem') || issuesText.includes('assumption') || issuesText.includes('misunderstand');

    if (needsUnderstanding) return { nextHouse: 'investigate', reason: 'Performance issues reveal the original problem may have been misunderstood. Return to Investigate.' };
    if (needsStrategy) return { nextHouse: 'validate', reason: 'The issue is commercial or market logic, not design. Return to Validate.' };
    if (needsRedesign) return { nextHouse: 'innovate', reason: 'Performance reveals the solution needs redesign. Return to Innovate.' };
    return fitStrength === 'Strong'
      ? { nextHouse: null, reason: 'Performance is strong. The loop is complete.' }
      : { nextHouse: 'innovate', reason: 'Performance gaps point to solution-level issues. Return to Innovate.' };
  }

  return { nextHouse: null, reason: '' };
}

// ─── Merge prompt ──────────────────────────────────────────────────────────────

export function buildMergePrompt(house: HouseId, agentOutputs: AgentOutput[], userInput: string): string {
  const houseName = house.charAt(0).toUpperCase() + house.slice(1);
  const fitLabel = HOUSE_FIT_LABELS[house];

  const agentSummaries = agentOutputs.map((a, i) => `### Agent ${i + 1}: ${a.displayName}
Summary: ${a.summary}
Key findings: ${a.key_findings.join(' | ')}
Confidence: ${a.confidence}
Risks: ${a.risks.join(' | ')}
Recommendations: ${a.recommendations.join(' | ')}
${a.structured_artifact ? `Structured artifact: ${a.structured_artifact}` : ''}`).join('\n\n');

  const investigateExtra = house === 'investigate' ? `
- POV_STATEMENT (Investigate only): A single polished sentence structured as: "[User] needs [what they actually need] because [the non-obvious insight that reframes the problem]." This is the Position Builder's UCNI framework collapsed into one sentence. It should feel like the user's own position, articulated precisely. Not a summary — a stance.
` : '';

  const investigateJsonField = house === 'investigate' ? `,
  "povStatement": "For [specific user]: they need [real need], because [non-obvious insight]"` : '';

  return `You are FRESCO's ${houseName} synthesis engine. Three specialist agents have run sequentially on the user's input. Each one built on the previous agent's findings.

Your job: synthesise their combined outputs into a single integrated result.

USER INPUT:
${userInput}

SEQUENTIAL AGENT OUTPUTS (in execution order):
${agentSummaries}

Produce the synthesis. Rules:
- FIT_STRENGTH must be: "Strong", "Weak", or "Undecided"
  - Strong: clear signal, confident direction
  - Weak: significant concerns, needs work before proceeding
  - Undecided: mixed signals, more information needed
- VERDICT must be: "GO", "PIVOT", "INVESTIGATE FURTHER", or "STOP"
  GO = proceed with confidence | PIVOT = better direction exists | INVESTIGATE FURTHER = not enough signal | STOP = wrong path
- SENTENCE OF TRUTH: ONE sharp statement — the thing the user sensed but hadn't articulated. Not a summary. An insight.
- KEY ISSUES: 3–5 consolidated issues. No duplication. Specific to their situation.
- NECESSARY MOVES: 3–5 concrete prioritised actions. Not generic.
- VERDICT RATIONALE: 1–2 sentences. Reference their specific situation.${investigateExtra}

Respond ONLY with valid JSON:
{
  "fitStrength": "Strong | Weak | Undecided",
  "verdict": "GO | PIVOT | INVESTIGATE FURTHER | STOP",
  "verdictRationale": "1-2 sentences",
  "sentenceOfTruth": "Single sharp insight",
  "keyIssues": ["issue 1", "issue 2", "issue 3"],
  "necessaryMoves": ["move 1", "move 2", "move 3"]${investigateJsonField}
}`;
}

// ─── Build final HouseResult ──────────────────────────────────────────────────

export function buildHouseResult(
  house: HouseId,
  mergeResponse: {
    fitStrength: 'Strong' | 'Weak' | 'Undecided';
    verdict: string;
    verdictRationale: string;
    sentenceOfTruth: string;
    keyIssues: string[];
    necessaryMoves: string[];
    povStatement?: string;
  }
): HouseResult {
  const fitStrength = mergeResponse.fitStrength || 'Undecided';
  const verdict = (mergeResponse.verdict as HouseResult['verdict']) || 'INVESTIGATE FURTHER';
  const routing = determineNextHouse(house, fitStrength, verdict, mergeResponse.keyIssues || []);

  return {
    house,
    fitLabel: HOUSE_FIT_LABELS[house],
    fitStrength,
    verdict,
    verdictRationale: mergeResponse.verdictRationale,
    povStatement: mergeResponse.povStatement || undefined,
    sentenceOfTruth: mergeResponse.sentenceOfTruth,
    keyIssues: (mergeResponse.keyIssues || []).slice(0, 5),
    necessaryMoves: (mergeResponse.necessaryMoves || []).slice(0, 5),
    suggestedNextHouse: routing.nextHouse,
    suggestedNextHouseReason: routing.reason,
    outputLabel: HOUSE_OUTPUT_LABELS[house],
  };
}

// ─── Local merge fallback ─────────────────────────────────────────────────────

export function mergeAgentOutputsLocally(house: HouseId, agentOutputs: AgentOutput[]): HouseResult {
  const allSignals = agentOutputs.map(a => a.signal).filter(Boolean);
  const allIssues = agentOutputs.flatMap(a => a.risks);
  const allMoves = agentOutputs.flatMap(a => a.recommendations);

  const dedup = (arr: string[], max: number) => {
    const seen = new Set<string>();
    return arr.filter(item => {
      const key = item.toLowerCase().slice(0, 30);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, max);
  };

  const routing = determineNextHouse(house, 'Undecided', 'INVESTIGATE FURTHER', allIssues);

  return {
    house,
    fitLabel: HOUSE_FIT_LABELS[house],
    fitStrength: 'Undecided',
    verdict: 'INVESTIGATE FURTHER',
    verdictRationale: 'Multiple perspectives analysed. Review key issues and necessary moves before committing.',
    sentenceOfTruth: allSignals[0] || 'The real insight lies in the tension between what you know and what you\'re assuming.',
    keyIssues: dedup(allIssues, 5),
    necessaryMoves: dedup(allMoves, 5),
    suggestedNextHouse: routing.nextHouse,
    suggestedNextHouseReason: routing.reason,
    outputLabel: HOUSE_OUTPUT_LABELS[house],
  };
}
