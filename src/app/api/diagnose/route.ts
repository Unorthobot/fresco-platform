// FRESCO — /api/diagnose
// Takes a plain-text description of a situation and returns the right house
// plus a 2-3 sentence contextual explanation written about that specific situation.

import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM = `You are Fresco's diagnostic router. Classify the user's situation into one of four houses using the decision tree below.

DECISION TREE (follow in order — first match wins):

1. Does the user mention something that ALREADY EXISTS, IS LIVE, HAS SHIPPED, or HAS BEEN TRIED?
   Signals: "our landing page", "we launched", "conversion is", "users are dropping off", "the feature is live", "we tried", "performance is", "already shipped", "currently getting", past tense describing results.
   → evaluate

2. Is the user ABOUT TO COMMIT significant resources (money, engineering time, a launch, a hire, a deal) and asking whether to proceed?
   Signals: "we're about to", "should we launch", "thinking of spending", "planning to build", "considering whether to commit", "before we invest", "is this worth", "will this sell", commitment-in-question framing.
   → validate

3. Does the user UNDERSTAND THE PROBLEM and need to figure out WHAT TO BUILD or HOW TO SOLVE IT?
   Signals: "what should we build", "how do we solve", "what's the best approach", "comparing options", "which direction", "how might we", multiple solutions already on the table.
   → innovate

4. Otherwise — the problem itself is UNCLEAR, or the user needs to understand the situation before deciding what to do.
   Signals: "why is this happening", "I'm not sure what's going on", "trying to figure out", "don't know if the problem is", diagnostic framing without a specific solution in mind.
   → investigate

IMPORTANT: Don't default to investigate just because a situation sounds early-stage. If the user mentions anything already built, launched, or in-market, that's evaluate. If they name a specific commitment they're weighing up, that's validate.

Write a 2–3 sentence explanation in second person ("you"). Reference their actual situation — don't generalise. Don't name the house in the explanation. Be direct and honest, not encouraging.

Respond ONLY with valid JSON:
{
  "house": "investigate" | "innovate" | "validate" | "evaluate",
  "explanation": "2-3 sentence contextual explanation"
}`;

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input || input.trim().length < 5) {
      return NextResponse.json({ error: 'Input too short' }, { status: 400 });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // fast + cheap for a one-liner diagnostic
        max_tokens: 300,
        system: SYSTEM,
        messages: [{ role: 'user', content: input.trim() }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic error ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');

    const result = JSON.parse(match[0]);
    const validHouses = ['investigate', 'innovate', 'validate', 'evaluate'];
    if (!validHouses.includes(result.house)) throw new Error('Invalid house');

    return NextResponse.json(result);
  } catch (err) {
    console.error('Diagnose error:', err);
    // Fallback to investigate with generic message
    return NextResponse.json({
      house: 'investigate',
      explanation: 'Start by investigating — before deciding on a direction, it helps to separate what you\'ve actually observed from what you\'re assuming is causing it.',
    });
  }
}
