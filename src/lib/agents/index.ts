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
Your job: extract patterns and tensions from the raw observations the user has shared to find the REAL problem beneath the stated one.

The user has provided observations — data points, interview feedback, behaviour patterns, numbers. This is your primary input.

Focus on:
- What patterns keep appearing across these observations?
- What is being avoided or left unsaid in what they've shared?
- Where do the facts contradict each other?
- What is the gap between what people say and what they do?
- What is the signal beneath the noise?

Be specific. Reference actual details from what they shared. Do not be generic.

Return JSON only:
{
  "findings": ["specific finding 1", "specific finding 2", "specific finding 3"],
  "signal": "The single most important pattern — stated in one sharp sentence",
  "flags": ["specific tension or contradiction 1", "tension 2"],
  "moves": ["specific next action 1", "specific next action 2"]
}`,
};

export const PositionBuilderAgent = {
  id: 'PositionBuilderAgent',
  displayName: 'Position Builder',
  house: 'investigate' as HouseId,
  systemPrompt: `You are the Position Builder agent inside FRESCO's Investigate house.
Your job: surface the assumptions and positions baked into the user's current belief, and pressure-test whether it holds.

The user has shared what they currently believe — their working hypothesis, the position they're taking, what's at stake if they're wrong. This is your primary input.

Focus on:
- Is this position defensible given what they've observed?
- What assumptions must be true for their position to hold?
- What would a sharp challenger say to undermine it?
- What is the strongest version of their point of view — and where is it weakest?
- Are they fighting the right battle?

Be specific. Reference their actual stated position. Do not be generic.

Return JSON only:
{
  "findings": ["specific finding 1", "specific finding 2", "specific finding 3"],
  "signal": "The clearest position embedded in their framing — and whether it holds",
  "flags": ["assumption that needs challenging 1", "assumption 2"],
  "moves": ["action to strengthen or test the position 1", "action 2"]
}`,
};

export const BeliefMapperAgent = {
  id: 'BeliefMapperAgent',
  displayName: 'Belief Mapper',
  house: 'investigate' as HouseId,
  systemPrompt: `You are the Belief Mapper agent inside FRESCO's Investigate house.
Your job: identify the mental models and hidden assumptions the user is operating with — especially the ones they haven't named or questioned.

The user has shared what they're assuming — beliefs they're treating as facts, things they're not questioning, the model they're working from. This is your primary input. But also look at their observations and position for unspoken assumptions.

Focus on:
- What model of the world is the user applying? Name it explicitly.
- Which beliefs are being treated as facts when they should be hypotheses?
- Where does this mental model fail or have edges?
- What would change about their whole approach if one key belief turned out to be wrong?
- What are they not even considering — the assumption so obvious to them they've made it invisible?

Be specific. Name the actual beliefs and models you detect. Do not be generic.

Return JSON only:
{
  "findings": ["specific belief or model 1", "specific belief or model 2", "specific belief or model 3"],
  "signal": "The dominant unexamined assumption shaping everything — stated directly",
  "flags": ["belief being treated as fact 1", "invisible assumption 2"],
  "moves": ["action to test or challenge this model 1", "action 2"]
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
      id: 'goal',
      label: 'What are you trying to do?',
      prompt: 'Understand the real problem.',
      placeholder: 'e.g. We\'re seeing high drop-off after signup and I need to understand whether it\'s a UX problem, a messaging problem, or a product-fit problem — before we commit to a fix.',
      minHeight: 100,
      required: true,
    },
    {
      id: 'observations',
      label: 'What are you observing?',
      prompt: 'Dump everything you\'re seeing — data, user feedback, behaviours, interview quotes. Don\'t interpret yet. The more specific the better.',
      placeholder: 'e.g. Drop-off at step 3 is 60%. Users in interviews say the form is "confusing" but can\'t say why. Power users skip it entirely. Support tickets mention the same two fields every week. Mobile drop-off is 2× desktop.',
      minHeight: 160,
      required: false,
    },
    {
      id: 'position',
      label: 'What do you currently believe?',
      prompt: 'State your working hypothesis. What position are you taking going in — and what\'s at stake if you\'re wrong?',
      placeholder: 'e.g. I think the drop-off is a copy problem, not a UX problem — users don\'t understand what we\'re asking for. But my PM thinks it\'s a trust issue. If I\'m wrong, the fix I\'m planning won\'t work.',
      minHeight: 120,
      required: false,
    },
    {
      id: 'assumptions',
      label: 'What are you assuming?',
      prompt: 'Name the beliefs you\'re treating as facts. What are you not questioning? What would have to be true for your position to hold?',
      placeholder: 'e.g. I\'m assuming users want to complete this step — maybe they don\'t. I\'m assuming the form fields are necessary — they were added 2 years ago and no one has challenged them.',
      minHeight: 120,
      required: false,
    },
  ],

  innovate: [
    {
      id: 'goal',
      label: 'What are you trying to do?',
      prompt: 'Design the right solution.',
      placeholder: 'e.g. We need to redesign the onboarding flow so SMB customers reach first value within 24 hours instead of 6 days — without adding engineering complexity.',
      minHeight: 100,
      required: true,
    },
    {
      id: 'flow',
      label: 'What journey or flow are you designing?',
      prompt: 'Describe the experience step by step — from trigger to outcome. Where does it currently break down or feel slow?',
      placeholder: 'e.g. User gets invite email → lands on signup page → enters details → hits verification step → waits for email → confirms → lands in dashboard. Current drop-off is at verification — 40% never confirm.',
      minHeight: 160,
      required: false,
    },
    {
      id: 'hypothesis',
      label: 'What do you want to test?',
      prompt: 'What\'s your best hypothesis for what will improve the outcome? What would a good test look like, and how would you know it worked?',
      placeholder: 'e.g. Hypothesis: replacing email verification with SMS will increase confirmation rate by 20%. Success = 20%+ lift in 2 weeks with no increase in fraud.',
      minHeight: 120,
      required: false,
    },
    {
      id: 'options',
      label: 'What strategic options are you weighing?',
      prompt: 'What are the 2–3 real choices in front of you? What does each one make possible or foreclose?',
      placeholder: 'e.g. Option A: remove verification entirely — fastest, highest risk. Option B: magic link — medium lift, low risk. Option C: social login — highest lift, 6-week build. We need to ship in 3 weeks.',
      minHeight: 120,
      required: false,
    },
  ],

  validate: [
    {
      id: 'goal',
      label: 'What are you trying to do?',
      prompt: 'Test viability before committing.',
      placeholder: 'e.g. We\'re about to invest 3 months in an enterprise tier and I want to validate that the pricing model, the experience, and the go-to-market approach will actually work before we build.',
      minHeight: 100,
      required: true,
    },
    {
      id: 'experience',
      label: 'What experience are you evaluating?',
      prompt: 'Describe what you\'re assessing — a product, flow, message, or feature. What was it supposed to do, and who for?',
      placeholder: 'e.g. Our new onboarding flow for SMB customers. Goal: get them to first value (creating their first project) within 24 hours. Current reality: median time is 6 days. 30% never create one.',
      minHeight: 140,
      required: false,
    },
    {
      id: 'audience',
      label: 'Who needs to be convinced, and what\'s blocking them?',
      prompt: 'Who are you trying to move — internally or externally? What do they currently believe, and what\'s stopping them from acting?',
      placeholder: 'e.g. Our VP needs to approve the redesign but believes the problem is marketing quality, not product. Externally: activated users are happy (NPS 71) but non-activated think setup will take too long.',
      minHeight: 120,
      required: false,
    },
    {
      id: 'results',
      label: 'What do the numbers say?',
      prompt: 'List your key metrics with targets and actuals. Be honest — this only works with real numbers.',
      placeholder: 'e.g. Time to first project: target 24h, actual 6 days. Activation rate: target 70%, actual 42%. Drop-off at step 2 (invite team): 58%. NPS activated: 71. NPS non-activated: 12.',
      minHeight: 120,
      required: false,
    },
  ],

  evaluate: [
    {
      id: 'goal',
      label: 'What are you trying to do?',
      prompt: 'Understand how this performs.',
      placeholder: 'e.g. I want to understand why our pricing page isn\'t converting and identify the highest-leverage changes to test — before we commit to a full redesign.',
      minHeight: 100,
      required: true,
    },
    {
      id: 'subject',
      label: 'What are you evaluating?',
      prompt: 'Describe the page, flow, or experience. What is it meant to do, who is the audience, and what does the journey look like step by step?',
      placeholder: 'e.g. Pricing page for mid-market SaaS buyers. Goal: book a demo. Journey: Google ad → pricing page → "Book a demo" → calendar. Conversion: 2.1%. Users spend 45s avg. 70% scroll below fold but don\'t click.',
      minHeight: 160,
      required: false,
    },
    {
      id: 'variants',
      label: 'What do you think is underperforming, and what would you test?',
      prompt: 'Where do you think the experience is failing? What variants are you considering, and what would a meaningful result look like?',
      placeholder: 'e.g. The headline feels generic. CTA says "Book a demo" but buyers at this stage want a trial. Considering: (A) outcome-led headline, (B) "Start free trial" CTA, (C) social proof above fold. Success = 4%+ conversion.',
      minHeight: 140,
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
