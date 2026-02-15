// FRESCO AI Generation API
// Uses Claude API for intelligent insight generation across all toolkit types

import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Lens-specific output instructions
function getLensSpecificInstructions(lens: string): string {
  const instructions: Record<string, string> = {
    systems: `
Additionally, identify the KEY SYSTEM ELEMENTS and their RELATIONSHIPS.
Include a "systemsDiagram" object with:
- "nodes": array of 3-5 key elements/factors in this system
- "connections": array of relationships, each with "from", "to", and optional "label" describing the relationship`,

    futures: `
Additionally, generate THREE SCENARIOS for how this might play out.
Include a "futuresScenarios" object with:
- "optimistic": the best-case outcome (2-3 sentences)
- "pessimistic": the worst-case outcome (2-3 sentences)  
- "mostLikely": the realistic middle path (2-3 sentences)`,

    ethical: `
Additionally, map the STAKEHOLDER IMPACTS of this situation.
Include an "ethicalMatrix" object with:
- "stakeholders": array of 3-5 affected parties, each with "name", "impact" (positive/negative/neutral), and "notes"`,

    first_principles: `
Additionally, break down the FUNDAMENTAL TRUTHS underlying this situation.
Include a "firstPrinciplesList" array with 3-5 foundational truths or axioms that this situation depends on.`,

    narrative: `
Additionally, frame this as a STORY ARC.
Include a "narrativeArc" object with:
- "setup": the current situation and context
- "conflict": the core tension or challenge
- "resolution": the path forward or transformation needed`,
  };
  
  return instructions[lens] || '';
}

// JSON format hints for lens-specific outputs
function getLensSpecificJsonHint(lens: string): string {
  const hints: Record<string, string> = {
    systems: `,
  "systemsDiagram": { "nodes": ["element1", "element2"], "connections": [{"from": "element1", "to": "element2", "label": "influences"}] }`,
    futures: `,
  "futuresScenarios": { "optimistic": "...", "pessimistic": "...", "mostLikely": "..." }`,
    ethical: `,
  "ethicalMatrix": { "stakeholders": [{"name": "...", "impact": "positive", "notes": "..."}] }`,
    first_principles: `,
  "firstPrinciplesList": ["truth 1", "truth 2", "truth 3"]`,
    narrative: `,
  "narrativeArc": { "setup": "...", "conflict": "...", "resolution": "..." }`,
  };
  
  return hints[lens] || '';
}

interface Step {
  label: string;
  content: string;
}

interface OutputLabels {
  primary: string;
  secondary: string;
  action: string;
}

interface WorkspaceSessionContext {
  toolkit: string;
  toolkitName?: string;
  sentenceOfTruth?: string;
  insights?: string[];
  necessaryMoves?: string[];
  steps?: { label: string; content: string }[];
}

interface GenerateRequest {
  // New generic format
  toolkitType?: string;
  toolkitName?: string;
  steps?: Step[];
  outputLabels?: OutputLabels;
  thinkingLens: string;
  workspaceContext?: WorkspaceSessionContext[];
  // Legacy Insight Stack format (backward compatibility)
  context?: string;
  observations?: string;
  patterns?: string;
  tensions?: string;
  insightExtraction?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    
    // Check if we have content (either new or legacy format)
    const hasNewContent = body.steps?.some(s => s.content?.trim().length > 0);
    const hasLegacyContent = body.context || body.observations || body.patterns || body.tensions || body.insightExtraction;
    
    if (!hasNewContent && !hasLegacyContent) {
      return NextResponse.json({ insights: [], sentenceOfTruth: '', necessaryMoves: [] });
    }

    // If API key exists, use Claude
    if (ANTHROPIC_API_KEY) {
      try {
        const result = await callClaudeAPI(body);
        return NextResponse.json(result);
      } catch (error) {
        console.error('Claude API error:', error);
        // Fall through to basic response
      }
    }

    // No API key - return a message prompting to add one
    return NextResponse.json({
      insights: [
        'To get AI-powered insights, add your Anthropic API key in Settings or create a .env.local file with ANTHROPIC_API_KEY=your-key',
      ],
      sentenceOfTruth: '',
      necessaryMoves: [
        'Add ANTHROPIC_API_KEY to enable intelligent analysis',
        'Go to console.anthropic.com to get an API key',
      ],
    });
    
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}

async function callClaudeAPI(body: GenerateRequest) {
  const { toolkitType, toolkitName, steps, outputLabels, thinkingLens } = body;
  
  const lensDescriptions: Record<string, string> = {
    automatic: 'Provide balanced analysis considering multiple perspectives',
    critical: 'Focus on truth-testing, questioning assumptions, and examining evidence',
    systems: 'Analyse interconnections, feedback loops, and emergent patterns',
    design: 'Consider human context, empathy, emotions, and user experience',
    product: 'Evaluate feasibility, viability, and practical implementation',
    analytical: 'Break down into patterns, categories, and structured data',
    first_principles: 'Reduce to fundamental truths and build up from basics',
    strategic: 'Consider direction, prioritisation, competition, and long-term impact',
    futures: 'Explore scenarios, forecast implications, and consider future states',
    scientific: 'Form hypotheses, consider testability, and examine evidence',
    economic: 'Analyse value exchange, incentives, costs, and benefits',
    ethical: 'Examine integrity, consequences, fairness, and moral dimensions',
    narrative: 'Find meaning, story, and ways to communicate the insight',
  };

  // Toolkit-specific guidance
  const toolkitGuidance: Record<string, string> = {
    insight_stack: `The user is working through an Insight Stack - a 5-step process for extracting insights from complexity.
Generate insights that reveal patterns they haven't articulated, a Sentence of Truth that captures the core realisation, and Necessary Moves as concrete next steps.`,
    
    pov_generator: `The user is working through a POV Generator - crystallising a defensible point of view.
They have provided: User (who), Need (what they need), Truth (the underlying reason), and optionally a Consequence.

Generate POV Synthesis points that sharpen their thinking, and MOST IMPORTANTLY: a Core POV Statement that is a GRAMMATICALLY POLISHED, PROFESSIONALLY WRITTEN version of their POV that flows naturally as a single coherent statement. This should take their raw inputs and transform them into an articulate, presentation-ready statement they could confidently share with stakeholders. Also include Strategic Implications that flow from this POV.`,
    
    mental_model_mapper: `The user is mapping mental models - uncovering the frameworks that shape decisions.

They have provided:
- DOMAIN: The area they're examining
- BELIEFS: Individual beliefs categorised as assumptions, facts, or opinions
- RELATIONSHIPS: Connections the user has drawn between beliefs (these are significant - they show the user's intuition about how beliefs relate)
- GAPS: Missing information or uncertainties they've identified
- MODEL: Their initial summary

Pay special attention to the RELATIONSHIPS section - when beliefs are connected, analyse:
1. Do they REINFORCE each other (creating a stronger conviction)?
2. Do they CONTRADICT each other (revealing internal conflict)?
3. Do they form a DEPENDENCY CHAIN (if one falls, others collapse)?
4. Do they reveal BLIND SPOTS (connected assumptions that haven't been tested)?

Generate Model Components that identify the key structural elements of their mental model, a Mental Model Summary that names and defines the model they're operating with, and Model Applications showing where this model serves them well and where it might fail them.`,
    
    flow_board: `The user is designing flows - mapping journeys, processes, or experiences.
Generate Flow Analysis points that identify friction and opportunity, an Optimal Path that describes the ideal flow, and Flow Improvements as specific changes to implement.`,
    
    experiment_brief: `The user is structuring an experiment - preparing to test a hypothesis.
Generate Experiment Design considerations that strengthen rigor, a Core Hypothesis that is clear and testable, and a Test Plan with specific steps to run the experiment.`,
    
    strategy_sketchbook: `The user is exploring strategic options - mapping possibilities before commitment.
Generate Strategic Options that expand their thinking, a Strategic Direction that emerges as most promising, and Next Moves to advance the strategy.`,
    
    ux_scorecard: `The user is evaluating user experience - assessing quality against criteria.
Generate UX Evaluation points across key dimensions, an Overall Assessment that summarises the experience quality, and Priority Fixes that would have the highest impact.`,
    
    persuasion_canvas: `The user is mapping persuasion - understanding how to communicate and influence.
Generate Persuasion Elements that identify key levers, a Core Message that captures the essential pitch, and a Communication Plan for delivery.`,
    
    performance_grid: `The user is analysing performance - understanding what's working and what isn't.
Generate Performance Analysis across key metrics, a Key Finding that captures the most important insight, and Optimisation Actions to improve performance.`,

    workspace_synthesis: `You are synthesising insights from MULTIPLE toolkit sessions in a workspace to provide a META-LEVEL VIEW of the entire project.

The user has completed various thinking exercises and you have access to:
- CORE TRUTHS: The "Sentences of Truth" from each toolkit session
- KEY INSIGHTS: Individual insights generated across all sessions  
- IDENTIFIED ACTIONS: Next steps and moves identified across sessions

Your job is to:
1. Identify CROSS-CUTTING THEMES that emerge across multiple sessions
2. Synthesise a single PROJECT DIRECTION that captures what all this thinking points toward
3. Recommend STRATEGIC NEXT STEPS that build on the accumulated clarity

Be bold in your synthesis - look for patterns, contradictions, and the bigger picture that individual sessions couldn't see. This is the helicopter view of their thinking.`,
  };

  const guidance = toolkitGuidance[toolkitType || 'insight_stack'] || toolkitGuidance.insight_stack;
  const labels = outputLabels || { primary: 'Insights', secondary: 'Sentence of Truth', action: 'Necessary Moves' };

  const systemPrompt = `You are FRESCO, an AI thinking partner that helps people extract clarity from complexity through structured thinking.

${guidance}

Your role is to analyse their thinking and generate:
1. **${labels.primary}** (2-4 key observations that ADD NEW PERSPECTIVE - don't just repeat what they said)
2. **${labels.secondary}** (ONE powerful, memorable statement that captures the core of what they're working toward)
3. **${labels.action}** (2-4 specific, actionable next steps)

THINKING LENS: ${thinkingLens}
${lensDescriptions[thinkingLens] || lensDescriptions.automatic}

CRITICAL RULES:
- Actually engage with the SPECIFIC content they've shared
- Don't be generic - reference their actual situation
- The ${labels.secondary} should feel like an "aha moment" - something true they sensed but hadn't put into words
- Be direct and insightful, not corporate or vague
- If the situation is personal/emotional, acknowledge that dimension
- ${labels.action} should be concrete actions THEY can take

${getLensSpecificInstructions(thinkingLens)}

Respond ONLY with valid JSON in this exact format:
{
  "insights": ["point 1", "point 2", "point 3"],
  "sentenceOfTruth": "Your single powerful statement here",
  "necessaryMoves": ["action 1", "action 2", "action 3"]${getLensSpecificJsonHint(thinkingLens)}
}`;

  // Build workspace context section if available
  let workspaceContextSection = '';
  if (body.workspaceContext && body.workspaceContext.length > 0) {
    const contextSummary = body.workspaceContext.map(ctx => {
      let summary = `### ${ctx.toolkitName || ctx.toolkit.replace(/_/g, ' ').toUpperCase()}`;
      
      // Include key step content
      if (ctx.steps && ctx.steps.length > 0) {
        const filledSteps = ctx.steps.filter(s => s.content && s.content.trim().length > 0);
        if (filledSteps.length > 0) {
          summary += '\nUser Input:';
          filledSteps.forEach(s => {
            const truncated = s.content.length > 200 ? s.content.slice(0, 200) + '...' : s.content;
            summary += `\n- ${s.label}: ${truncated}`;
          });
        }
      }
      
      if (ctx.sentenceOfTruth) {
        summary += `\nCore Finding: "${ctx.sentenceOfTruth}"`;
      }
      if (ctx.insights && ctx.insights.length > 0) {
        summary += `\nKey Insights: ${ctx.insights.slice(0, 3).join('; ')}`;
      }
      if (ctx.necessaryMoves && ctx.necessaryMoves.length > 0) {
        summary += `\nNext Steps Identified: ${ctx.necessaryMoves.slice(0, 2).join('; ')}`;
      }
      return summary;
    }).join('\n\n');
    
    workspaceContextSection = `
=== IMPORTANT: CONTEXT FROM PREVIOUS WORK ===
The user has already completed other toolkits in this workspace. You MUST build on their previous thinking and reference it directly:

${contextSummary}

When generating your response:
1. Reference specific findings from their previous work
2. Build on insights they've already uncovered
3. Connect new insights to their existing understanding
4. Don't ask them to repeat information they've already provided
===

`;
  }

  // Build user prompt from steps
  let userPrompt: string;
  
  if (steps && steps.length > 0) {
    // New generic format
    const stepContent = steps.map(s => `${s.label.toUpperCase()}:\n${s.content || '(not yet filled in)'}`).join('\n\n');
    userPrompt = `${workspaceContextSection}Here's what the user has captured in their ${toolkitName || 'session'}:

${stepContent}

Based on what they've shared${body.workspaceContext ? ' and their previous work in this workspace' : ''}, generate ${labels.primary.toLowerCase()} that actually engage with their specific situation. Remember: be specific to THEIR context, not generic.`;
  } else {
    // Legacy Insight Stack format
    userPrompt = `${workspaceContextSection}Here's what the user has captured so far:

CONTEXT:
${body.context || '(not yet filled in)'}

OBSERVATIONS:
${body.observations || '(not yet filled in)'}

PATTERNS:
${body.patterns || '(not yet filled in)'}

TENSIONS:
${body.tensions || '(not yet filled in)'}

USER'S INITIAL INSIGHT:
${body.insightExtraction || '(not yet filled in)'}

Based on what they've shared${body.workspaceContext ? ' and their previous work in this workspace' : ''}, generate insights that actually engage with their specific situation. Remember: be specific to THEIR context, not generic.`;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Anthropic API error:', errorText);
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text;
  
  if (!content) {
    throw new Error('Empty response from Claude');
  }

  // Parse the JSON response
  try {
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanedContent);
    return {
      insights: parsed.insights || [],
      sentenceOfTruth: parsed.sentenceOfTruth || '',
      necessaryMoves: parsed.necessaryMoves || [],
      // Lens-specific outputs (optional)
      systemsDiagram: parsed.systemsDiagram || null,
      futuresScenarios: parsed.futuresScenarios || null,
      ethicalMatrix: parsed.ethicalMatrix || null,
      firstPrinciplesList: parsed.firstPrinciplesList || null,
      narrativeArc: parsed.narrativeArc || null,
    };
  } catch (parseError) {
    console.error('Failed to parse Claude response:', content);
    throw new Error('Failed to parse response');
  }
}
