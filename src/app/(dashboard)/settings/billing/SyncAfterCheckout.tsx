'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Fires POST /api/stripe/sync when mounted.
 * Used on the billing page after ?checkout=success redirect.
 * If sync succeeds, refreshes the page so server component picks up
 * the updated subscription state.
 */
export function SyncAfterCheckout() {
  const router = useRouter();
  const [status, setStatus] = useState<'syncing' | 'done' | 'failed'>('syncing');

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const res = await fetch('/api/stripe/sync', { method: 'POST' });
        const data = await res.json();

        if (cancelled) return;

        if (data.synced) {
          setStatus('done');
          // Refresh server component to pick up new subscription state
          router.refresh();
        } else {
          setStatus('failed');
          // Still refresh — webhook may have worked even if sync didn't find anything new
          setTimeout(() => router.refresh(), 2000);
        }
      } catch {
        if (!cancelled) {
          setStatus('failed');
          setTimeout(() => router.refresh(), 2000);
        }
      }
    }

    sync();
    return () => { cancelled = true; };
  }, [router]);

  if (status === 'syncing') {
    return (
      <p className="text-xs text-slate-500 animate-pulse">
        Activating your plan...
      </p>
    );
  }

  return null;
}
