'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, AlertTriangle, FileWarning, Loader2 } from 'lucide-react';

interface SearchResult {
  isPhiladelphia: boolean;
  message?: string;
  violationCount?: number;
  openViolationCount?: number;
  missingDocumentCount?: number;
  missingDocuments?: string[];
  estimatedFineExposure?: number;
  hasRentalLicense?: boolean;
}

export function AddressSearch() {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim() || address.trim().length < 3) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(
        `/api/address-search?address=${encodeURIComponent(address.trim())}`,
      );
      if (!res.ok) {
        setError('Search failed. Please try again.');
        return;
      }
      const data: SearchResult = await res.json();
      setResult(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-10 max-w-xl mx-auto">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your Philadelphia property address"
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading || address.trim().length < 3}
          className="px-5 py-3 rounded-lg bg-[#059669] text-white text-sm font-medium hover:bg-[#047857] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
      )}

      {result && !result.isPhiladelphia && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-600">{result.message}</p>
        </div>
      )}

      {result && result.isPhiladelphia && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 text-left space-y-3">
          <div className="flex items-center gap-3">
            {(result.openViolationCount ?? 0) > 0 ? (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-md">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {result.openViolationCount} open violation{result.openViolationCount !== 1 ? 's' : ''} found
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md">
                <span className="text-sm font-medium">No open violations</span>
              </div>
            )}
            {(result.estimatedFineExposure ?? 0) > 0 && (
              <span className="text-sm text-red-600 font-medium">
                ~${result.estimatedFineExposure?.toLocaleString()} fine exposure
              </span>
            )}
          </div>

          {(result.missingDocumentCount ?? 0) > 0 && (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <FileWarning className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
              <span>
                {result.missingDocumentCount} compliance document{result.missingDocumentCount !== 1 ? 's' : ''} may be needed
              </span>
            </div>
          )}

          {!result.hasRentalLicense && (
            <p className="text-sm text-amber-600">
              No active rental license found for this address
            </p>
          )}

          <div className="pt-2 border-t border-slate-100">
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#059669] hover:text-[#047857]"
            >
              Sign up to see full details
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
