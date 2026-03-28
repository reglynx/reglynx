import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

function detectPlan(priceId: string | undefined): string {
  if (!priceId) return 'starter';
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
  return 'pilot'; // default to pilot if unknown price
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe signature' },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 },
    );
  }

  console.log('[Stripe Webhook] Received:', event.type);

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id;
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : (session.customer as Stripe.Customer | null)?.id;

        console.log('[Stripe Webhook] checkout.session.completed', {
          orgId,
          customerId,
          subscriptionId: session.subscription,
          customerEmail: session.customer_email ?? session.customer_details?.email,
        });

        if (!session.subscription) {
          console.error('[Stripe Webhook] No subscription on checkout session');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );

        const priceId = subscription.items.data[0]?.price?.id;
        const plan = detectPlan(priceId);

        console.log('[Stripe Webhook] Detected plan:', plan, 'from priceId:', priceId);

        // Build the update payload
        const updatePayload: Record<string, unknown> = {
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status === 'trialing' ? 'trialing' : 'active',
          subscription_plan: plan,
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        };

        // Always set stripe_customer_id if we have it
        if (customerId) {
          updatePayload.stripe_customer_id = customerId;
        }

        // Try update by org_id first (from metadata)
        if (orgId) {
          const { error: updateError, data: updated } = await supabase
            .from('organizations')
            .update(updatePayload)
            .eq('id', orgId)
            .select('id');

          if (updateError) {
            console.error('[Stripe Webhook] Failed to update org by id:', updateError);
          } else if (updated && updated.length > 0) {
            console.log('[Stripe Webhook] Updated org by id:', orgId);
            break;
          }
        }

        // Fallback: find org by stripe_customer_id
        if (customerId) {
          const { data: updated } = await supabase
            .from('organizations')
            .update(updatePayload)
            .eq('stripe_customer_id', customerId)
            .select('id');

          if (updated && updated.length > 0) {
            console.log('[Stripe Webhook] Updated org by stripe_customer_id:', customerId);
            break;
          }
        }

        // Fallback: find org by customer email
        const email = session.customer_email ?? session.customer_details?.email;
        if (email) {
          const { data: users } = await supabase.auth.admin.listUsers();
          const matchedUser = users?.users?.find(u => u.email === email);
          if (matchedUser) {
            const { data: updated } = await supabase
              .from('organizations')
              .update(updatePayload)
              .eq('owner_id', matchedUser.id)
              .select('id');

            if (updated && updated.length > 0) {
              console.log('[Stripe Webhook] Updated org by owner email:', email);
              break;
            }
          }
        }

        console.error('[Stripe Webhook] FAILED to find org. orgId:', orgId, 'customerId:', customerId, 'email:', email);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.org_id;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as Stripe.Customer | null)?.id;

        const priceId = subscription.items.data[0]?.price?.id;
        const plan = detectPlan(priceId);

        let status: string = subscription.status;
        if (status === 'trialing') status = 'trialing';
        else if (status === 'active') status = 'active';
        else if (status === 'past_due') status = 'past_due';
        else status = 'canceled';

        console.log('[Stripe Webhook]', event.type, { orgId, customerId, plan, status });

        const updatePayload: Record<string, unknown> = {
          stripe_subscription_id: subscription.id,
          subscription_status: status,
          subscription_plan: plan,
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        };

        if (customerId) {
          updatePayload.stripe_customer_id = customerId;
        }

        // Try by org_id metadata
        if (orgId) {
          const { data: updated } = await supabase
            .from('organizations')
            .update(updatePayload)
            .eq('id', orgId)
            .select('id');
          if (updated && updated.length > 0) break;
        }

        // Fallback by customer_id
        if (customerId) {
          const { data: updated } = await supabase
            .from('organizations')
            .update(updatePayload)
            .eq('stripe_customer_id', customerId)
            .select('id');
          if (updated && updated.length > 0) break;
        }

        console.error('[Stripe Webhook] subscription update: no org matched', { orgId, customerId });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.org_id;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer : null;

        if (orgId) {
          await supabase
            .from('organizations')
            .update({ subscription_status: 'canceled', stripe_subscription_id: null })
            .eq('id', orgId);
        } else if (customerId) {
          await supabase
            .from('organizations')
            .update({ subscription_status: 'canceled', stripe_subscription_id: null })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoiceAny = invoice as any;
        const subscriptionId =
          typeof invoiceAny.subscription === 'string'
            ? invoiceAny.subscription
            : invoiceAny.subscription?.id;

        if (subscriptionId) {
          await supabase
            .from('organizations')
            .update({ subscription_status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId);
        }
        break;
      }

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 },
    );
  }
}
