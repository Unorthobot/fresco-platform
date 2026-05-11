import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  generateExtensionKey,
  hashExtensionKey,
  extensionKeyPrefix,
} from '@/lib/extension-auth';

/**
 * GET /api/account/extension-keys
 * Returns the user's keys (excluding the actual hashed value).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = await prisma.extensionKey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      prefix: true,
      label: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ keys });
}

/**
 * POST /api/account/extension-keys
 * Generates a new key for this user. The plaintext is returned ONCE in
 * the response body — the client must capture it, since the database
 * only stores the hash.
 *
 * Body: { label?: string }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { label?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  const plaintext = generateExtensionKey();
  const hash = hashExtensionKey(plaintext);
  const prefix = extensionKeyPrefix(plaintext);

  const created = await prisma.extensionKey.create({
    data: {
      userId: session.user.id,
      hash,
      prefix,
      label: typeof body.label === 'string' && body.label.trim().length > 0
        ? body.label.trim().slice(0, 80)
        : null,
    },
    select: { id: true, prefix: true, label: true, createdAt: true },
  });

  // Return the plaintext key only once. This is the only time it ever
  // leaves the server.
  return NextResponse.json({
    key: { ...created, plaintext },
  });
}
