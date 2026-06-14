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

// POST /api/teams — retired June 2026. Team collaboration is no longer part
// of Fresco; existing teams/workspaces are untouched, but no new teams can be
// created. GET still works so existing shared workspaces keep resolving.
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: 'Team collaboration has been retired.', code: 'feature_retired' },
    { status: 410 }
  );
}
