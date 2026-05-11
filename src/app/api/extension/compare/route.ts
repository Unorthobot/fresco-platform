import { NextRequest } from 'next/server';
import { authenticateExtensionRequest } from '@/lib/extension-auth';
import { runComparePages, type PageData } from '@/lib/extension-prompts';
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

  let body: { pageA?: PageData; pageB?: PageData; focus?: string };
  try {
    body = await req.json();
  } catch {
    return extensionCorsResponse({ error: 'Invalid JSON' }, { status: 400, origin });
  }

  if (!body.pageA || !body.pageB) {
    return extensionCorsResponse(
      { error: 'pageA and pageB are both required' },
      { status: 400, origin }
    );
  }

  try {
    const result = await runComparePages({
      pageA: body.pageA,
      pageB: body.pageB,
      focus: body.focus,
    });
    return extensionCorsResponse(result, { status: 200, origin });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Extension compare failed:', msg);
    return extensionCorsResponse(
      { error: 'Comparison failed', detail: msg },
      { status: 500, origin }
    );
  }
}
