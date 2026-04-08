import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'No API key' }, { status: 500 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';

    // ── Image extraction via Claude vision ──────────────────────────────────
    if (contentType.includes('application/json')) {
      const { type, base64, mediaType, name } = await req.json();

      if (type !== 'image' || !base64) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
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
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              {
                type: 'text',
                text: `You are extracting content from an image to be used as evidence in a product analysis session.

Be analytical, not just descriptive. Extract what matters for decision-making.

If this is a UI screenshot or mockup:
- What is the page trying to achieve? What is the primary CTA?
- Extract all visible copy, headlines, labels, microcopy verbatim
- Note what creates or destroys trust (social proof, pricing, friction)
- Note what's missing or unclear

If this is analytics, a dashboard, or chart:
- Extract every metric, number, and label
- State the trend (rising/falling/flat) and what period it covers
- Note any anomalies or notable data points

If this is a document, research, or notes:
- Extract the key findings, claims, and evidence verbatim
- Note what is asserted vs what is backed by data

If this is a table or spreadsheet:
- Reproduce the data as structured text with headers

Return extracted content as clean plain text. Lead with the most important finding. No preamble like "This image shows..."`,
              },
            ],
          }],
        }),
      });

      if (!response.ok) {
        return NextResponse.json({ text: `[Image: ${name} — extraction failed. Describe what it shows in your answer.]` });
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || `[Image: ${name} — no content extracted]`;
      return NextResponse.json({ text });
    }

    // ── Document extraction (PDF, DOCX, etc.) via Claude with PDF beta ──────
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');

      // PDF — use Claude's native PDF support
      if (ext === 'pdf') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'pdfs-2024-09-25',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2000,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: { type: 'base64', media_type: 'application/pdf', data: base64 },
                },
                {
                  type: 'text',
                  text: `Extract the key content from this document for use as evidence in a product analysis session.

Focus on what matters for decision-making:
- Key findings, conclusions, or recommendations
- Metrics, data points, and evidence
- Problem statements or hypotheses
- Any quotes or verbatim claims worth preserving

If it is research or a report: summarise findings and extract key data.
If it is a spec or PRD: extract the goals, requirements, and open questions.
If it is a strategy doc: extract the core argument and the assumptions.

Return as clean structured plain text. Be concise. No preamble.`,
                },
              ],
            }],
          }),
        });

        if (!response.ok) {
          return NextResponse.json({ text: `[PDF: ${file.name} — could not extract. Paste key content manually.]` });
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || `[PDF: ${file.name} — no content extracted]`;
        return NextResponse.json({ text: `[From ${file.name}]\n${text}` });
      }

      // Plain text files (txt, md, csv, json)
      if (['txt', 'md', 'csv', 'json'].includes(ext)) {
        const text = new TextDecoder().decode(bytes);
        const truncated = text.length > 8000 ? text.slice(0, 8000) + '\n[truncated]' : text;
        return NextResponse.json({ text: `[From ${file.name}]\n${truncated}` });
      }

      // DOCX — extract raw XML text as fallback
      if (['docx', 'doc'].includes(ext)) {
        // Try reading as text (works for some doc formats)
        const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        // Extract readable strings from the binary (crude but functional)
        const readable = text
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s{3,}/g, '\n')
          .trim()
          .slice(0, 4000);
        if (readable.length > 100) {
          return NextResponse.json({ text: `[From ${file.name}]\n${readable}` });
        }
        return NextResponse.json({ text: `[File: ${file.name} — DOCX extraction is limited. Copy and paste the key content directly.]` });
      }

      return NextResponse.json({ text: `[File: ${file.name} — unsupported format. Paste key content manually.]` });
    }

    return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });

  } catch (err) {
    console.error('extract-file error:', err);
    return NextResponse.json({ text: '[File — extraction failed. Paste key content manually.]' });
  }
}
