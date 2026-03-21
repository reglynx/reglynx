import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
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
