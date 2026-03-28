'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';
import { FOOTER_LEGAL_LINE } from '@/lib/constants';
import { MapPin, Loader2, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed || trimmed.length < 3) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/address-search?address=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Search failed');
        setLoading(false);
        return;
      }

      // Store the scan result and navigate to scan page
      sessionStorage.setItem('reglynx_scan', JSON.stringify(data));
      sessionStorage.setItem('reglynx_scan_address', trimmed);
      router.push('/scan');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo size="sm" />
          <Link
            href="/login"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero — above the fold */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6">
        <div className="max-w-xl w-full py-20 sm:py-28">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0f172a] leading-tight tracking-tight text-center">
            The city already has a file<br className="hidden sm:block" /> on your property.
          </h1>

          <p className="text-base sm:text-lg text-slate-500 mt-5 text-center leading-relaxed max-w-md mx-auto">
            See open violations, license status, and permit flags — pulled live from Philadelphia public records.
          </p>

          <form onSubmit={handleSearch} className="mt-10">
            <label
              htmlFor="address"
              className="block text-[10px] font-bold uppercase tracking-[2px] text-slate-400 mb-2 text-center"
            >
              Check any Philadelphia address
            </label>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="1401 Spruce St, Philadelphia PA"
                  autoComplete="street-address"
                  className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-3.5 text-sm placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
              <button
                type="submit"
                disabled={loading || address.trim().length < 3}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f172a] px-6 py-3.5 text-sm font-medium text-white hover:bg-[#1e293b] disabled:opacity-40 transition-colors shrink-0"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Check this property
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
            )}
          </form>

          <p className="text-xs text-slate-400 text-center mt-4">
            Free. No signup. Results in seconds.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 px-4">
        <p className="text-[10px] text-slate-400 text-center max-w-lg mx-auto">
          {FOOTER_LEGAL_LINE}
        </p>
      </footer>
    </div>
  );
}
