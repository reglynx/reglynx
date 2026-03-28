'use client';

import { useState } from 'react';
import { Check, Loader2, ArrowRight } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

type PlanKey = 'pilot' | 'starter' | 'professional';

const PLANS: {
  key: PlanKey;
  name: string;
  price: number;
  badge?: string;
  recommended?: boolean;
  description: string;
  includes: string[];
}[] = [
  {
    key: 'pilot',
    name: 'RegLynx Pilot',
    price: 49,
    badge: 'Recommended',
    recommended: true,
    description:
      'Monitor up to 5 Philadelphia properties with live checks for violations, licenses, permits, and parcel-level risk.',
    includes: [
      'Up to 5 properties',
      'Full violation history',
      'Rental license status',
      'Permit activity',
      'Assessment data',
      'Evidence links to city records',
      'On-demand refresh',
    ],
  },
  {
    key: 'starter',
    name: 'RegLynx Starter',
    price: 147,
    description:
      'For active operators who need broader coverage and more compliance workflow support.',
    includes: [
      'Everything in Pilot',
      `Up to ${SUBSCRIPTION_PLANS.starter.limits.properties} properties`,
      `${SUBSCRIPTION_PLANS.starter.limits.documentsPerMonth} document drafts/month`,
      'Federal + state jurisdiction coverage',
      'Email alerts',
      'PDF export',
    ],
  },
  {
    key: 'professional',
    name: 'RegLynx Professional',
    price: 297,
    description:
      'For serious managers and portfolio operators who need deeper visibility across multiple properties.',
    includes: [
      'Everything in Starter',
      `Up to ${SUBSCRIPTION_PLANS.professional.limits.properties} properties`,
      'Unlimited document drafts',
      'All jurisdictions (federal + state + local)',
      'Priority alerts',
      'Team access (up to 5)',
    ],
  },
];

export function UpgradeSelection() {
  const [selected, setSelected] = useState<PlanKey>('pilot');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = PLANS.find((p) => p.key === selected)!;
  const priceId = SUBSCRIPTION_PLANS[selected]?.priceId;

  async function handleCheckout() {
    if (!priceId) {
      setError('This plan is not yet available. Contact support@reglynx.com');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Checkout failed');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0f172a]">
          Choose the right plan for your portfolio.
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
          You&apos;ve checked your first property for free. Upgrade to monitor
          more properties and keep live Philadelphia compliance data in one place.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isSelected = selected === plan.key;
          const hasPriceId = !!SUBSCRIPTION_PLANS[plan.key]?.priceId;

          return (
            <button
              key={plan.key}
              type="button"
              onClick={() => setSelected(plan.key)}
              className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                isSelected
                  ? 'border-[#0f172a] bg-slate-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Recommended badge */}
              {plan.recommended && (
                <div className="absolute -top-2.5 left-4 rounded-full bg-[#0f172a] px-2.5 py-0.5 text-[10px] font-bold text-white">
                  {plan.badge}
                </div>
              )}

              {/* Selection indicator */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">{plan.name}</p>
                  <p className="mt-1">
                    <span className="text-2xl font-bold text-[#0f172a]">${plan.price}</span>
                    <span className="text-sm text-slate-400">/mo</span>
                  </p>
                </div>
                <div
                  className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected
                      ? 'border-[#0f172a] bg-[#0f172a]'
                      : 'border-slate-300'
                  }`}
                >
                  {isSelected && <Check className="size-3 text-white" />}
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                {plan.description}
              </p>

              <ul className="space-y-1.5">
                {plan.includes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs text-slate-600"
                  >
                    <Check className="size-3 text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {!hasPriceId && (
                <p className="mt-3 text-[10px] text-slate-400">
                  Not yet available
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Comparison hint */}
      <p className="text-xs text-slate-400 text-center">
        All plans include live Philadelphia property checks and evidence links to city records.
      </p>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 text-center rounded-lg border border-red-200 bg-red-50 px-4 py-2">
          {error}
        </p>
      )}

      {/* CTA */}
      <button
        onClick={handleCheckout}
        disabled={loading || !priceId}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f172a] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-40 transition-colors"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4" />
        )}
        {loading
          ? 'Redirecting to checkout...'
          : `Continue with ${selectedPlan.name} — $${selectedPlan.price}/month`}
      </button>

      <p className="text-xs text-slate-400 text-center">
        Cancel anytime. No long-term commitment.
      </p>
    </div>
  );
}
