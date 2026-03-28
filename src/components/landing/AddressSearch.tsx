'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, AlertTriangle, ShieldCheck, FileText, Loader2, MapPin, ArrowRight, ExternalLink, Info } from 'lucide-react';

interface SearchResult {
  isPhiladelphia: boolean;
  identityResolved?: boolean;
  matchMethod?: string;
  matchConfidence?: string;
  standardizedAddress?: string;
  alternateAddress?: string;
  opaAccountNum?: string;
  message?: string;
  violationCount?: number;
  openViolationCount?: number;
  missingDocumentCount?: number;
  missingDocuments?: string[];
  estimatedFineExposure?: number;
  hasRentalLicense?: boolean;
  rentalLicenseStatus?: string;
  assessment?: {
    owner: string;
    yearBuilt: number;
    marketValue: number;
    zoning: string;
  } | null;
  evidence?: {
    atlas_link: string | null;
    li_property_history: string | null;
  };
}

const CONFIDENCE_LABELS: Record<string, { label: string; cls: string }> = {
  high: { label: 'High confidence match', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  medium: { label: 'Spatial match (corner parcel)', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  low: { label: 'Address string match', cls: 'text-red-700 bg-red-50 border-red-200' },
};

export function AddressSearch() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim() || address.trim().length < 3) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/address-search?address=${encodeURIComponent(address.trim())}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Search failed');
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const conf = result?.matchConfidence ? CONFIDENCE_LABELS[result.matchConfidence] : null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-lg">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-[#0f172a]">
            Check your property — free, no signup
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Enter a Philadelphia property address to see violations, license status, and compliance gaps.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 1401 Spruce St, Philadelphia PA 19102"
              className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-3 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading || address.trim().length < 3}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f172a] px-5 py-3 text-sm font-medium text-white hover:bg-[#1e293b] disabled:opacity-50 transition-colors shrink-0"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Check
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}

        {/* Philadelphia result — identity resolved */}
        {result?.isPhiladelphia && result.identityResolved && (
          <div className="mt-6 space-y-4">
            {/* Identity confidence badge */}
            {conf && (
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${conf.cls}`}>
                <Info className="size-3.5 shrink-0" />
                <span>{conf.label}</span>
                {result.standardizedAddress && (
                  <span className="text-slate-500 font-normal ml-1">
                    — {result.standardizedAddress}
                  </span>
                )}
              </div>
            )}

            {/* Alternate address notice */}
            {result.alternateAddress && result.alternateAddress !== result.standardizedAddress && (
              <p className="text-xs text-slate-500 px-1">
                Recorded parcel address: <span className="font-medium">{result.alternateAddress}</span>
              </p>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-[#0f172a]">{result.violationCount ?? 0}</p>
                <p className="text-xs text-slate-500">Violations</p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{result.openViolationCount ?? 0}</p>
                <p className="text-xs text-slate-500">Open</p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">${(result.estimatedFineExposure ?? 0).toLocaleString()}</p>
                <p className="text-xs text-slate-500">Fine Exposure</p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3 text-center">
                {result.hasRentalLicense ? (
                  <>
                    <ShieldCheck className="size-6 text-emerald-500 mx-auto" />
                    <p className="text-xs text-slate-500 mt-1">License Found</p>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-6 text-red-500 mx-auto" />
                    <p className="text-xs text-slate-500 mt-1">No License</p>
                  </>
                )}
              </div>
            </div>

            {/* Assessment info */}
            {result.assessment && (
              <div className="rounded-lg border bg-slate-50 p-3 text-xs text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {result.assessment.owner && (
                  <div>
                    <p className="text-slate-400">Owner</p>
                    <p className="font-medium truncate">{result.assessment.owner}</p>
                  </div>
                )}
                {result.assessment.yearBuilt && (
                  <div>
                    <p className="text-slate-400">Year Built</p>
                    <p className="font-medium">{result.assessment.yearBuilt}</p>
                  </div>
                )}
                {result.assessment.marketValue && (
                  <div>
                    <p className="text-slate-400">Market Value</p>
                    <p className="font-medium">${result.assessment.marketValue.toLocaleString()}</p>
                  </div>
                )}
                {result.assessment.zoning && (
                  <div>
                    <p className="text-slate-400">Zoning</p>
                    <p className="font-medium">{result.assessment.zoning}</p>
                  </div>
                )}
              </div>
            )}

            {/* Missing docs */}
            {result.missingDocuments && result.missingDocuments.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="size-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-800">
                    {result.missingDocumentCount} compliance documents may be required
                  </p>
                </div>
                <ul className="space-y-1">
                  {result.missingDocuments.slice(0, 4).map((doc) => (
                    <li key={doc} className="text-xs text-amber-700 flex items-center gap-1.5">
                      <span className="size-1 rounded-full bg-amber-400 shrink-0" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Evidence links */}
            {(result.evidence?.atlas_link || result.evidence?.li_property_history) && (
              <div className="flex flex-wrap gap-3 text-xs">
                {result.evidence.atlas_link && (
                  <a
                    href={result.evidence.atlas_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700"
                  >
                    <ExternalLink className="size-3" /> View on Atlas
                  </a>
                )}
                {result.evidence.li_property_history && (
                  <a
                    href={result.evidence.li_property_history}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700"
                  >
                    <ExternalLink className="size-3" /> L&I Property History
                  </a>
                )}
              </div>
            )}

            {/* CTA */}
            <div className="text-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#059669] text-white font-semibold text-sm hover:bg-[#047857] transition-colors"
              >
                Sign up to monitor this property
                <ArrowRight className="size-4" />
              </Link>
              <p className="text-xs text-slate-500 mt-2">Free 14-day trial. Full compliance report included.</p>
            </div>
          </div>
        )}

        {/* Philadelphia result — identity NOT resolved */}
        {result?.isPhiladelphia && result.identityResolved === false && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
            <AlertTriangle className="size-5 text-amber-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-amber-800">
              Could not match this address to a Philadelphia parcel
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {result.message || 'Try entering the full street address with city and state.'}
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-amber-700 hover:underline"
            >
              Sign up to check manually <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}

        {/* Non-Philadelphia result */}
        {result && !result.isPhiladelphia && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
            <MapPin className="size-5 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-800">
              {result.message || 'Coming soon to your city.'}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Live compliance monitoring is currently available for Philadelphia, PA.
            </p>
            <Link
              href="/early-access"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-blue-700 hover:underline"
            >
              Join the waitlist <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
