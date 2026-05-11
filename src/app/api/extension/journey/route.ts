import { NextRequest } from 'next/server';
import { authenticateExtensionRequest } from '@/lib/extension-auth';
import { runJourneyTrace, type JourneyStep } from '@/lib/extension-prompts';
import { extensionCorsResponse, extensionPreflight } from '@/lib/extension-cors';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function OPTIONS(req: NextRequest) {
  return extensionPreflight(req.headers.get('origin'));
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  const auth = await authenticateExtensionRequest(req);
  if (!auth.ok) {
    return extensionCorsResponse({ error: auth.message }, { status: auth.status, origin });
  }

  let body: { steps?: JourneyStep[] };
  try {
    body = await req.json();
  } catch {
    return extensionCorsResponse({ error: 'Invalid JSON' }, { status: 400, origin });
  }

  if (!Array.isArray(body.steps) || body.steps.length < 2) {
    return extensionCorsResponse(
      { error: 'steps must be an array with at least 2 entries' },
      { status: 400, origin }
    );
  }

  try {
    const result = await runJourneyTrace({ steps: body.steps });
    return extensionCorsResponse(result, { status: 200, origin });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Extension journey failed:', msg);
    return extensionCorsResponse(
      { error: 'Journey trace failed', detail: msg },
      { status: 500, origin }
    );
  }
}
