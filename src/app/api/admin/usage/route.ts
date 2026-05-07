import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

/**
 * GET /api/admin/usage
 *
 * Returns aggregate usage data for the beta cohort. Gated to ADMIN_EMAILS.
 *
 * Shape:
 *   {
 *     summary: { totalUsers, totalSessions, completedSessions, completionRate },
 *     houseBreakdown: [{ house, total, completed }, ...],
 *     verdictBreakdown: [{ verdict, count }, ...],
 *     testers: [{
 *       email, name, signedUpAt, totalSessions, completedSessions,
 *       lastActive, housesUsed: [...]
 *     }, ...],
 *     dailyActivity: [{ date, sessions }, ...]   // last 30 days
 *   }
 */
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch everything we need in parallel — small enough dataset that this is fine.
  const [users, allSessions] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        workspaces: {
          select: {
            sessions: {
              select: {
                id: true,
                houseType: true,
                toolkitType: true,
                decision: true,
                isLocked: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.toolkitSession.findMany({
      select: {
        id: true,
        houseType: true,
        toolkitType: true,
        decision: true,
        isLocked: true,
        createdAt: true,
      },
    }),
  ]);

  // ── Summary ────────────────────────────────────────────────────────────
  type SessionRow = {
    id: string;
    houseType: string | null;
    toolkitType: string;
    decision: string | null;
    isLocked: boolean;
    createdAt: Date;
    updatedAt?: Date;
  };
  type UserWithSessions = {
    id: string;
    email: string;
    name: string | null;
    createdAt: Date;
    workspaces: Array<{ sessions: SessionRow[] }>;
  };

  const typedSessions = allSessions as SessionRow[];
  const typedUsers = users as UserWithSessions[];

  const totalUsers = typedUsers.length;
  const totalSessions = typedSessions.length;
  const completedSessions = typedSessions.filter((s: SessionRow) => s.isLocked).length;
  const completionRate = totalSessions > 0
    ? Math.round((completedSessions / totalSessions) * 100)
    : 0;

  // ── House breakdown — only count sessions where house is set ──────────
  const houseMap = new Map<string, { total: number; completed: number }>();
  for (const s of typedSessions) {
    const house = s.houseType || s.toolkitType || 'unknown';
    const entry = houseMap.get(house) || { total: 0, completed: 0 };
    entry.total += 1;
    if (s.isLocked) entry.completed += 1;
    houseMap.set(house, entry);
  }
  const houseBreakdown = Array.from(houseMap.entries())
    .map(([house, counts]) => ({ house, ...counts }))
    .sort((a, b) => b.total - a.total);

  // ── Verdict breakdown — only count completed sessions ──────────────────
  const verdictMap = new Map<string, number>();
  for (const s of typedSessions) {
    if (!s.isLocked || !s.decision) continue;
    verdictMap.set(s.decision, (verdictMap.get(s.decision) || 0) + 1);
  }
  const verdictBreakdown = Array.from(verdictMap.entries())
    .map(([verdict, count]) => ({ verdict, count }))
    .sort((a, b) => b.count - a.count);

  // ── Per-tester breakdown ───────────────────────────────────────────────
  const testers = typedUsers.map((u: UserWithSessions) => {
    const sessions = u.workspaces.flatMap((w: { sessions: SessionRow[] }) => w.sessions);
    const completed = sessions.filter((s: SessionRow) => s.isLocked).length;
    const housesUsed = Array.from(
      new Set(
        sessions
          .map((s: SessionRow) => s.houseType || s.toolkitType)
          .filter((h: string | null | undefined): h is string => !!h)
      )
    );
    let lastActive: Date | null = null;
    for (const s of sessions) {
      const d = s.updatedAt || s.createdAt;
      if (!lastActive || d > lastActive) lastActive = d;
    }

    return {
      email: u.email,
      name: u.name,
      signedUpAt: u.createdAt,
      totalSessions: sessions.length,
      completedSessions: completed,
      lastActive,
      housesUsed,
    };
  }).sort((a: { lastActive: Date | null }, b: { lastActive: Date | null }) => {
    // Sort by last active desc, with users who never started a session last.
    const aTime = a.lastActive?.getTime() || 0;
    const bTime = b.lastActive?.getTime() || 0;
    return bTime - aTime;
  });

  // ── Daily activity — last 30 days ──────────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dayMap = new Map<string, number>();
  for (let i = 0; i < 30; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const s of typedSessions) {
    if (s.createdAt < thirtyDaysAgo) continue;
    const key = s.createdAt.toISOString().slice(0, 10);
    if (dayMap.has(key)) {
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    }
  }
  const dailyActivity = Array.from(dayMap.entries())
    .map(([date, sessions]) => ({ date, sessions }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    summary: {
      totalUsers,
      totalSessions,
      completedSessions,
      completionRate,
    },
    houseBreakdown,
    verdictBreakdown,
    testers,
    dailyActivity,
    generatedAt: new Date().toISOString(),
  });
}
