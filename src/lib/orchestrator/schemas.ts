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
// These schemas are intentionally permissive on optional fields. Strict
// schemas are appropriate when the consumer fails on missing data; ours
// degrades gracefully (the section components hide if a field is missing),
// so requiring fewer fields gives the model room to omit data it doesn't
// have rather than fabricating it.

import type { HouseId } from './index';

// ─── Reusable nested shapes ──────────────────────────────────────────────────

const ARCHETYPE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: ['string', 'null'], description: 'System archetype name (Fixes that Fail, Shifting the Burden, Limits to Growth, Eroding Goals, Escalation, Success to the Successful, Tragedy of the Commons, Accidental Adversaries) or null if none clearly applies.' },
    description: { type: 'string', description: '1-2 sentences: why this archetype applies to THIS situation' },
    loop: { type: 'string', description: 'The specific loop in plain English' },
    escape: { type: 'string', description: 'How to break out of this archetype — one concrete action' },
  },
  required: ['name'],
} as const;

const BOTG_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      variable: { type: 'string' },
      unit: { type: 'string' },
      dataPoints: {
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
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
        },
        required: ['id', 'label'],
      },
    },
    edges: {
      type: 'array',
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
    dominantLoop: { type: 'string' },
    loopType: { type: 'string', enum: ['reinforcing', 'balancing', 'both'] },
  },
  required: ['nodes', 'edges'],
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
  properties: {
    outcomeVariable: { type: 'string' },
    outcomeUnit: { type: 'string' },
    baselineValue: { type: 'number' },
    variables: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          unit: { type: 'string' },
          currentValue: { type: 'number' },
          minValue: { type: 'number' },
          maxValue: { type: 'number' },
          sensitivityScore: { type: 'number' },
          direction: { type: 'string', enum: ['positive', 'negative'] },
        },
        required: ['name', 'currentValue'],
      },
    },
  },
  required: ['outcomeVariable', 'variables'],
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
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['label'],
      },
    },
    bottleneck: { type: 'string' },
  },
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
      currentStateSimulation: { type: 'string', description: 'If nothing changes — one sentence' },
      systemTruth: { type: 'string', description: 'The uncomfortable truth — one sentence' },
      archetype: ARCHETYPE_SCHEMA,
      behaviorOverTime: BOTG_SCHEMA,
      causalLoop: CAUSAL_LOOP_SCHEMA,
      ipoMap: IPO_SCHEMA,
      sensitivityAnalysis: SENSITIVITY_SCHEMA,
    },
  },
  innovate: {
    type: 'object',
    properties: {
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
  },
  validate: {
    type: 'object',
    properties: {
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
  },
  evaluate: {
    type: 'object',
    properties: {
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
    required: ['fitStrength', 'verdict', 'verdictRationale', 'sentenceOfTruth', 'keyIssues', 'necessaryMoves'],
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
