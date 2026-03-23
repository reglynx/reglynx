'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  propertyId: string;
}

export function ComplianceEvaluateButton({ propertyId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleEvaluate() {
    setLoading(true);
    try {
      const res = await fetch('/api/compliance/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('[ComplianceEvaluateButton] error:', data);
      }
      router.refresh();
    } catch (err) {
      console.error('[ComplianceEvaluateButton] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
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
  );
}
