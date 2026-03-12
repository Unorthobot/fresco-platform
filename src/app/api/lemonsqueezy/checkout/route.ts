import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { configureLemonSqueezy } from '@/lib/lemonsqueezy';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
        email: session.user.email,
        custom: { user_id: (session.user as any).id },
      },
      productOptions: {
        redirectUrl: process.env.NEXTAUTH_URL + '/',
        receiptButtonText: 'Back to Fresco',
      },
    }
  );

  if (checkout.error) {
    return NextResponse.json({ error: checkout.error.message }, { status: 500 });
  }

  return NextResponse.json({ url: checkout.data?.data.attributes.url });
}
