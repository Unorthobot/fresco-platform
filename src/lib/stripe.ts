'use client';

import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    price: 0,
    priceId: null,
    description: 'For individuals getting started',
    features: [
      '3 workspaces',
      '10 AI generations per month',
      'Basic exports (PDF)',
      'Email support',
    ],
    limits: {
      workspaces: 3,
      aiGenerations: 10,
    },
  },
  pro: {
    name: 'Pro',
    price: 29,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_1T1muDDxdMzzMWBlKFBbR4jK',
    description: 'For professionals and power users',
    features: [
      'Unlimited workspaces',
      'Unlimited AI generations',
      'Advanced exports (PDF, DOCX, PPTX)',
      'Priority support',
      'Custom templates',
    ],
    limits: {
      workspaces: -1, // unlimited
      aiGenerations: -1, // unlimited
    },
  },
  studio: {
    name: 'Studio',
    price: 79,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID || 'price_1T1mvMDxdMzzMWBlnhUI3Sjn',
    description: 'For teams and organizations',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Shared workspaces',
      'Admin dashboard',
      'SSO integration',
      'Dedicated support',
    ],
    limits: {
      workspaces: -1,
      aiGenerations: -1,
      teamMembers: 10,
    },
  },
};

export type PlanType = keyof typeof PRICING_PLANS;

export async function redirectToCheckout(priceId: string, userEmail?: string) {
  try {
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        userEmail,
      }),
    });

    const { url, error } = await response.json();

    if (error) {
      throw new Error(error);
    }

    if (url) {
      window.location.href = url;
    }
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    throw error;
  }
}

export async function redirectToPortal(customerId: string) {
  try {
    const response = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customerId }),
    });

    const { url, error } = await response.json();

    if (error) {
      throw new Error(error);
    }

    if (url) {
      window.location.href = url;
    }
  } catch (error) {
    console.error('Error redirecting to portal:', error);
    throw error;
  }
}

export { stripePromise };
