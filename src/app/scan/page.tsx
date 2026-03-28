'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';
import { FOOTER_LEGAL_LINE } from '@/lib/constants';
import {
  AlertTriangle,
  ShieldCheck,
  Lock,
  ArrowRight,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';

interface ScanViolation {
  casenumber?: string;
  violationdate?: string;
  violationtype?: string;
  violationdescription?: string;
  status?: string;
  casestatus?: string;
  casepriority?: string;
  prioritydesc?: string;
}

interface ScanResult {
  isPhiladelphia: boolean;
  identityResolved?: boolean;
  matchMethod?: string;
  standardizedAddress?: string;
  alternateAddress?: string;
  opaAccountNum?: string;
  violationCount?: number;
  openViolationCount?: number;
  hasRentalLicense?: boolean;
  rentalLicenseStatus?: string;
  estimatedFineExposure?: number;
  assessment?: { owner?: string; yearBuilt?: number; marketValue?: number; zoning?: string } | null;
  evidence?: { atlas_link?: string | null; li_property_history?: string | null };
  sources?: Record<string, { status: string; recordCount: number; error?: string }>;
  violations?: ScanViolation[];
  permits?: unknown[];
  rentalLicenses?: unknown[];
  message?: string;
}

function buildIssues(data: ScanResult): { title: string; severity: 'high' | 'medium' | 'low'; source: string; ref?: string; date?: string; evidenceUrl?: string | null }[] {
  const issues: ReturnType<typeof buildIssues> = [];

  // Open violations
  if (data.violations) {
    for (const v of data.violations) {
      const s = (v.status ?? v.casestatus ?? '').toLowerCase();
      if (s === 'open' || s === 'active' || s === 'in violation') {
        issues.push({
          title: v.violationdescription || v.violationtype || 'L&I Violation',
          severity: (v.casepriority ?? '').toLowerCase().includes('high') ? 'high' : 'medium',
          source: 'L&I Violations',
          ref: v.casenumber,
          date: v.violationdate,
          evidenceUrl: data.evidence?.li_property_history,
        });
      }
    }
  }

  // Missing rental license
  if (!data.hasRentalLicense) {
    issues.push({
      title: 'No active rental license found',
      severity: 'high',
      source: 'Business Licenses',
      evidenceUrl: data.evidence?.atlas_link,
    });
  } else if (data.rentalLicenseStatus === 'expired') {
    issues.push({
      title: 'Rental license expired',
      severity: 'high',
      source: 'Business Licenses',
      evidenceUrl: data.evidence?.atlas_link,
    });
  } else if (data.rentalLicenseStatus === 'expiring_soon') {
    issues.push({
      title: 'Rental license expiring soon',
      severity: 'medium',
      source: 'Business Licenses',
      evidenceUrl: data.evidence?.atlas_link,
    });
  }

  return issues;
}

const SEVERITY_STYLES = {
  high: 'bg-red-50 border-red-200 text-red-800',
  medium: 'bg-amber-50 border-amber-200 text-amber-800',
  low: 'bg-blue-50 border-blue-200 text-blue-800',
};

const SEVERITY_DOT = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
};

export default function ScanResultPage() {
  const router = useRouter();
  const [data, setData] = useState<ScanResult | null>(null);
  const [inputAddress, setInputAddress] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('reglynx_scan');
    const addr = sessionStorage.getItem('reglynx_scan_address');
    if (!raw) {
      router.replace('/');
      return;
    }
    setData(JSON.parse(raw));
    setInputAddress(addr ?? '');
  }, [router]);

  if (!data) return null;

  // Not Philadelphia
  if (!data.isPhiladelphia) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <nav className="border-b border-slate-100 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center">
            <Logo size="sm" href="/" />
          </div>
        </nav>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md text-center py-20">
            <p className="text-lg font-semibold text-slate-700">Not in Philadelphia</p>
            <p className="text-sm text-slate-500 mt-2">
              {data.message || 'Live property compliance monitoring is currently available for Philadelphia, PA.'}
            </p>
            <Link href="/" className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-slate-700 hover:text-slate-900">
              <ArrowLeft className="size-3.5" /> Try another address
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Identity unresolved
  if (data.identityResolved === false) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <nav className="border-b border-slate-100 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center">
            <Logo size="sm" href="/" />
          </div>
        </nav>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md text-center py-20">
            <AlertTriangle className="size-8 text-amber-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-700">Could not match this address</p>
            <p className="text-sm text-slate-500 mt-2">
              We couldn&apos;t resolve this address to a Philadelphia parcel. Try the full street address.
            </p>
            <Link href="/" className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-slate-700 hover:text-slate-900">
              <ArrowLeft className="size-3.5" /> Try another address
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Build issues from live data
  const issues = buildIssues(data);
  const totalSourcesChecked = Object.values(data.sources ?? {}).filter(s => s.status === 'active').length;
  const hasIssues = issues.length > 0;
  const firstIssue = issues[0];
  const hiddenCount = Math.max(issues.length - 1, 0);

  // Property line
  const parcelDisplay = data.opaAccountNum ? `Parcel ${data.opaAccountNum}` : '';
  const altAddr = data.alternateAddress && data.alternateAddress !== data.standardizedAddress
    ? data.alternateAddress : '';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo size="sm" href="/" />
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900">Sign in</Link>
        </div>
      </nav>

      <main className="flex-1 px-4 sm:px-6 py-10 sm:py-16">
        <div className="max-w-xl mx-auto">

          {/* Property identity line */}
          <div className="text-sm text-slate-500 mb-1">
            <Link href="/" className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 mr-2">
              <ArrowLeft className="size-3" />
            </Link>
            {inputAddress}
          </div>
          <p className="text-xs text-slate-400 mb-8">
            {[parcelDisplay, altAddr].filter(Boolean).join(' · ')}
            {totalSourcesChecked > 0 && ` · Checked ${totalSourcesChecked} sources`}
          </p>

          {/* Risk signal */}
          {hasIssues ? (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-6">
              <AlertTriangle className="size-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  {issues.length} {issues.length === 1 ? 'issue' : 'issues'} found.
                  {issues.some(i => i.severity === 'high') && ' At least 1 requires immediate attention.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 mb-6">
              <ShieldCheck className="size-5 text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-sm font-semibold text-emerald-800">
                No active issues found in checked sources.
              </p>
            </div>
          )}

          {/* One visible issue */}
          {firstIssue && (
            <div className={`rounded-lg border px-4 py-4 mb-4 ${SEVERITY_STYLES[firstIssue.severity]}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`size-2 rounded-full ${SEVERITY_DOT[firstIssue.severity]}`} />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {firstIssue.severity === 'high' ? 'High priority' : 'Attention needed'}
                </span>
              </div>
              <p className="text-sm font-semibold">{firstIssue.title}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80">
                <span>Source: {firstIssue.source}</span>
                {firstIssue.ref && <span>Ref: {firstIssue.ref}</span>}
                {firstIssue.date && <span>Date: {new Date(firstIssue.date).toLocaleDateString()}</span>}
              </div>
              {firstIssue.evidenceUrl && (
                <a
                  href={firstIssue.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-medium hover:underline"
                >
                  Verify on city records <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}

          {/* Blurred hidden issues */}
          {hiddenCount > 0 && (
            <div className="relative rounded-lg border border-slate-200 px-4 py-5 mb-8 overflow-hidden">
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <Lock className="size-5 text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {hiddenCount} more {hiddenCount === 1 ? 'issue' : 'issues'} detected
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs text-center">
                  Create a free account to see all violations, license status, and recommended actions.
                </p>
              </div>
              {/* Blurred placeholder content */}
              <div className="space-y-3 select-none" aria-hidden>
                {issues.slice(1, 4).map((issue, i) => (
                  <div key={i} className="rounded border border-slate-100 p-3">
                    <div className="h-3 w-48 bg-slate-200 rounded mb-2" />
                    <div className="h-2 w-32 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Even if no hidden issues, still gate full detail behind signup */}
          {hiddenCount === 0 && (
            <div className="rounded-lg border border-slate-200 px-4 py-5 mb-8 text-center">
              <Lock className="size-5 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Full property detail requires a free account
              </p>
              <p className="text-xs text-slate-500 mt-1">
                See all violations, license history, permits, assessment data, and evidence links.
              </p>
            </div>
          )}

          {/* CTA */}
          <Link
            href={`/signup?address=${encodeURIComponent(inputAddress)}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f172a] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#1e293b] transition-colors"
          >
            Unlock full report
            <ArrowRight className="size-4" />
          </Link>
          <p className="text-xs text-slate-400 text-center mt-3">
            Free. No credit card.
          </p>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-6 px-4">
        <p className="text-[10px] text-slate-400 text-center max-w-lg mx-auto">{FOOTER_LEGAL_LINE}</p>
      </footer>
    </div>
  );
}
