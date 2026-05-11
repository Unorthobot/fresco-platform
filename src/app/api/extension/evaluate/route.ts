import { NextRequest } from 'next/server';
import { authenticateExtensionRequest } from '@/lib/extension-auth';
import { runEvaluatePage, type PageData } from '@/lib/extension-prompts';
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

  let body: { pageData?: PageData; userContext?: string };
  try {
    body = await req.json();
  } catch {
    return extensionCorsResponse({ error: 'Invalid JSON' }, { status: 400, origin });
  }

  if (!body.pageData || typeof body.pageData !== 'object') {
    return extensionCorsResponse(
      { error: 'pageData is required' },
      { status: 400, origin }
    );
  }

  try {
    const result = await runEvaluatePage({
      pageData: body.pageData,
      userContext: body.userContext,
    });
    return extensionCorsResponse(result, { status: 200, origin });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Extension evaluate failed:', msg);
    return extensionCorsResponse(
      { error: 'Evaluation failed', detail: msg },
      { status: 500, origin }
    );
  }
}
