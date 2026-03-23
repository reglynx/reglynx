'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  propertyId: string;
}

interface EvalSummary {
  issues: number;
  expiring: number;
  total: number;
}

export function ComplianceEvaluateButton({ propertyId }: Props) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<EvalSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleEvaluate() {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch('/api/compliance/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Evaluation failed.');
        return;
      }

      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: Array<{ status: string }> = (data as any).items ?? [];
      const issues = items.filter(
        (i) => i.status === 'open_violation' || i.status === 'expired',
      ).length;
      const expiring = items.filter((i) => i.status === 'expiring').length;
      setSummary({ issues, expiring, total: items.length });
      router.refresh();
    } catch (err) {
      console.error('[ComplianceEvaluateButton] fetch error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={handleEvaluate}
        className="gap-1.5"
      >
        <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Evaluating…' : 'Evaluate Now'}
      </Button>

      {summary && !loading && (
        <p className="flex items-center gap-1 text-xs">
          {summary.issues > 0 ? (
            <AlertTriangle className="size-3 text-red-500" />
          ) : (
            <CheckCircle2 className="size-3 text-emerald-500" />
          )}
          <span className="text-muted-foreground">
            {summary.total} items ·{' '}
            <span className={summary.issues > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}>
              {summary.issues} issue{summary.issues !== 1 ? 's' : ''}
            </span>
            {summary.expiring > 0 && (
              <span className="text-amber-600 font-medium">
                {' '}· {summary.expiring} expiring
              </span>
            )}
          </span>
        </p>
      )}

      {error && !loading && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
