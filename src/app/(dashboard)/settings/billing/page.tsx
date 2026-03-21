'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Organization } from '@/lib/types';

const STATUS_BADGE_MAP: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  trialing: { label: 'Trial', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  past_due: { label: 'Past Due', variant: 'destructive' },
  canceled: { label: 'Canceled', variant: 'outline' },
};

export default function BillingPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrg() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const { data, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id)
        .single<Organization>();

      if (orgError || !data) {
        setError('Organization not found');
      } else {
        setOrg(data);
      }
      setLoading(false);
    }

    fetchOrg();
  }, []);

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to open billing portal');
        return;
      }

      window.location.href = data.url;
    } catch {
      setError('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'Something went wrong'}
        </div>
      </div>
    );
  }

  const planInfo =
    SUBSCRIPTION_PLANS[org.subscription_plan] || SUBSCRIPTION_PLANS.starter;
  const statusInfo =
    STATUS_BADGE_MAP[org.subscription_status] || STATUS_BADGE_MAP.active;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Settings
      </Link>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <CreditCard className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle>Billing</CardTitle>
              <CardDescription>
                Manage your subscription and payment method
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold">{planInfo.name} Plan</span>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <p className="text-2xl font-bold">
              ${planInfo.price}
              <span className="text-sm font-normal text-muted-foreground">
                /month
              </span>
            </p>
            {org.trial_ends_at && org.subscription_status === 'trialing' && (
              <p className="text-sm text-muted-foreground">
                Your trial ends on{' '}
                {new Date(org.trial_ends_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* Plan features */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Plan features
            </p>
            <ul className="space-y-1">
              {planInfo.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Portal button */}
          <Button
            onClick={openBillingPortal}
            disabled={portalLoading || !org.stripe_customer_id}
            className="bg-[#0f172a] text-white hover:bg-[#1e293b]"
          >
            {portalLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                Manage Billing
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </>
            )}
          </Button>

          {!org.stripe_customer_id && (
            <p className="text-sm text-muted-foreground">
              No billing account found. Subscribe to a plan to enable billing
              management.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Billing questions? Email{' '}
            <a
              href="mailto:billing@reglynx.com"
              className="font-medium text-slate-700 underline hover:text-slate-900"
            >
              billing@reglynx.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
