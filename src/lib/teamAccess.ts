// Team collaboration was retired June 2026 (public ladder is Free + Founder,
// solo). It's retained for one grandfathered account only — Sipho — by
// explicit request. Gate every team surface (nav, workspace visibility,
// TeamPage, /api/teams) on this, not on subscription tier.
//
// Single hardcoded allowlist by email — simplest correct thing for one user.
// Add more emails here if that ever changes.

export const TEAM_ALLOWED_EMAILS = ['sipho.sepeng@gmail.com'];

export function canUseTeams(email?: string | null): boolean {
  if (!email) return false;
  return TEAM_ALLOWED_EMAILS.includes(email.trim().toLowerCase());
}
