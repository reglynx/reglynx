'use client';

import { useState } from 'react';
import type { CoverageMatrix } from '@/lib/compliance/coverage';
import { COVERAGE_BADGE, formatLastChecked } from '@/lib/compliance/coverage';

// ── Response type from the API ────────────────────────────────────────────────

interface AdapterInfo {
  success: boolean;
  error: string | null;
  recordCount: number;
  classification: Record<string, unknown>;
  sample: Record<string, unknown>[];
}

interface ValidationResult {
  address: string;
  opaAccountNumber: string | null;
  adapters: {
    lni_violations: AdapterInfo;
    rental_license: AdapterInfo;
  };
  coverage: CoverageMatrix;
  checkedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function AdapterCard({ name, info }: { name: string; info: AdapterInfo }) {
  const [showSample, setShowSample] = useState(false);
  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm">{name}</span>
        <span className={`rounded border px-2 py-0.5 text-[11px] font-medium ${
          info.success ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {info.success ? 'OK' : 'Failed'}
        </span>
      </div>

      {info.error && (
        <p className="rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{info.error}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-slate-50 p-2">
          <p className="text-muted-foreground">Records returned</p>
          <p className="font-bold text-slate-800 text-lg">{info.recordCount}</p>
        </div>
        {Object.entries(info.classification).map(([k, v]) => (
          <div key={k} className="rounded bg-slate-50 p-2">
            <p className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</p>
            <p className="font-bold text-slate-800">{String(v ?? '—')}</p>
          </div>
        ))}
      </div>

      {info.sample.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowSample((s) => !s)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showSample ? 'Hide' : 'Show'} sample records ({info.sample.length})
          </button>
          {showSample && (
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-900 p-3 text-[11px] text-green-300">
              {JSON.stringify(info.sample, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function CoverageGrid({ coverage }: { coverage: CoverageMatrix }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        Coverage Matrix
        <span className={`rounded border px-2 py-0.5 text-[11px] font-medium ${
          coverage.overall_coverage === 'full'        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
          coverage.overall_coverage === 'partial'     ? 'bg-blue-50 text-blue-700 border-blue-200' :
          coverage.overall_coverage === 'unavailable' ? 'bg-red-50 text-red-600 border-red-200' :
                                                        'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {coverage.overall_coverage}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {coverage.categories.map((cat) => {
          const badge = COVERAGE_BADGE[cat.coverage_status];
          return (
            <div key={cat.category} className="rounded border bg-slate-50 p-3 space-y-1 text-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="font-medium text-slate-700">{cat.label}</span>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-muted-foreground leading-snug">{cat.notes}</p>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{formatLastChecked(cat.last_checked_at)}</span>
                {cat.source_count > 0 && <span>{cat.source_count} records</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export function ValidationClient() {
  const [address, setAddress] = useState('');
  const [opaNumber, setOpaNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/admin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, opaAccountNumber: opaNumber || undefined }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setError(err.error ?? `HTTP ${res.status}`);
        return;
      }

      const data: ValidationResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Input form */}
      <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700" htmlFor="address">
              Property Address *
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="1234 N Broad St, Philadelphia PA"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700" htmlFor="opa">
              OPA Account Number (optional)
            </label>
            <input
              id="opa"
              type="text"
              value={opaNumber}
              onChange={(e) => setOpaNumber(e.target.value)}
              placeholder="123456789"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !address.trim()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Run Validation'}
          </button>
          <span className="text-xs text-muted-foreground">
            Calls live Philadelphia Open Data APIs — no DB writes
          </span>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          <p className="text-xs text-muted-foreground">
            Checked <strong>{result.address}</strong>
            {result.opaAccountNumber && <> · OPA {result.opaAccountNumber}</>}
            {' '}· {new Date(result.checkedAt).toLocaleString()}
          </p>

          {/* Adapter results side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            <AdapterCard name="L&I Violations" info={result.adapters.lni_violations} />
            <AdapterCard name="Rental License" info={result.adapters.rental_license} />
          </div>

          {/* Coverage matrix */}
          <CoverageGrid coverage={result.coverage} />
        </div>
      )}
    </div>
  );
}
