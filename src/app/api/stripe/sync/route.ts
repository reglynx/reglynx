import { NextResponse } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { Organization } from '@/lib/types';

/**
 * POST /api/stripe/sync
 *
 * Client-side fallback: if the webhook didn't fire or failed, the client
 * can call this after returning from Stripe checkout to force-sync the
 * subscription state from Stripe into Supabase.
 *
 * Requires auth. Looks up the org's stripe_customer_id, fetches their
 * active subscriptions from Stripe, and updates the org row.
 */
export async function POST() {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Fetch org
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle<Organization>();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // If org already has a subscription_id, fetch it directly
    if (org.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
        const priceId = sub.items.data[0]?.price?.id;
        const plan = detectPlan(priceId);

        await serviceClient
          .from('organizations')
          .update({
            subscription_status: sub.status === 'trialing' ? 'trialing' : sub.status === 'active' ? 'active' : sub.status,
            subscription_plan: plan,
            trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          })
          .eq('id', org.id);

        return NextResponse.json({ synced: true, plan, status: sub.status });
      } catch (e) {
        console.error('[Stripe Sync] Failed to retrieve subscription:', e);
      }
    }

    // If no subscription_id but we have a customer_id, look up their subscriptions
    if (org.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({
        customer: org.stripe_customer_id,
        status: 'all',
        limit: 1,
      });

      const sub = subs.data[0];
      if (sub) {
        const priceId = sub.items.data[0]?.price?.id;
        const plan = detectPlan(priceId);

        await serviceClient
          .from('organizations')
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: sub.status === 'trialing' ? 'trialing' : sub.status === 'active' ? 'active' : sub.status,
            subscription_plan: plan,
            trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          })
          .eq('id', org.id);

        return NextResponse.json({ synced: true, plan, status: sub.status });
      }
    }

    // Last resort: search Stripe customers by email
    if (user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      const customer = customers.data[0];

      if (customer) {
        // Save customer_id first
        await serviceClient
          .from('organizations')
          .update({ stripe_customer_id: customer.id })
          .eq('id', org.id);

        const subs = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'all',
          limit: 1,
        });

        const sub = subs.data[0];
        if (sub) {
          const priceId = sub.items.data[0]?.price?.id;
          const plan = detectPlan(priceId);

          await serviceClient
            .from('organizations')
            .update({
              stripe_customer_id: customer.id,
              stripe_subscription_id: sub.id,
              subscription_status: sub.status === 'trialing' ? 'trialing' : sub.status === 'active' ? 'active' : sub.status,
              subscription_plan: plan,
              trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            })
            .eq('id', org.id);

          return NextResponse.json({ synced: true, plan, status: sub.status });
        }

        return NextResponse.json({ synced: false, reason: 'Customer found but no subscription' });
      }
    }

    return NextResponse.json({ synced: false, reason: 'No Stripe customer found' });
  } catch (error) {
    console.error('[Stripe Sync] Error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

function detectPlan(priceId: string | undefined): string {
  if (!priceId) return 'pilot';
  if (
    priceId === process.env.STRIPE_PRICE_ID_PILOT ||
    priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PILOT
  ) return 'pilot';
  if (
    priceId === process.env.STRIPE_PRICE_ID_STARTER ||
    priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER
  ) return 'starter';
  if (
    priceId === process.env.STRIPE_PRICE_ID_PROFESSIONAL ||
    priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL
  ) return 'professional';
  if (
    priceId === process.env.STRIPE_PRICE_ID_ENTERPRISE ||
    priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE
  ) return 'enterprise';
  return 'pilot';
}
