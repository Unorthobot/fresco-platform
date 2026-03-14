import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/teams — get the team the current user belongs to (or owns)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  // Find team where user is owner or member
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    include: {
      team: {
        include: {
          owner: { select: { id: true, name: true, email: true, image: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
            },
            orderBy: { joinedAt: 'asc' },
          },
          invites: {
            where: { usedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!membership) {
    // Check if they own a team (owner row may not have a member row)
    const ownedTeam = await prisma.team.findFirst({
      where: { ownerId: userId },
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        invites: {
          where: { usedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return NextResponse.json({ team: ownedTeam });
  }

  return NextResponse.json({ team: membership.team });
}

// POST /api/teams — create a team (studio users only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.subscription !== 'studio') {
    return NextResponse.json({ error: 'Studio plan required' }, { status: 403 });
  }

  // Check they don't already have a team
  const existing = await prisma.team.findFirst({ where: { ownerId: session.user.id } });
  if (existing) return NextResponse.json({ error: 'You already have a team' }, { status: 400 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Team name required' }, { status: 400 });

  const team = await prisma.team.create({
    data: {
      name: name.trim(),
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id, role: 'owner' },
      },
    },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      invites: true,
    },
  });

  return NextResponse.json({ team });
}
