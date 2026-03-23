import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  HelpCircle,
  ExternalLink,
  MapPin,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ComplianceEvaluateButton } from './ComplianceEvaluateButton';
import type { Organization, Property } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

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
      return <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />;
    case 'expiring':
      return <Clock className="size-4 shrink-0 text-amber-500" />;
    case 'expired':
    case 'open_violation':
      return <XCircle className="size-4 shrink-0 text-red-500" />;
    case 'needs_review':
      return <HelpCircle className="size-4 shrink-0 text-blue-500" />;
    default:
      return <AlertTriangle className="size-4 shrink-0 text-slate-400" />;
  }
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    good:           { label: 'Good',           className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    closed:         { label: 'Resolved',       className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    expiring:       { label: 'Expiring Soon',  className: 'bg-amber-50 text-amber-700 border-amber-200' },
    expired:        { label: 'Expired',        className: 'bg-red-50 text-red-700 border-red-200' },
    open_violation: { label: 'Open Violation', className: 'bg-red-50 text-red-700 border-red-200' },
    needs_review:   { label: 'Needs Review',   className: 'bg-blue-50 text-blue-700 border-blue-200' },
    unknown:        { label: 'Unknown',        className: 'bg-slate-50 text-slate-600 border-slate-200' },
  };
  const info = map[status] ?? map.unknown;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${info.className}`}>
      {info.label}
    </span>
  );
}

function overallBadge(status: string) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    compliant:        { label: 'Compliant',        className: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: <CheckCircle2 className="size-4" /> },
    attention_needed: { label: 'Attention Needed', className: 'bg-amber-100 text-amber-800 border-amber-300',   icon: <Clock className="size-4" /> },
    non_compliant:    { label: 'Issues Found',     className: 'bg-red-100 text-red-800 border-red-300',         icon: <XCircle className="size-4" /> },
    unknown:          { label: 'Not Evaluated',    className: 'bg-slate-100 text-slate-700 border-slate-300',   icon: <HelpCircle className="size-4" /> },
  };
  const info = map[status] ?? map.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${info.className}`}>
      {info.icon}
      {info.label}
    </span>
  );
}

function confidenceLabel(level: string) {
  const map: Record<string, { label: string; color: string }> = {
    verified:     { label: 'Philadelphia Open Data', color: 'text-emerald-600' },
    likely:       { label: 'Mock Data',              color: 'text-amber-600' },
    needs_review: { label: 'Manual Review',          color: 'text-blue-600' },
  };
  return map[level] ?? { label: level, color: 'text-slate-500' };
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({ item }: { item: ComplianceItem }) {
  const conf = confidenceLabel(item.confidence_level);
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="mt-0.5">{statusIcon(item.status)}</div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{item.label}</span>
          {statusBadge(item.status)}
        </div>
        {item.notes && (
          <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
            {item.notes}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          {item.due_date && (
            <span className="flex items-center gap-0.5">
              <Calendar className="size-3" />
              {item.status === 'expired' ? 'Expired' : 'Expires'}:{' '}
              {new Date(item.due_date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          )}
          <span className={conf.color}>Source: {conf.label}</span>
          <span className="text-slate-400">
            Updated{' '}
            {new Date(item.updated_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </li>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title,
  items,
  emptyText,
  accent,
}: {
  title: string;
  items: ComplianceItem[];
  emptyText?: string;
  accent?: string;
}) {
  return (
    <div>
      <h3 className={`mb-2 text-xs font-semibold uppercase tracking-wider ${accent ?? 'text-slate-500'}`}>
        {title} <span className="ml-1 font-normal normal-case text-muted-foreground">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border bg-white px-4">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ComplianceDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { propertyId } = await params;
  const { new: isNew } = await searchParams;

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
  ]
    .filter(Boolean)
    .join(', ');

  const overallStatus = snapshot?.overall_status ?? 'unknown';
  const lastChecked = snapshot?.computed_at
    ? new Date(snapshot.computed_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null;

  // ── Section buckets ───────────────────────────────────────────────────────
  const openIssues    = items.filter((i) => i.status === 'open_violation' || i.status === 'expired');
  const expiringSoon  = items.filter((i) => i.status === 'expiring');
  const needsReview   = items.filter((i) => i.status === 'needs_review');
  const resolved      = items.filter((i) => i.status === 'good' || i.status === 'closed' || i.status === 'unknown');

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/compliance"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All Properties
      </Link>

      {/* New property success banner */}
      {isNew === '1' && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <ShieldCheck className="size-4 shrink-0" />
          Property added! Compliance evaluation is running in the background —
          refresh in a moment to see results.
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Compliance Status</h1>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {fullAddress}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {overallBadge(overallStatus)}
          <ComplianceEvaluateButton propertyId={propertyId} />
        </div>
      </div>

      {/* Last checked */}
      {lastChecked ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          Last evaluated: {lastChecked} · Data from Philadelphia Open Data
        </p>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <HelpCircle className="size-4 shrink-0" />
          <span>
            No compliance data yet. Click <strong>Evaluate Now</strong> to check this property
            against Philadelphia L&I and license databases.
          </span>
        </div>
      )}

      {/* Summary strip */}
      {snapshot?.item_summary && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: 'Good',           value: snapshot.item_summary.good,           color: 'text-emerald-600' },
            { label: 'Expiring',       value: snapshot.item_summary.expiring,       color: 'text-amber-600' },
            { label: 'Expired',        value: snapshot.item_summary.expired,        color: 'text-red-600' },
            { label: 'Violations',     value: snapshot.item_summary.openViolations, color: 'text-red-700' },
            { label: 'Needs Review',   value: snapshot.item_summary.needsReview,    color: 'text-blue-600' },
            { label: 'Unknown',        value: snapshot.item_summary.unknown,        color: 'text-slate-500' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="text-center shadow-none">
              <CardContent className="py-3">
                <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sections */}
      {items.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Compliance Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Section
              title="Open Issues"
              items={openIssues}
              emptyText="No open issues — great!"
              accent="text-red-600"
            />
            <Section
              title="Expiring Soon (60 days)"
              items={expiringSoon}
              emptyText="Nothing expiring soon."
              accent="text-amber-600"
            />
            <Section
              title="Needs Review"
              items={needsReview}
              emptyText="Nothing needs manual review."
              accent="text-blue-600"
            />
            <Section
              title="Resolved / Compliant"
              items={resolved}
              emptyText="No resolved items yet."
              accent="text-emerald-600"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="mx-auto mb-3 size-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No compliance items yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click <strong>Evaluate Now</strong> above to run a compliance check.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data sources */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="py-4">
          <p className="text-xs font-semibold text-slate-700 mb-2">Data Sources</p>
          <ul className="space-y-1.5">
            {[
              { label: 'Philadelphia L&I Violations', url: 'https://www.opendataphilly.org/datasets/l-i-violations' },
              { label: 'Philadelphia Business Licenses (Rental)', url: 'https://www.opendataphilly.org/datasets/business-licenses' },
              { label: 'Philadelphia L&I Self-Service Portal', url: 'https://li.phila.gov' },
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
            Data is sourced from Philadelphia Open Data APIs and may be delayed up to 24 hours.
            Items marked &ldquo;Mock Data&rdquo; are demo placeholders — verify directly with the relevant agency.
            This is not legal advice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
