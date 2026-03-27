'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  FileCheck,
  Hammer,
  Landmark,
  Loader2,
  RefreshCw,
  CircleAlert,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LIViolation {
  violationcode: string;
  violationcodetitle: string;
  violationdate: string;
  violationstatus: string;
  casenbr: string;
  address: string;
}

interface LIPermit {
  permitnumber: string;
  permitdescription: string;
  permittype: string;
  permitissuedate: string;
  status: string;
  address: string;
}

interface RentalLicense {
  licensenumber: string;
  licensetype: string;
  licensestatus: string;
  initialissuedate: string;
  expirationdate: string;
  street_address: string;
}

interface PropertyAssessment {
  location: string;
  market_value: number;
  sale_price: number;
  sale_date: string;
  year_built: number;
  category_code_description: string;
  total_livable_area: number;
  zoning: string;
}

interface CityData {
  violations: LIViolation[];
  permits: LIPermit[];
  rentalLicenses: RentalLicense[];
  assessment: PropertyAssessment | null;
  violationCount: number;
  openViolationCount: number;
  estimatedFineExposure: number;
  rentalLicenseStatus: 'active' | 'expired' | 'expiring_soon' | 'not_found';
  requiredActions: string[];
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const licenseStatusConfig = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-800' },
  expired: { label: 'Expired', className: 'bg-red-100 text-red-800' },
  expiring_soon: { label: 'Expiring Soon', className: 'bg-amber-100 text-amber-800' },
  not_found: { label: 'Not Found', className: 'bg-slate-100 text-slate-800' },
};

export function CityRecords({ propertyId }: { propertyId: string }) {
  const [data, setData] = useState<CityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/properties/${propertyId}/city-data`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Failed to load city data');
        return;
      }
      setData(await res.json());
    } catch {
      setError('Network error loading city data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading city records...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const licStatus = licenseStatusConfig[data.rentalLicenseStatus];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="size-4" />
          City Records
        </CardTitle>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="size-3" />
          Refresh
        </button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required actions banner */}
        {data.requiredActions.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1.5">
            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
              <CircleAlert className="size-4" />
              Action Required
            </p>
            <ul className="space-y-1">
              {data.requiredActions.map((action) => (
                <li key={action} className="text-sm text-amber-700 pl-5">
                  &bull; {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Violations</p>
            <p className="text-lg font-semibold">{data.violationCount}</p>
            {data.openViolationCount > 0 && (
              <p className="text-xs text-amber-600">{data.openViolationCount} open</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Fine Exposure</p>
            <p className="text-lg font-semibold">
              {data.estimatedFineExposure > 0
                ? `$${data.estimatedFineExposure.toLocaleString()}`
                : '$0'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Permits</p>
            <p className="text-lg font-semibold">{data.permits.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Rental License</p>
            <Badge
              variant="secondary"
              className={licStatus.className + ' hover:' + licStatus.className}
            >
              {licStatus.label}
            </Badge>
          </div>
        </div>

        {/* Assessment */}
        {data.assessment && (
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              OPA Assessment
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Market Value</p>
                <p className="font-medium">
                  ${data.assessment.market_value?.toLocaleString() ?? '--'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Zoning</p>
                <p className="font-medium">{data.assessment.zoning || '--'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Year Built</p>
                <p className="font-medium">{data.assessment.year_built || '--'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Livable Area</p>
                <p className="font-medium">
                  {data.assessment.total_livable_area
                    ? `${data.assessment.total_livable_area.toLocaleString()} sq ft`
                    : '--'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Violations list */}
        {data.violations.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <AlertTriangle className="size-3.5 text-amber-500" />
              L&I Violations ({data.violations.length})
            </p>
            <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
              {data.violations.map((v, i) => (
                <div key={`${v.casenbr}-${i}`} className="px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {v.violationcodetitle || v.violationcode}
                    </p>
                    <Badge
                      variant="secondary"
                      className={
                        v.violationstatus?.toLowerCase() === 'open'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-600'
                      }
                    >
                      {v.violationstatus || 'Unknown'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(v.violationdate)} &middot; Case {v.casenbr || '--'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Permits list */}
        {data.permits.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Hammer className="size-3.5 text-blue-500" />
              Permits ({data.permits.length})
            </p>
            <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
              {data.permits.map((p, i) => (
                <div key={`${p.permitnumber}-${i}`} className="px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {p.permitdescription || p.permittype || p.permitnumber}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(p.permitissuedate)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    #{p.permitnumber} &middot; {p.status || 'Unknown'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rental licenses */}
        {data.rentalLicenses.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <FileCheck className="size-3.5 text-emerald-500" />
              Rental License
            </p>
            {data.rentalLicenses.map((lic, i) => (
              <div key={`${lic.licensenumber}-${i}`} className="rounded-lg border p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">#{lic.licensenumber}</span>
                  <Badge
                    variant="secondary"
                    className={
                      lic.licensestatus?.toLowerCase() === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }
                  >
                    {lic.licensestatus || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    Issued {formatDate(lic.initialissuedate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    Expires {formatDate(lic.expirationdate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
