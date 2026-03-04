import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();

  // Verify session belongs to user via workspace
  const existing = await prisma.toolkitSession.findFirst({
    where: { id: params.id, workspace: { userId: session.user.id } },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.toolkitSession.update({
    where: { id: params.id },
    data: {
      thinkingLens: data.thinkingLens,
      stepResponses: data.stepResponses,
      aiOutputs: data.aiOutputs,
      sentenceOfTruth: data.sentenceOfTruth,
      isLocked: data.isLocked,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.toolkitSession.findFirst({
    where: { id: params.id, workspace: { userId: session.user.id } },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.toolkitSession.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
