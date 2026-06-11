import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, workspaceId, toolkitType, thinkingLens, houseType } = await req.json();

  // Verify workspace belongs to user
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId: session.user.id },
  });
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

  const toolkitSession = await prisma.toolkitSession.create({
    data: {
      id,
      workspaceId,
      toolkitType,
      houseType: houseType || null,
      thinkingLens: thinkingLens || 'automatic',
    },
  });

  // WP0 funnel: second_session_14d — fires exactly once, when this create
  // brings the user to 2 sessions within 14 days of signup. Server-side
  // because the client can't reliably know the user's session count.
  // Fire-and-forget; never blocks the response.
  (async () => {
    const userId = session.user!.id!;
    const [count, user] = await Promise.all([
      prisma.toolkitSession.count({ where: { workspace: { userId } } }),
      prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    ]);
    if (count !== 2 || !user) return;
    const daysSinceSignup = (Date.now() - user.createdAt.getTime()) / 86_400_000;
    if (daysSinceSignup <= 14) {
      await prisma.event.create({
        data: { name: 'second_session_14d', userId, sessionId: toolkitSession.id },
      });
    }
  })().catch(() => {});

  return NextResponse.json(toolkitSession);
}
