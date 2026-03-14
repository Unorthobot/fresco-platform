import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/teams/[id]/members/[memberId] — change role
export async function PATCH(req: NextRequest, { params }: { params: { id: string; memberId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const team = await prisma.team.findUnique({ where: { id: params.id } });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.ownerId !== session.user.id) return NextResponse.json({ error: 'Owner only' }, { status: 403 });

  const { role } = await req.json();
  if (!['admin', 'member'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

  const updated = await prisma.teamMember.update({
    where: { id: params.memberId },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json({ member: updated });
}

// DELETE /api/teams/[id]/members/[memberId] — remove member
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; memberId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const team = await prisma.team.findUnique({ where: { id: params.id } });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const targetMember = await prisma.teamMember.findUnique({ where: { id: params.memberId } });
  if (!targetMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  // Owner can remove anyone. Members can remove themselves.
  const isSelf = targetMember.userId === session.user.id;
  const isOwner = team.ownerId === session.user.id;
  if (!isSelf && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (targetMember.role === 'owner') return NextResponse.json({ error: 'Cannot remove owner' }, { status: 400 });

  await prisma.teamMember.delete({ where: { id: params.memberId } });
  return NextResponse.json({ ok: true });
}
