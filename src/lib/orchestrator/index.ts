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
  fitStrength: 'Strong' | 'Shaky' | 'Mixed';
  // Verdict
  verdict: 'GO' | 'PIVOT' | 'INVESTIGATE FURTHER' | 'STOP';
  verdictRationale: string;
  // Core outputs
  povStatement?: string;        // Investigate only
  sentenceOfTruth: string;
  keyIssues: string[];
  necessaryMoves: string[];
  // Systems thinking outputs — house-specific
  systemsOutput?: {
    // Investigate: Iceberg + Current State Simulation
    icebergLevels?: { event: string; pattern: string; structure: string; mentalModel: string };
    currentStateSimulation?: string;
    systemTruth?: string;
    // Innovate: Leverage Map + Intervention Forecast
    leverageMap?: { option: string; leverageLevel: string; impact: string }[];
    interventionForecast?: { immediate: string; delayed: string; risk: string };
    // Validate: Funnel Simulation + Confidence Range
    funnelSimulation?: { expected: string; bestCase: string; worstCase: string };
    influenceMap?: { barrier: string; lever: string; proofRequired: string };
    // Evaluate: Evolution Projection + Learning
    evolutionProjection?: string;
    doublLoopLearning?: string;
    kpiSystemMap?: string;
    // Cross-house: System Archetype (all houses)
    archetype?: {
      name: string;        // e.g. "Fixes that Fail", "Shifting the Burden"
      description: string; // Why this archetype applies to THIS situation
      loop: string;        // The specific reinforcing/balancing loop in plain English
      escape: string;      // How to break out of this archetype
    };
    // Cross-house: Behavior Over Time
    behaviorOverTime?: {
      variable: string;
      unit: string;
      dataPoints: { label: string; value: number }[];
      trend: 'rising' | 'falling' | 'oscillating' | 'plateauing' | 'accelerating';
      projection?: { label: string; value: number }[];
    }[];
    // Cross-house: Scenario Simulation model
    scenarioModel?: {
      outcomeVariable: string;   // What we're trying to improve, e.g. "Conversion rate"
      outcomeUnit: string;       // e.g. "%"
      baselineValue: number;     // Current value
      variables: {
        name: string;            // e.g. "Trust signals"
        unit: string;
        currentValue: number;
        minValue: number;
        maxValue: number;
        sensitivityScore: number; // 0-10: how much this moves the outcome
        direction: 'positive' | 'negative'; // does increasing this help or hurt?
      }[];
    };
    // Cross-house: Stock & Flow
    stockFlow?: {
      stocks: { name: string; value: string; description: string }[];
      inflows: { name: string; rate: string; from: string; to: string }[];
      outflows: { name: string; rate: string; from: string; to: string }[];
      keyConstraint: string; // The main bottleneck
    };
    // Cross-house: Causal Loop Diagram
    causalLoop?: {
      nodes: { id: string; label: string }[];
      edges: { from: string; to: string; polarity: '+' | '-'; label?: string }[];
      dominantLoop: string; // Description of the most important loop
      loopType: 'reinforcing' | 'balancing' | 'both';
    };
    // Cross-house: Sensitivity Analysis
    sensitivityAnalysis?: {
      outcomeVariable: string;
      variables: { name: string; impact: number; direction: 'positive' | 'negative'; note: string }[];
    };
    // Cross-house: Input → Process → Output map
    ipoMap?: {
      inputs: { label: string; note: string }[];
      processes: { label: string; note: string }[];
      outputs: { label: string; note: string }[];
      bottleneck?: string; // Where the system loses most value
    };
  };
  // Routing
  suggestedNextHouse: HouseId | null;
  suggestedNextHouseReason: string;
  // Meta
  outputLabel: string;
}

// ─── House configuration ──────────────────────────────────────────────────────

export const HOUSE_FIT_LABELS: Record<HouseId, string> = {
  investigate: 'Is the problem real?',
  innovate: 'Will people want this?',
  validate: 'Will it sell?',
  evaluate: 'How is it actually doing?',
};

export const HOUSE_OUTPUT_LABELS: Record<HouseId, string> = {
  investigate: 'Is the problem real?',
  innovate: 'Will people want this?',
  validate: 'Will it sell?',
  evaluate: 'How is it actually doing?',
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
  fitStrength: 'Strong' | 'Shaky' | 'Mixed',
  verdict: string,
  keyIssues: string[]
): RoutingDecision {
  // The spec: houses are a loop, not a line
  // Evaluate can route back to any house depending on findings
  
  const issuesText = keyIssues.join(' ').toLowerCase();

  if (house === 'investigate') {
    return fitStrength === 'Strong'
      ? { nextHouse: 'innovate', reason: 'Good. Now figure out the right solution — move to Innovate.' }
      : { nextHouse: 'investigate', reason: 'The problem still isn\'t clear enough. Run Investigate again with sharper input.' };
  }

  if (house === 'innovate') {
    return fitStrength === 'Strong'
      ? { nextHouse: 'validate', reason: 'You have a solid direction. Now test if it will actually work — move to Validate.' }
      : { nextHouse: 'investigate', reason: 'The solution isn\'t clear yet. Go back to Investigate — the problem definition probably needs work.' };
  }

  if (house === 'validate') {
    return fitStrength === 'Strong'
      ? { nextHouse: 'evaluate', reason: 'It should sell. Now ship it and see how it actually performs — move to Evaluate.' }
      : verdict === 'PIVOT'
      ? { nextHouse: 'innovate', reason: 'This direction isn\'t working. Go back to Innovate and explore other options.' }
      : { nextHouse: 'investigate', reason: 'Something\'s off at a deeper level. Go back to Investigate — the original problem may be wrong.' };
  }

  if (house === 'evaluate') {
    // Evaluate can loop back to any house
    const needsRedesign = issuesText.includes('design') || issuesText.includes('flow') || issuesText.includes('ux') || issuesText.includes('journey');
    const needsStrategy = issuesText.includes('positioning') || issuesText.includes('market') || issuesText.includes('commercial') || issuesText.includes('viability');
    const needsUnderstanding = issuesText.includes('problem') || issuesText.includes('assumption') || issuesText.includes('misunderstand');

    if (needsUnderstanding) return { nextHouse: 'investigate', reason: 'The performance issues suggest you were solving the wrong problem. Go back to Investigate.' };
    if (needsStrategy) return { nextHouse: 'validate', reason: 'This is a commercial problem, not a design one. Go back to Validate.' };
    if (needsRedesign) return { nextHouse: 'innovate', reason: 'The solution needs rethinking. Go back to Innovate.' };
    return fitStrength === 'Strong'
      ? { nextHouse: null, reason: 'Strong performance. The loop is complete.' }
      : { nextHouse: 'innovate', reason: 'Something in the solution isn\'t working. Go back to Innovate.' };
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

  const ARCHETYPE_SHAPE = '"archetype": { "name": "Name of the system archetype (Fixes that Fail | Shifting the Burden | Limits to Growth | Eroding Goals | Escalation | Success to the Successful | Tragedy of the Commons | Accidental Adversaries — pick the best fit or null if none clearly applies)", "description": "1-2 sentences: why this archetype applies to THIS specific situation", "loop": "The specific loop in plain English — e.g. the quick fix creates a side effect that makes the original problem worse", "escape": "How to break out of this archetype — one concrete action" }';

  const BOTG_SHAPE = '"behaviorOverTime": [{ "variable": "Name of key variable", "unit": "unit of measurement", "dataPoints": [{ "label": "time label e.g. Month 1", "value": number }], "trend": "rising|falling|oscillating|plateauing|accelerating", "projection": [{ "label": "projected label", "value": number }] }]';

  const SCENARIO_SHAPE = '"scenarioModel": { "outcomeVariable": "What we are trying to improve", "outcomeUnit": "%", "baselineValue": number, "variables": [{ "name": "variable name", "unit": "unit", "currentValue": number, "minValue": number, "maxValue": number, "sensitivityScore": number_0_to_10, "direction": "positive|negative" }] }';

  const STOCK_FLOW_SHAPE = '"stockFlow": { "stocks": [{ "name": "stock name", "value": "current value", "description": "what accumulates" }], "inflows": [{ "name": "inflow name", "rate": "rate description", "from": "source", "to": "stock name" }], "outflows": [{ "name": "outflow name", "rate": "rate description", "from": "stock name", "to": "destination" }], "keyConstraint": "The main bottleneck limiting the system" }';

  const CAUSAL_LOOP_SHAPE = '"causalLoop": { "nodes": [{ "id": "n1", "label": "Node name" }], "edges": [{ "from": "n1", "to": "n2", "polarity": "+|-", "label": "optional label" }], "dominantLoop": "Description of the most important loop in plain English", "loopType": "reinforcing|balancing|both" }';

  const SENSITIVITY_SHAPE = '"sensitivityAnalysis": { "outcomeVariable": "What changes", "variables": [{ "name": "variable", "impact": number_0_to_10, "direction": "positive|negative", "note": "why this matters" }] }';

  const IPO_SHAPE = '"ipoMap": { "inputs": [{ "label": "input name", "note": "what it contributes" }], "processes": [{ "label": "process name", "note": "what it transforms" }], "outputs": [{ "label": "output name", "note": "what is produced" }], "bottleneck": "Where the system loses most value" }';

  const SYSTEMS_OUTPUT_SHAPES: Record<string, string> = {
    investigate: '"icebergLevels": { "event": "visible symptom in 1 sentence", "pattern": "recurring trend in 1 sentence", "structure": "system element producing the pattern", "mentalModel": "belief keeping the system this way" }, "currentStateSimulation": "If nothing changes — one sentence", "systemTruth": "The uncomfortable truth — one sentence", ' + ARCHETYPE_SHAPE + ', ' + BOTG_SHAPE + ', ' + CAUSAL_LOOP_SHAPE + ', ' + IPO_SHAPE + ', ' + SENSITIVITY_SHAPE,
    innovate: '"leverageMap": [{ "option": "Option name", "leverageLevel": "parameters|feedback|information|rules|goals|paradigms", "impact": "what shifts" }], "interventionForecast": { "immediate": "what changes within weeks", "delayed": "what changes over months", "risk": "unintended consequence to watch for" }, ' + ARCHETYPE_SHAPE + ', ' + BOTG_SHAPE + ', ' + STOCK_FLOW_SHAPE + ', ' + CAUSAL_LOOP_SHAPE + ', ' + SCENARIO_SHAPE + ', ' + IPO_SHAPE,
    validate: '"funnelSimulation": { "expected": "X% conversion", "bestCase": "Y% if top fix", "worstCase": "Z% if barriers stronger" }, "influenceMap": { "barrier": "the real barrier", "lever": "what overcomes it", "proofRequired": "what proof specifically" }, ' + ARCHETYPE_SHAPE + ', ' + BOTG_SHAPE + ', ' + SCENARIO_SHAPE + ', ' + SENSITIVITY_SHAPE + ', ' + STOCK_FLOW_SHAPE + ', ' + IPO_SHAPE,
    evaluate: '"evolutionProjection": "If current trends continue, in 3 months: one sentence", "doublLoopLearning": "Are we solving the right problem? one sentence", "kpiSystemMap": "What actually drives the outcome metric", ' + ARCHETYPE_SHAPE + ', ' + BOTG_SHAPE + ', ' + SCENARIO_SHAPE + ', ' + SENSITIVITY_SHAPE + ', ' + CAUSAL_LOOP_SHAPE + ', ' + STOCK_FLOW_SHAPE + ', ' + IPO_SHAPE,
  };
  const systemsOutputShape = SYSTEMS_OUTPUT_SHAPES[house] || '"notes": ""';

  return `You are FRESCO's ${houseName} synthesis engine. Three specialist agents have run sequentially on the user's input. Each one built on the previous agent's findings.

Your job: synthesise their combined outputs into a single integrated result.

USER INPUT:
${userInput}

SEQUENTIAL AGENT OUTPUTS (in execution order):
${agentSummaries}

Produce the synthesis. Rules:
- FIT_STRENGTH and VERDICT are linked — they must be consistent:
  - Strong → GO (clear signal, proceed with confidence)
  - Shaky → PIVOT or STOP (significant concerns; PIVOT if a better path exists, STOP if the direction is fundamentally wrong)
  - Mixed → INVESTIGATE FURTHER (mixed signals, more information needed)
  - Never combine Strong with STOP, PIVOT, or INVESTIGATE FURTHER
  - Never combine Shaky with GO
- SENTENCE OF TRUTH: ONE sharp statement — the thing the user sensed but hadn't articulated. Not a summary. An insight.
- KEY ISSUES: 3–5 consolidated issues. No duplication. Specific to their situation.
- NECESSARY MOVES: 3–5 concrete prioritised actions. Not generic.
- VERDICT RATIONALE: 1–2 sentences. Reference their specific situation.
- SYSTEMS OUTPUT: Extract structured data from agent artifacts. Fill in the systemsOutput fields using what the agents actually found. Do not leave fields as "..." — put real content from the analysis.${investigateExtra}

Also extract the SYSTEMS THINKING outputs from the agent structured_artifacts. The agents have embedded frameworks in their outputs — surface them as structured data.

Respond ONLY with valid JSON:
{
  "fitStrength": "Strong | Shaky | Mixed",
  "verdict": "GO | PIVOT | INVESTIGATE FURTHER | STOP",
  "verdictRationale": "1-2 sentences directly answering whether ${houseName} fit exists",
  "sentenceOfTruth": "The thing they sensed but hadn't articulated — the uncomfortable truth",
  "keyIssues": ["specific issue 1", "issue 2", "issue 3"],
  "necessaryMoves": ["highest-impact action 1", "action 2", "action 3"],
  "systemsOutput": {
    ${systemsOutputShape}
  }${investigateJsonField}
}`;
}

// ─── Build final HouseResult ──────────────────────────────────────────────────

export function buildHouseResult(
  house: HouseId,
  mergeResponse: {
    fitStrength: 'Strong' | 'Shaky' | 'Mixed';
    verdict: string;
    verdictRationale: string;
    sentenceOfTruth: string;
    keyIssues: string[];
    necessaryMoves: string[];
    povStatement?: string;
    systemsOutput?: Record<string, any>;
  }
): HouseResult {
  const fitStrength = mergeResponse.fitStrength || 'Mixed';
  const rawVerdict = (mergeResponse.verdict as HouseResult['verdict']) || 'INVESTIGATE FURTHER';

  // Enforce consistency — fitStrength and verdict must not contradict
  const verdict: HouseResult['verdict'] = (() => {
    if (fitStrength === 'Strong' && rawVerdict !== 'GO') return 'GO';
    if (fitStrength === 'Shaky' && rawVerdict === 'GO') return 'PIVOT';
    if (fitStrength === 'Mixed' && rawVerdict === 'GO') return 'INVESTIGATE FURTHER';
    return rawVerdict;
  })();

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
    systemsOutput: (mergeResponse as any).systemsOutput || undefined,
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

  const routing = determineNextHouse(house, 'Mixed', 'INVESTIGATE FURTHER', allIssues);

  return {
    house,
    fitLabel: HOUSE_FIT_LABELS[house],
    fitStrength: 'Mixed',
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
