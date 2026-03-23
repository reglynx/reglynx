'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ExternalLink, Zap, MapPin } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

interface BillingActionsProps {
  hasPilotPriceId: boolean;
  hasStripeCustomer: boolean;
  isSubscribed: boolean;
  currentPlan: string;
  /** True if org has ≥1 property in a supported jurisdiction (e.g. Philadelphia) */
  hasPhillyProperties: boolean;
}

export function BillingActions({
  hasPilotPriceId,
  hasStripeCustomer,
  isSubscribed,
  currentPlan,
  hasPhillyProperties,
}: BillingActionsProps) {
  const [loading, setLoading] = useState<null | 'pilot' | 'portal'>(null);
  const [error, setError] = useState<string | null>(null);

  async function startPilot() {
    const priceId = SUBSCRIPTION_PLANS.pilot.priceId;
    if (!priceId) {
      setError('Pilot plan not yet configured. Contact support@reglynx.com to get started.');
      return;
    }
    setLoading('pilot');
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Checkout failed'); return; }
      window.location.href = data.url;
    } catch {
      setError('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading('portal');
    setError(null);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to open portal'); return; }
      window.location.href = data.url;
    } catch {
      setError('Failed to open billing portal.');
    } finally {
      setLoading(null);
    }
  }

  const onPilotOrHigher = currentPlan === 'pilot' || currentPlan === 'professional' || currentPlan === 'enterprise';

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      {/* Primary CTA: gate on supported jurisdiction */}
      {!isSubscribed && hasPhillyProperties && (
        <div className="rounded-lg border-2 border-slate-900 bg-slate-900 p-4 text-white space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-sm">Start Philadelphia Pilot — $49/mo</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Monitor up to 5 Philadelphia rental properties. Live L&amp;I violation checks,
            rental license tracking, and daily compliance alerts — backed by Philadelphia Open Data.
          </p>
          <button
            onClick={startPilot}
            disabled={loading !== null}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
          >
            {loading === 'pilot' ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
            {loading === 'pilot' ? 'Redirecting to checkout…' : 'Start Pilot Plan'}
          </button>
          {!hasPilotPriceId && (
            <p className="text-[10px] text-slate-400 text-center">
              Stripe price not yet configured — contact support@reglynx.com
            </p>
          )}
        </div>
      )}

      {/* Waitlist CTA: org has no properties in a supported jurisdiction */}
      {!isSubscribed && !hasPhillyProperties && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-blue-500 shrink-0" />
            <span className="font-semibold text-sm text-blue-900">Coverage not yet active in your jurisdiction</span>
          </div>
          <p className="text-xs text-blue-700 leading-relaxed">
            Live compliance monitoring is currently available for Philadelphia, PA.
            Add a Philadelphia property to activate monitoring, or join the waitlist
            to be notified when your city goes live.
          </p>
          <Link
            href="/early-access"
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
          >
            <MapPin className="size-4" />
            Notify me when available
          </Link>
        </div>
      )}

      {/* Manage billing portal for existing subscribers */}
      {isSubscribed && (
        <button
          onClick={openPortal}
          disabled={loading !== null || !hasStripeCustomer}
          className="flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent disabled:opacity-60"
        >
          {loading === 'portal' ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
          {loading === 'portal' ? 'Opening…' : 'Manage Billing Portal'}
        </button>
      )}

      {/* Upgrade from pilot to professional */}
      {isSubscribed && currentPlan === 'pilot' && (
        <p className="text-xs text-muted-foreground">
          Need more than 5 properties?{' '}
          <a href="mailto:support@reglynx.com" className="underline hover:no-underline">
            Contact us
          </a>{' '}
          to upgrade to Professional.
        </p>
      )}

      {!hasStripeCustomer && isSubscribed && (
        <p className="text-xs text-muted-foreground">No billing account on file.</p>
      )}

      <p className="text-xs text-muted-foreground">
        Questions?{' '}
        <a href="mailto:billing@reglynx.com" className="underline hover:no-underline">
          billing@reglynx.com
        </a>
      </p>
    </div>
  );
}
