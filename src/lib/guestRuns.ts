// Guest run tracker
// =====================
// Tracks lifetime house runs for unauthenticated users. Persisted directly to
// localStorage rather than to the Zustand user object — anonymous users have
// no `state.user`, so a quota system that depends on the user object cannot
// enforce limits on them.
//
// Three free lifetime runs. After that, the modal asks them to sign up.
// Resets when the user actually signs up — the gate becomes their account
// quota at that point.

const KEY = 'fresco-guest-runs';
export const GUEST_RUN_LIMIT = 3;

/** Read current guest run count. Safe on SSR — returns 0 outside the browser. */
export function getGuestRunCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Increment the guest run counter. Called when a verdict lands for an anonymous user. */
export function incrementGuestRunCount(): number {
  if (typeof window === 'undefined') return 0;
  const next = getGuestRunCount() + 1;
  try {
    localStorage.setItem(KEY, String(next));
  } catch {
    /* storage unavailable — fail open rather than block the user */
  }
  // Notify any listening UI (e.g., the sidebar usage indicator) to re-read.
  // Storage events only fire across tabs, so we dispatch a custom event for
  // same-tab listeners.
  try {
    window.dispatchEvent(new CustomEvent('fresco:guest-runs-changed', { detail: { count: next } }));
  } catch {
    /* ignore */
  }
  return next;
}

/** True if the anonymous user has runs remaining. */
export function canGuestRun(): boolean {
  return getGuestRunCount() < GUEST_RUN_LIMIT;
}

/** Reset on signup — once the user has an account, the gate moves to their tier quota. */
export function resetGuestRunCount(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Backfill the guest counter from existing session data.
 *
 * Called once at app boot for anonymous users. If the counter is 0 but the
 * user has existing sessions in their store (i.e., they ran them before the
 * counter was wired), set the counter to min(sessions, limit). Without this,
 * users who ran sessions before this fix shipped get a fresh-looking 0/3
 * counter and can keep running indefinitely.
 *
 * Conservative direction: if backfill is ambiguous, err toward enforcement
 * (more counted runs, not fewer). The honest tradeoff is users who ran
 * sessions long ago and forgot will hit the limit immediately. That's
 * acceptable — the gate is meant to push them toward signup anyway.
 */
const BACKFILL_KEY = 'fresco-guest-runs-backfilled';
export function backfillGuestRunCount(sessionCount: number): void {
  if (typeof window === 'undefined') return;
  // Only run once per browser. If we've already backfilled, the counter is
  // the source of truth from then on.
  try {
    if (localStorage.getItem(BACKFILL_KEY)) return;
  } catch {
    return;
  }
  // If there's already a counter value, respect it — it's been writing
  // correctly since the fix shipped.
  if (getGuestRunCount() > 0) {
    try { localStorage.setItem(BACKFILL_KEY, '1'); } catch { /* ignore */ }
    return;
  }
  // Backfill from session count, capped at the limit.
  if (sessionCount > 0) {
    const value = Math.min(sessionCount, GUEST_RUN_LIMIT);
    try {
      localStorage.setItem(KEY, String(value));
      localStorage.setItem(BACKFILL_KEY, '1');
      window.dispatchEvent(new CustomEvent('fresco:guest-runs-changed', { detail: { count: value } }));
    } catch {
      /* ignore */
    }
  } else {
    // No sessions, no backfill needed. Mark as done so we don't keep checking.
    try { localStorage.setItem(BACKFILL_KEY, '1'); } catch { /* ignore */ }
  }
}
