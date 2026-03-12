import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

export function configureLemonSqueezy() {
  lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY!,
    onError(error) {
      console.error('LemonSqueezy error:', error);
    },
  });
}

export const LS_VARIANT_IDS = {
  pro: process.env.LEMONSQUEEZY_PRO_VARIANT_ID!,
  studio: process.env.LEMONSQUEEZY_STUDIO_VARIANT_ID!,
};
