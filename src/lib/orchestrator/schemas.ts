// FRESCO — JSON schemas for tool-use enforced output.
//
// Why this file exists:
// Before tool-use enforcement, merge calls produced ~8KB of free-form JSON
// that occasionally failed to parse — a missing comma at position 7957,
// an unescaped quote inside a string. Each failure dropped the user into
// the local fallback path with a generic INVESTIGATE FURTHER verdict. The
// breadcrumb 'fresco-merge-fallback-breadcrumbs' caught a real instance.
//
// Tool-use mode forces the model to produce arguments matching the schema
// below — no parsing required, valid JSON guaranteed. We trade verbosity
// (each schema repeats structure that prose-prompts could reference more
// loosely) for reliability.
//
// Required vs optional policy:
// The Analysis tab IS Fresco's product. The marketing page promises:
//   "Iceberg analysis. System archetypes. Causal loops. Scenario simulation."
// Those are deliverables, not aspirations. The schema enforces them as
// required output across every house, with shape constraints that ensure
// the renders actually populate (minItems:3 nodes for causal loops,
// minItems:2 variables for scenarios, minItems:2 dataPoints for BOT, etc.).
//
// Required across all houses:
//   - currentStateSimulation  (one-sentence trajectory projection)
//   - archetype               (with description + loop populated, name nullable)
//   - behaviorOverTime        (qualitative or numerical trend, ≥2 data points)
//   - causalLoop              (≥3 nodes, ≥2 edges, dominantLoop named)
//   - ipoMap                  (inputs/processes/outputs ≥1 each, plus bottleneck)
//
// Required for non-Investigate houses (where forecasting is core):
//   - scenarioModel           (≥2 variables, baseline value)
//
// Required for Investigate (where surface→depth is core):
//   - icebergLevels           (all four layers populated)
//
// Optional everywhere:
//   - stockFlow, sensitivityAnalysis, plus house-specific ones like
//     leverageMap, funnelSimulation, influenceMap, kpiSystemMap.
//   These render when richer material is available, hide when it's not.
//
// Anti-fabrication: the prompt instructs the model that when agents didn't
// find supporting material, draw on what they DID find — thin-but-honest
// is better than rich-but-invented. Required fields can't be skipped, but
// they don't need to be elaborate.

import type { HouseId } from '@/lib/agents';

// ─── Reusable nested shapes ──────────────────────────────────────────────────

const ARCHETYPE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: ['string', 'null'], description: 'System archetype name (Fixes that Fail, Shifting the Burden, Limits to Growth, Eroding Goals, Escalation, Success to the Successful, Tragedy of the Commons, Accidental Adversaries) or null if none clearly applies. If null, still populate description and loop with the dynamic at work in plain language.' },
    description: { type: 'string', description: '1-2 sentences in plain English: the dynamic at work in THIS situation. If name is set, why this archetype applies. If name is null, the dynamic in plain terms.' },
    loop: { type: 'string', description: 'The specific feedback dynamic in plain English — what triggers what.' },
    escape: { type: 'string', description: 'One concrete action that would interrupt the dynamic.' },
  },
  required: ['name', 'description', 'loop'],
} as const;

const BOTG_SCHEMA = {
  type: 'array',
  minItems: 1,
  description: 'A qualitative trend showing how the situation has moved over time. At least one series with at least 2 data points so the chart actually renders.',
  items: {
    type: 'object',
    properties: {
      variable: { type: 'string', description: 'What is being tracked over time' },
      unit: { type: 'string' },
      dataPoints: {
        type: 'array',
        minItems: 2,
        description: 'At least two points so a trend can be drawn.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            value: { type: 'number' },
          },
          required: ['label', 'value'],
        },
      },
      trend: { type: 'string', enum: ['rising', 'falling', 'oscillating', 'plateauing', 'accelerating'] },
      projection: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            value: { type: 'number' },
          },
          required: ['label', 'value'],
        },
      },
    },
    required: ['variable', 'dataPoints', 'trend'],
  },
} as const;

const CAUSAL_LOOP_SCHEMA = {
  type: 'object',
  description: 'A causal loop diagram showing how variables feed back on each other in THIS situation. Drawn from agent material — what the user described and what the agents identified as dynamics. Not a generic template.',
  properties: {
    nodes: {
      type: 'array',
      minItems: 3,
      description: 'At least 3 nodes — fewer than that and you do not have a loop, you have a list. Each node is a variable that participates in the dynamic.',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Short identifier used in edges, e.g. "trust", "friction", "reach".' },
          label: { type: 'string', description: 'Human-readable name in plain language.' },
        },
        required: ['id', 'label'],
      },
    },
    edges: {
      type: 'array',
      minItems: 2,
      description: 'At least 2 edges so a loop can be traced. Each edge connects two nodes by id and shows whether the influence is reinforcing (+) or balancing (-).',
      items: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          polarity: { type: 'string', enum: ['+', '-'] },
          label: { type: 'string' },
        },
        required: ['from', 'to', 'polarity'],
      },
    },
    dominantLoop: { type: 'string', description: 'One sentence: which loop is currently dominant and what it means for the situation.' },
    loopType: { type: 'string', enum: ['reinforcing', 'balancing', 'both'] },
  },
  required: ['nodes', 'edges', 'dominantLoop'],
} as const;

const STOCK_FLOW_SCHEMA = {
  type: 'object',
  properties: {
    stocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          value: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name'],
      },
    },
    inflows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          rate: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
        },
        required: ['name', 'to'],
      },
    },
    outflows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          rate: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
        },
        required: ['name', 'from'],
      },
    },
    keyConstraint: { type: 'string' },
  },
} as const;

const SCENARIO_SCHEMA = {
  type: 'object',
  description: 'Scenario simulation: how the outcome shifts as key variables change. Drawn from the actual situation — outcomeVariable is what the user cares about, variables are the levers that would move it.',
  properties: {
    outcomeVariable: { type: 'string', description: 'The metric the user is trying to move (e.g. "monthly active users", "conversion rate", "revenue").' },
    outcomeUnit: { type: 'string' },
    baselineValue: { type: 'number', description: 'Where the outcome metric is now. If unknown, use a representative number from the agent material.' },
    variables: {
      type: 'array',
      minItems: 2,
      description: 'At least 2 variables — fewer than that is not a simulation, it is a single dependency. Each variable is a lever that meaningfully moves the outcome.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          unit: { type: 'string' },
          currentValue: { type: 'number' },
          minValue: { type: 'number' },
          maxValue: { type: 'number' },
          sensitivityScore: { type: 'number', description: '0-1: how much this variable moves the outcome relative to others.' },
          direction: { type: 'string', enum: ['positive', 'negative'] },
        },
        required: ['name', 'currentValue', 'minValue', 'maxValue'],
      },
    },
  },
  required: ['outcomeVariable', 'baselineValue', 'variables'],
} as const;

const SENSITIVITY_SCHEMA = {
  type: 'object',
  properties: {
    outcomeVariable: { type: 'string' },
    variables: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          impact: { type: 'number' },
          direction: { type: 'string', enum: ['positive', 'negative'] },
          note: { type: 'string' },
        },
        required: ['name', 'impact'],
      },
    },
  },
  required: ['variables'],
} as const;

const IPO_SCHEMA = {
  type: 'object',
  properties: {
    inputs: {
      type: 'array',
      minItems: 1,
      description: 'What the user is bringing in or starting from. At least one entry.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['label'],
      },
    },
    processes: {
      type: 'array',
      minItems: 1,
      description: 'The mechanisms or dynamics turning inputs into outputs. At least one entry.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['label'],
      },
    },
    outputs: {
      type: 'array',
      minItems: 1,
      description: 'The actions or results that follow from the analysis. At least one entry.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['label'],
      },
    },
    bottleneck: { type: 'string', description: 'The single most critical issue blocking change. One sentence.' },
  },
  required: ['inputs', 'processes', 'outputs', 'bottleneck'],
} as const;

const ICEBERG_SCHEMA = {
  type: 'object',
  properties: {
    event: { type: 'string', description: 'Visible symptom in 1 sentence' },
    pattern: { type: 'string', description: 'Recurring trend in 1 sentence' },
    structure: { type: 'string', description: 'System element producing the pattern' },
    mentalModel: { type: 'string', description: 'Belief keeping the system this way' },
  },
  required: ['event', 'pattern', 'structure', 'mentalModel'],
} as const;

// ─── Per-house systemsOutput schemas ─────────────────────────────────────────

const SYSTEMS_OUTPUT_BY_HOUSE: Record<HouseId, Record<string, unknown>> = {
  investigate: {
    type: 'object',
    properties: {
      icebergLevels: ICEBERG_SCHEMA,
      currentStateSimulation: { type: 'string', description: 'If nothing changes — one sentence about the trajectory.' },
      systemTruth: { type: 'string', description: 'The uncomfortable truth — one sentence' },
      archetype: ARCHETYPE_SCHEMA,
      behaviorOverTime: BOTG_SCHEMA,
      causalLoop: CAUSAL_LOOP_SCHEMA,
      ipoMap: IPO_SCHEMA,
      sensitivityAnalysis: SENSITIVITY_SCHEMA,
    },
    required: ['icebergLevels', 'currentStateSimulation', 'archetype', 'behaviorOverTime', 'causalLoop', 'ipoMap'],
  },
  innovate: {
    type: 'object',
    properties: {
      currentStateSimulation: { type: 'string', description: 'If nothing changes about the current direction — one sentence.' },
      leverageMap: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            option: { type: 'string' },
            leverageLevel: { type: 'string', enum: ['parameters', 'feedback', 'information', 'rules', 'goals', 'paradigms'] },
            impact: { type: 'string' },
          },
          required: ['option', 'leverageLevel'],
        },
      },
      interventionForecast: {
        type: 'object',
        properties: {
          immediate: { type: 'string' },
          delayed: { type: 'string' },
          risk: { type: 'string' },
        },
      },
      archetype: ARCHETYPE_SCHEMA,
      behaviorOverTime: BOTG_SCHEMA,
      stockFlow: STOCK_FLOW_SCHEMA,
      causalLoop: CAUSAL_LOOP_SCHEMA,
      scenarioModel: SCENARIO_SCHEMA,
      ipoMap: IPO_SCHEMA,
    },
    required: ['currentStateSimulation', 'archetype', 'behaviorOverTime', 'causalLoop', 'scenarioModel', 'ipoMap'],
  },
  validate: {
    type: 'object',
    properties: {
      currentStateSimulation: { type: 'string', description: 'If the test plays out as designed — one sentence about expected outcome.' },
      funnelSimulation: {
        type: 'object',
        properties: {
          expected: { type: 'string' },
          bestCase: { type: 'string' },
          worstCase: { type: 'string' },
        },
      },
      influenceMap: {
        type: 'object',
        properties: {
          barrier: { type: 'string' },
          lever: { type: 'string' },
          proofRequired: { type: 'string' },
        },
      },
      archetype: ARCHETYPE_SCHEMA,
      behaviorOverTime: BOTG_SCHEMA,
      scenarioModel: SCENARIO_SCHEMA,
      sensitivityAnalysis: SENSITIVITY_SCHEMA,
      stockFlow: STOCK_FLOW_SCHEMA,
      ipoMap: IPO_SCHEMA,
    },
    required: ['currentStateSimulation', 'archetype', 'behaviorOverTime', 'causalLoop', 'scenarioModel', 'ipoMap'],
  },
  evaluate: {
    type: 'object',
    properties: {
      currentStateSimulation: { type: 'string', description: 'If the page/flow stays as it is — one sentence about expected behavior.' },
      evolutionProjection: { type: 'string', description: 'If current trends continue, in 3 months: one sentence' },
      doublLoopLearning: { type: 'string', description: 'Are we solving the right problem? one sentence' },
      kpiSystemMap: { type: 'string', description: 'What actually drives the outcome metric' },
      archetype: ARCHETYPE_SCHEMA,
      behaviorOverTime: BOTG_SCHEMA,
      scenarioModel: SCENARIO_SCHEMA,
      sensitivityAnalysis: SENSITIVITY_SCHEMA,
      causalLoop: CAUSAL_LOOP_SCHEMA,
      stockFlow: STOCK_FLOW_SCHEMA,
      ipoMap: IPO_SCHEMA,
    },
    required: ['currentStateSimulation', 'archetype', 'behaviorOverTime', 'causalLoop', 'scenarioModel', 'ipoMap'],
  },
};

// ─── Top-level merge schema (per house) ──────────────────────────────────────

export function buildMergeToolSchema(house: HouseId): Record<string, unknown> {
  const baseProps: Record<string, unknown> = {
    fitStrength: { type: 'string', enum: ['Strong', 'Shaky', 'Mixed'] },
    verdict: { type: 'string', enum: ['GO', 'PIVOT', 'INVESTIGATE FURTHER', 'STOP'] },
    verdictRationale: { type: 'string', description: '1-2 sentences directly answering whether the fit exists' },
    sentenceOfTruth: { type: 'string', description: "The thing the user sensed but hadn't articulated — the uncomfortable truth" },
    keyIssues: { type: 'array', items: { type: 'string' }, minItems: 1 },
    necessaryMoves: { type: 'array', items: { type: 'string' }, minItems: 1 },
    systemsOutput: SYSTEMS_OUTPUT_BY_HOUSE[house],
  };
  if (house === 'investigate') {
    baseProps.povStatement = {
      type: 'string',
      description: '"For [specific user]: they need [real need], because [non-obvious insight]" — Investigate only.',
    };
  }
  return {
    type: 'object',
    properties: baseProps,
    required: ['fitStrength', 'verdict', 'verdictRationale', 'sentenceOfTruth', 'keyIssues', 'necessaryMoves', 'systemsOutput'],
  };
}

// ─── Agent output schema (same shape across all 12 agents) ───────────────────

export const AGENT_TOOL_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'One sentence: what the evidence actually shows' },
    key_findings: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
    signal: { type: 'string', description: 'The sharpest single insight' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    risks: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    structured_artifact: { type: 'string', description: 'Optional structured snapshot (e.g. iceberg layers)' },
  },
  required: ['summary', 'key_findings', 'signal', 'confidence', 'risks', 'recommendations'],
};

// ─── Reframe (lens) schema — slimmer than merge ──────────────────────────────

export const REFRAME_TOOL_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    fitStrength: { type: 'string', enum: ['Strong', 'Shaky', 'Mixed', 'Undecided'] },
    verdict: { type: 'string', enum: ['GO', 'PIVOT', 'INVESTIGATE FURTHER', 'STOP'] },
    verdictRationale: { type: 'string' },
    sentenceOfTruth: { type: 'string', description: 'Lens-shaped insight, single sentence' },
    keyIssues: { type: 'array', items: { type: 'string' }, minItems: 1 },
    necessaryMoves: { type: 'array', items: { type: 'string' }, minItems: 1 },
  },
  required: ['fitStrength', 'verdict', 'verdictRationale', 'sentenceOfTruth', 'keyIssues', 'necessaryMoves'],
};
