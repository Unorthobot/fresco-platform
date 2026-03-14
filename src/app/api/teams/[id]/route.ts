import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/teams/[id] — rename team (owner/admin only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const team = await prisma.team.findUnique({ where: { id: params.id } });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.ownerId !== session.user.id) return NextResponse.json({ error: 'Owner only' }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const updated = await prisma.team.update({
    where: { id: params.id },
    data: { name: name.trim() },
  });

  return NextResponse.json({ team: updated });
}

// DELETE /api/teams/[id] — disband team (owner only)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const team = await prisma.team.findUnique({ where: { id: params.id } });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.ownerId !== session.user.id) return NextResponse.json({ error: 'Owner only' }, { status: 403 });

  await prisma.team.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
