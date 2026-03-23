import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText, ArrowRight, ShieldCheck, ShieldAlert, HelpCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import type { Organization, Property } from '@/lib/types';

interface StatusSnapshot {
  overall_status: string;
  computed_at: string;
}

function overallIcon(status: string) {
  if (status === 'compliant') return <ShieldCheck className="size-4 shrink-0 text-emerald-500" />;
  if (status === 'non_compliant' || status === 'attention_needed')
    return <ShieldAlert className="size-4 shrink-0 text-amber-500" />;
  return <HelpCircle className="size-4 shrink-0 text-slate-400" />;
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle<Organization>();

  if (!org) redirect('/onboarding');

  const { data: propertiesData } = await supabase
    .from('properties')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false });

  const properties: Property[] = propertiesData ?? [];

  // Fetch latest snapshot for each property
  const snapshotMap = new Map<string, StatusSnapshot>();
  if (properties.length > 0) {
    const { data: snapshots } = await supabase
      .from('status_snapshots')
      .select('property_id, overall_status, computed_at')
      .in('property_id', properties.map((p) => p.id))
      .order('computed_at', { ascending: false });

    // Keep only the latest per property
    for (const snap of snapshots ?? []) {
      if (!snapshotMap.has(snap.property_id)) {
        snapshotMap.set(snap.property_id, snap);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and export compliance reports for each property.
        </p>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No properties yet.{' '}
            <Link href="/properties/new" className="text-blue-600 hover:underline">
              Add your first property
            </Link>{' '}
            to generate reports.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => {
            const address = [p.address_line1, p.city, p.state].filter(Boolean).join(', ');
            const snap = snapshotMap.get(p.id);
            const lastEvaluated = snap
              ? new Date(snap.computed_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })
              : null;

            return (
              <li key={p.id}>
                <Link
                  href={`/reports/${p.id}`}
                  className="flex items-start justify-between rounded-lg border bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText className="size-5 shrink-0 mt-0.5 text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name ?? address}</p>
                      {p.name && (
                        <p className="truncate text-xs text-muted-foreground">{address}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {snap ? (
                          <>
                            {overallIcon(snap.overall_status)}
                            <span className="capitalize">{snap.overall_status.replace(/_/g, ' ')}</span>
                            <span className="text-slate-300">·</span>
                            <span>{lastEvaluated}</span>
                          </>
                        ) : (
                          <>
                            <HelpCircle className="size-3.5 text-slate-400" />
                            <span>Not yet evaluated</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 self-center text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
