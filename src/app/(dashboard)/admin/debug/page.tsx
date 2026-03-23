/**
 * /admin/debug — System observability dashboard
 *
 * Auth-gated: requires ADMIN_EMAILS env var or development mode.
 * NOT linked in the main sidebar — access directly via /admin/debug.
 *
 * Shows:
 *   - Property identity resolution status across all properties
 *   - Adapter execution summary (match method distribution)
 *   - System health overview (env vars, configuration)
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Database, Settings, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
}

interface PropertyDebugRow {
  id: string;
  name: string;
  address_line1: string;
  city: string;
  state: string;
  org_id: string;
  normalized_address: string | null;
  local_parcel_id: string | null;
  provider_name: string | null;
  provider_confidence: number | null;
  identity_resolved_at: string | null;
  latitude: number | null;
  longitude: number | null;
  jurisdiction_city: string | null;
  jurisdiction_state: string | null;
}

const PROVIDER_LABEL: Record<string, { label: string; cls: string }> = {
  phila_ais:                     { label: 'Philadelphia AIS',        cls: 'text-emerald-700 bg-emerald-50' },
  phila_ais_cached:              { label: 'Philadelphia AIS (cached)', cls: 'text-emerald-600 bg-emerald-50' },
  census_geocoder:               { label: 'Census Geocoder',         cls: 'text-blue-700 bg-blue-50' },
  census_geocoder_philly_fallback: { label: 'Census (Philly fallback)', cls: 'text-blue-600 bg-blue-50' },
  user_input:                    { label: 'User Input (no geocode)', cls: 'text-amber-700 bg-amber-50' },
};

function confidenceBar(confidence: number | null) {
  if (confidence === null) return null;
  const pct = Math.round(confidence * 100);
  const color = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-200">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">{pct}%</span>
    </div>
  );
}

export default async function AdminDebugPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminEmails = getAdminEmails();
  const isDev = process.env.NODE_ENV === 'development';
  const isAdmin = isDev || adminEmails.has(user.email?.toLowerCase() ?? '');
  if (!isAdmin) redirect('/dashboard');

  const serviceClient = createServiceClient();

  const { data: properties, count: totalProps } = await serviceClient
    .from('properties')
    .select('id, name, address_line1, city, state, org_id, normalized_address, local_parcel_id, provider_name, provider_confidence, identity_resolved_at, latitude, longitude, jurisdiction_city, jurisdiction_state', { count: 'exact' })
    .order('identity_resolved_at', { ascending: false, nullsFirst: false })
    .limit(100);

  const rows = (properties ?? []) as PropertyDebugRow[];

  // Summary stats
  const resolved = rows.filter((r) => r.identity_resolved_at !== null).length;
  const withParcelId = rows.filter((r) => r.local_parcel_id !== null).length;
  const withCoords = rows.filter((r) => r.latitude !== null).length;
  const unresolved = rows.filter((r) => r.identity_resolved_at === null).length;

  // Provider distribution
  const providerCounts: Record<string, number> = {};
  for (const r of rows) {
    const p = r.provider_name ?? 'not_resolved';
    providerCounts[p] = (providerCounts[p] ?? 0) + 1;
  }

  // Env / config health
  const envChecks = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL',          value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',     value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { key: 'SUPABASE_SERVICE_ROLE_KEY',         value: process.env.SUPABASE_SERVICE_ROLE_KEY },
    { key: 'STRIPE_SECRET_KEY',                 value: process.env.STRIPE_SECRET_KEY },
    { key: 'STRIPE_WEBHOOK_SECRET',             value: process.env.STRIPE_WEBHOOK_SECRET },
    { key: 'PHILLY_OPEN_DATA_APP_TOKEN',        value: process.env.PHILLY_OPEN_DATA_APP_TOKEN },
    { key: 'ADMIN_EMAILS',                      value: process.env.ADMIN_EMAILS },
    { key: 'LOG_LEVEL',                         value: process.env.LOG_LEVEL },
    { key: 'NEXT_PUBLIC_GIT_COMMIT',            value: process.env.NEXT_PUBLIC_GIT_COMMIT },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/properties"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Admin
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="size-5" />
          System Debug
        </h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Properties</p>
            <p className="text-2xl font-bold tabular-nums">{totalProps ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Identity Resolved</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-700">{resolved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">With Parcel ID</p>
            <p className="text-2xl font-bold tabular-nums text-blue-700">{withParcelId}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Unresolved</p>
            <p className={`text-2xl font-bold tabular-nums ${unresolved > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{unresolved}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Provider distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="size-4" />
              Resolution Provider Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(providerCounts).sort((a, b) => b[1] - a[1]).map(([provider, count]) => {
                const meta = PROVIDER_LABEL[provider];
                return (
                  <div key={provider} className="flex items-center justify-between gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${meta?.cls ?? 'text-slate-600 bg-slate-100'}`}>
                      {meta?.label ?? provider}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{count}</span>
                  </div>
                );
              })}
              {Object.keys(providerCounts).length === 0 && (
                <p className="text-xs text-muted-foreground">No properties yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Environment / config */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="size-4" />
              Environment Config
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {envChecks.map(({ key, value }) => {
                const isSet = Boolean(value && value !== 'your_supabase_url' && value !== 'your_supabase_anon_key');
                return (
                  <div key={key} className="flex items-center gap-2">
                    {isSet
                      ? <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                      : <XCircle className="size-3.5 shrink-0 text-red-400" />
                    }
                    <span className="font-mono text-[11px] text-slate-600">{key}</span>
                    {isSet && (
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground truncate max-w-24">
                        {value!.slice(0, 8)}…
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property resolution table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="size-4" />
            Property Identity Resolution Traces
            <span className="ml-auto text-xs font-normal text-muted-foreground">Latest 100</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-[11px] text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Property</th>
                  <th className="px-4 py-2 font-medium">Normalized Address</th>
                  <th className="px-4 py-2 font-medium">Provider</th>
                  <th className="px-4 py-2 font-medium w-32">Confidence</th>
                  <th className="px-4 py-2 font-medium">OPA / Parcel</th>
                  <th className="px-4 py-2 font-medium">Coords</th>
                  <th className="px-4 py-2 font-medium">Resolved At</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta = PROVIDER_LABEL[r.provider_name ?? ''];
                  const hasCoords = r.latitude !== null && r.longitude !== null;
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-800 truncate max-w-32">{r.name}</p>
                        <p className="text-muted-foreground">{r.address_line1}, {r.city}, {r.state}</p>
                      </td>
                      <td className="px-4 py-2.5 max-w-48">
                        {r.normalized_address
                          ? <span className="text-slate-700">{r.normalized_address}</span>
                          : <span className="text-slate-400 italic">not resolved</span>
                        }
                      </td>
                      <td className="px-4 py-2.5">
                        {r.provider_name
                          ? <span className={`rounded px-1.5 py-0.5 font-medium ${meta?.cls ?? 'text-slate-600 bg-slate-100'}`}>{meta?.label ?? r.provider_name}</span>
                          : <span className="text-slate-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 w-32">
                        {r.provider_confidence !== null ? confidenceBar(r.provider_confidence) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        {r.local_parcel_id
                          ? <span className="text-emerald-700">{r.local_parcel_id}</span>
                          : <span className="text-slate-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-2.5">
                        {hasCoords
                          ? <CheckCircle2 className="size-3.5 text-emerald-500" />
                          : <AlertTriangle className="size-3.5 text-slate-300" />
                        }
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {r.identity_resolved_at
                          ? new Date(r.identity_resolved_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="size-3" /> Pending</span>
                        }
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No properties found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <Link href="/admin/properties" className="hover:text-foreground underline">→ Properties</Link>
        <Link href="/admin/leads" className="hover:text-foreground underline">→ Leads</Link>
        <Link href="/admin/validate" className="hover:text-foreground underline">→ Validate adapter</Link>
      </div>
    </div>
  );
}
