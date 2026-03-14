// FRESCO Platform - Type Definitions
// "Structure before speed."

// ============================================
// THINKING MODES
// ============================================

export const THINKING_MODES = {
  // Tier 1 - Core 4 (The Fresco Cognitive Quadrant)
  core: [
    { id: 'critical', label: 'Critical', description: 'Truth-testing, assumption recognition' },
    { id: 'systems', label: 'Systems', description: 'Interconnections, loops, patterns' },
    { id: 'design', label: 'Design', description: 'Human context, empathy, desirability' },
    { id: 'product', label: 'Product', description: 'Feasibility, viability, prioritisation' },
  ],
  // Tier 2 - Expansion 8 (Secondary Modes)
  secondary: [
    { id: 'analytical', label: 'Analytical', description: 'Patterns, categories, data structure' },
    { id: 'first_principles', label: 'First Principles', description: 'Reducing to fundamental truths' },
    { id: 'strategic', label: 'Strategic', description: 'Direction, prioritisation, competition' },
    { id: 'futures', label: 'Futures', description: 'Forecasting, scenario building' },
    { id: 'scientific', label: 'Scientific', description: 'Hypotheses, testability, falsification' },
    { id: 'economic', label: 'Economic', description: 'Value exchange, incentives, cost' },
    { id: 'ethical', label: 'Ethical', description: 'Integrity, consequences, fairness' },
    { id: 'narrative', label: 'Narrative', description: 'Meaning, story, communication' },
  ],
  // Tier 3 - Specialised (Optional Intensifiers)
  advanced: [
    { id: 'lateral', label: 'Lateral', description: 'Creative leaps beyond constraints' },
    { id: 'computational', label: 'Computational', description: 'Logical steps, algorithmic breakdowns' },
    { id: 'philosophical', label: 'Philosophical', description: 'Essence, purpose, ontology' },
    { id: 'behavioral', label: 'Behavioural', description: 'Human bias, motivation, behavioural economics' },
  ],
} as const;

export type ThinkingModeId = 
  | 'automatic'
  | 'critical' | 'systems' | 'design' | 'product'
  | 'analytical' | 'first_principles' | 'strategic' | 'futures'
  | 'scientific' | 'economic' | 'ethical' | 'narrative'
  | 'lateral' | 'computational' | 'philosophical' | 'behavioral';

export type ThinkingMode = {
  id: ThinkingModeId;
  label: string;
  description: string;
};

// ============================================
// TOOLKIT DEFINITIONS
// ============================================

export type ToolkitCategory = 'investigate' | 'innovate' | 'validate';

export type ToolkitType = 
  | 'insight_stack' | 'pov_generator' | 'mental_model_mapper'
  | 'flow_board' | 'experiment_brief' | 'strategy_sketchbook'
  | 'ux_scorecard' | 'persuasion_canvas' | 'performance_grid';

export interface ToolkitDefinition {
  id: ToolkitType;
  name: string;
  subtitle: string;
  category: ToolkitCategory;
  purpose: string;
  primaryModes: ThinkingModeId[];
  steps: ToolkitStepDefinition[];
}

export interface ToolkitStepDefinition {
  stepNumber: number;
  label: string;
  prompt: string;
  lensHints: Record<ThinkingModeId, string>;
  placeholder?: string;
  minHeight?: number;
}

// ============================================
// TOOLKIT CONFIGURATIONS
// ============================================

export const TOOLKITS: Record<ToolkitType, ToolkitDefinition> = {
  // INVESTIGATE TOOLKITS
  insight_stack: {
    id: 'insight_stack',
    name: 'Insight Stack',
    subtitle: "Extract the real insight from what you're seeing.",
    category: 'investigate',
    purpose: 'Extract, structure, and refine raw observations into meaningful insights.',
    primaryModes: ['critical', 'systems', 'analytical', 'first_principles', 'scientific'],
    steps: [
      {
        stepNumber: 1,
        label: 'What are you looking at?',
        prompt: 'Set the scene. What situation, problem, or data are you trying to make sense of?',
        lensHints: {
          automatic: '',
          critical: 'Focus on facts, not interpretations.',
          systems: 'Identify the actors and elements.',
          design: 'Consider the human context.',
          product: 'What is the business context?',
          analytical: 'What data sources are available?',
          first_principles: 'What is the fundamental situation?',
          strategic: 'What is the competitive landscape?',
          futures: 'What time horizon are we considering?',
          scientific: 'What are the observable variables?',
          economic: 'What resources are involved?',
          ethical: 'Who are the stakeholders affected?',
          narrative: 'What is the story so far?',
          lateral: 'What unexpected angles exist?',
          computational: 'What are the measurable inputs?',
          philosophical: 'What is the essence of this situation?',
          behavioral: 'What behaviours are we observing?',
        },
        placeholder: 'e.g. Our users keep dropping off after signup. We have 3 months of data and 12 customer interviews.',
        minHeight: 140,
      },
      {
        stepNumber: 2,
        label: 'What are you noticing?',
        prompt: "Dump your raw observations here — data points, things people said, behaviours you've seen. Don't interpret yet, just list.",
        lensHints: {
          automatic: '',
          critical: 'Separate observation from interpretation.',
          systems: 'Note relationships between elements.',
          design: 'What are users saying and doing?',
          product: 'What metrics are you seeing?',
          analytical: 'Categorise as you observe.',
          first_principles: 'What are the undeniable facts?',
          strategic: 'What competitive signals exist?',
          futures: 'What trends are emerging?',
          scientific: 'Record without bias.',
          economic: 'What value flows are visible?',
          ethical: 'What impacts are you noticing?',
          narrative: 'What story patterns emerge?',
          lateral: 'What surprises you?',
          computational: 'What sequences occur?',
          philosophical: 'What meaning emerges?',
          behavioral: 'What motivations are visible?',
        },
        placeholder: 'e.g. 60% drop-off on day 3. Users say onboarding is confusing. Power users ignore the tutorial entirely.',
        minHeight: 160,
      },
      {
        stepNumber: 3,
        label: 'What keeps coming up?',
        prompt: 'Look across your observations. What themes, clusters, or repeating signals do you see?',
        lensHints: {
          automatic: '',
          critical: 'Test each pattern for validity.',
          systems: 'Identify loops and feedback mechanisms.',
          design: 'What user needs emerge?',
          product: 'What product implications appear?',
          analytical: 'What categories are forming?',
          first_principles: 'What fundamental patterns exist?',
          strategic: 'What strategic themes emerge?',
          futures: 'What direction do patterns suggest?',
          scientific: 'What hypotheses do patterns suggest?',
          economic: 'What value patterns emerge?',
          ethical: 'What ethical themes appear?',
          narrative: 'What story arcs are forming?',
          lateral: 'What unconventional groupings work?',
          computational: 'What algorithmic patterns exist?',
          philosophical: 'What deeper meanings connect?',
          behavioral: 'What behavioural clusters form?',
        },
        placeholder: 'e.g. Every churned user mentioned confusion in the first week. Retained users all found one core feature within 48 hours.',
        minHeight: 140,
      },
      {
        stepNumber: 4,
        label: "What doesn't add up?",
        prompt: "Where do things contradict each other? What surprised you? What's broken or missing?",
        lensHints: {
          automatic: '',
          critical: 'Contradictions are sources of insight.',
          systems: 'Where does the system break down?',
          design: 'Where are user needs unmet?',
          product: 'Where are trade-offs required?',
          analytical: 'What data conflicts exist?',
          first_principles: 'What assumptions conflict?',
          strategic: 'What strategic tensions exist?',
          futures: 'What uncertainties emerge?',
          scientific: 'What hypotheses conflict?',
          economic: 'What value conflicts exist?',
          ethical: 'What moral tensions appear?',
          narrative: 'What story conflicts emerge?',
          lateral: 'What paradoxes exist?',
          computational: 'What logical conflicts appear?',
          philosophical: 'What fundamental tensions exist?',
          behavioral: 'What motivation conflicts appear?',
        },
        placeholder: 'e.g. We assumed users wanted more features — but interviews show they want less complexity. The data contradicts our product bets.',
        minHeight: 120,
      },
      {
        stepNumber: 5,
        label: "What's the real truth here?",
        prompt: "Try completing this sentence: 'The evidence shows that...' Don't be safe — say what the data and patterns are actually pointing to.",
        lensHints: {
          automatic: '',
          critical: 'Ensure evidence supports your insight.',
          systems: 'Effect → Cause → Relationship',
          design: 'What human truth emerges?',
          product: 'What product truth emerges?',
          analytical: 'What does the data reveal?',
          first_principles: 'Reduce to the fundamental truth.',
          strategic: 'What strategic truth emerges?',
          futures: 'What future truth is indicated?',
          scientific: 'What can be verified?',
          economic: 'What value truth emerges?',
          ethical: 'What ethical truth emerges?',
          narrative: 'What story must be told?',
          lateral: 'What unexpected truth emerges?',
          computational: 'What logical conclusion follows?',
          philosophical: 'What essential truth emerges?',
          behavioral: 'What behavioural truth emerges?',
        },
        placeholder: "e.g. We've been solving for feature breadth when users need a faster path to their first win. The problem isn't the product — it's the journey.",
        minHeight: 180,
      },
    ],
  },
  
  pov_generator: {
    id: 'pov_generator',
    name: 'Position Builder',
    subtitle: 'Build a clear, defensible position on any situation.',
    category: 'investigate',
    purpose: 'Transform insights into a sharp, defensible point of view.',
    primaryModes: ['critical', 'first_principles', 'systems', 'product', 'strategic'],
    steps: [
      {
        stepNumber: 1,
        label: 'Who is this about?',
        prompt: 'Describe the specific person or group this POV is built around. The more specific, the sharper the POV.',
        lensHints: {
          automatic: '',
          critical: 'Avoid stereotypes and assumptions.',
          systems: 'Identify their role within the system.',
          design: 'Empathise deeply with their context.',
          product: 'Connect to job-to-be-done.',
          analytical: 'Define with precision.',
          first_principles: 'Who are they fundamentally?',
          strategic: 'What is their strategic importance?',
          futures: 'How might they evolve?',
          scientific: 'What evidence defines them?',
          economic: 'What is their economic role?',
          ethical: 'What are their rights and needs?',
          narrative: 'What is their story?',
          lateral: 'Who else might this apply to?',
          computational: 'How would you define them algorithmically?',
          philosophical: 'What is their essence?',
          behavioral: 'What drives their behaviour?',
        },
        placeholder: 'e.g. A mid-level product manager at a fast-growing startup who has budget but no time to evaluate tools properly.',
        minHeight: 140,
      },
      {
        stepNumber: 2,
        label: 'What do they actually need?',
        prompt: 'What is the real, unmet need behind their behaviour? Not what they ask for — what they actually need.',
        lensHints: {
          automatic: '',
          critical: 'Distinguish real needs from wants.',
          systems: 'How does this need connect to the system?',
          design: 'What is the human need beneath the surface?',
          product: 'What job needs to be done?',
          analytical: 'What evidence supports this need?',
          first_principles: 'What is the fundamental need?',
          strategic: 'What is the strategic value of this need?',
          futures: 'How might this need evolve?',
          scientific: 'What evidence supports this need?',
          economic: 'What value does meeting this need create?',
          ethical: 'Why does this need matter?',
          narrative: 'What story does this need tell?',
          lateral: 'What hidden needs exist?',
          computational: 'How would you quantify this need?',
          philosophical: 'What is the essence of this need?',
          behavioral: 'What behaviour indicates this need?',
        },
        placeholder: 'e.g. They need to feel confident in their decisions without spending hours doing research they don\'t have time for.',
        minHeight: 140,
      },
      {
        stepNumber: 3,
        label: 'What makes this hard to argue with?',
        prompt: 'What fact, pattern, or reality makes your position difficult to dismiss? Think: what would you say to a sceptic?',
        lensHints: {
          automatic: '',
          critical: 'Test for contradictions.',
          systems: 'Validate relationship forces.',
          design: 'What human truth emerges?',
          product: 'What product truth emerges?',
          analytical: 'Ensure truth is evidence-aligned.',
          first_principles: 'Reduce to irreducible truth.',
          strategic: 'What strategic truth emerges?',
          futures: 'What future does this truth imply?',
          scientific: 'What can be verified?',
          economic: 'What economic truth emerges?',
          ethical: 'What ethical truth emerges?',
          narrative: 'What story truth emerges?',
          lateral: 'What unexpected truth appears?',
          computational: 'What logical truth follows?',
          philosophical: 'What essential truth emerges?',
          behavioral: 'What behavioural truth emerges?',
        },
        placeholder: 'e.g. Most PMs are evaluated on speed of delivery, not quality of decisions — so anything that slows them down feels like a threat.',
        minHeight: 160,
      },
      {
        stepNumber: 4,
        label: 'So what changes?',
        prompt: 'If this truth is real, what must be done? Articulate the strategic consequence.',
        lensHints: {
          automatic: '',
          critical: 'What must change?',
          systems: 'What ecosystem impact follows?',
          design: 'What design implications follow?',
          product: 'What roadmap implications follow?',
          analytical: 'What actions does the data suggest?',
          first_principles: 'What fundamental action follows?',
          strategic: 'What business implications follow?',
          futures: 'What preparations are needed?',
          scientific: 'What experiments follow?',
          economic: 'What investments follow?',
          ethical: 'What responsibilities follow?',
          narrative: 'What story must be told?',
          lateral: 'What unexpected actions might work?',
          computational: 'What process follows?',
          philosophical: 'What essential action follows?',
          behavioral: 'What behaviour change is needed?',
        },
        placeholder: 'e.g. If this is true, we should lead with speed and confidence — not depth and comprehensiveness.',
        minHeight: 180,
      },
    ],
  },
  
  mental_model_mapper: {
    id: 'mental_model_mapper',
    name: 'Belief Mapper',
    subtitle: 'Surface the unspoken assumptions that drive decisions — so you can question them.',
    category: 'investigate',
    purpose: 'Uncover and visualise the mental models that shape decisions.',
    primaryModes: ['systems', 'philosophical', 'behavioral', 'critical'],
    steps: [
      {
        stepNumber: 1,
        label: 'What are we trying to understand?',
        prompt: 'What situation, team, market, or decision are you trying to get clearer on? The more specific, the better.',
        lensHints: {
          automatic: '',
          critical: 'Define boundaries clearly.',
          systems: 'What system does this exist within?',
          design: 'Whose mental model matters?',
          product: 'What product decisions does this affect?',
          analytical: 'What data informs this domain?',
          first_principles: 'What is fundamental to this domain?',
          strategic: 'Why does this domain matter?',
          futures: 'How might this domain evolve?',
          scientific: 'What is known vs unknown?',
          economic: 'What value exists here?',
          ethical: 'What stakes exist?',
          narrative: 'What stories define this domain?',
          lateral: 'What adjacent domains matter?',
          computational: 'What rules govern this domain?',
          philosophical: 'What is the essence of this domain?',
          behavioral: 'What behaviours define this domain?',
        },
        placeholder: 'e.g. How our sales team thinks about enterprise deals — what they believe, what they avoid, what drives their calls.',
        minHeight: 120,
      },
      {
        stepNumber: 2,
        label: 'What do people assume here?',
        prompt: 'What do people take for granted in this situation? List the unspoken rules, shortcuts, and assumptions — even ones you think are wrong.',
        lensHints: {
          automatic: '',
          critical: 'Which beliefs are tested vs assumed?',
          systems: 'How do beliefs connect to each other?',
          design: 'What do users believe?',
          product: 'What does the market believe?',
          analytical: 'What evidence supports each belief?',
          first_principles: 'Which beliefs are fundamental?',
          strategic: 'Which beliefs drive decisions?',
          futures: 'Which beliefs might change?',
          scientific: 'Which beliefs are testable?',
          economic: 'Which beliefs affect value?',
          ethical: 'Which beliefs have ethical weight?',
          narrative: 'What stories reinforce these beliefs?',
          lateral: 'What beliefs are hidden?',
          computational: 'What logic underlies these beliefs?',
          philosophical: 'What is the foundation of these beliefs?',
          behavioral: 'What behaviours do these beliefs drive?',
        },
        placeholder: 'e.g. "Enterprise deals take 6+ months." "Price is always the objection." "Legal will kill the deal."',
        minHeight: 160,
      },
      {
        stepNumber: 3,
        label: 'How do these assumptions affect each other?',
        prompt: 'Pick any two assumptions and ask: does believing one make the other more or less likely? Try starting with: "Because people believe X, they also tend to..."',
        lensHints: {
          automatic: '',
          critical: 'Where do beliefs conflict?',
          systems: 'Map the feedback loops.',
          design: 'How do beliefs shape experience?',
          product: 'How do beliefs shape product decisions?',
          analytical: 'What clusters emerge?',
          first_principles: 'What are the root relationships?',
          strategic: 'What relationships matter most?',
          futures: 'How might relationships evolve?',
          scientific: 'What causal relationships exist?',
          economic: 'How do beliefs affect value creation?',
          ethical: 'What ethical tensions exist?',
          narrative: 'How do belief stories interact?',
          lateral: 'What unexpected connections exist?',
          computational: 'What logical dependencies exist?',
          philosophical: 'What deeper connections exist?',
          behavioral: 'How do beliefs drive behaviour chains?',
        },
        placeholder: 'e.g. The belief that deals take 6 months makes reps avoid urgency — which actually makes deals take longer.',
        minHeight: 140,
      },
      {
        stepNumber: 4,
        label: "What's being ignored or taken for granted?",
        prompt: 'What important thing is nobody saying? What assumption has never been tested? What would change everything if it turned out to be wrong?',
        lensHints: {
          automatic: '',
          critical: 'What is not being questioned?',
          systems: 'What elements are missing from the model?',
          design: 'What user realities are ignored?',
          product: 'What market realities are ignored?',
          analytical: 'What data is missing?',
          first_principles: 'What fundamentals are unexamined?',
          strategic: 'What strategic blindspots exist?',
          futures: 'What future scenarios are ignored?',
          scientific: 'What hypotheses are untested?',
          economic: 'What value is unrecognised?',
          ethical: 'What stakeholders are ignored?',
          narrative: 'What stories are not being told?',
          lateral: 'What perspectives are missing?',
          computational: 'What inputs are ignored?',
          philosophical: 'What essential questions are unasked?',
          behavioral: 'What behaviours are unexplained?',
        },
        placeholder: 'e.g. Nobody believes the product can sell itself — but our top 3 deals closed with almost no sales involvement.',
        minHeight: 140,
      },
      {
        stepNumber: 5,
        label: 'What should guide decisions instead?',
        prompt: 'Based on everything above — what is the clearer way of thinking that should replace the old assumptions? Write it as a simple rule or principle.',
        lensHints: {
          automatic: '',
          critical: 'Is this model defensible?',
          systems: 'Does this model capture the key dynamics?',
          design: 'Does this model serve human needs?',
          product: 'Does this model guide product decisions?',
          analytical: 'Is this model evidence-based?',
          first_principles: 'Is this model built on solid foundations?',
          strategic: 'Does this model enable strategy?',
          futures: 'Is this model future-ready?',
          scientific: 'Is this model testable?',
          economic: 'Does this model create value?',
          ethical: 'Is this model ethical?',
          narrative: 'Does this model tell a compelling story?',
          lateral: 'Is this model creative enough?',
          computational: 'Is this model logical?',
          philosophical: 'Does this model capture essence?',
          behavioral: 'Does this model predict behaviour?',
        },
        placeholder: 'e.g. The best salespeople don\'t push harder — they reduce the fear of being wrong. Focus on making the buyer feel safe, not excited.',
        minHeight: 180,
      },
    ],
  },
  
  // INNOVATE TOOLKITS
  flow_board: {
    id: 'flow_board',
    name: 'Flow Board',
    subtitle: 'Map the flow of solutions.',
    category: 'innovate',
    purpose: 'Visualise and design solution flows.',
    primaryModes: ['design', 'systems', 'strategic', 'futures', 'lateral'],
    steps: [
      { stepNumber: 1, label: 'Where does this start?', prompt: 'Describe the starting point. What is the situation or moment when this flow begins?', lensHints: { automatic: '', critical: 'What actually happens vs what should happen?', systems: 'What inputs enter the system?', design: 'What is the user\'s starting experience?', product: 'What triggers this flow?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. A new user lands on the app after clicking a paid ad. They have no account yet and don\'t know what the product does.', minHeight: 140 },
      { stepNumber: 2, label: 'What are the key steps?', prompt: 'List the major stages in order. What actually happens between start and end?', lensHints: { automatic: '', critical: 'Which steps are necessary vs habitual?', systems: 'How do steps connect and depend on each other?', design: 'What does the user experience at each step?', product: 'Which steps create or destroy value?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. 1. Landing page → 2. Signup form → 3. Email verification → 4. Onboarding checklist → 5. First core action', minHeight: 180 },
      { stepNumber: 3, label: 'Where does it break down?', prompt: 'Where do people slow down, drop off, or get confused? What causes the most friction?', lensHints: { automatic: '', critical: 'What assumptions create friction?', systems: 'Where do bottlenecks occur?', design: 'Where do users struggle or abandon?', product: 'What technical constraints cause friction?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. 60% drop off at email verification. Onboarding checklist has 8 steps — most users complete 2. First core action is buried.', minHeight: 160 },
      { stepNumber: 4, label: 'What does success look like?', prompt: 'Describe the ideal version of this flow. What does a perfect run look like?', lensHints: { automatic: '', critical: 'How will you know success is achieved?', systems: 'What outputs indicate system success?', design: 'What does the ideal user experience feel like?', product: 'What metrics define success?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. User signs up, verifies in one click, completes 1 core action within 5 minutes, and comes back the next day.', minHeight: 140 },
    ],
  },
  
  experiment_brief: {
    id: 'experiment_brief',
    name: 'Experiment Brief',
    subtitle: 'Test your assumptions before you commit time or money.',
    category: 'innovate',
    purpose: 'Structure experiments to test assumptions.',
    primaryModes: ['scientific', 'product', 'analytical', 'first_principles'],
    steps: [
      { stepNumber: 1, label: 'What do you believe?', prompt: 'State the belief you want to test. Be specific — vague hypotheses produce vague results.', lensHints: { automatic: '', critical: 'Is this belief falsifiable?', systems: 'What system-level assumption are you testing?', design: 'What user behaviour are you predicting?', product: 'What product assumption are you testing?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: 'State as: If X, then Y because Z.', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. We believe that showing social proof on the pricing page will increase trial signups by 20%, because users are uncertain about value.', minHeight: 160 },
      { stepNumber: 2, label: 'How will you test it?', prompt: 'What is the smallest, fastest experiment that could prove or disprove this belief?', lensHints: { automatic: '', critical: 'What would disprove your hypothesis?', systems: 'How will you isolate variables?', design: 'How will you test with real users?', product: 'What is the MVP for this test?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: 'What controls and variables will you use?', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. Add 3 customer quotes to the pricing page for 2 weeks. Show to 50% of visitors. Measure trial signup rate vs control.', minHeight: 160 },
      { stepNumber: 3, label: 'What does pass/fail look like?', prompt: 'Define the exact numbers or outcomes that would tell you the experiment worked — or didn\'t.', lensHints: { automatic: '', critical: 'What evidence would change your mind?', systems: 'What system-level metrics matter?', design: 'What user behaviours indicate success?', product: 'What metrics must move and by how much?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: 'What p-value or confidence level?', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. Success: +15% trial signups in treatment group. Failure: <5% difference. If negative, kill the idea entirely.', minHeight: 160 },
      { stepNumber: 4, label: 'What could make this wrong?', prompt: 'What assumptions are baked into this test? What external factors could skew the results?', lensHints: { automatic: '', critical: 'What could make results meaningless?', systems: 'What external factors could interfere?', design: 'What user context might skew results?', product: 'What technical risks exist?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: 'What confounds might exist?', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. Assumes current traffic is representative. Risk: seasonal drop in traffic. Assumes quotes are credible to our audience.', minHeight: 160 },
    ],
  },
  
  strategy_sketchbook: {
    id: 'strategy_sketchbook',
    name: 'Strategy Sketchbook',
    subtitle: 'Surface solution paths.',
    category: 'innovate',
    purpose: 'Explore and map strategic options.',
    primaryModes: ['strategic', 'systems', 'futures', 'economic'],
    steps: [
      { stepNumber: 1, label: 'What are you deciding?', prompt: 'What is the real strategic question on the table? State it as a decision, not a topic.', lensHints: { automatic: '', critical: 'Is this the real question or a symptom?', systems: 'How does this connect to the larger system?', design: 'What human need drives this question?', product: '', analytical: '', first_principles: '', strategic: 'What strategic decision does this enable?', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. Should we go upmarket to enterprise or double down on SMB? We need to decide in the next 30 days.', minHeight: 140 },
      { stepNumber: 2, label: 'What are your options?', prompt: 'List at least 3 real strategic paths. Include options you\'re tempted to dismiss — they often reveal assumptions.', lensHints: { automatic: '', critical: 'What options are being avoided and why?', systems: 'How do options interact with the system?', design: 'What options best serve user needs?', product: '', analytical: '', first_principles: '', strategic: 'What options create competitive advantage?', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: 'What unconventional options exist?', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. Option 1: Go full enterprise (redesign product, hire AEs). Option 2: Stay SMB, reduce CAC. Option 3: Segment product by use case.', minHeight: 200 },
      { stepNumber: 3, label: 'What does each option cost?', prompt: 'For each option: what do you gain, what do you give up, and what does it require you to believe?', lensHints: { automatic: '', critical: 'What trade-offs are hidden?', systems: 'What systemic trade-offs exist?', design: 'What user experience trade-offs exist?', product: '', analytical: '', first_principles: '', strategic: 'What strategic trade-offs matter most?', futures: '', scientific: '', economic: 'What is the economic cost-benefit?', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. Enterprise: Higher ACV but 12-month sales cycle. Requires believing our product can compete at that tier. SMB: Faster but margin pressure.', minHeight: 180 },
      { stepNumber: 4, label: 'What do you recommend?', prompt: 'Make the call. Which option do you recommend and what would have to be true for you to be wrong?', lensHints: { automatic: '', critical: 'What would need to be true for this to be wrong?', systems: 'How does this affect the system?', design: 'How does this serve users?', product: '', analytical: '', first_principles: '', strategic: 'Why is this the winning strategy?', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. Recommend Option 2 (SMB focus) because our CAC/LTV is already broken at the top. Fix the foundation before scaling up.', minHeight: 180 },
    ],
  },
  
  // VALIDATE TOOLKITS
  ux_scorecard: {
    id: 'ux_scorecard',
    name: 'Experience Scorecard',
    subtitle: 'Score any experience, product, or process against what actually matters.',
    category: 'validate',
    purpose: 'Evaluate user experience systematically.',
    primaryModes: ['design', 'product', 'analytical', 'behavioral'],
    steps: [
      { stepNumber: 1, label: 'What are you evaluating?', prompt: 'Name the specific product, feature, or touchpoint. Be precise — broad evaluations produce useless scores.', lensHints: { automatic: '', critical: 'What claims are being made about this experience?', systems: 'What system does this experience exist within?', design: 'What is the intended user experience?', product: 'What product does this evaluate?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. The onboarding flow for new free users — specifically from signup to first completed action.', minHeight: 140 },
      { stepNumber: 2, label: 'What will you score it on?', prompt: 'Define 3–5 criteria that matter for this experience. Be specific about what good looks like for each.', lensHints: { automatic: '', critical: 'Are these the right criteria?', systems: '', design: 'What user-centered criteria matter?', product: 'What business criteria matter?', analytical: 'How will you measure each criterion?', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. 1. Time-to-first-value (under 5 mins = 10/10). 2. Clarity of next step. 3. Emotional tone. 4. Error recovery. 5. Mobile usability.', minHeight: 160 },
      { stepNumber: 3, label: 'Score each criterion', prompt: 'Rate each criterion out of 10 and explain why. Back scores with evidence — user feedback, data, or direct observation.', lensHints: { automatic: '', critical: 'What evidence supports each score?', systems: '', design: 'What does user feedback say?', product: 'What do metrics show?', analytical: 'What does the data reveal?', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. Time-to-value: 4/10 — average user takes 12 minutes. Clarity: 6/10 — most users find the CTA but miss the secondary action.', minHeight: 200 },
      { stepNumber: 4, label: 'What needs fixing first?', prompt: 'Based on your scores, what are the 2–3 highest-leverage improvements? What would move the needle most?', lensHints: { automatic: '', critical: 'What improvements would have the most impact?', systems: '', design: 'What improvements serve users most?', product: 'What improvements are feasible?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: 'What improvements have the best ROI?', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. 1. Reduce onboarding to 3 steps (biggest drop-off). 2. Add progress indicator. 3. Send day-1 email with single CTA.', minHeight: 160 },
    ],
  },
  
  persuasion_canvas: {
    id: 'persuasion_canvas',
    name: 'Influence Map',
    subtitle: 'Understand what moves people and how to reach them.',
    category: 'validate',
    purpose: 'Analyse and design persuasive systems.',
    primaryModes: ['behavioral', 'ethical', 'narrative', 'design'],
    steps: [
      { stepNumber: 1, label: 'Who are you trying to move?', prompt: 'Describe the specific audience. What do they currently believe, and why do they believe it?', lensHints: { automatic: '', critical: 'What evidence supports your understanding of them?', systems: '', design: 'What is their lived experience?', product: '', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: 'What story do they tell themselves?', lateral: '', computational: '', philosophical: '', behavioral: 'What behaviours do they exhibit?' }, placeholder: 'e.g. CFOs at mid-market SaaS companies. They believe AI tools are a cost, not an investment — because they\'ve seen hype without ROI.', minHeight: 160 },
      { stepNumber: 2, label: 'What do you want them to do?', prompt: 'State the exact belief, feeling, or action you want to produce. Be specific about the outcome.', lensHints: { automatic: '', critical: 'Is this change justified?', systems: '', design: 'How will this change improve their experience?', product: '', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: 'Is this change ethical?', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: 'What behavior change do you want?' }, placeholder: 'e.g. We want them to approve a 3-month pilot budget — because they believe the ROI is measurable within 90 days.', minHeight: 140 },
      { stepNumber: 3, label: 'What\'s in the way?', prompt: 'What objections, fears, or competing beliefs will block the change? Be honest — include the ones that are hard to counter.', lensHints: { automatic: '', critical: 'Are barriers real or perceived?', systems: 'What systemic barriers exist?', design: '', product: '', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: 'What stories create barriers?', lateral: '', computational: '', philosophical: '', behavioral: 'What habits create barriers?' }, placeholder: 'e.g. "We tried something similar and it failed." "Our team won\'t adopt it." "I need board approval for anything over $50k."', minHeight: 160 },
      { stepNumber: 4, label: 'How will you move them?', prompt: 'What specific messages, proof points, or experiences will overcome each barrier? Map it directly.', lensHints: { automatic: '', critical: 'What evidence would be most convincing?', systems: '', design: 'What experiences would persuade?', product: '', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: 'How can you persuade ethically?', narrative: 'What story would persuade?', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. Lead with a 90-day ROI guarantee. Show a case study from a similar company. Let them speak to a reference customer before signing.', minHeight: 180 },
    ],
  },
  
  performance_grid: {
    id: 'performance_grid',
    name: 'Performance Grid',
    subtitle: 'Test what\'s true.',
    category: 'validate',
    purpose: 'Evaluate performance against criteria.',
    primaryModes: ['product', 'analytical', 'scientific', 'economic'],
    steps: [
      { stepNumber: 1, label: 'What are you measuring?', prompt: 'Name the specific thing being measured. What is it and why does its performance matter right now?', lensHints: { automatic: '', critical: 'Is this the right thing to measure?', systems: 'What system does this exist within?', design: '', product: 'What product does this relate to?', analytical: '', first_principles: '', strategic: 'Why does this performance matter?', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. Our paid acquisition funnel for the SMB segment — we\'ve spent $40k this quarter and aren\'t sure it\'s working.', minHeight: 120 },
      { stepNumber: 2, label: 'What are you tracking?', prompt: 'List the specific metrics with targets or benchmarks. If you don\'t have a target, set one now.', lensHints: { automatic: '', critical: 'Do these metrics measure what matters?', systems: '', design: '', product: 'What business metrics matter?', analytical: 'How will you collect and analyse these metrics?', first_principles: '', strategic: '', futures: '', scientific: 'How reliable are these metrics?', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. CAC (target: under $800). Trial-to-paid conversion (target: 15%). Time-to-close (target: under 21 days). MQL volume (target: 120/mo).', minHeight: 160 },
      { stepNumber: 3, label: 'What are the actual numbers?', prompt: 'Fill in the real results against each target. Be honest — this only works if the numbers are accurate.', lensHints: { automatic: '', critical: 'Are results valid and reliable?', systems: '', design: '', product: 'What do results say about product health?', analytical: 'What statistical analysis reveals?', first_principles: '', strategic: '', futures: '', scientific: '', economic: 'What is the economic impact of results?', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. CAC: $1,240 vs $800 target. Trial-to-paid: 9% vs 15% target. Time-to-close: 34 days vs 21. MQL volume: 88 vs 120.', minHeight: 180 },
      { stepNumber: 4, label: 'What needs to change?', prompt: 'Based on the gap between targets and results — what specific actions will close the gap? Who owns each one?', lensHints: { automatic: '', critical: 'What actions would have the most impact?', systems: 'What systemic changes are needed?', design: '', product: 'What product changes are needed?', analytical: '', first_principles: '', strategic: 'What strategic changes are needed?', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'e.g. 1. Pause Google Ads (high CAC, low quality). 2. A/B test pricing page (conversion gap). 3. Review ICP — we may be targeting wrong segment.', minHeight: 160 },
    ],
  },
};

// ============================================
// SESSION & WORKSPACE TYPES
// ============================================

export type SessionStatus = 'draft' | 'in_progress' | 'completed';

export interface Workspace {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  teamId?: string;
  team?: { id: string; name: string } | null;
  sessions?: ToolkitSession[];
}

export interface ToolkitSession {
  id: string;
  toolkitType: ToolkitType;
  category: ToolkitCategory;
  thinkingLens: ThinkingModeId;
  title?: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  workspaceId: string;
  steps?: SessionStep[];
  insights?: Insight[];
  sentenceOfTruth?: SentenceOfTruth;
  necessaryMoves?: NecessaryMove[];
}

export interface SessionStep {
  id: string;
  stepNumber: number;
  label: string;
  prompt: string;
  response?: string;
  content?: string; // Alias for response - some components use this
  lensHint?: string;
  sessionId: string;
}

export interface Insight {
  id: string;
  content: string;
  sourceStep?: number;
  isAiGenerated: boolean;
  createdAt: Date;
  sessionId: string;
}

export interface SentenceOfTruth {
  id: string;
  content: string;
  isLocked: boolean;
  isAiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
  sessionId: string;
}

export interface NecessaryMove {
  id: string;
  orderNum: number;
  content: string;
  isCompleted: boolean;
  createdAt: Date;
  sessionId: string;
}

// ============================================
// UI STATE TYPES
// ============================================

export interface NavigationState {
  activeSection: 'home' | 'workspaces' | 'archive' | 'toolkit';
  activeWorkspaceId?: string;
  activeSessionId?: string;
}

export interface ThinkingLensState {
  selectedLens: ThinkingModeId;
  isDropdownOpen: boolean;
}
