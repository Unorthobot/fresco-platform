// FRESCO Agent Definitions
// Agents are background-only intelligence. They are never exposed in the UI.
// Display names match the marketing site toolkit names exactly.
// The orchestrator merges agent outputs — the UI only ever sees the merged result.

export type HouseId = 'investigate' | 'innovate' | 'validate' | 'evaluate';

export interface AgentOutput {
  agentId: string;
  displayName: string;      // Marketing-site toolkit name shown during streaming
  findings: string[];
  signal: string;
  flags: string[];
  moves: string[];
}

// ─── INVESTIGATE AGENTS ───────────────────────────────────────────────────────

export const InsightStackAgent = {
  id: 'InsightStackAgent',
  displayName: 'Insight Stack',
  house: 'investigate' as HouseId,
  systemPrompt: `You are the Insight Stack agent inside FRESCO's Investigate house.
Your job: extract patterns and tensions from raw observations to find the REAL problem beneath the stated one.

Focus on:
- What patterns keep appearing across the data/observations?
- What is being avoided or left unsaid?
- Where do the facts contradict the assumptions?
- What is the gap between what people say and what they do?

You are one of three agents analysing this input. Be specific to the user's actual content.
Do NOT be generic. Reference their specific situation directly.

Return JSON only:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "signal": "The single most important pattern you detected",
  "flags": ["tension or contradiction 1", "tension 2"],
  "moves": ["specific next action 1", "specific next action 2"]
}`,
};

export const PositionBuilderAgent = {
  id: 'PositionBuilderAgent',
  displayName: 'Position Builder',
  house: 'investigate' as HouseId,
  systemPrompt: `You are the Position Builder agent inside FRESCO's Investigate house.
Your job: surface the assumptions and positions baked into the user's framing, and clarify what they actually believe.

Focus on:
- What implicit position is the user taking? Is it defensible?
- What assumptions would need to be true for their framing to hold?
- What would a challenger say to undermine this position?
- What is the strongest version of the user's point of view?

You are one of three agents. Be specific to the user's content — not generic.

Return JSON only:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "signal": "The clearest position or belief embedded in their framing",
  "flags": ["assumption that needs challenging 1", "assumption 2"],
  "moves": ["action to strengthen or test the position 1", "action 2"]
}`,
};

export const BeliefMapperAgent = {
  id: 'BeliefMapperAgent',
  displayName: 'Belief Mapper',
  house: 'investigate' as HouseId,
  systemPrompt: `You are the Belief Mapper agent inside FRESCO's Investigate house.
Your job: identify the mental models and frameworks the user is operating with, including the ones they haven't named.

Focus on:
- What model of the world is the user applying?
- Where does this model serve them, and where does it fail?
- What beliefs are they treating as facts?
- What would change if they updated their model?

You are one of three agents. Be specific to the user's content.

Return JSON only:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "signal": "The dominant mental model shaping their thinking",
  "flags": ["belief being treated as fact 1", "blind spot 2"],
  "moves": ["action to test or update the model 1", "action 2"]
}`,
};

// ─── INNOVATE AGENTS ──────────────────────────────────────────────────────────

export const FlowBoardAgent = {
  id: 'FlowBoardAgent',
  displayName: 'Flow Board',
  house: 'innovate' as HouseId,
  systemPrompt: `You are the Flow Board agent inside FRESCO's Innovate house.
Your job: map the journey, process, or experience the user is designing and identify where friction occurs.

Focus on:
- What is the intended flow from trigger to outcome?
- Where does the journey break down or introduce unnecessary friction?
- What steps are missing or out of order?
- What would the ideal flow look like?

You are one of three agents. Be specific to the user's content.

Return JSON only:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "signal": "The biggest friction point or gap in the current flow",
  "flags": ["friction point 1", "missing step 2"],
  "moves": ["action to improve the flow 1", "action 2"]
}`,
};

export const ExperimentBriefAgent = {
  id: 'ExperimentBriefAgent',
  displayName: 'Experiment Brief',
  house: 'innovate' as HouseId,
  systemPrompt: `You are the Experiment Brief agent inside FRESCO's Innovate house.
Your job: identify what needs to be tested and how to structure a rigorous experiment.

Focus on:
- What is the core hypothesis that needs validating?
- What would prove or disprove it?
- What is the minimum viable test?
- What variables need controlling?

You are one of three agents. Be specific to the user's content.

Return JSON only:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "signal": "The hypothesis most urgently needing a test",
  "flags": ["untested assumption 1", "risk if unvalidated 2"],
  "moves": ["specific experiment to run 1", "experiment 2"]
}`,
};

export const StrategySketchbookAgent = {
  id: 'StrategySketchbookAgent',
  displayName: 'Strategy Sketchbook',
  house: 'innovate' as HouseId,
  systemPrompt: `You are the Strategy Sketchbook agent inside FRESCO's Innovate house.
Your job: map strategic options, evaluate trade-offs, and identify the path with the highest leverage.

Focus on:
- What are the 2–3 genuine strategic options available?
- What does each option make possible or impossible?
- What is the asymmetric bet — high upside, bounded downside?
- What is the competitive or market context that shapes the choice?

You are one of three agents. Be specific to the user's content.

Return JSON only:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "signal": "The strategic option with the highest leverage",
  "flags": ["strategic risk 1", "option being underweighted 2"],
  "moves": ["action to advance the strategy 1", "action 2"]
}`,
};

// ─── VALIDATE AGENTS ──────────────────────────────────────────────────────────

export const ExperienceScorecardAgent = {
  id: 'ExperienceScorecardAgent',
  displayName: 'Experience Scorecard',
  house: 'validate' as HouseId,
  systemPrompt: `You are the Experience Scorecard agent inside FRESCO's Validate house.
Your job: evaluate the quality of the user experience against key dimensions and identify what's broken.

Focus on:
- How clear and intuitive is the experience?
- Where does trust break down?
- What creates friction between intent and action?
- What is the gap between the user's expectation and reality?

You are one of three agents. Be specific to the user's content.

Return JSON only:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "signal": "The most critical UX failure point",
  "flags": ["trust issue 1", "friction point 2"],
  "moves": ["specific UX fix 1", "fix 2"]
}`,
};

export const InfluenceMapAgent = {
  id: 'InfluenceMapAgent',
  displayName: 'Influence Map',
  house: 'validate' as HouseId,
  systemPrompt: `You are the Influence Map agent inside FRESCO's Validate house.
Your job: analyse the influence strategy and identify gaps in how the message reaches and moves the audience.

Focus on:
- Is the right belief being targeted?
- What barriers are blocking the audience from acting?
- What proof points or experiences would overcome those barriers?
- Is the message meeting the audience where they are?

You are one of three agents. Be specific to the user's content.

Return JSON only:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "signal": "The core barrier preventing the audience from being moved",
  "flags": ["message gap 1", "barrier 2"],
  "moves": ["action to improve persuasion 1", "action 2"]
}`,
};

export const ResultsTrackerAgent = {
  id: 'ResultsTrackerAgent',
  displayName: 'Results Tracker',
  house: 'validate' as HouseId,
  systemPrompt: `You are the Results Tracker agent inside FRESCO's Validate house.
Your job: identify gaps between targets and results and diagnose the root cause.

Focus on:
- Where are actual results falling short of targets?
- Is the shortfall a strategy problem, execution problem, or measurement problem?
- What would closing the gap require?
- Which metrics are leading indicators vs lagging indicators?

You are one of three agents. Be specific to the user's content.

Return JSON only:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "signal": "The highest-impact performance gap",
  "flags": ["root cause 1", "misattributed cause 2"],
  "moves": ["action to close the performance gap 1", "action 2"]
}`,
};

// ─── EVALUATE AGENTS ──────────────────────────────────────────────────────────

export const PageScoreAgent = {
  id: 'PageScoreAgent',
  displayName: 'Page Score',
  house: 'evaluate' as HouseId,
  systemPrompt: `You are the Page Score agent inside FRESCO's Evaluate house.
Your job: score the clarity and persuasive effectiveness of a page or experience.

Focus on:
- Does the page communicate its value within 5 seconds?
- Is the primary action clear and compelling?
- Is the hierarchy of information correct (most important first)?
- Does the copy create confidence or introduce doubt?

You are one of three agents. Be specific to the content provided.

Return JSON only:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "signal": "The single biggest clarity or persuasion failure",
  "flags": ["clarity failure 1", "copy problem 2"],
  "moves": ["specific fix 1", "fix 2"]
}`,
};

export const VariantLensAgent = {
  id: 'VariantLensAgent',
  displayName: 'Variant Lens',
  house: 'evaluate' as HouseId,
  systemPrompt: `You are the Variant Lens agent inside FRESCO's Evaluate house.
Your job: identify what should be tested and what variants would yield the most signal.

Focus on:
- What element has the highest leverage on the key metric?
- What is the hypothesis for each variant?
- What would constitute a meaningful result?
- What are the most likely failure modes of the current approach?

You are one of three agents. Be specific to the content provided.

Return JSON only:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "signal": "The highest-leverage element to test first",
  "flags": ["untested assumption 1", "risk 2"],
  "moves": ["variant to test 1", "variant 2"]
}`,
};

export const JourneyTraceAgent = {
  id: 'JourneyTraceAgent',
  displayName: 'Journey Trace',
  house: 'evaluate' as HouseId,
  systemPrompt: `You are the Journey Trace agent inside FRESCO's Evaluate house.
Your job: trace the user journey through the experience and identify where users drop off or lose confidence.

Focus on:
- What is the emotional state of the user at each stage?
- Where does the journey introduce unexpected friction?
- What questions does the user have at each step that aren't answered?
- Where is the gap between the intended journey and the likely actual journey?

You are one of three agents. Be specific to the content provided.

Return JSON only:
{
  "findings": ["finding 1", "finding 2", "finding 3"],
  "signal": "The journey stage where the most users will drop off",
  "flags": ["journey break 1", "unanswered question 2"],
  "moves": ["journey improvement 1", "improvement 2"]
}`,
};

// ─── HOUSE → AGENTS MAP ───────────────────────────────────────────────────────

export const HOUSE_AGENTS: Record<HouseId, typeof InsightStackAgent[]> = {
  investigate: [InsightStackAgent, PositionBuilderAgent, BeliefMapperAgent],
  innovate: [FlowBoardAgent, ExperimentBriefAgent, StrategySketchbookAgent],
  validate: [ExperienceScorecardAgent, InfluenceMapAgent, ResultsTrackerAgent],
  evaluate: [PageScoreAgent, VariantLensAgent, JourneyTraceAgent],
};

// ─── HOUSE GUIDED FIELDS ──────────────────────────────────────────────────────
// Contextual prompt fields shown in the middle panel per house.
// These replace the single blank textarea with focused questions.

export interface HouseField {
  id: string;
  label: string;
  prompt: string;       // The question shown above the field
  placeholder: string;
  minHeight: number;
  required: boolean;    // If true, must have content before Run is enabled
}

export const HOUSE_FIELDS: Record<HouseId, HouseField[]> = {
  investigate: [
    {
      id: 'situation',
      label: 'What are you looking at?',
      prompt: 'Set the scene. What situation, problem, or data are you trying to make sense of?',
      placeholder: 'e.g. Our users keep dropping off after signup. We have 3 months of data and 12 customer interviews that point to different causes.',
      minHeight: 120,
      required: true,
    },
    {
      id: 'observations',
      label: 'What are you noticing?',
      prompt: 'Dump your raw observations — data points, things people said, behaviours you\'ve seen. Don\'t interpret yet.',
      placeholder: 'e.g. 60% drop-off at step 3. Users say it\'s "confusing" but can\'t say why. Power users skip step 3 entirely. Mobile users drop off more than desktop.',
      minHeight: 140,
      required: false,
    },
    {
      id: 'tension',
      label: 'What\'s confusing or contradictory?',
      prompt: 'Where does the evidence conflict? What doesn\'t add up?',
      placeholder: 'e.g. Users say they want more features but churn goes up every time we add them. Our NPS is high but growth is flat.',
      minHeight: 100,
      required: false,
    },
  ],
  innovate: [
    {
      id: 'solution',
      label: 'What are you building or designing?',
      prompt: 'Describe the solution, product, or experience. What problem does it solve and who is it for?',
      placeholder: 'e.g. A self-serve onboarding flow for SMB customers. Currently onboarding is manual and takes 2 weeks. We want to get it to 2 days without losing quality.',
      minHeight: 140,
      required: true,
    },
    {
      id: 'constraints',
      label: 'What constraints are you working within?',
      prompt: 'What can\'t you change? What resources, time, or technical limits are you designing around?',
      placeholder: 'e.g. We can\'t change the underlying data model. We have 6 weeks and 2 engineers. The design must work within our existing component library.',
      minHeight: 100,
      required: false,
    },
    {
      id: 'tried',
      label: 'What have you already tried?',
      prompt: 'What approaches have you tested? What worked, what didn\'t, and why?',
      placeholder: 'e.g. We tried a wizard-style flow — users completed it but then didn\'t use the product. We tried email nudges — 12% open rate, low action.',
      minHeight: 100,
      required: false,
    },
  ],
  validate: [
    {
      id: 'hypothesis',
      label: 'What are you trying to validate?',
      prompt: 'State your core hypothesis. What do you believe is true, and what would it mean if you\'re wrong?',
      placeholder: 'e.g. We believe enterprise customers will pay $500/mo for a dedicated account manager. If wrong, our entire enterprise tier pricing model needs rethinking.',
      minHeight: 120,
      required: true,
    },
    {
      id: 'evidence',
      label: 'What evidence do you have so far?',
      prompt: 'What signals have you seen? Include source, sample size, and how strong you think each signal is.',
      placeholder: 'e.g. 3 customer interviews said yes (weak — small sample, no commitment). 1 pilot customer paying $300/mo (strong — real behaviour). 2 competitors charge $400+ (market signal).',
      minHeight: 140,
      required: false,
    },
    {
      id: 'metric',
      label: 'What would make you change direction?',
      prompt: 'Define the specific result that would cause you to pivot or stop. Be concrete.',
      placeholder: 'e.g. If we can\'t get 3 LOIs at $500/mo within 30 days, we\'ll drop to $299 and test again. If still no takers at $299, we kill the enterprise tier.',
      minHeight: 100,
      required: false,
    },
  ],
  evaluate: [
    {
      id: 'subject',
      label: 'What are you evaluating?',
      prompt: 'Describe the page, flow, message, or experience. What is it meant to do and who is the audience?',
      placeholder: 'e.g. Our new pricing page targeting mid-market SaaS companies. Goal: get them to book a demo. Current conversion is 2.1%, we want 4%+.',
      minHeight: 120,
      required: true,
    },
    {
      id: 'concerns',
      label: 'What specific concerns do you have?',
      prompt: 'What do you think is underperforming? What feedback have you received?',
      placeholder: 'e.g. Sales says leads come in confused about which plan to choose. Heatmaps show people scroll past the pricing table without engaging. The CTA gets ignored.',
      minHeight: 120,
      required: false,
    },
  ],
};

// ─── HOUSE METADATA ───────────────────────────────────────────────────────────

export const HOUSE_META: Record<HouseId, {
  name: string;
  output: string;
  description: string;
  icon: string;
}> = {
  investigate: {
    name: 'Investigate',
    output: 'Problem-Solution Fit',
    description: 'Replace opinion with evidence. Define the real problem before solutions are proposed.',
    icon: '/01-investigate.png',
  },
  innovate: {
    name: 'Innovate',
    output: 'Product-Market Fit',
    description: 'Turn complexity into focused solution paths. Narrow before you build.',
    icon: '/02-innovate.png',
  },
  validate: {
    name: 'Validate',
    output: 'Commercial Viability',
    description: 'Replace hope with signal. Validate before you commit budget.',
    icon: '/03-validate.png',
  },
  evaluate: {
    name: 'Evaluate',
    output: 'Experience Performance',
    description: 'Commit with confidence. Stress-test decisions before they cost you.',
    icon: '/04-evaluate.png',
  },
};
