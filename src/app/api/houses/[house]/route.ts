// FRESCO Houses API — /api/houses/[house]
// Sequential agent execution: each agent receives prior agents' outputs.
// Streaming SSE: each agent result sent as it completes.
// Synthesis layer merges all outputs into a single HouseResult.
//
// SSE event types:
//   { type: 'agent', displayName, signal, summary, confidence }  — one per agent
//   { type: 'verdict', ...HouseResult }                          — final merged output
//   { type: 'error', message }

import { NextRequest } from 'next/server';
import { HOUSE_AGENTS, type HouseId } from '@/lib/agents';
import type { AgentOutput } from '@/lib/orchestrator';
import { buildMergePrompt, buildHouseResult, mergeAgentOutputsLocally } from '@/lib/orchestrator';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ── URL content fetcher ───────────────────────────────────────────────────────

async function fetchPageContent(url: string): Promise<{ content: string; title: string; fetched: boolean }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return { content: '', title: '', fetched: false };

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return { content: '', title: '', fetched: false };

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';

    // Extract meta description + OG fallback
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const metaDesc = metaMatch ? metaMatch[1].trim() : '';
    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const ogDesc = ogDescMatch ? ogDescMatch[1].trim() : '';

    // Try to extract Next.js pre-rendered data from __NEXT_DATA__
    let spaText = '';
    const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const extractStrings = (obj: any, depth = 0): string[] => {
          if (depth > 4) return [];
          if (typeof obj === 'string' && obj.length > 20 && obj.length < 500) return [obj];
          if (Array.isArray(obj)) return obj.flatMap((v: any) => extractStrings(v, depth + 1));
          if (obj && typeof obj === 'object') return Object.values(obj).flatMap((v: any) => extractStrings(v, depth + 1));
          return [];
        };
        spaText = extractStrings(nextData?.props?.pageProps || nextData?.props || nextData).slice(0, 40).join('\n');
      } catch { /* ignore */ }
    }

    // Strip noise
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s>][\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s>][\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s>][\s\S]*?<\/header>/gi, '')
      .replace(/<head[\s>][\s\S]*?<\/head>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

    const mainText = text.length < 200 && spaText ? spaText : text;
    const truncated = mainText.length > 6000 ? mainText.slice(0, 6000) + '…' : mainText;

    const content = [
      title ? `Page title: ${title}` : '',
      metaDesc ? `Meta description: ${metaDesc}` : (ogDesc ? `Description: ${ogDesc}` : ''),
      truncated ? `Page content:\n${truncated}` : '',
    ].filter(Boolean).join('\n\n');

    return { content, title, fetched: content.length > 100 };
  } catch {
    return { content: '', title: '', fetched: false };
  }
}

async function runAgent(
  agent: { id: string; displayName: string; systemPrompt: string },
  userInput: string,
  priorOutputs: AgentOutput[],
  context?: string,
  pageContent?: string,
  pageFetchStatus?: 'fetched' | 'failed' | 'none',
  originalUrl?: string,
): Promise<AgentOutput> {
  // Flag uploaded files in the user input so agents know to use them as reference
  const uploadedFilesNote = userInput.includes('[Uploaded file:') || userInput.includes('[Uploaded image:')
    ? `\n\nNOTE: The user has uploaded reference files. Their content appears inline prefixed with [Uploaded file:] or [Uploaded image:]. Use this material as evidence to inform your analysis — it is context the user provided, not their direct answer.`
    : '';

  const contextSection = context
    ? `\n\nWORKSPACE CONTEXT (from prior sessions):\n${context}`
    : '';
  const pageSection = pageContent
    ? `\n\n━━━ LIVE PAGE CONTENT (fetched directly from the URL) ━━━\n${pageContent}\n━━━ END PAGE CONTENT ━━━\n\nIMPORTANT: The content above is the actual live page. Base your entire analysis on what is written there — the real headlines, copy, CTAs, structure, and messaging. Do not substitute generic assumptions. Quote specific text from the page in your findings where relevant.`
    : pageFetchStatus === 'failed'
    ? `\n\nNOTE: The URL ${originalUrl || '(provided)'} could not be fetched — the page is likely JavaScript-rendered, behind authentication, or bot-protected.\n\nDo NOT say you cannot analyse it. Instead:\n1. If you recognise this domain/product, use your knowledge of it directly\n2. Reason analytically from the user's description of the page\n3. State specifically what you verified vs what you're inferring\n4. Name what you would need to see to be more confident\nA specific partial analysis beats a generic refusal every time.`
    : '';

  // Sequential context: each agent sees what prior agents found
  const priorSection = priorOutputs.length > 0
    ? `\n\nPRIOR AGENT OUTPUTS (build on these — don't repeat them):\n` +
      priorOutputs.map(p =>
        `${p.displayName}:\n- Summary: ${p.summary}\n- Key findings: ${p.key_findings.join(' | ')}\n- Signal: ${p.signal}`
      ).join('\n\n')
    : '';

  const userMessage = `${contextSection}${pageSection}${priorSection}\n\nUSER INPUT:\n${userInput}\n\nReturn your JSON analysis.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: agent.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) throw new Error(`Agent ${agent.id} error: ${response.status}`);

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Agent ${agent.id} returned no JSON`);

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    agentId: agent.id,
    displayName: agent.displayName,
    summary: parsed.summary || '',
    key_findings: parsed.key_findings || [],
    signal: parsed.signal || '',
    confidence: parsed.confidence || 'medium',
    risks: parsed.risks || [],
    recommendations: parsed.recommendations || [],
    structured_artifact: parsed.structured_artifact || undefined,
  };
}

async function runMerge(house: HouseId, agentOutputs: AgentOutput[], userInput: string) {
  const mergePrompt = buildMergePrompt(house, agentOutputs, userInput);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: mergePrompt }],
    }),
  });
  if (!response.ok) throw new Error(`Merge error: ${response.status}`);
  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Merge returned no JSON');
  return JSON.parse(jsonMatch[0]);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { house: string } }
) {
  const house = params.house as HouseId;
  const validHouses: HouseId[] = ['investigate', 'innovate', 'validate', 'evaluate'];

  if (!validHouses.includes(house)) {
    return new Response(JSON.stringify({ error: `Invalid house: ${house}` }), { status: 400 });
  }

  const body = await request.json();
  const userInput: string = body.userInput || '';
  const context: string | undefined = body.context;
  const url: string | undefined = body.url;

  if (!userInput || userInput.trim().length < 10) {
    return new Response(JSON.stringify({ error: 'userInput required (min 10 chars)' }), { status: 400 });
  }

  // ── Fetch page content if URL provided (Evaluate house) ──────────────────
  let pageContent: string | undefined;
  let pageFetchStatus: 'fetched' | 'failed' | 'none' = 'none';

  const normaliseUrl = (u: string) => u.startsWith('http') ? u : `https://${u}`;
  if (url && url.trim()) {
    const urls = url.split('\n').map(u => normaliseUrl(u.trim())).filter(u => u.length > 8);
    if (urls.length > 0) {
      const results = await Promise.all(urls.slice(0, 3).map(u => fetchPageContent(u)));
      const fetched = results.filter(r => r.fetched);
      if (fetched.length > 0) {
        pageContent = urls.length === 1
          ? fetched[0].content
          : fetched.map((r, i) => `=== Page ${i + 1}: ${urls[i]} ===\n${r.content}`).join('\n\n');
        pageFetchStatus = 'fetched';
      } else {
        pageFetchStatus = 'failed';
      }
    }
  }

  if (!ANTHROPIC_API_KEY) {
    const fallback = {
      type: 'verdict',
      house,
      fitLabel: house,
      fitStrength: 'Undecided',
      verdict: 'INVESTIGATE FURTHER',
      verdictRationale: 'Add your Anthropic API key in Settings to enable AI-powered house analysis.',
      sentenceOfTruth: 'Configure ANTHROPIC_API_KEY to unlock full orchestration.',
      keyIssues: ['API key not configured — go to Settings to add your Anthropic key.'],
      necessaryMoves: ['Add ANTHROPIC_API_KEY to your environment variables.'],
      suggestedNextHouse: null,
      suggestedNextHouseReason: '',
      outputLabel: house.charAt(0).toUpperCase() + house.slice(1),
    };
    return new Response(JSON.stringify(fallback), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const agents = HOUSE_AGENTS[house];
  const encoder = new TextEncoder();

  // ── Evaluate: classify input type to determine agent emphasis ─────────────
  // Single page → Page Scorecard leads, Journey Trace light
  // Multiple pages/flow → all three, Journey Trace gets full context
  // Comparison (two versions) → Variant Lens leads
  // Prefer explicit mode from client (set in EvaluateInputs); fall back to
  // regex inference for legacy clients or when mode is missing.
  const explicitMode = body.evaluateMode;
  let evaluateMode: 'single' | 'journey' | 'comparison' =
    explicitMode === 'single' || explicitMode === 'journey' || explicitMode === 'comparison'
      ? explicitMode
      : 'single';
  if (house === 'evaluate' && !explicitMode) {
    const combined = userInput.toLowerCase();
    const hasComparison = /version [ab]|variant|vs\.|versus|option [ab]|current.*test|control.*treatment/.test(combined);
    const hasMultiplePages = /step \d|→|->|page \d|flow|journey|sequence|funnel|after.*before|first.*then/.test(combined);
    if (hasComparison) evaluateMode = 'comparison';
    else if (hasMultiplePages) evaluateMode = 'journey';
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const agentOutputs: AgentOutput[] = [];

        // ── Send page fetch status if URL was provided ────────────────────────
        if (url && url.trim()) {
          send({
            type: 'pageFetch',
            status: pageFetchStatus,
            message: pageFetchStatus === 'fetched'
              ? 'Page fetched — agents are analysing the live content.'
              : pageFetchStatus === 'failed'
              ? 'Page couldn\'t be fetched directly (JS-rendered or bot-protected). Agents will use your description and any prior knowledge of this URL — add more detail in your answers if results feel generic.'
              : null,
          });
        }

        // ── Sequential execution ─────────────────────────────────────────────
        for (const agent of agents) {
          try {
            // For Evaluate: append mode context so agents know the primary lens
            const modeContext = house === 'evaluate' && evaluateMode !== 'single'
              ? `\n\nEVALUATION MODE: ${evaluateMode === 'comparison'
                  ? 'COMPARISON — the user is comparing two versions or approaches. The Variant Lens perspective is primary.'
                  : 'JOURNEY — the user is describing a multi-step flow. The Journey Trace perspective is primary.'}`
              : '';

            const output = await runAgent(
              agent,
              userInput.trim() + modeContext,
              agentOutputs,
              context,
              pageContent,
              pageFetchStatus,
              url
            );
            agentOutputs.push(output);

            // Stream this agent's result immediately
            send({
              type: 'agent',
              displayName: output.displayName,
              signal: output.signal,
              summary: output.summary,
              confidence: output.confidence,
              structured_artifact: output.structured_artifact || null,
              // Full fields for lens reframe
              key_findings: output.key_findings,
              risks: output.risks,
              recommendations: output.recommendations,
            });
          } catch (err) {
            console.error(`Agent ${agent.id} failed:`, err);
            const stub: AgentOutput = {
              agentId: agent.id,
              displayName: agent.displayName,
              summary: '',
              key_findings: [],
              signal: '',
              confidence: 'low',
              risks: [],
              recommendations: [],
            };
            agentOutputs.push(stub);
          }
        }

        // ── Synthesis merge ──────────────────────────────────────────────────
        const hasOutput = agentOutputs.some(a => a.signal || a.key_findings.length > 0);
        let verdictData;

        if (hasOutput) {
          try {
            const mergeResponse = await runMerge(house, agentOutputs, userInput.trim());
            verdictData = buildHouseResult(house, mergeResponse);
          } catch (mergeErr) {
            console.error('Merge failed, using local:', mergeErr);
            verdictData = mergeAgentOutputsLocally(house, agentOutputs);
          }
        } else {
          verdictData = mergeAgentOutputsLocally(house, agentOutputs);
        }

        send({ type: 'verdict', ...verdictData });

      } catch (err) {
        console.error('House stream error:', err);
        send({ type: 'error', message: 'Analysis failed. Please try again.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
