// FRESCO Deep Dive API
// Explores a single insight through a specific thinking lens

import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface DeepDiveRequest {
  insight: string;
  originalLens: string;
  deepDiveLens: string;
}

const lensLabels: Record<string, string> = {
  automatic: 'Automatic',
  critical: 'Critical',
  systems: 'Systems',
  design: 'Design',
  product: 'Product',
  analytical: 'Analytical',
  first_principles: 'First Principles',
  strategic: 'Strategic',
  futures: 'Futures',
  scientific: 'Scientific',
  economic: 'Economic',
  ethical: 'Ethical',
  narrative: 'Narrative',
  lateral: 'Lateral',
  computational: 'Computational',
  philosophical: 'Philosophical',
  behavioral: 'Behavioral',
};

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
  lateral: 'Make creative leaps beyond constraints',
  computational: 'Apply logical steps and algorithmic breakdowns',
  philosophical: 'Examine essence, purpose, and ontology',
  behavioral: 'Consider human bias, motivation, and behavioural patterns',
};

export async function POST(request: NextRequest) {
  try {
    const body: DeepDiveRequest = await request.json();
    const { insight, originalLens, deepDiveLens } = body;
    
    if (!insight || !deepDiveLens) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({
        observations: ['Add your Anthropic API key in Settings to enable Deep Dive'],
        refinedInsight: insight,
        nextSteps: ['Go to console.anthropic.com to get an API key'],
      });
    }
    
    const lensName = lensLabels[deepDiveLens] || deepDiveLens;
    const originalLensName = lensLabels[originalLens] || originalLens;
    const lensDescription = lensDescriptions[deepDiveLens] || '';
    
    const systemPrompt = `You are FRESCO, an AI thinking partner. You help people explore their insights more deeply by applying different thinking lenses.

Your approach for ${lensName} thinking: ${lensDescription}

The user has an insight that was originally generated through ${originalLensName} thinking. Your job is to examine it through the lens of ${lensName} thinking to reveal new dimensions.

Respond ONLY with valid JSON in this format:
{
  "observations": ["observation 1", "observation 2"],
  "refinedInsight": "An evolved or refined version of the original insight",
  "nextSteps": ["step 1", "step 2"]
}`;

    const userPrompt = `Please explore this insight through ${lensName} thinking:

ORIGINAL INSIGHT: "${insight}"

Using ${lensName} thinking (${lensDescription}):
1. What new dimensions or implications do you see?
2. How might you refine or evolve this insight?
3. What specific actions follow from this perspective?

Be specific and practical. Don't just restate - add genuine new perspective.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: userPrompt }],
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
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanedContent);
    
    return NextResponse.json({
      observations: parsed.observations || [],
      refinedInsight: parsed.refinedInsight || insight,
      nextSteps: parsed.nextSteps || [],
    });
    
  } catch (error) {
    console.error('Deep dive error:', error);
    return NextResponse.json({ error: 'Failed to generate deep dive' }, { status: 500 });
  }
}
