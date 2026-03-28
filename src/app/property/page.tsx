'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';
import { FOOTER_LEGAL_LINE } from '@/lib/constants';
import { UpgradeSelection } from '@/components/upgrade/UpgradeSelection';
import {
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
  Plus,
} from 'lucide-react';

interface ScanViolation {
  casenumber?: string;
  violationdate?: string;
  violationtype?: string;
  violationdescription?: string;
  status?: string;
  casestatus?: string;
  casepriority?: string;
}

interface ScanPermit {
  permitnumber?: string;
  permittype?: string;
  permit_type_name?: string;
  typeofwork?: string;
  descriptionofwork?: string;
  permitissuedate?: string;
  status?: string;
}

interface ScanLicense {
  licensenum?: string;
  licensestatus?: string;
  licensetype?: string;
  initialissuedate?: string;
  mostrecentissuedate?: string;
  inactivedate?: string;
  legalname?: string;
  numberofunits?: string;
}

interface ScanData {
  isPhiladelphia: boolean;
  identityResolved?: boolean;
  standardizedAddress?: string;
  alternateAddress?: string;
  opaAccountNum?: string;
  matchMethod?: string;
  matchConfidence?: string;
  violationCount?: number;
  openViolationCount?: number;
  hasRentalLicense?: boolean;
  rentalLicenseStatus?: string;
  estimatedFineExposure?: number;
  assessment?: { owner?: string; yearBuilt?: number; marketValue?: number; zoning?: string } | null;
  evidence?: { atlas_link?: string | null; li_property_history?: string | null };
  sources?: Record<string, { status: string; recordCount: number; error?: string }>;
  violations?: ScanViolation[];
  permits?: ScanPermit[];
  rentalLicenses?: ScanLicense[];
}

function SeverityDot({ status }: { status?: string }) {
  const s = (status ?? '').toLowerCase();
  if (s === 'open' || s === 'active' || s === 'in violation') {
    return <span className="size-2 rounded-full bg-red-500 shrink-0" />;
  }
  return <span className="size-2 rounded-full bg-slate-300 shrink-0" />;
}

export default function PropertyDetailPage() {
  const router = useRouter();
  const [data, setData] = useState<ScanData | null>(null);
  const [inputAddress, setInputAddress] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);

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

  const violations = data.violations ?? [];
  const permits = data.permits ?? [];
  const licenses = data.rentalLicenses ?? [];
  const assessment = data.assessment;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo size="sm" href="/" />
          <button
            onClick={() => setShowUpgrade(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b] transition-colors"
          >
            <Plus className="size-3.5" />
            Add another property
          </button>
        </div>
      </nav>

      <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Upgrade selection — triggered by "Add another property" */}
          {showUpgrade && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
              <UpgradeSelection />
            </div>
          )}

          {/* Property header */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-[#0f172a]">
                  {data.standardizedAddress || inputAddress}
                </h1>
                {data.alternateAddress && data.alternateAddress !== data.standardizedAddress && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Recorded address: {data.alternateAddress}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {data.opaAccountNum && `OPA ${data.opaAccountNum}`}
                  {data.matchConfidence && ` · ${data.matchConfidence} confidence`}
                </p>
              </div>
              {(data.evidence?.atlas_link || data.evidence?.li_property_history) && (
                <div className="flex gap-2 shrink-0">
                  {data.evidence.atlas_link && (
                    <a href={data.evidence.atlas_link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:border-slate-300">
                      Atlas <ExternalLink className="size-3" />
                    </a>
                  )}
                  {data.evidence.li_property_history && (
                    <a href={data.evidence.li_property_history} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:border-slate-300">
                      L&I History <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Assessment row */}
            {assessment && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {assessment.owner && (
                  <div><p className="text-slate-400">Owner</p><p className="font-medium text-slate-700 truncate">{assessment.owner}</p></div>
                )}
                {assessment.yearBuilt && (
                  <div><p className="text-slate-400">Year Built</p><p className="font-medium text-slate-700">{assessment.yearBuilt}</p></div>
                )}
                {assessment.marketValue && (
                  <div><p className="text-slate-400">Market Value</p><p className="font-medium text-slate-700">${assessment.marketValue.toLocaleString()}</p></div>
                )}
                {assessment.zoning && (
                  <div><p className="text-slate-400">Zoning</p><p className="font-medium text-slate-700">{assessment.zoning}</p></div>
                )}
              </div>
            )}
          </div>

          {/* Violations */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0f172a]">
                L&I Violations ({violations.length})
              </h2>
              {data.openViolationCount !== undefined && data.openViolationCount > 0 && (
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  {data.openViolationCount} open
                </span>
              )}
            </div>
            {violations.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">No violations found for this parcel.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {violations.map((v, i) => (
                  <li key={i} className="px-5 py-3 flex items-start gap-3">
                    <SeverityDot status={v.status ?? v.casestatus} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {v.violationdescription || v.violationtype || 'Violation'}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-400">
                        {v.casenumber && <span>Case: {v.casenumber}</span>}
                        {v.violationdate && <span>{new Date(v.violationdate).toLocaleDateString()}</span>}
                        {v.status && <span className="capitalize">{v.status}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Rental Licenses */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0f172a]">
                Rental Licenses ({licenses.length})
              </h2>
              {data.rentalLicenseStatus && data.rentalLicenseStatus !== 'not_found' && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  data.rentalLicenseStatus === 'active' ? 'text-emerald-600 bg-emerald-50' :
                  data.rentalLicenseStatus === 'expiring_soon' ? 'text-amber-600 bg-amber-50' :
                  'text-red-600 bg-red-50'
                }`}>
                  {data.rentalLicenseStatus === 'active' ? 'Active' :
                   data.rentalLicenseStatus === 'expiring_soon' ? 'Expiring soon' : 'Expired'}
                </span>
              )}
            </div>
            {licenses.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <AlertTriangle className="size-5 text-amber-500 mx-auto mb-1" />
                <p className="text-sm text-slate-500">No rental license found for this parcel.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {licenses.map((l, i) => (
                  <li key={i} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">{l.licensenum || 'License'}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${
                        (l.licensestatus ?? '').toLowerCase() === 'active' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-50'
                      }`}>{l.licensestatus}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-slate-400">
                      {l.legalname && <span>{l.legalname}</span>}
                      {l.numberofunits && <span>{l.numberofunits} units</span>}
                      {l.mostrecentissuedate && <span>Issued: {new Date(l.mostrecentissuedate).toLocaleDateString()}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Permits */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-[#0f172a]">
                Permits ({permits.length})
              </h2>
            </div>
            {permits.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">No recent permits found.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {permits.map((p, i) => (
                  <li key={i} className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {(p as ScanPermit).descriptionofwork || (p as ScanPermit).permit_type_name || (p as ScanPermit).typeofwork || 'Permit'}
                    </p>
                    <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-slate-400">
                      {(p as ScanPermit).permitnumber && <span>{(p as ScanPermit).permitnumber}</span>}
                      {(p as ScanPermit).permitissuedate && <span>{new Date((p as ScanPermit).permitissuedate!).toLocaleDateString()}</span>}
                      {(p as ScanPermit).status && <span className="capitalize">{(p as ScanPermit).status}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Source status */}
          {data.sources && (
            <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1 px-1">
              {Object.entries(data.sources).map(([name, meta]) => (
                <span key={name} className="flex items-center gap-1">
                  <span className={`size-1.5 rounded-full ${meta.status === 'active' ? 'bg-emerald-400' : meta.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'}`} />
                  {name}: {meta.recordCount} records
                </span>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 px-4">
        <p className="text-[10px] text-slate-400 text-center max-w-lg mx-auto">{FOOTER_LEGAL_LINE}</p>
      </footer>
    </div>
  );
}
