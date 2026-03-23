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
  ShieldAlert,
  FlaskConical,
  Scale,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComplianceEvaluateButton } from './ComplianceEvaluateButton';
import { EvidencePanel, type EvidenceItem } from './EvidencePanel';
import type { Organization, Property } from '@/lib/types';

// ── DB row types ──────────────────────────────────────────────────────────────

interface ComplianceItemRow {
  id: string;
  type: string;
  label: string;
  status: string;
  due_date: string | null;
  confidence_level: string;
  provenance: string;
  source_record_id: string | null;
  source_retrieved_at: string | null;
  notes: string | null;
  updated_at: string;
}

interface SourceRecordRow {
  id: string;
  source_name: string;
  source_url: string | null;
  retrieved_at: string;
  effective_date: string | null;
  raw_data: Record<string, unknown>;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractRawStatus(sourceName: string, rawData: Record<string, unknown>): string | null {
  if (sourceName === 'philly_rental_license') {
    const status = rawData.licensestatus ?? rawData.status;
    const exp = rawData.expirationdate ?? rawData.expdate;
    return [status, exp ? `exp: ${exp}` : ''].filter(Boolean).join(' · ') || null;
  }
  if (sourceName === 'philly_lni_violations') {
    const status = rawData.casestatus ?? rawData.status;
    const desc = rawData.violationdescription ?? rawData.description;
    return [status, desc].filter(Boolean).join(' · ') || null;
  }
  return null;
}

function buildEvidenceItem(
  item: ComplianceItemRow,
  sourceRecord: SourceRecordRow | undefined,
): EvidenceItem {
  const rawStatus = sourceRecord
    ? extractRawStatus(sourceRecord.source_name, sourceRecord.raw_data)
    : null;
  return {
    id: item.id,
    type: item.type,
    label: item.label,
    status: item.status,
    confidence_level: item.confidence_level,
    provenance: item.provenance,
    source_retrieved_at: item.source_retrieved_at,
    notes: item.notes,
    source_name: sourceRecord?.source_name ?? null,
    source_url: sourceRecord?.source_url ?? null,
    source_effective_date: sourceRecord?.effective_date ?? null,
    source_raw_status: rawStatus,
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
  const map: Record<string, { label: string; cls: string }> = {
    good:           { label: 'Good',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    closed:         { label: 'Resolved',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    expiring:       { label: 'Expiring Soon',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    expired:        { label: 'Expired',        cls: 'bg-red-50 text-red-700 border-red-200' },
    open_violation: { label: 'Open Violation', cls: 'bg-red-50 text-red-700 border-red-200' },
    needs_review:   { label: 'Needs Review',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    unknown:        { label: 'Unknown',        cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  };
  const info = map[status] ?? map.unknown;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${info.cls}`}>
      {info.label}
    </span>
  );
}

function provenanceBadge(provenance: string) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    verified_from_source: {
      label: 'Verified',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <ShieldCheck className="size-2.5" />,
    },
    derived_from_rule: {
      label: 'Rule-Derived',
      cls: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Scale className="size-2.5" />,
    },
    pending_source_verification: {
      label: 'Pending Verification',
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <RefreshCw className="size-2.5" />,
    },
    mock_demo_only: {
      label: 'Demo Data',
      cls: 'bg-slate-100 text-slate-500 border-slate-300 opacity-75',
      icon: <FlaskConical className="size-2.5" />,
    },
  };
  const info = map[provenance] ?? map.pending_source_verification;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium ${info.cls}`}>
      {info.icon}
      {info.label}
    </span>
  );
}

function overallBadge(status: string) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    compliant:        { label: 'Compliant',        cls: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: <CheckCircle2 className="size-4" /> },
    attention_needed: { label: 'Attention Needed', cls: 'bg-amber-100 text-amber-800 border-amber-300',       icon: <Clock className="size-4" /> },
    non_compliant:    { label: 'Issues Found',     cls: 'bg-red-100 text-red-800 border-red-300',             icon: <XCircle className="size-4" /> },
    unknown:          { label: 'Not Evaluated',    cls: 'bg-slate-100 text-slate-700 border-slate-300',       icon: <HelpCircle className="size-4" /> },
  };
  const info = map[status] ?? map.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${info.cls}`}>
      {info.icon}
      {info.label}
    </span>
  );
}

function freshnessLabel(retrievedAt: string | null): { label: string; isStale: boolean; cls: string } {
  if (!retrievedAt) return { label: 'No source data', isStale: true, cls: 'text-slate-400' };
  const hours = (Date.now() - new Date(retrievedAt).getTime()) / 3_600_000;
  if (hours < 1) return { label: 'Synced recently', isStale: false, cls: 'text-emerald-600' };
  if (hours < 24) return { label: 'Synced today', isStale: false, cls: 'text-emerald-600' };
  const days = Math.floor(hours / 24);
  if (days < 7) return { label: `Synced ${days}d ago`, isStale: false, cls: 'text-amber-600' };
  return { label: `Stale — ${days}d old`, isStale: true, cls: 'text-red-600' };
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({ item }: { item: EvidenceItem }) {
  const freshness = freshnessLabel(item.source_retrieved_at);
  const isMock = item.provenance === 'mock_demo_only';

  return (
    <li className={`py-4 first:pt-0 last:pb-0 ${isMock ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{statusIcon(item.status)}</div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-sm font-medium ${isMock ? 'line-through decoration-dotted text-muted-foreground' : ''}`}>
              {item.label}
            </span>
            {statusBadge(item.status)}
            {provenanceBadge(item.provenance)}
          </div>

          {item.notes && (
            <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
              {item.notes}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {item.source_effective_date || item.status === 'expiring' || item.status === 'expired' ? (
              <span className="flex items-center gap-0.5">
                <Calendar className="size-3" />
                {item.status === 'expired' ? 'Expired' : 'Expires'}:{' '}
                {item.source_effective_date
                  ? new Date(item.source_effective_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </span>
            ) : null}
            <span className={`flex items-center gap-0.5 ${freshness.cls}`}>
              <Clock className="size-3" />
              {freshness.label}
            </span>
          </div>

          <EvidencePanel item={item} />
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
  items: EvidenceItem[];
  emptyText: string;
  accent: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className={`mb-2 text-xs font-semibold uppercase tracking-wider ${accent}`}>
        {title}{' '}
        <span className="font-normal normal-case text-muted-foreground">({items.length})</span>
      </h3>
      <ul className="divide-y divide-slate-100 rounded-lg border bg-white px-4">
        {items.map((item) => <ItemRow key={item.id} item={item} />)}
      </ul>
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

  const [{ data: itemsData }, { data: snapshotData }, { data: srcRecordsData }] = await Promise.all([
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
    supabase
      .from('source_records')
      .select('id, source_name, source_url, retrieved_at, effective_date, raw_data')
      .eq('property_id', propertyId),
  ]);

  const rawItems: ComplianceItemRow[] = itemsData ?? [];
  const snapshot: StatusSnapshot | null = snapshotData?.[0] ?? null;
  const srcMap = new Map((srcRecordsData as SourceRecordRow[] ?? []).map((r) => [r.id, r]));

  const items: EvidenceItem[] = rawItems.map((item) =>
    buildEvidenceItem(item, item.source_record_id ? srcMap.get(item.source_record_id) : undefined),
  );

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

  // ── Pilot readiness ───────────────────────────────────────────────────────
  const mockCount = items.filter((i) => i.provenance === 'mock_demo_only').length;
  const verifiedCount = items.filter((i) => i.provenance === 'verified_from_source').length;
  const hasMockItems = mockCount > 0;
  const isFullySourceBacked = items.length > 0 && !hasMockItems && verifiedCount > 0;

  // ── Section buckets ───────────────────────────────────────────────────────
  const mockItems    = items.filter((i) => i.provenance === 'mock_demo_only');
  const openIssues   = items.filter((i) => i.provenance !== 'mock_demo_only' && (i.status === 'open_violation' || i.status === 'expired'));
  const expiringSoon = items.filter((i) => i.provenance !== 'mock_demo_only' && i.status === 'expiring');
  const needsReview  = items.filter((i) => i.provenance !== 'mock_demo_only' && i.status === 'needs_review');
  const resolved     = items.filter((i) => i.provenance !== 'mock_demo_only' && (i.status === 'good' || i.status === 'closed' || i.status === 'unknown'));

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

      {/* Success banner */}
      {isNew === '1' && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <ShieldCheck className="size-4 shrink-0" />
          Property added. Compliance evaluation is running in the background — refresh in a moment to see results.
        </div>
      )}

      {/* Pilot readiness banner */}
      {isFullySourceBacked ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <ShieldCheck className="size-4 shrink-0" />
          <strong>Source-backed monitoring active.</strong>&nbsp;All key items are sourced directly from Philadelphia Open Data APIs.
        </div>
      ) : hasMockItems ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="size-4 shrink-0" />
          <span>
            <strong>Demo data active.</strong>&nbsp;{mockCount} item{mockCount > 1 ? 's are' : ' is'} using placeholder data
            ({verifiedCount} source-backed). Alerts and emails are suppressed for demo items.
            Re-evaluate once the property address matches Philadelphia Open Data records.
          </span>
        </div>
      ) : null}

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
          <Link
            href={`/reports/${propertyId}`}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent transition-colors"
          >
            <FileText className="size-3.5" />
            Report
          </Link>
        </div>
      </div>

      {/* Last checked + staleness */}
      {lastChecked ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          Last evaluated: {lastChecked} · Philadelphia Open Data
        </p>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <HelpCircle className="size-4 shrink-0" />
          No compliance data yet. Click <strong className="mx-1">Evaluate Now</strong> to check this property.
        </div>
      )}

      {/* Summary strip */}
      {snapshot?.item_summary && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: 'Good',        value: snapshot.item_summary.good,           color: 'text-emerald-600' },
            { label: 'Expiring',    value: snapshot.item_summary.expiring,       color: 'text-amber-600' },
            { label: 'Expired',     value: snapshot.item_summary.expired,        color: 'text-red-600' },
            { label: 'Violations',  value: snapshot.item_summary.openViolations, color: 'text-red-700' },
            { label: 'Needs Review',value: snapshot.item_summary.needsReview,    color: 'text-blue-600' },
            { label: 'Unknown',     value: snapshot.item_summary.unknown,        color: 'text-slate-500' },
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

      {/* Compliance sections */}
      {items.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Compliance Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Section title="Open Issues"            items={openIssues}   emptyText="No open issues."         accent="text-red-600" />
            <Section title="Expiring Soon (60 days)" items={expiringSoon} emptyText="Nothing expiring soon." accent="text-amber-600" />
            <Section title="Needs Review"           items={needsReview}  emptyText="Nothing to review."     accent="text-blue-600" />
            <Section title="Resolved / Compliant"   items={resolved}     emptyText="No resolved items yet." accent="text-emerald-600" />

            {/* Mock/demo items — visually isolated */}
            {mockItems.length > 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <FlaskConical className="size-3.5" />
                  Demo Data ({mockItems.length} item{mockItems.length > 1 ? 's' : ''})
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  These items are placeholders and do not represent verified compliance status.
                  No alerts or emails are sent for demo items.
                </p>
                <ul className="divide-y divide-slate-100 rounded-lg border bg-white px-4 opacity-60">
                  {mockItems.map((item) => <ItemRow key={item.id} item={item} />)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="mx-auto mb-3 size-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No compliance items yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click <strong>Evaluate Now</strong> to run a compliance check.
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
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  {label} <ExternalLink className="size-3" />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-slate-500 leading-relaxed">
            Data sourced from Philadelphia Open Data APIs. Items marked &ldquo;Demo Data&rdquo; are
            placeholders. &ldquo;Rule-Derived&rdquo; items are based on Philadelphia code requirements
            without a public source API. This is not legal advice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
