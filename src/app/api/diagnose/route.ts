// FRESCO — /api/diagnose
// Takes a plain-text description of a situation and returns the right house
// plus a 2-3 sentence contextual explanation written about that specific situation.

import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM = `You are Fresco's diagnostic router. A user has described a decision or situation they're trying to think through.

Your job: identify which of the four Fresco houses best fits their situation, and write a 2–3 sentence explanation that speaks directly to what they described — not a generic description of the house.

The four houses:
- investigate: Use when the user needs to understand what's actually happening before deciding anything. The problem is unclear, the cause is unknown, or assumptions haven't been tested.
- innovate: Use when the user understands the problem and needs to turn it into focused options worth building. The question is what to build or how to solve it.
- validate: Use when the user is about to commit to something (spend money, build a feature, launch) and needs to test whether it will work before they do.
- evaluate: Use when something has already been built or shipped and the user needs to understand how it's performing — what's working, what isn't, where to improve.

Write the explanation in second person ("you"). Be specific — reference the actual situation they described. Don't use the house name in the explanation. Keep it to 2–3 sentences maximum. Be direct and honest, not encouraging or salesy.

Respond ONLY with valid JSON in this exact shape:
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
