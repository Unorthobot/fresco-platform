import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'No API key' }, { status: 500 });
  }

  const contentType = req.headers.get('content-type') || '';

  try {
    // ── Image extraction (JSON body with base64) ──────────────────────────
    if (contentType.includes('application/json')) {
      const { type, base64, mediaType, name } = await req.json();

      if (type === 'image') {
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
                  text: `Extract all meaningful text and data from this image for use as input in a product analysis. 
                  
If it contains:
- A screenshot/UI: describe what you see, extract any copy, labels, metrics, or data
- A chart or graph: describe the data, extract numbers, labels, trends
- A document or spreadsheet: extract the text and structured data
- A photo or illustration: describe what's relevant for a product context

Return the extracted content as clean plain text. Include numbers, labels, and any visible data.
Do not include preamble — just the extracted content.`,
                },
              ],
            }],
          }),
        });

        const data = await response.json();
        const text = data.content?.[0]?.text || `[Image: ${name} — no text extracted]`;
        return NextResponse.json({ text });
      }
    }

    // ── Document extraction (FormData with file) ──────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const buffer = await file.arrayBuffer();

      // PDF — use pdfjs-based text extraction via Claude
      if (ext === 'pdf') {
        const base64 = Buffer.from(buffer).toString('base64');
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
            max_tokens: 2048,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: { type: 'base64', media_type: 'application/pdf', data: base64 },
                },
                {
                  type: 'text',
                  text: 'Extract all meaningful text and data from this document for use as input in a product analysis. Return the content as clean plain text with structure preserved. Do not add preamble.',
                },
              ],
            }],
          }),
        });
        const data = await response.json();
        const text = data.content?.[0]?.text || `[PDF: ${file.name} — could not extract]`;
        return NextResponse.json({ text });
      }

      // CSV / TSV — parse directly
      if (ext === 'csv' || ext === 'tsv') {
        const text = Buffer.from(buffer).toString('utf-8');
        return NextResponse.json({ text });
      }

      // XLSX / XLS — extract as CSV-like text using a simple approach
      if (ext === 'xlsx' || ext === 'xls') {
        // Return a note — full XLSX parsing requires a library
        // For now extract any visible text
        const text = `[Spreadsheet: ${file.name}]\nFile uploaded but rich spreadsheet parsing is not available in this environment. Please copy and paste the relevant data directly.`;
        return NextResponse.json({ text });
      }

      // DOCX — extract text from XML
      if (ext === 'docx') {
        try {
          // DOCX is a ZIP — extract word/document.xml
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(buffer);
          const docXml = await zip.file('word/document.xml')?.async('string');
          if (docXml) {
            // Strip XML tags, preserve text
            const text = docXml
              .replace(/<w:p[^>]*>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
              .replace(/\n{3,}/g, '\n\n')
              .trim();
            return NextResponse.json({ text });
          }
        } catch {
          // fall through
        }
        return NextResponse.json({ text: `[Document: ${file.name} — could not extract text]` });
      }

      // Fallback — try reading as plain text
      const text = Buffer.from(buffer).toString('utf-8');
      return NextResponse.json({ text });
    }

    return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
  } catch (err) {
    console.error('extract-file error:', err);
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}
