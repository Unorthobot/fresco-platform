'use client';

// LemonSqueezy checkout links. The subscription webhook activates the plan
// via meta.custom_data.user_id — a bare checkout URL carries none, so a
// buyer would pay and never get upgraded. Always open checkouts through
// this helper, which attaches the signed-in user's id (and prefills their
// email). Guests get the bare URL; the webhook can't link them anyway —
// they need to sign in before buying.

export function checkoutUrlFor(
  base: string,
  user?: { id?: string; email?: string } | null
): string {
  try {
    const u = new URL(base);
    if (user?.id && user.id !== 'guest' && user.id !== 'demo-user') {
      u.searchParams.set('checkout[custom][user_id]', user.id);
      if (user.email) u.searchParams.set('checkout[email]', user.email);
    }
    return u.toString();
  } catch {
    return base;
  }
}
