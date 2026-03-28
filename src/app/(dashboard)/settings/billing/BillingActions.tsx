'use client';

import { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { UpgradeSelection } from '@/components/upgrade/UpgradeSelection';

interface BillingActionsProps {
  hasStripeCustomer: boolean;
  isPaid: boolean;
  currentPlan: string;
  hasPhillyProperties: boolean;
}

export function BillingActions({
  hasStripeCustomer,
  isPaid,
  currentPlan,
}: BillingActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to open portal'); return; }
      window.location.href = data.url;
    } catch {
      setError('Failed to open billing portal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      {/* Not paid — show full upgrade selection */}
      {!isPaid && <UpgradeSelection />}

      {/* Paid — show billing portal */}
      {isPaid && (
        <button
          onClick={openPortal}
          disabled={loading || !hasStripeCustomer}
          className="flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
          {loading ? 'Opening...' : 'Manage Billing Portal'}
        </button>
      )}

      {isPaid && currentPlan === 'pilot' && (
        <p className="text-xs text-muted-foreground">
          Need more than 5 properties? Upgrade via the billing portal or{' '}
          <a href="mailto:support@reglynx.com" className="underline hover:no-underline">contact us</a>.
        </p>
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
