/**
 * /reports/[propertyId] — Monthly Compliance Summary Report
 *
 * Clean, export-ready server-rendered page.
 * Print-friendly layout (print:* Tailwind classes).
 * Includes: property info, overall status, item sections, source references, timestamp.
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  FlaskConical,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { PrintButton } from './PrintButton';
import { CopyReportButton } from './CopyReportButton';
import { createClient } from '@/lib/supabase/server';
import {
  buildCoverageMatrix,
  COVERAGE_BADGE,
  formatLastChecked,
} from '@/lib/compliance/coverage';
import type { Organization, Property } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Display helpers ───────────────────────────────────────────────────────────

function statusIcon(status: string) {
  switch (status) {
    case 'good':
    case 'closed':     return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />;
    case 'expiring':   return <Clock className="size-3.5 shrink-0 text-amber-500" />;
    case 'expired':
    case 'open_violation': return <XCircle className="size-3.5 shrink-0 text-red-500" />;
    case 'needs_review': return <HelpCircle className="size-3.5 shrink-0 text-blue-500" />;
    default:           return <AlertTriangle className="size-3.5 shrink-0 text-slate-400" />;
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    good: 'Compliant', closed: 'Resolved', expiring: 'Expiring Soon',
    expired: 'Expired', open_violation: 'Open Violation',
    needs_review: 'Needs Review', unknown: 'Unknown',
  };
  return map[status] ?? status;
}

function provenanceIcon(provenance: string) {
  switch (provenance) {
    case 'verified_from_source':        return <ShieldCheck className="size-3 text-emerald-600" />;
    case 'derived_from_rule':           return <Scale className="size-3 text-blue-600" />;
    case 'pending_source_verification': return <RefreshCw className="size-3 text-amber-600" />;
    case 'mock_demo_only':              return <FlaskConical className="size-3 text-slate-400" />;
    default:                            return null;
  }
}

function provenanceLabel(provenance: string): string {
  const map: Record<string, string> = {
    verified_from_source: 'Verified from Source',
    derived_from_rule: 'Derived from Rule',
    pending_source_verification: 'Pending Verification',
    mock_demo_only: 'Demo Data Only',
  };
  return map[provenance] ?? provenance;
}

function overallInfo(status: string): { label: string; cls: string; icon: React.ReactNode } {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    compliant:        { label: 'No Active Issues Found', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <ShieldCheck className="size-5 text-emerald-600" /> },
    attention_needed: { label: 'Attention Needed',       cls: 'text-amber-700 bg-amber-50 border-amber-200',       icon: <ShieldAlert className="size-5 text-amber-600" /> },
    non_compliant:    { label: 'Issues Found',           cls: 'text-red-700 bg-red-50 border-red-200',             icon: <XCircle className="size-5 text-red-600" /> },
    unknown:          { label: 'Not Yet Evaluated',      cls: 'text-slate-600 bg-slate-50 border-slate-200',       icon: <HelpCircle className="size-5 text-slate-500" /> },
  };
  return map[status] ?? map.unknown;
}

// ── Report section ────────────────────────────────────────────────────────────

function ReportSection({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: ComplianceItemRow[];
  emptyText: string;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b pb-1">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-1">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded border p-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{statusIcon(item.status)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.label}</span>
                    <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium">
                      {statusLabel(item.status)}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      {provenanceIcon(item.provenance)}
                      {provenanceLabel(item.provenance)}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.notes}</p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                    {item.due_date && (
                      <span>Due: {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    )}
                    {item.source_retrieved_at && (
                      <span>Synced: {new Date(item.source_retrieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ComplianceReportPage({
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

  const [{ data: itemsData }, { data: snapshotData }, { data: srcData }] = await Promise.all([
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
      .select('source_name, retrieved_at')
      .eq('property_id', propertyId),
  ]);

  const items: ComplianceItemRow[] = itemsData ?? [];
  const snapshot: StatusSnapshot | null = snapshotData?.[0] ?? null;

  const coverage = buildCoverageMatrix(
    propertyId,
    items.map((i) => ({ type: i.type, provenance: i.provenance, source_retrieved_at: i.source_retrieved_at })),
    (srcData ?? []) as { source_name: string; retrieved_at: string }[],
  );

  const fullAddress = [
    property.address_line1,
    property.address_line2,
    `${property.city}, ${property.state} ${property.zip}`,
  ].filter(Boolean).join(', ');

  const generatedAt = new Date().toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  const overallStatus = snapshot?.overall_status ?? 'unknown';
  const overall = overallInfo(overallStatus);

  // Buckets — keep mock items in their own section
  const openIssues   = items.filter((i) => i.provenance !== 'mock_demo_only' && (i.status === 'open_violation' || i.status === 'expired'));
  const expiringSoon = items.filter((i) => i.provenance !== 'mock_demo_only' && i.status === 'expiring');
  const needsReview  = items.filter((i) => i.provenance !== 'mock_demo_only' && i.status === 'needs_review');
  const resolved     = items.filter((i) => i.provenance !== 'mock_demo_only' && (i.status === 'good' || i.status === 'closed'));
  const mockItems    = items.filter((i) => i.provenance === 'mock_demo_only');
  const hasMock      = mockItems.length > 0;

  return (
    <div className="space-y-6">
      {/* Navigation — hidden on print */}
      <div className="print:hidden flex items-center justify-between gap-3">
        <Link
          href={`/compliance/${propertyId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Compliance
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/reports"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            All Reports
          </Link>
          <CopyReportButton
            address={fullAddress}
            overallLabel={overall.label}
            openIssues={openIssues.length}
            expiringSoon={expiringSoon.length}
            generatedAt={generatedAt}
          />
          <PrintButton />
        </div>
      </div>

      {/* ── Report document ── */}
      <article className="mx-auto max-w-3xl rounded-xl border bg-white p-8 shadow-sm print:shadow-none print:border-0 print:p-0 print:max-w-none space-y-8">

        {/* Report header */}
        <header className="space-y-4 border-b pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                RegLynx — Compliance Report
              </p>
              <h1 className="mt-1 text-xl font-bold text-slate-900">{fullAddress}</h1>
              {property.name && (
                <p className="text-sm text-muted-foreground">{property.name}</p>
              )}
            </div>
            <div className={`rounded-lg border px-4 py-2 text-center ${overall.cls}`}>
              <div className="flex items-center gap-1.5 justify-center">
                {overall.icon}
                <span className="text-sm font-bold">{overall.label}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <InfoCell label="Generated" value={generatedAt} />
            <InfoCell label="Property Type" value={property.property_type?.replace(/_/g, ' ') ?? '—'} />
            <InfoCell label="Units" value={String(property.unit_count ?? '—')} />
            {property.year_built && <InfoCell label="Year Built" value={String(property.year_built)} />}
          </div>

          {snapshot && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 text-center text-sm">
              {[
                { label: 'Good',       value: snapshot.item_summary.good,           cls: 'text-emerald-600' },
                { label: 'Expiring',   value: snapshot.item_summary.expiring,       cls: 'text-amber-600' },
                { label: 'Expired',    value: snapshot.item_summary.expired,        cls: 'text-red-600' },
                { label: 'Violations', value: snapshot.item_summary.openViolations, cls: 'text-red-700' },
                { label: 'Review',     value: snapshot.item_summary.needsReview,    cls: 'text-blue-600' },
                { label: 'Unknown',    value: snapshot.item_summary.unknown,        cls: 'text-slate-500' },
              ].map(({ label, value, cls }) => (
                <div key={label} className="rounded-lg border py-2 px-1">
                  <p className={`text-xl font-bold tabular-nums ${cls}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* Compliance sections */}
        <div className="space-y-6">
          <ReportSection title="Open Issues"             items={openIssues}   emptyText="No open issues — property is clear." />
          <ReportSection title="Expiring Soon (60 days)" items={expiringSoon} emptyText="No items expiring in the next 60 days." />
          <ReportSection title="Needs Review"            items={needsReview}  emptyText="No items requiring manual review." />
          <ReportSection title="Resolved / Compliant"    items={resolved}     emptyText="No resolved items on record." />

          {hasMock && (
            <section className="space-y-2 rounded-lg border-2 border-dashed border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                <FlaskConical className="size-3.5" />
                Demo / Placeholder Data ({mockItems.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                These items are placeholders and do not represent verified compliance status.
                No alerts were sent for demo items. Re-evaluate once the address matches
                Philadelphia Open Data records.
              </p>
              <ul className="mt-2 space-y-1">
                {mockItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground line-through">
                    <FlaskConical className="size-3 shrink-0" />
                    {item.label} — {statusLabel(item.status)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Coverage matrix */}
        <section className="border-t pt-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Source Coverage
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {coverage.categories.map((cat) => {
              const badge = COVERAGE_BADGE[cat.coverage_status];
              return (
                <div key={cat.category} className="rounded border p-2.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-slate-700 truncate">{cat.label}</span>
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{cat.notes}</p>
                  <p className="text-[10px] text-slate-500">{formatLastChecked(cat.last_checked_at)}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Source references */}
        <section className="border-t pt-6 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Source References</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>Philadelphia L&I Violations — OpenDataPhilly (dataset 6vkh-6s3i)</li>
            <li>Philadelphia Business Licenses (Rental) — OpenDataPhilly (dataset jp3q-4wb6)</li>
            <li>Philadelphia L&I Self-Service Portal — https://li.phila.gov</li>
            <li>Philadelphia Lead &amp; Healthy Homes Program — (215) 685-2788</li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="border-t pt-4 text-[10px] text-slate-400 space-y-1">
          <p>
            This report was generated by RegLynx on {generatedAt} for {org.name}.
            Data sourced from Philadelphia Open Data APIs and may be delayed up to 24 hours.
            A status of &ldquo;No Active Issues Found&rdquo; reflects only what is detectable
            in monitored public data sources — it is not a guarantee of full legal compliance.
            Items marked &ldquo;Demo Data&rdquo; or &ldquo;Pending Verification&rdquo; require
            manual confirmation. This report is not legal advice.
          </p>
          <p>RegLynx — Ramesses Management &amp; Contracting LLC · 1700 Market St. Suite 1005, Philadelphia PA 19103</p>
        </footer>
      </article>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-slate-800 capitalize">{value}</p>
    </div>
  );
}
