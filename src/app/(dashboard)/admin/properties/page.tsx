/**
 * /admin/properties — Internal pilot validation log
 *
 * NOT linked in the main sidebar. Access directly via /admin/properties.
 * Auth-gated: requires ADMIN_EMAILS env var or development mode.
 *
 * Shows all properties across all orgs with their compliance status,
 * coverage level, internal notes, and last checked time.
 * Includes a CSV export link.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ExternalLink, Download, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
}

interface PropertyRow {
  id: string;
  org_id: string;
  name: string;
  address_line1: string;
  city: string;
  state: string;
  zip: string;
  internal_notes: string | null;
  created_at: string;
}

interface SnapshotRow {
  property_id: string;
  overall_status: string;
  computed_at: string;
}

interface OrgRow {
  id: string;
  name: string;
  subscription_plan: string;
  subscription_status: string;
}

interface AlertRow {
  org_id: string;
  created_at: string;
}

function statusBadgeCls(status: string): string {
  switch (status) {
    case 'compliant':        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'attention_needed': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'non_compliant':    return 'bg-red-50 text-red-700 border-red-200';
    default:                 return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'compliant':        return 'No Active Issues';
    case 'attention_needed': return 'Attention Needed';
    case 'non_compliant':    return 'Issues Found';
    default:                 return 'Not Evaluated';
  }
}

function planBadge(plan: string, subscriptionStatus: string) {
  const isPilotActive = plan === 'pilot' && (subscriptionStatus === 'active' || subscriptionStatus === 'trialing');
  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  if (isPilotActive) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded border bg-amber-50 border-amber-300 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold">
        <Zap className="size-2.5" />
        Pilot Active
      </span>
    );
  }
  if (isActive) {
    return (
      <span className="rounded border bg-emerald-50 border-emerald-200 text-emerald-700 px-1.5 py-0.5 text-[10px] font-medium capitalize">
        {plan} · Active
      </span>
    );
  }
  return (
    <span className="rounded border bg-slate-100 border-slate-200 text-slate-500 px-1.5 py-0.5 text-[10px] font-medium capitalize">
      {plan} · {subscriptionStatus}
    </span>
  );
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AdminPropertiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminEmails = getAdminEmails();
  const isAdmin =
    adminEmails.size === 0
      ? process.env.NODE_ENV === 'development'
      : adminEmails.has((user.email ?? '').toLowerCase());
  if (!isAdmin) redirect('/dashboard');

  const service = createServiceClient();

  const [
    { data: propertiesData },
    { data: snapshotsData },
    { data: orgsData },
    { data: alertsData },
  ] = await Promise.all([
    service
      .from('properties')
      .select('id, org_id, name, address_line1, city, state, zip, internal_notes, created_at')
      .order('created_at', { ascending: false }),
    service
      .from('status_snapshots')
      .select('property_id, overall_status, computed_at')
      .order('computed_at', { ascending: false }),
    service
      .from('organizations')
      .select('id, name, subscription_plan, subscription_status')
      .order('created_at', { ascending: false }),
    service
      .from('org_alerts')
      .select('org_id, created_at')
      .order('created_at', { ascending: false }),
  ]);

  const properties: PropertyRow[] = propertiesData ?? [];
  const snapshots: SnapshotRow[] = snapshotsData ?? [];
  const orgs: OrgRow[] = orgsData ?? [];
  const alerts: AlertRow[] = alertsData ?? [];

  // Latest snapshot per property
  const latestSnapshot = new Map<string, SnapshotRow>();
  for (const snap of snapshots) {
    if (!latestSnapshot.has(snap.property_id)) {
      latestSnapshot.set(snap.property_id, snap);
    }
  }

  // Latest alert per org
  const latestAlert = new Map<string, string>();
  for (const a of alerts) {
    if (!latestAlert.has(a.org_id)) {
      latestAlert.set(a.org_id, a.created_at);
    }
  }

  // Property count per org
  const propCountByOrg = new Map<string, number>();
  for (const p of properties) {
    propCountByOrg.set(p.org_id, (propCountByOrg.get(p.org_id) ?? 0) + 1);
  }

  const orgMap = new Map(orgs.map((o) => [o.id, o]));

  // Summary stats
  const activeOrgs = orgs.filter((o) => o.subscription_status === 'active' || o.subscription_status === 'trialing');
  const pilotOrgs  = activeOrgs.filter((o) => o.subscription_plan === 'pilot');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
            Internal Tool · Not public
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Pilot Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All organisations and properties. Real-time pilot health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/api/admin/export-properties"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50"
          >
            <Download className="size-3.5" />
            Export CSV
          </Link>
          <Link
            href="/admin/validate"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50"
          >
            Address Validator
          </Link>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Total orgs',       value: orgs.length },
          { label: 'Pilot active',     value: pilotOrgs.length,  highlight: true },
          { label: 'Active (any plan)', value: activeOrgs.length },
          { label: 'Total properties', value: properties.length },
          { label: 'Evaluated',        value: snapshots.length > 0 ? latestSnapshot.size : 0 },
        ].map(({ label, value, highlight }) => (
          <div key={label} className={`rounded-lg border px-4 py-2 text-center ${highlight ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
            <p className={`text-2xl font-bold tabular-nums ${highlight ? 'text-amber-700' : 'text-slate-800'}`}>{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Org-level table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Organisations ({orgs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 text-left">Org</th>
                  <th className="px-4 py-2.5 text-left">Plan</th>
                  <th className="px-4 py-2.5 text-center">Properties</th>
                  <th className="px-4 py-2.5 text-left">Last Compliance Run</th>
                  <th className="px-4 py-2.5 text-left">Last Alert Sent</th>
                </tr>
              </thead>
              <tbody>
                {orgs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">
                      No organisations yet.
                    </td>
                  </tr>
                )}
                {orgs.map((org) => {
                  // Find latest snapshot across all properties for this org
                  const orgProps = properties.filter((p) => p.org_id === org.id);
                  const orgSnapshots = orgProps.map((p) => latestSnapshot.get(p.id)).filter(Boolean) as SnapshotRow[];
                  const latestOrgSnap = orgSnapshots.sort((a, b) => b.computed_at.localeCompare(a.computed_at))[0];

                  return (
                    <tr key={org.id} className="border-b last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{org.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        {planBadge(org.subscription_plan, org.subscription_status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium tabular-nums">{propCountByOrg.get(org.id) ?? 0}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {latestOrgSnap ? fmtDate(latestOrgSnap.computed_at) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {fmtDate(latestAlert.get(org.id))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Property-level table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Properties ({properties.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5 text-left">Property / Address</th>
                  <th className="px-4 py-2.5 text-left">Org / Plan</th>
                  <th className="px-4 py-2.5 text-left">Compliance Status</th>
                  <th className="px-4 py-2.5 text-left">Last Checked</th>
                  <th className="px-4 py-2.5 text-left">Internal Notes</th>
                  <th className="px-4 py-2.5 text-left">Links</th>
                </tr>
              </thead>
              <tbody>
                {properties.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">
                      No properties yet.
                    </td>
                  </tr>
                )}
                {properties.map((prop) => {
                  const snap = latestSnapshot.get(prop.id);
                  const org = orgMap.get(prop.org_id);
                  return (
                    <tr key={prop.id} className="border-b last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 leading-tight">{prop.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {prop.address_line1}, {prop.city}, {prop.state} {prop.zip}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-700">{org?.name ?? '—'}</p>
                        {org && (
                          <div className="mt-0.5">
                            {planBadge(org.subscription_plan, org.subscription_status)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {snap ? (
                          <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${statusBadgeCls(snap.overall_status)}`}>
                            {statusLabel(snap.overall_status)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {snap ? fmtDate(snap.computed_at) : '—'}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {prop.internal_notes ? (
                          <p className="text-xs text-slate-700 line-clamp-2">{prop.internal_notes}</p>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">no notes</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/compliance/${prop.id}`}
                            className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline"
                          >
                            Compliance <ExternalLink className="size-2.5" />
                          </Link>
                          <Link href={`/properties/${prop.id}`} className="text-xs text-slate-500 hover:underline">
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
