// FRESCO Houses API — /api/houses/[house]
// Sequential agent execution: each agent receives prior agents' outputs.
// Streaming SSE: each agent result sent as it completes.
// Synthesis layer merges all outputs into a single HouseResult.
//
// SSE event types:
//   { type: 'pageFetch', status, message }                      — page fetch result
//   { type: 'run_start', agentNames }                           — list of agents that will run, in order
//   { type: 'agent_narration', displayName, text }              — one-line context, sent before each agent runs
//   { type: 'agent', displayName, signal, summary, confidence } — one per agent
//   { type: 'merge_status', status, reason? }                   — whether synthesis used live merge or fallback
//   { type: 'verdict', ...HouseResult }                          — final merged output
//   { type: 'error', message }

import { NextRequest } from 'next/server';
import { HOUSE_AGENTS, type HouseId } from '@/lib/agents';
import type { AgentOutput } from '@/lib/orchestrator';
import { buildMergePrompt, buildHouseResult, mergeAgentOutputsLocally } from '@/lib/orchestrator';
import { buildMergeToolSchema, AGENT_TOOL_SCHEMA } from '@/lib/orchestrator/schemas';

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

// ── Pre-agent narration ──────────────────────────────────────────────────────
// One-sentence context emitted BEFORE the heavy agent call, so the user sees
// readable text typing out instead of a dead skeleton during the 6-12s wait.
// Cheap (Haiku) and forgiving — failure is non-fatal, the narration is just
// skipped.
async function runAgentNarration(
  agent: { id: string; displayName: string },
  userInput: string,
  pageContent?: string,
): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const pageHint = pageContent ? `\n\nLive page content was fetched (use it for specifics):\n${pageContent.slice(0, 1500)}` : '';
    const prompt = `You are about to run analysis as the ${agent.displayName}. In ONE sentence (max 22 words), describe what you're about to examine — anchored to specifics from the user's input. No findings, no predictions, no greetings. Start mid-thought, e.g. "Looking at how..." or "Examining the gap between...".${pageHint}\n\nUSER INPUT:\n${userInput.slice(0, 1500)}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 80,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content?.[0]?.text || '').trim().replace(/^["']|["']$/g, '');
    return text || null;
  } catch {
    return null;
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

  const userMessage = `${contextSection}${pageSection}${priorSection}\n\nUSER INPUT:\n${userInput}\n\nCall the submit_analysis tool with your structured analysis.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: agent.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      // Tool-use enforcement: model must call submit_analysis with args
      // matching the schema, which means we get guaranteed-valid JSON in
      // tool_use.input — no parse errors possible.
      tools: [{
        name: 'submit_analysis',
        description: 'Submit your structured analysis as the agent.',
        input_schema: AGENT_TOOL_SCHEMA,
      }],
      tool_choice: { type: 'tool', name: 'submit_analysis' },
    }),
  });

  if (!response.ok) throw new Error(`Agent ${agent.id} error: ${response.status}`);

  const data = await response.json();
  // Find the tool_use block — when tool_choice forces a specific tool, it's
  // always present, but be defensive in case Anthropic changes content
  // ordering or includes preamble blocks.
  const toolUse = data.content?.find((b: { type: string }) => b.type === 'tool_use');
  if (!toolUse?.input) throw new Error(`Agent ${agent.id} returned no tool_use`);
  const parsed = toolUse.input;
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
      model: 'claude-sonnet-4-6',
      // 2400 is enough for the per-house schemas (4-7 nested shapes) without
      // giving the model headroom to over-elaborate. Was 4000 — defensive
      // bump when adding tool-use, but in practice merges fit comfortably
      // under 2400 and the extra budget added 2-3s to generation time.
      max_tokens: 2400,
      messages: [{ role: 'user', content: mergePrompt }],
      // Tool-use enforces schema — no more "Expected ',' or ']' at position
      // 7957" failures from manual JSON.parse on a long verbose response.
      // The merge schema has 4-7 nested shapes per house; this is exactly
      // the kind of output where unstructured prompts were producing rare
      // but real malformed JSON.
      tools: [{
        name: 'submit_synthesis',
        description: 'Submit the synthesised house result.',
        input_schema: buildMergeToolSchema(house),
      }],
      tool_choice: { type: 'tool', name: 'submit_synthesis' },
    }),
  });
  if (!response.ok) throw new Error(`Merge error: ${response.status}`);
  const data = await response.json();
  const toolUse = data.content?.find((b: { type: string }) => b.type === 'tool_use');
  if (!toolUse?.input) throw new Error('Merge returned no tool_use');
  return toolUse.input;
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

  // Peek at the explicit mode to label pages meaningfully when fetching.
  // (The full evaluateMode resolution with regex fallback happens further
  // below — we just need the explicit hint here for chip labelling.)
  const isComparison = house === 'evaluate' && body.evaluateMode === 'comparison';

  const normaliseUrl = (u: string) => u.startsWith('http') ? u : `https://${u}`;
  if (url && url.trim()) {
    const urls = url.split('\n').map(u => normaliseUrl(u.trim())).filter(u => u.length > 8);
    if (urls.length > 0) {
      const results = await Promise.all(urls.slice(0, 3).map(u => fetchPageContent(u)));
      const fetched = results.filter(r => r.fetched);
      if (fetched.length > 0) {
        if (urls.length === 1) {
          // Single URL: in comparison mode, label it Version A and note B is missing.
          pageContent = isComparison
            ? `=== Version A: ${urls[0]} ===\n${fetched[0].content}\n\n(Version B URL not provided — analyse Version A and note any comparison limits.)`
            : fetched[0].content;
        } else {
          // Multiple URLs: label by Version A/B for comparison, Page N otherwise.
          const labelFor = (i: number) =>
            isComparison ? `Version ${String.fromCharCode(65 + i)}` : `Page ${i + 1}`;
          pageContent = fetched
            .map((r, i) => `=== ${labelFor(i)}: ${urls[i]} ===\n${r.content}`)
            .join('\n\n');
        }
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

  const baseAgents = HOUSE_AGENTS[house];
  const encoder = new TextEncoder();

  // ── Evaluate: classify input type to determine agent emphasis ─────────────
  // Single → Page Scorecard only (Variant Lens has no B; Journey Trace has no journey)
  // Journey → Journey Trace leads, Page Scorecard supports
  // Comparison → Variant Lens leads, Page Scorecard supports
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

  // Reorder + filter agents based on evaluate mode so the streaming order
  // matches the primary lens. Comment in HOUSE_AGENTS map is canonical;
  // this is the runtime expression of "X leads".
  const agents = (() => {
    if (house !== 'evaluate') return baseAgents;
    const byId = Object.fromEntries(baseAgents.map(a => [a.id, a]));
    if (evaluateMode === 'single') {
      // Only Page Scorecard runs — single page has no comparison and no journey.
      return [byId.PageScorecardAgent].filter(Boolean);
    }
    if (evaluateMode === 'comparison') {
      return [byId.VariantLensAgent, byId.PageScorecardAgent, byId.JourneyTraceAgent].filter(Boolean);
    }
    // journey
    return [byId.JourneyTraceAgent, byId.PageScorecardAgent, byId.VariantLensAgent].filter(Boolean);
  })();

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

        // Tell the client which agents will run in this session, in order.
        // Lets the progress UI compute "step N of M" and percentage without
        // having to wait for the first narration.
        send({
          type: 'run_start',
          agentNames: agents.map(a => a.displayName),
        });

        // ── Sequential execution ─────────────────────────────────────────────
        for (const agent of agents) {
          try {
            // For Evaluate: append mode context so agents know the primary lens
            const modeContext = house === 'evaluate' && evaluateMode !== 'single'
              ? `\n\nEVALUATION MODE: ${evaluateMode === 'comparison'
                  ? 'COMPARISON — the user is comparing two versions or approaches. The Variant Lens perspective is primary.'
                  : 'JOURNEY — the user is describing a multi-step flow. The Journey Trace perspective is primary.'}`
              : '';

            // Pre-agent narration: a one-sentence "what this agent is about to look at"
            // streamed to the client so the user has something to read during the
            // ~6-12s wait. Best-effort — null on failure, the loop continues.
            const narration = await runAgentNarration(agent, userInput.trim(), pageContent);
            if (narration) {
              send({
                type: 'agent_narration',
                displayName: agent.displayName,
                text: narration,
              });
            }

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
        let mergeStatus: 'ok' | 'fallback_no_agent_output' | 'fallback_merge_failed' = 'ok';
        let mergeErrorReason: string | undefined;

        if (hasOutput) {
          try {
            const mergeResponse = await runMerge(house, agentOutputs, userInput.trim());
            verdictData = buildHouseResult(house, mergeResponse);
          } catch (mergeErr) {
            mergeStatus = 'fallback_merge_failed';
            mergeErrorReason = mergeErr instanceof Error ? mergeErr.message : String(mergeErr);
            console.error('Merge failed, using local:', mergeErr);
            verdictData = mergeAgentOutputsLocally(house, agentOutputs);
          }
        } else {
          mergeStatus = 'fallback_no_agent_output';
          verdictData = mergeAgentOutputsLocally(house, agentOutputs);
        }

        // Tell the client which path produced this verdict. Lets the client
        // log a localStorage breadcrumb so we can audit silent fallback cases.
        send({ type: 'merge_status', status: mergeStatus, reason: mergeErrorReason });

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
