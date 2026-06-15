'use client';

// Guest → account import gate.
//
// Work created before sign-up lives only in the local store. We must not lose
// it (beta testers did, before the migration existed) — but we also must not
// silently write it into whichever account logs in first on a shared browser
// (that leaks one person's confidential decision into another's account).
//
// The resolution: on login, move any guest rows OUT of the main store into a
// dedicated stash key, load the account's real data clean, and ask the user
// whether to import. Migration only happens on explicit consent. The stash is
// persistent (survives a tab close, so the prompt resumes) and is cleared on
// import, discard, or explicit sign-out.

const KEY = 'fresco-pending-guest-import';

export interface PendingGuestImport {
  workspaces: any[];
  sessions: any[];
}

/** A guest row is one with no real owner — created while unauthenticated. */
export function isGuestOwned(userId: unknown): boolean {
  return !userId || userId === 'guest' || userId === 'demo-user';
}

export function stashGuestImport(data: PendingGuestImport): void {
  if (!data.workspaces.length && !data.sessions.length) return;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
}

export function readGuestImport(): PendingGuestImport | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || (!parsed.workspaces?.length && !parsed.sessions?.length)) return null;
    return { workspaces: parsed.workspaces || [], sessions: parsed.sessions || [] };
  } catch {
    return null;
  }
}

export function clearGuestImport(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

/** A short human label for the stashed work, for the consent prompt. */
export function describeGuestImport(data: PendingGuestImport): string {
  const n = data.sessions.length;
  if (n === 0) return 'your guest work';
  const first =
    (data.sessions[0] as any)?.aiOutputs?.houseResult?.primaryQuestion ||
    (data.sessions[0] as any)?.title ||
    (data.workspaces[0] as any)?.title ||
    'a decision';
  if (n === 1) return `“${String(first).slice(0, 80)}”`;
  return `“${String(first).slice(0, 60)}” and ${n - 1} more`;
}
