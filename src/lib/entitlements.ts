// Server-authoritative entitlements (WP5). The Zustand store has a parallel
// client-side copy for UX (showing the upgrade modal early), but the limits
// here are the ones that actually gate generation — the client copy is a
// hint, this is the wall. Keep VERDICTS_PER_MONTH in sync with
// store.getUsageLimits.
//
// Tiers: 'free' | 'pro' (publicly "Founder") | 'studio' (grandfathered beta
// cohort). Founder/studio are unlimited; only free is capped.

import { prisma } from '@/lib/prisma';

export const VERDICTS_PER_MONTH: Record<string, number> = {
  free: 3,
  pro: -1, // Founder — unlimited
  studio: -1, // grandfathered — unlimited
};

/** Current month key, matching the store's format ("2026-06"). */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthlyLimitFor(subscription: string | null | undefined): number {
  return VERDICTS_PER_MONTH[subscription || 'free'] ?? VERDICTS_PER_MONTH.free;
}

/** Lenses are a Founder+ feature; free (and unauthenticated) are blocked. */
export function canUseLenses(subscription: string | null | undefined): boolean {
  return (subscription || 'free') !== 'free';
}

export interface VerdictQuota {
  allowed: boolean;
  limit: number; // -1 = unlimited
  used: number; // verdicts used this month (0 if the month just rolled over)
  remaining: number; // Infinity-safe: -1 when unlimited
}

/**
 * Read-only quota check for a signed-in user. Treats a rolled-over month as a
 * fresh count without writing — the write happens in consumeVerdict.
 */
export async function checkVerdictQuota(userId: string): Promise<VerdictQuota> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscription: true, aiGenerationsThisMonth: true, aiGenerationsResetDate: true },
  });

  const limit = monthlyLimitFor(user?.subscription);
  if (limit === -1) {
    return { allowed: true, limit: -1, used: 0, remaining: -1 };
  }

  // A new month means the stored count no longer applies.
  const used = user?.aiGenerationsResetDate === currentMonth()
    ? (user?.aiGenerationsThisMonth || 0)
    : 0;

  return { allowed: used < limit, limit, used, remaining: Math.max(0, limit - used) };
}

/**
 * Record one verdict against a user's monthly quota. Resets the counter when
 * the month has rolled over. No-op for unlimited tiers. Best-effort — callers
 * fire-and-forget so a counter write never blocks or fails a delivered verdict.
 */
export async function consumeVerdict(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscription: true, aiGenerationsThisMonth: true, aiGenerationsResetDate: true },
  });
  if (!user) return;
  if (monthlyLimitFor(user.subscription) === -1) return; // unlimited — don't bother counting

  const month = currentMonth();
  const rolledOver = user.aiGenerationsResetDate !== month;
  await prisma.user.update({
    where: { id: userId },
    data: {
      aiGenerationsThisMonth: rolledOver ? 1 : (user.aiGenerationsThisMonth || 0) + 1,
      aiGenerationsResetDate: month,
    },
  });
}
