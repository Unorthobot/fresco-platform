import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/invites/[token] — preview invite (who invited you, team name)
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const invite = await prisma.teamInvite.findUnique({
    where: { token: params.token },
    include: { team: { select: { id: true, name: true } } },
  });

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: 'Invite already used' }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 });

  return NextResponse.json({ invite: { teamName: invite.team.name, teamId: invite.teamId, role: invite.role } });
}

// POST /api/invites/[token] — accept invite
export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const invite = await prisma.teamInvite.findUnique({
    where: { token: params.token },
    include: { team: true },
  });

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: 'Invite already used' }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 });

  // Check not already a member
  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: invite.teamId, userId: session.user.id } },
  });
  if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 400 });

  // Add member and mark invite used
  await prisma.$transaction([
    prisma.teamMember.create({
      data: { teamId: invite.teamId, userId: session.user.id, role: invite.role },
    }),
    prisma.teamInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true, teamId: invite.teamId, teamName: invite.team.name });
}
