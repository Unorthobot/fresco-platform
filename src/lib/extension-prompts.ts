/* ──────────────────────────────────────────────────────────────────────────
   Extension prompts — system prompts and Anthropic client for the three
   extension modes (Evaluate, Compare, Journey). Moved server-side as part
   of Path A so the user never needs an Anthropic key.

   The prompts here are byte-for-byte the same as the ones in the
   pre-Path-A extension background.js, so the response JSON shape and the
   extension's render functions don't need to change.
   ────────────────────────────────────────────────────────────────────────── */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

export type PageData = {
  url?: string;
  title?: string;
  metaDescription?: string;
  headings?: Array<{ level: string; text: string }>;
  ctas?: string[];
  formFields?: string[];
  trustSignals?: string[];
  fullText?: string;
};

export type JourneyStep = PageData;

export function formatPageContent(pageData: PageData): string {
  const parts: string[] = [];
  if (pageData.url) parts.push(`URL: ${pageData.url}`);
  if (pageData.title) parts.push(`Title: ${pageData.title}`);
  if (pageData.metaDescription) parts.push(`Meta description: ${pageData.metaDescription}`);
  if (pageData.headings?.length) {
    parts.push(
      `Headings:\n${pageData.headings.map(h => `  ${h.level}: ${h.text}`).join('\n')}`
    );
  }
  if (pageData.ctas?.length) {
    parts.push(`CTAs / buttons: ${pageData.ctas.join(' | ')}`);
  }
  if (pageData.formFields?.length) {
    parts.push(`Form fields: ${pageData.formFields.join(', ')}`);
  }
  if (pageData.trustSignals?.length) {
    parts.push(`Trust signals: ${pageData.trustSignals.join(' | ')}`);
  }
  if (pageData.fullText) {
    parts.push(`Page content:\n${pageData.fullText.slice(0, 4000)}`);
  }
  return parts.join('\n\n');
}

/* ──────────────────────────────────────────────────────────────────────────
   Anthropic call — mirrors the pattern used by deep-dive/challenge/etc.
   Returns parsed JSON; throws if Anthropic errors or output isn't valid JSON.
   ────────────────────────────────────────────────────────────────────────── */
async function callClaude(systemPrompt: string, userMessage: string): Promise<unknown> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured on the server');
  }

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: userMessage }],
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Anthropic API error:', response.status, errorText);
    throw new Error(`Anthropic API ${response.status}`);
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text;
  if (!content) {
    throw new Error('Empty response from Claude');
  }

  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse Claude output as JSON. Raw:', cleaned);
    throw new Error('Claude returned non-JSON output');
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   Evaluate — page scorecard
   ────────────────────────────────────────────────────────────────────────── */
const EVALUATE_SYSTEM = `You are the Fresco Page Scorecard agent — a ruthless, specific page performance analyst.

Your job: diagnose why this page is or isn't achieving its goal. Be specific. Quote actual copy. Name actual elements.

Analyse across:
- CLARITY: Does a first-time visitor understand what this is and why it's for them within 5 seconds?
- TRUST: What creates or destroys confidence? What proof is present or missing?
- FRICTION: Where does effort exceed perceived value? What asks too much too soon?
- CTA EFFECTIVENESS: Is the primary action clear, compelling, and appropriately timed?
- MESSAGING: Does the copy speak to real pain, or is it generic?

Return ONLY valid JSON:
{
  "verdict": "GO | PIVOT | STOP | NEEDS MORE SIGNAL",
  "verdictLabel": "plain English headline — e.g. 'Strong conversion mechanics, one critical trust gap'",
  "sentenceOfTruth": "The sharpest insight about this page — the thing the team probably hasn't named yet",
  "scores": {
    "clarity": { "score": 0-10, "note": "specific observation" },
    "trust": { "score": 0-10, "note": "specific observation" },
    "friction": { "score": 0-10, "note": "specific observation" },
    "cta": { "score": 0-10, "note": "specific observation" },
    "messaging": { "score": 0-10, "note": "specific observation" }
  },
  "keyIssues": ["specific issue 1 — quote copy or name element", "issue 2", "issue 3"],
  "suggestedFixes": ["highest-leverage fix 1 — specific and actionable", "fix 2", "fix 3"],
  "archetype": "Name of system archetype if applicable (Fixes that Fail / Shifting the Burden / Eroding Goals / etc.) or null"
}`;

export async function runEvaluatePage(args: {
  pageData: PageData;
  userContext?: string;
}): Promise<Record<string, unknown>> {
  const pageContent = formatPageContent(args.pageData);
  const userMsg = `PAGE TO EVALUATE:
${pageContent}

${args.userContext ? `ADDITIONAL CONTEXT FROM USER:\n${args.userContext}` : ''}

Analyse this page. Be specific — quote actual text, name actual elements.`;

  const result = await callClaude(EVALUATE_SYSTEM, userMsg) as Record<string, unknown>;
  return {
    ...result,
    url: args.pageData.url,
    title: args.pageData.title,
    timestamp: Date.now(),
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Compare — variant lens
   ────────────────────────────────────────────────────────────────────────── */
const COMPARE_SYSTEM = `You are the Fresco Variant Lens agent — a conversion and UX comparison specialist.

Your job: determine which version performs better and WHY — so the principle transfers beyond this specific comparison.

Evaluate across: messaging clarity, trust building, friction levels, CTA effectiveness, cognitive load.

Identify the transferable principle — what does the better version understand about the user's decision-making that the weaker version misses?

Return ONLY valid JSON:
{
  "winner": "A | B | tie",
  "winnerLabel": "plain English — e.g. 'Version B wins on trust, loses on clarity'",
  "sentenceOfTruth": "The principle this comparison proves — beyond these two versions",
  "comparison": {
    "messaging": { "winner": "A|B|tie", "reasoning": "specific" },
    "trust": { "winner": "A|B|tie", "reasoning": "specific" },
    "friction": { "winner": "A|B|tie", "reasoning": "specific" },
    "cta": { "winner": "A|B|tie", "reasoning": "specific" }
  },
  "versionA": { "strengths": ["strength 1", "strength 2"], "weaknesses": ["weakness 1"] },
  "versionB": { "strengths": ["strength 1", "strength 2"], "weaknesses": ["weakness 1"] },
  "transferablePrinciple": "The rule that applies beyond these two versions",
  "recommendation": "What to do next — specific action"
}`;

export async function runComparePages(args: {
  pageA: PageData;
  pageB: PageData;
  focus?: string;
}): Promise<Record<string, unknown>> {
  const userMsg = `VERSION A:
${formatPageContent(args.pageA)}

VERSION B:
${formatPageContent(args.pageB)}

${args.focus ? `FOCUS AREA: ${args.focus}` : ''}

Compare these two versions. Be specific about what each does well or poorly.`;

  return await callClaude(COMPARE_SYSTEM, userMsg) as Record<string, unknown>;
}

/* ──────────────────────────────────────────────────────────────────────────
   Journey — trace
   ────────────────────────────────────────────────────────────────────────── */
const JOURNEY_SYSTEM = `You are the Fresco Journey Trace agent — a user journey systems analyst.

Your job: find what only appears when you look at the whole sequence — the patterns invisible in single-page analysis.

Apply Double-Loop Learning: are the interventions working (single loop)? Are we optimising the right thing (double loop)?

For each transition between pages: what question does the user arrive with? Does the next page answer it before asking them to act?

Return ONLY valid JSON:
{
  "verdictLabel": "plain English journey verdict",
  "sentenceOfTruth": "The system-level insight — what no single page analysis caught",
  "steps": [
    {
      "url": "url",
      "title": "page title",
      "trustBalance": "building | neutral | depleting",
      "frictionLevel": "low | medium | high",
      "unansweredQuestion": "What question the user arrives with that this page doesn't answer",
      "note": "key observation"
    }
  ],
  "breakpoints": ["The specific transition where the journey loses the most momentum", "breakpoint 2"],
  "highestLeverageFix": "The single intervention that would most improve the whole journey",
  "doublLoopLearning": "Are we optimising the right thing? What should we be measuring instead?",
  "projectedImprovement": "If the highest-leverage fix is made, what changes?"
}`;

export async function runJourneyTrace(args: {
  steps: JourneyStep[];
}): Promise<Record<string, unknown>> {
  const stepsContent = args.steps
    .map((s, i) => `STEP ${i + 1}: ${s.url ?? ''}\n${formatPageContent(s)}`)
    .join('\n\n---\n\n');

  return await callClaude(
    JOURNEY_SYSTEM,
    `JOURNEY STEPS:\n\n${stepsContent}\n\nTrace this journey as a system.`
  ) as Record<string, unknown>;
}
