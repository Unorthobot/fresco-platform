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
    subtitle: 'A structured extraction of insights.',
    category: 'investigate',
    purpose: 'Extract, structure, and refine raw observations into meaningful insights.',
    primaryModes: ['critical', 'systems', 'analytical', 'first_principles', 'scientific'],
    steps: [
      {
        stepNumber: 1,
        label: 'CONTEXT',
        prompt: 'Describe the situation, event, behaviour, or data you are examining.',
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
        placeholder: 'Describe what you\'re analysing...',
        minHeight: 140,
      },
      {
        stepNumber: 2,
        label: 'OBSERVATIONS',
        prompt: 'List your raw observations, signals, or data points.',
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
        placeholder: 'Add your observations...',
        minHeight: 160,
      },
      {
        stepNumber: 3,
        label: 'PATTERNS',
        prompt: 'Group related observations into clusters or patterns.',
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
        placeholder: 'Identify patterns and themes...',
        minHeight: 140,
      },
      {
        stepNumber: 4,
        label: 'TENSIONS',
        prompt: 'Identify inconsistencies, breakdowns, surprises, or conflicts.',
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
        placeholder: 'What contradictions or frictions exist?',
        minHeight: 120,
      },
      {
        stepNumber: 5,
        label: 'INSIGHT EXTRACTION',
        prompt: 'Write the deeper truth emerging from the patterns and tensions.',
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
        placeholder: 'What is the deeper truth?',
        minHeight: 180,
      },
    ],
  },
  
  pov_generator: {
    id: 'pov_generator',
    name: 'POV Generator',
    subtitle: 'Clarify what you believe and why.',
    category: 'investigate',
    purpose: 'Transform insights into a sharp, defensible point of view.',
    primaryModes: ['critical', 'first_principles', 'systems', 'product', 'strategic'],
    steps: [
      {
        stepNumber: 1,
        label: 'USER',
        prompt: 'Describe the person, segment, or actor this POV is centred on. Be specific.',
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
        placeholder: 'Who is this POV about?',
        minHeight: 140,
      },
      {
        stepNumber: 2,
        label: 'NEED',
        prompt: 'Write the unmet need, latent need, or overlooked struggle this POV responds to.',
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
        placeholder: 'What do they truly need?',
        minHeight: 140,
      },
      {
        stepNumber: 3,
        label: 'TRUTH',
        prompt: 'State the deeper truth emerging from your insights — not an opinion, a truth.',
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
        placeholder: 'What truth are you willing to stand behind?',
        minHeight: 160,
      },
      {
        stepNumber: 4,
        label: 'CONSEQUENCE',
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
        placeholder: 'If your POV is correct, what changes?',
        minHeight: 180,
      },
    ],
  },
  
  mental_model_mapper: {
    id: 'mental_model_mapper',
    name: 'Mental Model Mapper',
    subtitle: 'Map the hidden structures of understanding.',
    category: 'investigate',
    purpose: 'Uncover and visualise the mental models that shape decisions.',
    primaryModes: ['systems', 'philosophical', 'behavioral', 'critical'],
    steps: [
      {
        stepNumber: 1,
        label: 'DOMAIN',
        prompt: 'What domain or decision space are we mapping?',
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
        placeholder: 'Define the domain...',
        minHeight: 120,
      },
      {
        stepNumber: 2,
        label: 'BELIEFS',
        prompt: 'What beliefs, assumptions, or "truths" operate in this space?',
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
        placeholder: 'List the beliefs operating here...',
        minHeight: 160,
      },
      {
        stepNumber: 3,
        label: 'RELATIONSHIPS',
        prompt: 'How do these beliefs connect, conflict, or reinforce each other?',
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
        placeholder: 'Describe the relationships...',
        minHeight: 140,
      },
      {
        stepNumber: 4,
        label: 'GAPS',
        prompt: 'Where are the blind spots, missing beliefs, or unexamined assumptions?',
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
        placeholder: 'Identify the gaps...',
        minHeight: 140,
      },
      {
        stepNumber: 5,
        label: 'MODEL',
        prompt: 'Synthesise: What is the mental model that should guide decisions here?',
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
        placeholder: 'Describe the mental model...',
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
      { stepNumber: 1, label: 'STARTING STATE', prompt: 'Describe the current state or starting point of the flow you\'re mapping.', lensHints: { automatic: '', critical: 'What actually happens vs what should happen?', systems: 'What inputs enter the system?', design: 'What is the user\'s starting experience?', product: 'What triggers this flow?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'Describe where the flow begins...', minHeight: 140 },
      { stepNumber: 2, label: 'KEY STEPS', prompt: 'List the major steps, stages, or touchpoints in this flow.', lensHints: { automatic: '', critical: 'Which steps are necessary vs habitual?', systems: 'How do steps connect and depend on each other?', design: 'What does the user experience at each step?', product: 'Which steps create or destroy value?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'List the key steps in order...', minHeight: 180 },
      { stepNumber: 3, label: 'FRICTION POINTS', prompt: 'Where does the flow slow down, break, or frustrate? What causes friction?', lensHints: { automatic: '', critical: 'What assumptions create friction?', systems: 'Where do bottlenecks occur?', design: 'Where do users struggle or abandon?', product: 'What technical constraints cause friction?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'Identify friction and pain points...', minHeight: 160 },
      { stepNumber: 4, label: 'IDEAL STATE', prompt: 'Describe the optimal end state. What does success look like?', lensHints: { automatic: '', critical: 'How will you know success is achieved?', systems: 'What outputs indicate system success?', design: 'What does the ideal user experience feel like?', product: 'What metrics define success?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'Describe the optimal outcome...', minHeight: 140 },
    ],
  },
  
  experiment_brief: {
    id: 'experiment_brief',
    name: 'Experiment Brief',
    subtitle: 'Design experiments that reveal truth.',
    category: 'innovate',
    purpose: 'Structure experiments to test assumptions.',
    primaryModes: ['scientific', 'product', 'analytical', 'first_principles'],
    steps: [
      { stepNumber: 1, label: 'HYPOTHESIS', prompt: 'State your hypothesis clearly. What do you believe to be true that needs testing?', lensHints: { automatic: '', critical: 'Is this belief falsifiable?', systems: 'What system-level assumption are you testing?', design: 'What user behaviour are you predicting?', product: 'What product assumption are you testing?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: 'State as: If X, then Y because Z.', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'We believe that... because...', minHeight: 160 },
      { stepNumber: 2, label: 'TEST DESIGN', prompt: 'How will you test this hypothesis? What is the minimal experiment?', lensHints: { automatic: '', critical: 'What would disprove your hypothesis?', systems: 'How will you isolate variables?', design: 'How will you test with real users?', product: 'What is the MVP for this test?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: 'What controls and variables will you use?', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'To test this, we will...', minHeight: 160 },
      { stepNumber: 3, label: 'SUCCESS CRITERIA', prompt: 'What specific, measurable outcomes would validate or invalidate your hypothesis?', lensHints: { automatic: '', critical: 'What evidence would change your mind?', systems: 'What system-level metrics matter?', design: 'What user behaviours indicate success?', product: 'What metrics must move and by how much?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: 'What p-value or confidence level?', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'Success looks like... Failure looks like...', minHeight: 160 },
      { stepNumber: 4, label: 'RISKS & ASSUMPTIONS', prompt: 'What could invalidate this experiment? What are you assuming?', lensHints: { automatic: '', critical: 'What could make results meaningless?', systems: 'What external factors could interfere?', design: 'What user context might skew results?', product: 'What technical risks exist?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: 'What confounds might exist?', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'This experiment assumes... Risks include...', minHeight: 160 },
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
      { stepNumber: 1, label: 'STRATEGIC QUESTION', prompt: 'What is the core strategic question you\'re trying to answer?', lensHints: { automatic: '', critical: 'Is this the real question or a symptom?', systems: 'How does this connect to the larger system?', design: 'What human need drives this question?', product: '', analytical: '', first_principles: '', strategic: 'What strategic decision does this enable?', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'The strategic question we need to answer is...', minHeight: 140 },
      { stepNumber: 2, label: 'OPTIONS', prompt: 'What are the possible strategic paths? List at least 3 distinct options.', lensHints: { automatic: '', critical: 'What options are being avoided and why?', systems: 'How do options interact with the system?', design: 'What options best serve user needs?', product: '', analytical: '', first_principles: '', strategic: 'What options create competitive advantage?', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: 'What unconventional options exist?', computational: '', philosophical: '', behavioral: '' }, placeholder: 'Option 1: ...\nOption 2: ...\nOption 3: ...', minHeight: 200 },
      { stepNumber: 3, label: 'TRADE-OFFS', prompt: 'What does each option cost? What does it enable? Map the trade-offs.', lensHints: { automatic: '', critical: 'What trade-offs are hidden?', systems: 'What systemic trade-offs exist?', design: 'What user experience trade-offs exist?', product: '', analytical: '', first_principles: '', strategic: 'What strategic trade-offs matter most?', futures: '', scientific: '', economic: 'What is the economic cost-benefit?', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'Trade-offs for each option...', minHeight: 180 },
      { stepNumber: 4, label: 'RECOMMENDATION', prompt: 'Based on your analysis, what strategic direction do you recommend and why?', lensHints: { automatic: '', critical: 'What would need to be true for this to be wrong?', systems: 'How does this affect the system?', design: 'How does this serve users?', product: '', analytical: '', first_principles: '', strategic: 'Why is this the winning strategy?', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'We recommend... because...', minHeight: 180 },
    ],
  },
  
  // VALIDATE TOOLKITS
  ux_scorecard: {
    id: 'ux_scorecard',
    name: 'UX Scorecard',
    subtitle: 'Measure what matters.',
    category: 'validate',
    purpose: 'Evaluate user experience systematically.',
    primaryModes: ['design', 'product', 'analytical', 'behavioral'],
    steps: [
      { stepNumber: 1, label: 'EXPERIENCE', prompt: 'What experience, product, or touchpoint are you evaluating?', lensHints: { automatic: '', critical: 'What claims are being made about this experience?', systems: 'What system does this experience exist within?', design: 'What is the intended user experience?', product: 'What product does this evaluate?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'The experience we\'re evaluating is...', minHeight: 140 },
      { stepNumber: 2, label: 'CRITERIA', prompt: 'What criteria will you use to evaluate? (e.g., usability, delight, efficiency, accessibility)', lensHints: { automatic: '', critical: 'Are these the right criteria?', systems: '', design: 'What user-centered criteria matter?', product: 'What business criteria matter?', analytical: 'How will you measure each criterion?', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'Criteria: 1. ... 2. ... 3. ...', minHeight: 160 },
      { stepNumber: 3, label: 'EVALUATION', prompt: 'Score and explain each criterion. What\'s working? What\'s not?', lensHints: { automatic: '', critical: 'What evidence supports each score?', systems: '', design: 'What does user feedback say?', product: 'What do metrics show?', analytical: 'What does the data reveal?', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'Criterion 1: Score X/10 because...\nCriterion 2: Score X/10 because...', minHeight: 200 },
      { stepNumber: 4, label: 'PRIORITIES', prompt: 'Based on your evaluation, what are the highest-priority improvements?', lensHints: { automatic: '', critical: 'What improvements would have the most impact?', systems: '', design: 'What improvements serve users most?', product: 'What improvements are feasible?', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: 'What improvements have the best ROI?', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'Top priorities: 1. ... 2. ... 3. ...', minHeight: 160 },
    ],
  },
  
  persuasion_canvas: {
    id: 'persuasion_canvas',
    name: 'Persuasion Canvas',
    subtitle: 'Map the forces of influence.',
    category: 'validate',
    purpose: 'Analyse and design persuasive systems.',
    primaryModes: ['behavioral', 'ethical', 'narrative', 'design'],
    steps: [
      { stepNumber: 1, label: 'AUDIENCE', prompt: 'Who are you trying to persuade? What do they currently believe?', lensHints: { automatic: '', critical: 'What evidence supports your understanding of them?', systems: '', design: 'What is their lived experience?', product: '', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: 'What story do they tell themselves?', lateral: '', computational: '', philosophical: '', behavioral: 'What behaviours do they exhibit?' }, placeholder: 'Our audience is... They currently believe...', minHeight: 160 },
      { stepNumber: 2, label: 'DESIRED CHANGE', prompt: 'What do you want them to believe, feel, or do differently?', lensHints: { automatic: '', critical: 'Is this change justified?', systems: '', design: 'How will this change improve their experience?', product: '', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: 'Is this change ethical?', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: 'What behavior change do you want?' }, placeholder: 'We want them to believe/feel/do...', minHeight: 140 },
      { stepNumber: 3, label: 'BARRIERS', prompt: 'What prevents the change? What objections, fears, or competing beliefs exist?', lensHints: { automatic: '', critical: 'Are barriers real or perceived?', systems: 'What systemic barriers exist?', design: '', product: '', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: '', narrative: 'What stories create barriers?', lateral: '', computational: '', philosophical: '', behavioral: 'What habits create barriers?' }, placeholder: 'Barriers include... Objections include...', minHeight: 160 },
      { stepNumber: 4, label: 'PERSUASION STRATEGY', prompt: 'How will you overcome barriers and drive change? What messages, proof, or experiences?', lensHints: { automatic: '', critical: 'What evidence would be most convincing?', systems: '', design: 'What experiences would persuade?', product: '', analytical: '', first_principles: '', strategic: '', futures: '', scientific: '', economic: '', ethical: 'How can you persuade ethically?', narrative: 'What story would persuade?', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'Our strategy is to...', minHeight: 180 },
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
      { stepNumber: 1, label: 'SUBJECT', prompt: 'What are you measuring the performance of? (Product, campaign, process, etc.)', lensHints: { automatic: '', critical: 'Is this the right thing to measure?', systems: 'What system does this exist within?', design: '', product: 'What product does this relate to?', analytical: '', first_principles: '', strategic: 'Why does this performance matter?', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'We\'re measuring the performance of...', minHeight: 120 },
      { stepNumber: 2, label: 'METRICS', prompt: 'What specific metrics will you track? Include targets or benchmarks.', lensHints: { automatic: '', critical: 'Do these metrics measure what matters?', systems: '', design: '', product: 'What business metrics matter?', analytical: 'How will you collect and analyse these metrics?', first_principles: '', strategic: '', futures: '', scientific: 'How reliable are these metrics?', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'Metrics: 1. ... (target: X) 2. ... (target: Y)', minHeight: 160 },
      { stepNumber: 3, label: 'RESULTS', prompt: 'What are the actual results? How do they compare to targets?', lensHints: { automatic: '', critical: 'Are results valid and reliable?', systems: '', design: '', product: 'What do results say about product health?', analytical: 'What statistical analysis reveals?', first_principles: '', strategic: '', futures: '', scientific: '', economic: 'What is the economic impact of results?', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'Metric 1: Actual X vs Target Y...', minHeight: 180 },
      { stepNumber: 4, label: 'ACTIONS', prompt: 'Based on results, what actions should be taken to improve performance?', lensHints: { automatic: '', critical: 'What actions would have the most impact?', systems: 'What systemic changes are needed?', design: '', product: 'What product changes are needed?', analytical: '', first_principles: '', strategic: 'What strategic changes are needed?', futures: '', scientific: '', economic: '', ethical: '', narrative: '', lateral: '', computational: '', philosophical: '', behavioral: '' }, placeholder: 'Actions: 1. ... 2. ... 3. ...', minHeight: 160 },
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
