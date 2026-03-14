import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/teams/[id]/invites — create an invite link
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: params.id, userId: session.user.id } },
  });
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Owner or admin only' }, { status: 403 });
  }

  const { role = 'member' } = await req.json().catch(() => ({}));

  // Expire any existing unused invites for cleanliness (optional — we just make a new one)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.teamInvite.create({
    data: {
      teamId: params.id,
      role,
      createdBy: session.user.id,
      expiresAt,
    },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/join/${invite.token}`;
  return NextResponse.json({ invite, url: inviteUrl });
}

// GET /api/teams/[id]/invites — list active invites
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: params.id, userId: session.user.id } },
  });
  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const invites = await prisma.teamInvite.findMany({
    where: { teamId: params.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ invites });
}
