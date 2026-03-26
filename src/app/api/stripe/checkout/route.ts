import { NextResponse } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { Organization } from '@/lib/types';

const ALLOWED_PRICE_IDS = new Set(
  [
    process.env.STRIPE_PRICE_ID_PILOT,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PILOT,
    process.env.STRIPE_PRICE_ID_STARTER,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER,
    process.env.STRIPE_PRICE_ID_PROFESSIONAL,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL,
    process.env.STRIPE_PRICE_ID_ENTERPRISE,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE,
  ].filter(Boolean),
);

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Billing is not yet configured. Contact support@reglynx.com to get started.' },
        { status: 503 },
      );
    }

    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 },
      );
    }

    // Validate priceId is one of our known price IDs to prevent arbitrary Stripe price use
    if (ALLOWED_PRICE_IDS.size > 0 && !ALLOWED_PRICE_IDS.has(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 },
      );
    }

    // Authenticate the user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the user's organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle<Organization>();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Create or reuse Stripe customer
    let customerId = org.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { org_id: org.id, supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Persist the Stripe customer ID using the service client
      const serviceClient = createServiceClient();
      await serviceClient
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id);
    }

    // Build success / cancel URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://www.reglynx.com';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings/billing?checkout=success`,
      cancel_url: `${origin}/settings/billing`,
      subscription_data: {
        trial_period_days: 14,
        metadata: { org_id: org.id },
      },
      metadata: { org_id: org.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
