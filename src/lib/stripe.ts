import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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
      return process.env.STRIPE_PRICE_ID_STARTER!;
    case 'professional':
      return process.env.STRIPE_PRICE_ID_PROFESSIONAL!;
    case 'enterprise':
      return process.env.STRIPE_PRICE_ID_ENTERPRISE!;
    default:
      throw new Error(`Unknown plan: ${plan}`);
  }
}
