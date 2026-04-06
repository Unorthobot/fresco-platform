import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Extracts content from uploaded images using Claude vision.
// Only images are handled server-side — text/CSV are read client-side.

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'No API key' }, { status: 500 });
  }

  try {
    const { type, base64, mediaType, name } = await req.json();

    if (type !== 'image' || !base64) {
      return NextResponse.json({ error: 'Only image extraction is supported' }, { status: 400 });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `Extract all meaningful content from this image for use as input in a product analysis.

If it shows:
- A UI or screenshot: describe what you see, extract copy, labels, metrics, error messages
- A chart or graph: extract the data, numbers, labels, and trend
- A spreadsheet or table: extract the data as structured text
- A document page: extract the text verbatim
- Analytics or dashboards: extract all metrics and labels

Return extracted content as clean plain text. No preamble.`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude vision error:', err);
      return NextResponse.json({ text: `[Image: ${name} — extraction failed]` });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || `[Image: ${name} — no content extracted]`;
    return NextResponse.json({ text });

  } catch (err) {
    console.error('extract-file error:', err);
    return NextResponse.json({ text: '[Image — extraction failed, describe it manually]' });
  }
}
