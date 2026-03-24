import Stripe from 'stripe';

/**
 * Returns true if STRIPE_SECRET_KEY is present in the environment.
 * Use this to gate billing UI rather than crashing on missing config.
 */
export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && key.startsWith('sk_'));
}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        'STRIPE_SECRET_KEY is not set. Configure it in your environment variables.',
      );
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    });
  }
  return _stripe;
}

// Keep the named export for backwards compatibility but make it lazy
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export function getStripePriceId(plan: string): string {
  switch (plan) {
    case 'starter':
      return process.env.STRIPE_PRICE_ID_STARTER ?? '';
    case 'pilot':
      return (
        process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PILOT ??
        process.env.STRIPE_PRICE_ID_PILOT ??
        ''
      );
    case 'professional':
      return process.env.STRIPE_PRICE_ID_PROFESSIONAL ?? '';
    case 'enterprise':
      return process.env.STRIPE_PRICE_ID_ENTERPRISE ?? '';
    default:
      throw new Error(`Unknown plan: ${plan}`);
  }
}
