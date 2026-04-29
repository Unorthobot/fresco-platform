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
