import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Building2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import { BillingActions } from './BillingActions';
import { isJurisdictionSupported } from '@/lib/providers/jurisdiction-config';
import type { Organization } from '@/lib/types';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  trialing:  { label: 'Free trial',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  active:    { label: 'Active',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  past_due:  { label: 'Past Due',    cls: 'bg-red-50 text-red-700 border-red-200' },
  canceled:  { label: 'Canceled',    cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

/** True if the user has actually paid for a plan (vs. default trialing/starter) */
function hasPaidPlan(org: Organization): boolean {
  return !!org.stripe_subscription_id;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let org: Organization | null = null;
  try {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle<Organization>();
    org = data;
  } catch (e) {
    console.error('Failed to fetch organization:', e);
  }

  if (!org) redirect('/onboarding');

  let propCount = 0;
  let hasPhillyProperties = false;
  try {
    const { data: propertiesData, count } = await supabase
      .from('properties')
      .select('id, city, state', { count: 'exact' })
      .eq('org_id', org.id);
    propCount = count ?? 0;
    hasPhillyProperties = (propertiesData ?? []).some((p) =>
      isJurisdictionSupported(p.city ?? '', p.state ?? ''),
    );
  } catch (e) {
    console.error('Failed to fetch properties:', e);
  }

  const isPaid = hasPaidPlan(org);
  const planKey = isPaid ? (org.subscription_plan ?? 'pilot') : null;
  const plan = planKey ? (SUBSCRIPTION_PLANS[planKey as keyof typeof SUBSCRIPTION_PLANS] ?? null) : null;
  const statusInfo = STATUS_LABEL[org.subscription_status] ?? STATUS_LABEL.trialing;

  const isActive = org.subscription_status === 'active' || org.subscription_status === 'trialing';
  const propertyLimit = isPaid && plan ? (plan.limits.properties === Infinity ? '∞' : plan.limits.properties) : 1;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Settings
      </Link>

      {/* Checkout success banner */}
      {checkout === 'success' && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0" />
          Payment received — your plan is being activated. Refresh in a moment if the status hasn&apos;t updated yet.
        </div>
      )}

      {/* Current plan card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {isPaid && plan ? `${plan.name} Plan` : 'Free'}
              </CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {isPaid && plan
                  ? plan.description
                  : 'You checked one property for free. Upgrade to monitor more.'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusInfo.cls}`}>
                {isPaid ? statusInfo.label : 'Free'}
              </span>
              {isPaid && plan && (
                <span className="text-lg font-bold">
                  ${plan.price}
                  <span className="text-xs font-normal text-muted-foreground">/mo</span>
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Usage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-slate-50 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="size-3.5" />
                Properties
              </div>
              <p className="text-2xl font-bold tabular-nums text-slate-800">
                {propCount}
                <span className="text-sm font-normal text-muted-foreground">/{propertyLimit}</span>
              </p>
              {!isPaid && (
                <p className="text-[10px] text-amber-600">Upgrade to add more</p>
              )}
            </div>
            <div className="rounded-lg border bg-slate-50 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                Coverage
              </div>
              <p className="text-sm font-semibold text-slate-700">Philadelphia, PA</p>
              <p className="text-[10px] text-muted-foreground">More cities coming soon</p>
            </div>
          </div>

          {/* Plan features (only show if paid) */}
          {isPaid && plan && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Plan includes</p>
              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {org.trial_ends_at && org.subscription_status === 'trialing' && isPaid && (
            <p className="text-sm text-muted-foreground">
              Trial ends{' '}
              {new Date(org.trial_ends_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </p>
          )}

          {/* Billing actions */}
          <BillingActions
            hasStripeCustomer={Boolean(org.stripe_customer_id)}
            isPaid={isPaid}
            currentPlan={isPaid ? (planKey ?? '') : ''}
            hasPhillyProperties={hasPhillyProperties}
          />
        </CardContent>
      </Card>

      {/* Upgrade options for Pilot users */}
      {isPaid && planKey === 'pilot' && (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="py-4">
            <p className="text-xs font-semibold text-slate-600 mb-3">Upgrade your plan</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-900">
                  Starter
                </span>
                <span className="text-muted-foreground">
                  {SUBSCRIPTION_PLANS.starter.limits.properties} properties · ${SUBSCRIPTION_PLANS.starter.price}/mo
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-900">
                  Professional
                </span>
                <span className="text-muted-foreground">
                  {SUBSCRIPTION_PLANS.professional.limits.properties} properties · ${SUBSCRIPTION_PLANS.professional.price}/mo
                </span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              To switch plans, <a href="mailto:support@reglynx.com" className="underline hover:no-underline">contact support</a> or manage via the billing portal.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
