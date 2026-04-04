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
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FrescoBot/1.0; +https://frescolab.io)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return { content: '', title: '', fetched: false };

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return { content: '', title: '', fetched: false };

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract meta description
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const metaDesc = metaMatch ? metaMatch[1].trim() : '';

    // Strip scripts, styles, nav, footer, head
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s{3,}/g, '\n\n')
      .trim();

    // Truncate to ~3000 chars to stay within token budget
    if (text.length > 3000) text = text.slice(0, 3000) + '…';

    const content = [
      title ? `Title: ${title}` : '',
      metaDesc ? `Meta description: ${metaDesc}` : '',
      text ? `Page content:\n${text}` : '',
    ].filter(Boolean).join('\n\n');

    return { content, title, fetched: true };
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
): Promise<AgentOutput> {
  const contextSection = context
    ? `\n\nWORKSPACE CONTEXT (from prior sessions):\n${context}`
    : '';
  const pageSection = pageContent
    ? `\n\nACTUAL PAGE CONTENT (fetched live from the URL):\n${pageContent}\n\nAnalyse the actual content above — do not rely on assumptions about this page.`
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
      max_tokens: 700,
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
      max_tokens: 900,
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

  if (url && url.trim().startsWith('http')) {
    const urls = url.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));
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
  let evaluateMode: 'single' | 'journey' | 'comparison' = 'single';
  if (house === 'evaluate') {
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
              ? 'Page content retrieved — agents are analysing the actual content.'
              : pageFetchStatus === 'failed'
              ? 'Could not retrieve the page — agents will work from your description.'
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
              pageContent
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
