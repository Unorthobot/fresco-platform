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

  return NextResponse.json(toolkitSession);
}
