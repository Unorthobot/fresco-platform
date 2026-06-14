'use client';

// Decision reminders (#3). A verdict is "due to revisit" when the user hasn't
// touched it for longer than their chosen cadence. Derived from the session's
// last activity (updatedAt) rather than a stored reminder date — so no schema,
// and re-running or editing a decision naturally re-arms the clock.

export type RevisitCadence = 'off' | '2w' | '1m';

const KEY = 'fresco-revisit-cadence';

const CADENCE_DAYS: Record<RevisitCadence, number> = { off: 0, '2w': 14, '1m': 30 };

export const CADENCE_OPTIONS: { value: RevisitCadence; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: '2w', label: 'After 2 weeks' },
  { value: '1m', label: 'After 1 month' },
];

export function getRevisitCadence(): RevisitCadence {
  if (typeof window === 'undefined') return 'off';
  try {
    const v = localStorage.getItem(KEY);
    return v === '2w' || v === '1m' ? v : 'off';
  } catch {
    return 'off';
  }
}

export function setRevisitCadence(v: RevisitCadence): void {
  try { localStorage.setItem(KEY, v); } catch { /* storage unavailable */ }
}

/** True when a decision last touched at `updatedAt` is overdue for a revisit. */
export function isDueToRevisit(updatedAt: string | Date | undefined, cadence: RevisitCadence): boolean {
  if (cadence === 'off' || !updatedAt) return false;
  const last = new Date(updatedAt).getTime();
  if (!Number.isFinite(last)) return false;
  const ageDays = (Date.now() - last) / 86_400_000;
  return ageDays >= CADENCE_DAYS[cadence];
}
