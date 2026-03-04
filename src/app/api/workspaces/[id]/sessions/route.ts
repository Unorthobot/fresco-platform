import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspace = await prisma.workspace.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!workspace) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const sessions = await prisma.toolkitSession.findMany({
    where: { workspaceId: params.id },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(sessions);
}
