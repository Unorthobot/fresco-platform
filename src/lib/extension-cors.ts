import { NextResponse } from 'next/server';

/* ──────────────────────────────────────────────────────────────────────────
   CORS for extension routes.

   Chrome extensions make fetch() calls from their chrome-extension:// origin.
   The browser sends Origin: chrome-extension://<extension-id>. We allow any
   origin starting with chrome-extension:// — the actual auth is the Bearer
   key, not the origin. Web pages calling these routes from app.frescolab.io
   would also be permitted; that's fine since they'd still need a valid key.

   The extension does not send credentials (cookies), so we don't need
   Access-Control-Allow-Credentials.
   ────────────────────────────────────────────────────────────────────────── */

function corsHeaders(origin: string | null): Record<string, string> {
  // Allow any chrome-extension origin, plus the platform itself for testing.
  // Auth is by Bearer token, not origin, so opening the allow list to
  // chrome-extension://* is safe.
  const allowed =
    origin && (origin.startsWith('chrome-extension://') || origin === 'https://app.frescolab.io')
      ? origin
      : '*';

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function extensionCorsResponse(
  body: unknown,
  init: { status?: number; origin: string | null }
): NextResponse {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: corsHeaders(init.origin),
  });
}

export function extensionPreflight(origin: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}
