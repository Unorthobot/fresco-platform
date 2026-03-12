import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { configureLemonSqueezy } from '@/lib/lemonsqueezy';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('LS checkout session:', JSON.stringify(session));
  console.log('LS variant/store:', process.env.LEMONSQUEEZY_STORE_ID, process.env.LEMONSQUEEZY_PRO_VARIANT_ID);
  const { plan } = await req.json();
  const variantId = plan === 'studio'
    ? process.env.LEMONSQUEEZY_STUDIO_VARIANT_ID!
    : process.env.LEMONSQUEEZY_PRO_VARIANT_ID!;

  configureLemonSqueezy();

  const checkout = await createCheckout(
    process.env.LEMONSQUEEZY_STORE_ID!,
    variantId,
    {
      checkoutOptions: { embed: false },
      checkoutData: {
        email: session.user.email ?? undefined,
        custom: { user_id: session.user.id },
      },
      productOptions: {
        redirectUrl: process.env.NEXTAUTH_URL + '/',
        receiptButtonText: 'Back to Fresco',
      },
    }
  );

  if (checkout.error) {
    console.error('LS checkout full error:', JSON.stringify(checkout));
    return NextResponse.json({ error: checkout.error.message }, { status: 500 });
  }
  if (!checkout.data?.data.attributes.url) {
    console.error('LS checkout no URL:', JSON.stringify(checkout));
    return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 });
  }

  return NextResponse.json({ url: checkout.data?.data.attributes.url });
}
