import { auth } from './auth';

/**
 * Returns the admin emails configured in env. Comma-separated.
 * Falls back to empty array if unset — no one is admin until you configure it.
 */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns the current session iff the user is signed in AND their email
 * appears in ADMIN_EMAILS. Otherwise returns null.
 *
 * Use this at the top of any admin-only route or page:
 *
 *   const session = await requireAdmin();
 *   if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const admins = getAdminEmails();
  if (admins.length === 0) return null;

  const userEmail = session.user.email.toLowerCase();
  if (!admins.includes(userEmail)) return null;

  return session;
}
