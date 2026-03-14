import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ONE-TIME route to set your own account to studio for testing.
// Protected by auth + secret. Remove this file after testing.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  }

  const { secret } = await req.json();
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Wrong secret' }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { subscription: 'studio' },
  });

  return NextResponse.json({ ok: true, message: `Set ${session.user.email} to studio` });
}
