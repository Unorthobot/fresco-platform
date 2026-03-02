import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2026-01-28.clover' });

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const customerId = session.customer as string;
      if (userId && userId !== 'anonymous' && customerId) {
        await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const priceId = sub.items.data[0]?.price.id;
      let plan = 'free';
      if (sub.status === 'active' || sub.status === 'trialing') {
        if (priceId === 'price_1T1mvMDxdMzzMWBlnhUl3Sjn') plan = 'studio';
        else if (priceId === 'price_1T1muDDxdMzzMWBlKFBbR4jK') plan = 'pro';
      }
      await prisma.user.updateMany({ where: { stripeCustomerId: customerId }, data: { subscription: plan } });
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.user.updateMany({ where: { stripeCustomerId: sub.customer as string }, data: { subscription: 'free' } });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
