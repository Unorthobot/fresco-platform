import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/events — funnel instrumentation (WP0).
// Accepts guest events (no auth) so the pre-signup funnel is measurable;
// the userId is attached server-side when a session exists. Names are
// allowlisted so the table can't be polluted by arbitrary clients.

const ALLOWED_EVENTS = new Set([
  'signup',
  'first_input_focused',
  'first_submit',
  'routing_complete',
  'verdict_rendered',
  'second_session_14d',
]);

export async function POST(req: NextRequest) {
  let body: { name?: string; sessionId?: string; meta?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = String(body.name || '');
  if (!ALLOWED_EVENTS.has(name)) {
    return NextResponse.json({ error: 'Unknown event name' }, { status: 400 });
  }

  const session = await auth().catch(() => null);

  await prisma.event.create({
    data: {
      name,
      userId: session?.user?.id || null,
      sessionId: body.sessionId ? String(body.sessionId).slice(0, 64) : null,
      meta: body.meta && typeof body.meta === 'object' ? (body.meta as object) : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
