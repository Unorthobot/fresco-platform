import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function canWrite(userId: string, workspaceId: string) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) return false;
  if (ws.userId === userId) return true;
  if (ws.teamId) {
    const m = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: ws.teamId, userId } },
    });
    return !!m;
  }
  return false;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await canWrite(session.user.id, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const data = await req.json();
  const workspace = await prisma.workspace.update({
    where: { id: params.id },
    data: { title: data.title, description: data.description, updatedAt: new Date() },
    include: { team: { select: { id: true, name: true } } },
  });

  return NextResponse.json(workspace);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ws = await prisma.workspace.findUnique({ where: { id: params.id } });
  if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only the workspace creator can delete it
  if (ws.userId !== session.user.id) {
    return NextResponse.json({ error: 'Only the creator can delete this workspace' }, { status: 403 });
  }

  await prisma.workspace.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
