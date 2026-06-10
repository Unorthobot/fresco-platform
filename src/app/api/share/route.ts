import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/share — create a public read-only share link for a house verdict.
// The payload is frozen at share time; the link never depends on the session
// still existing. Requires a signed-in user (guests are prompted to sign up).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in to create share links' }, { status: 401 });
  }

  const { houseName, payload } = await req.json();
  if (!houseName || !payload?.verdict) {
    return NextResponse.json({ error: 'houseName and a result payload are required' }, { status: 400 });
  }

  const shared = await prisma.sharedResult.create({
    data: {
      userId: session.user.id,
      houseName: String(houseName).slice(0, 80),
      payload,
    },
    select: { token: true },
  });

  return NextResponse.json({ token: shared.token, url: `/share/${shared.token}` });
}
