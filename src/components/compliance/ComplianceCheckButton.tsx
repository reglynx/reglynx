'use client';

import { useState } from 'react';
import { Search, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ComplianceResult } from '@/lib/types';

interface ComplianceCheckButtonProps {
  propertyId: string;
  isPhiladelphia: boolean;
}

export function ComplianceCheckButton({ propertyId, isPhiladelphia }: ComplianceCheckButtonProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ComplianceResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isPhiladelphia) return null;

  async function runCheck() {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch('/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Check failed');
        return;
      }

      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setError('Unable to run compliance check. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const statusIcon = (state: string) => {
    switch (state) {
      case 'matched': return <CheckCircle2 className="size-4 text-emerald-500" />;
      case 'partial': return <AlertTriangle className="size-4 text-amber-500" />;
      default: return <XCircle className="size-4 text-slate-400" />;
    }
  };

  const statusLabel = (state: string) => {
    switch (state) {
      case 'matched': return 'Records found';
      case 'partial': return 'Partial match';
      default: return 'No records';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base">Philadelphia Source Check</CardTitle>
        <Button
          onClick={runCheck}
          disabled={loading}
          size="sm"
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          {loading ? (
            <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Checking...</>
          ) : (
            <><Search className="mr-1.5 size-3.5" /> Run Check</>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {!results && !error && !loading && (
          <p className="text-sm text-muted-foreground">
            Run a source check to query Philadelphia L&I violations, rental licenses,
            and permit records for this property.
          </p>
        )}

        {results && (
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(r.matchState)}
                    <span className="text-sm font-medium">
                      {r.adapterName.replace('philadelphia_', '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </div>
                  <Badge
                    variant={r.matchState === 'matched' ? 'default' : 'secondary'}
                    className={
                      r.matchState === 'matched'
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                        : ''
                    }
                  >
                    {statusLabel(r.matchState)}
                    {r.recordCount > 0 && ` (${r.recordCount})`}
                  </Badge>
                </div>

                {r.noMatchReason && (
                  <p className="mt-1.5 text-xs text-muted-foreground">{r.noMatchReason}</p>
                )}

                {r.records.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {r.records.slice(0, 5).map((rec, j) => (
                      <div key={j} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-xs">
                        <span className="truncate">{rec.description}</span>
                        <span className="ml-2 shrink-0 text-muted-foreground">
                          {rec.status}
                        </span>
                      </div>
                    ))}
                    {r.records.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        + {r.records.length - 5} more records
                      </p>
                    )}
                  </div>
                )}

                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Source: {r.sourceEndpoint} | Checked: {new Date(r.checkedAt).toLocaleString()}
                </p>
              </div>
            ))}

            {results.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No compliance adapters available for this property's jurisdiction.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
