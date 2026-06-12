import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const runtime = 'nodejs';

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature') ?? '';

  if (!verifySignature(rawBody, signature)) {
    console.error('Invalid LS webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventName: string = event.meta.event_name;
  const userId: string | undefined = event.meta.custom_data?.user_id;
  const variantId = String(event.data?.attributes?.variant_id ?? '');
  const status: string = event.data?.attributes?.status ?? '';

  const proVariantId = process.env.LEMONSQUEEZY_PRO_VARIANT_ID!;
  const studioVariantId = process.env.LEMONSQUEEZY_STUDIO_VARIANT_ID!;
  // Founder (June 2026 public ladder) maps to the `pro` tier — same
  // entitlements, new LemonSqueezy product. Env override supported; the
  // fallback is the live variant id so billing works without a config step.
  const founderVariantId = process.env.LEMONSQUEEZY_FOUNDER_VARIANT_ID || '1782750';

  let plan: string | null = null;
  if (variantId === founderVariantId || variantId === proVariantId) plan = 'pro';
  else if (variantId === studioVariantId) plan = 'studio';

  if (!userId) {
    return NextResponse.json({ received: true });
  }

  if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
    const newPlan = status === 'active' ? (plan ?? 'free') : 'free';
    await prisma.user.update({ where: { id: userId }, data: { subscription: newPlan } });
  }

  if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
    await prisma.user.update({ where: { id: userId }, data: { subscription: 'free' } });
  }

  return NextResponse.json({ received: true });
}
