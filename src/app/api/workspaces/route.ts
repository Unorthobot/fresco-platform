import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  // Get team memberships for this user
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = memberships.map(m => m.teamId);

  // Personal workspaces + shared team workspaces
  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { userId },
        ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
      ],
    },
    include: {
      team: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(workspaces);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, title, description, teamId } = await req.json();

  // If teamId provided, verify membership
  if (teamId) {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: session.user.id } },
    });
    if (!membership) return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
  }

  const workspace = await prisma.workspace.create({
    data: {
      id,
      title,
      description,
      userId: session.user.id,
      teamId: teamId || null,
    },
    include: {
      team: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(workspace);
}
