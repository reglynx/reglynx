import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  HelpCircle,
  ExternalLink,
  MapPin,
  Calendar,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ComplianceEvaluateButton } from './ComplianceEvaluateButton';
import type { Organization, Property } from '@/lib/types';

// ── Types from DB ─────────────────────────────────────────────────────────────

interface ComplianceItem {
  id: string;
  type: string;
  label: string;
  status: string;
  due_date: string | null;
  confidence_level: string;
  notes: string | null;
  updated_at: string;
}

interface StatusSnapshot {
  overall_status: string;
  computed_at: string;
  item_summary: {
    total: number;
    good: number;
    expiring: number;
    expired: number;
    openViolations: number;
    needsReview: number;
    unknown: number;
  };
}

// ── Status display helpers ────────────────────────────────────────────────────

function statusIcon(status: string) {
  switch (status) {
    case 'good':
    case 'closed':
      return <CheckCircle2 className="size-5 text-emerald-500" />;
    case 'expiring':
      return <Clock className="size-5 text-amber-500" />;
    case 'expired':
    case 'open_violation':
      return <XCircle className="size-5 text-red-500" />;
    case 'needs_review':
      return <HelpCircle className="size-5 text-blue-500" />;
    default:
      return <AlertTriangle className="size-5 text-slate-400" />;
  }
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    good:           { label: 'Good',           className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    closed:         { label: 'Closed',         className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    expiring:       { label: 'Expiring Soon',  className: 'bg-amber-50 text-amber-700 border-amber-200' },
    expired:        { label: 'Expired',        className: 'bg-red-50 text-red-700 border-red-200' },
    open_violation: { label: 'Open Violation', className: 'bg-red-50 text-red-700 border-red-200' },
    needs_review:   { label: 'Needs Review',   className: 'bg-blue-50 text-blue-700 border-blue-200' },
    unknown:        { label: 'Unknown',        className: 'bg-slate-50 text-slate-600 border-slate-200' },
  };
  const info = map[status] ?? map.unknown;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  );
}

function overallBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    compliant:       { label: 'Compliant',       className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    attention_needed:{ label: 'Attention Needed', className: 'bg-amber-100 text-amber-800 border-amber-300' },
    non_compliant:   { label: 'Non-Compliant',   className: 'bg-red-100 text-red-800 border-red-300' },
    unknown:         { label: 'Not Yet Evaluated',className: 'bg-slate-100 text-slate-700 border-slate-300' },
  };
  const info = map[status] ?? map.unknown;
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${info.className}`}>
      {info.label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ComplianceDashboardPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle<Organization>();

  if (!org) redirect('/onboarding');

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .eq('org_id', org.id)
    .single<Property>();

  if (!property) notFound();

  // Fetch compliance items and latest snapshot in parallel
  const [{ data: itemsData }, { data: snapshotData }] = await Promise.all([
    supabase
      .from('compliance_items')
      .select('*')
      .eq('property_id', propertyId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('status_snapshots')
      .select('*')
      .eq('property_id', propertyId)
      .order('computed_at', { ascending: false })
      .limit(1),
  ]);

  const items: ComplianceItem[] = itemsData ?? [];
  const snapshot: StatusSnapshot | null = snapshotData?.[0] ?? null;

  const fullAddress = [
    property.address_line1,
    property.address_line2,
    `${property.city}, ${property.state} ${property.zip}`,
  ].filter(Boolean).join(', ');

  const overallStatus = snapshot?.overall_status ?? 'unknown';
  const lastChecked = snapshot?.computed_at
    ? new Date(snapshot.computed_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href={`/properties/${property.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Property
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Compliance Status</h1>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {fullAddress}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {overallBadge(overallStatus)}
          <ComplianceEvaluateButton propertyId={propertyId} />
        </div>
      </div>

      {/* Last checked */}
      {lastChecked && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          Last evaluated: {lastChecked}
          <span className="ml-1 text-slate-400">
            · Data sourced from Philadelphia Open Data (L&I, Business Licenses)
          </span>
        </p>
      )}

      {!snapshot && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <p className="text-sm text-blue-800">
              No compliance data yet for this property. Click{' '}
              <strong>Evaluate Now</strong> to fetch data from Philadelphia
              L&I and license databases.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary strip */}
      {snapshot?.item_summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: 'Good',           value: snapshot.item_summary.good,           color: 'text-emerald-600' },
            { label: 'Expiring Soon',  value: snapshot.item_summary.expiring,       color: 'text-amber-600' },
            { label: 'Expired',        value: snapshot.item_summary.expired,        color: 'text-red-600' },
            { label: 'Open Violations',value: snapshot.item_summary.openViolations, color: 'text-red-700' },
            { label: 'Needs Review',   value: snapshot.item_summary.needsReview,    color: 'text-blue-600' },
            { label: 'Unknown',        value: snapshot.item_summary.unknown,        color: 'text-slate-500' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="text-center">
              <CardContent className="py-3">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Compliance items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No compliance items yet. Run an evaluation to fetch data from Philadelphia databases.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{statusIcon(item.status)}</div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{item.label}</span>
                          {statusBadge(item.status)}
                          {item.confidence_level === 'needs_review' && (
                            <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                              Verify Manually
                            </Badge>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                            {item.notes}
                          </p>
                        )}
                        {item.due_date && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="size-3" />
                            {item.status === 'expired' ? 'Expired' : 'Expires'}:{' '}
                            {new Date(item.due_date).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-muted-foreground">
                        Updated{' '}
                        {new Date(item.updated_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Data sources */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="py-4">
          <p className="text-xs font-medium text-slate-700 mb-2">Data Sources</p>
          <ul className="space-y-1.5">
            {[
              {
                label: 'Philadelphia L&I Violations',
                url: 'https://www.opendataphilly.org/datasets/l-i-violations',
              },
              {
                label: 'Philadelphia Business Licenses (Rental)',
                url: 'https://www.opendataphilly.org/datasets/business-licenses',
              },
              {
                label: 'Philadelphia L&I Self-Service Portal',
                url: 'https://li.phila.gov',
              },
            ].map(({ label, url }) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  {label}
                  <ExternalLink className="size-3" />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-slate-500 leading-relaxed">
            Compliance data is sourced from Philadelphia Open Data APIs and updated on each evaluation.
            Data may be delayed up to 24 hours from official records. Always verify critical items
            directly with the relevant city agency. This is not legal advice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
