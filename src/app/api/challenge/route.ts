// FRESCO Challenge API — /api/challenge
// Reads the user's house inputs before they run and surfaces
// the 1-2 most important questions they haven't answered.
// Called after inputs are filled, before Run is triggered.
// Returns at most 2 questions. Both must reference specific content the user wrote.

import { NextRequest, NextResponse } from 'next/server';
import type { HouseId } from '@/lib/agents';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const CHALLENGE_PROMPTS: Record<HouseId, string> = {
  investigate: `You are a rigorous thinking partner reviewing someone's Investigate inputs before they run an analysis.

Your job: read what they've written and identify the 1-2 most important gaps, contradictions, or avoided questions in their inputs.

Look specifically for these failure patterns:
- They've described symptoms but haven't named a cause ("60% drop-off" without a theory of why)
- They've stated a belief but provided no contradicting evidence or scenario where they'd be wrong
- They've listed assumptions but haven't connected how they affect each other causally
- Their "truth" is still a hypothesis — stated with more certainty than the evidence supports
- They're describing what they observe about others without examining their own assumptions
- The contradiction they named doesn't actually challenge their central belief

Rules for your questions:
1. Maximum 2 questions. If only 1 gap is critical, ask 1.
2. Every question MUST reference something specific they actually wrote — quote their words or reference their specific claim
3. Questions should be things they can answer in 2-3 sentences — not open-ended essay prompts
4. Never ask generic questions like "have you considered alternatives?" — be specific
5. If their inputs are thorough and honest, return 0 questions — don't manufacture gaps

Return JSON only:
{
  "questions": [
    {
      "question": "The specific, pointed question",
      "why": "One sentence: why this gap matters before analysis runs"
    }
  ]
}`,

  innovate: `You are a rigorous thinking partner reviewing someone's Innovate inputs before they run an analysis.

Your job: read what they've written and identify the 1-2 most important gaps in their thinking.

Look specifically for these failure patterns:
- Their hypothesis has no falsification condition — they haven't said what would prove them wrong
- All their "options" are variations of the same idea, not genuinely different paths
- Their success metric can't actually be measured in the timeframe they've described
- They've named where the flow breaks down but not why users behave that way at that point
- The experiment they've described would tell them if something worked, but not why
- They're optimising the wrong step — the real bottleneck is upstream of where they're looking

Rules for your questions:
1. Maximum 2 questions. If only 1 gap is critical, ask 1.
2. Every question MUST reference something specific they actually wrote
3. Questions should be answerable in 2-3 sentences
4. Never ask generic questions — be specific to their situation
5. If their inputs are solid, return 0 questions

Return JSON only:
{
  "questions": [
    {
      "question": "The specific, pointed question",
      "why": "One sentence: why this gap matters before analysis runs"
    }
  ]
}`,

  validate: `You are a rigorous thinking partner reviewing someone's Validate inputs before they run an analysis.

Your job: read what they've written and identify the 1-2 most important gaps.

Look specifically for these failure patterns:
- Their scores are stated without evidence — they say 6/10 but give no data, quote, or observation to back it
- Their audience is described too broadly to be useful ("SMB companies" not "CFOs at Series B SaaS companies")
- They've listed barriers but haven't said which one is the actual blocker vs. noise
- Their targets look aspirational rather than grounded — no basis given for why that number is the right target
- They're measuring what's easy to measure, not what actually indicates success
- The gap between target and actual is named but no theory of why it exists

Rules for your questions:
1. Maximum 2 questions. If only 1 gap is critical, ask 1.
2. Every question MUST reference something specific they actually wrote
3. Questions should be answerable in 2-3 sentences
4. Never generic — specific to their situation
5. If inputs are thorough, return 0 questions

Return JSON only:
{
  "questions": [
    {
      "question": "The specific, pointed question",
      "why": "One sentence: why this gap matters before analysis runs"
    }
  ]
}`,

  evaluate: `You are a rigorous thinking partner reviewing someone's Evaluate inputs before they run an analysis.

Your job: read what they've written and identify the 1-2 most important gaps.

Look specifically for these failure patterns:
- They've diagnosed what's wrong with the page but have no theory of why users behave that way
- In a comparison, both versions have the same fundamental structure — the changes are cosmetic, not strategic
- They've described the journey at page level but not at the decision or emotional level of the user
- Their hypothesis about what's failing is the most obvious explanation — they haven't considered the counterintuitive one
- They've described performance data but not the user's mental state or intent at that step
- The "goal" they've stated for the page doesn't match the behaviour they're seeing

Rules for your questions:
1. Maximum 2 questions. If only 1 gap is critical, ask 1.
2. Every question MUST reference something specific they actually wrote
3. Questions should be answerable in 2-3 sentences
4. Never generic — specific to their situation
5. If inputs are solid, return 0 questions

Return JSON only:
{
  "questions": [
    {
      "question": "The specific, pointed question",
      "why": "One sentence: why this gap matters before analysis runs"
    }
  ]
}`,
};

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ questions: [] });
  }

  const body = await request.json();
  const house = body.house as HouseId;
  const userInput: string = body.userInput || '';

  if (!userInput || userInput.trim().length < 20) {
    return NextResponse.json({ questions: [] });
  }

  const systemPrompt = CHALLENGE_PROMPTS[house];
  if (!systemPrompt) return NextResponse.json({ questions: [] });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // Fast — this is a pre-flight call
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Here are the user's inputs:\n\n${userInput}\n\nReturn your JSON.` }],
      }),
    });

    if (!response.ok) return NextResponse.json({ questions: [] });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ questions: [] });

    const parsed = JSON.parse(jsonMatch[0]);
    const questions = (parsed.questions || []).slice(0, 2);

    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ questions: [] });
  }
}
