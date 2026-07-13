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
import { auth } from '@/lib/auth';
import { checkVerdictQuota, consumeVerdict } from '@/lib/entitlements';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Sequential multi-agent runs regularly exceed Vercel's default function
// duration. Without this, long runs are killed mid-stream and the client
// sees a dead connection instead of a verdict.
export const maxDuration = 300;

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

// Anthropic call with retry on transient failures (429 rate-limit, 529
// overloaded, 5xx, network). Rate-limit windows are per-minute, so sub-second
// backoffs never cleared them — waits are seconds-scale (Retry-After when
// given, else 4s/8s/16s). maxDuration is 300s, so there's room to outwait a
// bad window rather than fail the run. Returns the message text.
async function anthropicMessage(payload: { messages: Array<{ role: string; content: string }> } & Record<string, unknown>, label: string, retries = 3): Promise<string> {
  // Assistant prefill: start the reply at "{" so the model can't write a
  // prose preamble before (or instead of) the JSON. Every caller here parses
  // JSON; "returned no JSON" was the top silent failure mode.
  const prefilled = {
    ...payload,
    messages: [...payload.messages, { role: 'assistant', content: '{' }],
  };
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(prefilled),
      });
      if (res.ok) {
        const data = await res.json();
        return '{' + (data.content?.[0]?.text || '');
      }
      const transient = res.status === 429 || res.status === 529 || (res.status >= 500 && res.status < 600);
      if (!transient || attempt === retries) throw new Error(`${label} error: ${res.status}`);
      const retryAfter = parseInt(res.headers.get('retry-after') || '', 10);
      const wait = Number.isFinite(retryAfter)
        ? Math.min(retryAfter * 1000, 30_000)
        : 4000 * 2 ** attempt + Math.random() * 1000;
      await new Promise(r => setTimeout(r, wait));
    } catch (e) {
      lastErr = e;
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
  throw lastErr;
}

// JSON-parsing layer over anthropicMessage. Prefill guarantees the reply
// STARTS as JSON, but a malformed/truncated object can still fail to parse —
// and agents aren't deterministic, so one fresh attempt usually fixes it.
async function anthropicJson(
  payload: { messages: Array<{ role: string; content: string }> } & Record<string, unknown>,
  label: string,
): Promise<any> {
  let lastErr = `${label} returned no JSON`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await anthropicMessage(payload, label);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { lastErr = `${label} returned no JSON`; continue; }
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      lastErr = `${label} returned invalid JSON`;
    }
  }
  throw new Error(lastErr);
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

  // Agents run on Haiku (~3x faster than Sonnet) to keep the verdict snappy.
  // The verdict synthesis and the deep systems pass stay on Sonnet, so the
  // user-facing reasoning is still Sonnet-quality.
  const parsed = await anthropicJson({
    model: 'claude-haiku-4-5-20251001',
    // Roomy cap: in journey/comparison mode with fetched page content the
    // agent JSON regularly outgrew 1200 and truncated into "no JSON".
    max_tokens: 2500,
    system: `${agent.systemPrompt}\n\nVOICE: Write directly to the founder in the second person — "you"/"your". Never use the third person ("the user", "the founder", "they"). Their input is first person; mirror it.`,
    messages: [{ role: 'user', content: userMessage }],
  }, `Agent ${agent.id}`);
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

// Two passes share this. 'verdict' is small + fast (Decision tab); 'systems'
// generates only the large systemsOutput block (Analysis tab) and runs after
// the verdict has already streamed, so it never blocks the verdict.
async function runMerge(
  house: HouseId,
  agentOutputs: AgentOutput[],
  userInput: string,
  mode: 'verdict' | 'systems',
  maxTokens: number,
) {
  const mergePrompt = buildMergePrompt(house, agentOutputs, userInput, mode);
  return anthropicJson({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: mergePrompt }],
  }, `Merge (${mode})`);
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
  // Client passes evaluateMode explicitly when running the Evaluate house.
  // Fall back to regex inference for older clients or non-Evaluate paths.
  const bodyEvaluateMode: 'single' | 'journey' | 'comparison' | undefined =
    body.evaluateMode === 'single' || body.evaluateMode === 'journey' || body.evaluateMode === 'comparison'
      ? body.evaluateMode
      : undefined;

  if (!userInput || userInput.trim().length < 10) {
    return new Response(JSON.stringify({ error: 'userInput required (min 10 chars)' }), { status: 400 });
  }

  // ── Verdict quota (WP5) ───────────────────────────────────────────────────
  // Server-side backstop for the free tier's monthly verdict limit. Only
  // gates signed-in users — guests run on the client-side guest counter and
  // have no account to meter (they hit the sign-up wall separately). Founder
  // and studio are unlimited and pass straight through.
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (userId) {
    const quota = await checkVerdictQuota(userId);
    if (!quota.allowed) {
      return new Response(
        JSON.stringify({
          error: `You've used all ${quota.limit} of your free verdicts this month.`,
          code: 'quota_exceeded',
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // ── Evaluate: classify input type to determine agent emphasis ─────────────
  // Single page → Page Scorecard leads, Journey Trace light
  // Multiple pages/flow → all three, Journey Trace gets full context
  // Comparison (two versions) → Variant Lens leads
  let evaluateMode: 'single' | 'journey' | 'comparison' = 'single';
  if (house === 'evaluate') {
    if (bodyEvaluateMode) {
      evaluateMode = bodyEvaluateMode;
    } else {
      // Fallback for clients that don't send evaluateMode explicitly.
      const combined = userInput.toLowerCase();
      const hasComparison = /version [ab]|variant|vs\.|versus|option [ab]|current.*test|control.*treatment/.test(combined);
      const hasMultiplePages = /step \d|→|->|page \d|flow|journey|sequence|funnel|after.*before|first.*then/.test(combined);
      if (hasComparison) evaluateMode = 'comparison';
      else if (hasMultiplePages) evaluateMode = 'journey';
    }
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
        // Label format depends on mode:
        //   single   → just the content (one URL only)
        //   journey  → 'Page 1: <url>' to preserve sequence
        //   comparison → 'Version A: <url>' / 'Version B: <url>'
        const labelFor = (i: number) =>
          evaluateMode === 'comparison'
            ? `=== Version ${String.fromCharCode(65 + i)}: ${urls[i]} ===`
            : `=== Page ${i + 1}: ${urls[i]} ===`;
        pageContent = urls.length === 1
          ? fetched[0].content
          : fetched.map((r, i) => `${labelFor(i)}\n${r.content}`).join('\n\n');
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

  // For Evaluate, reorder (and trim) the agent sequence based on mode.
  // The leading agent has the most context and gets the deepest analysis;
  // single mode skips the cross-page agents that have nothing to compare.
  let agents = HOUSE_AGENTS[house];
  if (house === 'evaluate') {
    const [pageScorecard, variantLens, journeyTrace] = HOUSE_AGENTS.evaluate;
    if (evaluateMode === 'single') {
      // One page, one frame. Cross-page agents add no signal.
      agents = [pageScorecard];
    } else if (evaluateMode === 'journey') {
      // Multi-step flow → Journey Trace leads, scorecards each step,
      // Variant Lens hunts diff between steps.
      agents = [journeyTrace, pageScorecard, variantLens];
    } else if (evaluateMode === 'comparison') {
      // Two versions → Variant Lens leads (it's the comparison specialist),
      // scorecards each version, journey traces overall flow if any.
      agents = [variantLens, pageScorecard, journeyTrace];
    }
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const agentOutputs: AgentOutput[] = [];

        // ── Stage: reading (WP3) — perceived progress before the first agent.
        send({ type: 'stage', stage: 'reading' });

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

        // ── Stage: analysing (WP3) — agents start running. ───────────────────
        send({ type: 'stage', stage: 'analysing' });

        // ── Sequential execution ─────────────────────────────────────────────
        // Agents run one at a time (not concurrently). Firing all three at once
        // burst-tripped Anthropic's rate-limit/overload and dropped agents into
        // the fallback; on Haiku each agent is fast (~10s), so the sum is still
        // well under the old Sonnet timings. Each agent also chains on the
        // prior outputs, and streams to the client as it lands.
        const modeContext = house === 'evaluate' && evaluateMode !== 'single'
          ? `\n\nEVALUATION MODE: ${evaluateMode === 'comparison'
              ? 'COMPARISON — the user is comparing two versions or approaches. The Variant Lens perspective is primary.'
              : 'JOURNEY — the user is describing a multi-step flow. The Journey Trace perspective is primary.'}`
          : '';

        let lastAgentError = '';
        for (const agent of agents) {
          let output: AgentOutput;
          try {
            output = await runAgent(agent, userInput.trim() + modeContext, agentOutputs, context, pageContent, pageFetchStatus, url);
          } catch (err) {
            console.error(`Agent ${agent.id} failed:`, err);
            lastAgentError = err instanceof Error ? err.message : String(err);
            output = {
              agentId: agent.id, displayName: agent.displayName,
              summary: '', key_findings: [], signal: '', confidence: 'low',
              risks: [], recommendations: [],
            };
          }
          agentOutputs.push(output);
          if (output.signal || output.key_findings.length > 0) {
            send({
              type: 'agent',
              displayName: output.displayName,
              signal: output.signal,
              summary: output.summary,
              confidence: output.confidence,
              structured_artifact: output.structured_artifact || null,
              key_findings: output.key_findings,
              risks: output.risks,
              recommendations: output.recommendations,
            });
          }
        }

        // ── Stage: forming — the fast verdict pass (Decision tab). ───────────
        send({ type: 'stage', stage: 'forming' });

        // Every agent failed (even after retries) — almost always transient
        // rate-limit/overload. Surface a real, retryable error instead of the
        // local fallback, which produces a misleading "NEEDS MORE SIGNAL"
        // verdict with no issues/moves. No verdict is sent, so no quota is spent.
        const hasOutput = agentOutputs.some(a => a.signal || a.key_findings.length > 0);
        if (!hasOutput) {
          // Client appends its own "Your answers are saved — try running
          // again." — don't duplicate it here. `detail` carries the last
          // upstream failure (e.g. "Agent x error: 429") for diagnosis; the
          // client ignores fields it doesn't know.
          send({ type: 'error', message: 'The analysis engine was busy and couldn’t finish.', detail: lastAgentError });
          return;
        }

        let verdictData;
        try {
          // 3000 gives the verdict JSON (now incl. theBet + whatsWorking)
          // real headroom — 2000 was the original truncation lesson.
          const mergeResponse = await runMerge(house, agentOutputs, userInput.trim(), 'verdict', 3000);
          verdictData = buildHouseResult(house, mergeResponse);
        } catch (mergeErr) {
          // Agents succeeded but synthesis failed — local merge still carries
          // the real agent findings, so it's an acceptable degradation here.
          console.error('Verdict merge failed, using local:', mergeErr);
          verdictData = mergeAgentOutputsLocally(house, agentOutputs);
        }

        // Verdict streams now — the Decision tab renders without waiting on the
        // heavy systems analysis below.
        send({ type: 'verdict', ...verdictData });

        // Meter the verdict against the user's monthly quota — only after a
        // real verdict reaches the client, so a failed run never costs a
        // credit. Fire-and-forget: a counter write must not delay delivery.
        if (userId) {
          consumeVerdict(userId).catch(() => { /* counter write is best-effort */ });
        }

        // ── Deferred systems pass (Analysis tab) ─────────────────────────────
        // Runs AFTER the verdict has already streamed, so the large
        // systemsOutput block never delays the verdict — which also means it
        // can afford to be patient: if the first attempt fails (usually a
        // per-minute rate window already spent by the verdict merge), cool
        // down a full window and try once more instead of leaving the
        // Analysis tab permanently incomplete. Pings keep the SSE stream
        // alive through the wait (the client ignores unknown event types).
        if (hasOutput) {
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const sys = await runMerge(house, agentOutputs, userInput.trim(), 'systems', 6000);
              if (sys && sys.systemsOutput) {
                send({ type: 'systems', systemsOutput: sys.systemsOutput });
              }
              break;
            } catch (sysErr) {
              console.error(`Systems pass failed (attempt ${attempt + 1}):`, sysErr);
              if (attempt === 0) {
                for (let i = 0; i < 3; i++) {
                  await new Promise(r => setTimeout(r, 20_000));
                  send({ type: 'ping' });
                }
              }
            }
          }
        }

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
