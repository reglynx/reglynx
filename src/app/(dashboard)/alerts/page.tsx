import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AlertsList } from './AlertsList';
import type { Organization, OrgAlert, RegulatoryAlert } from '@/lib/types';

export default async function AlertsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let org: Organization | null = null;
  try {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle<Organization>();
    org = data;
  } catch (e) {
    console.error('Failed to fetch organization:', e);
  }

  if (!org) redirect('/onboarding');

  let alerts: (OrgAlert & { alert: RegulatoryAlert })[] = [];
  try {
    const { data: alertsData } = await supabase
      .from('org_alerts')
      .select('*, alert:regulatory_alerts(*)')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false });
    alerts = (alertsData ?? []) as (OrgAlert & { alert: RegulatoryAlert })[];
  } catch (e) {
    console.error('Failed to fetch alerts:', e);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Regulatory Alerts
        </h1>
        <p className="text-muted-foreground">
          Stay up to date with regulatory changes affecting your properties.
        </p>
      </div>

      {/* Alerts list or empty state */}
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Bell className="size-6 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            No regulatory alerts yet
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            No regulatory alerts for your jurisdictions yet. We&apos;ll notify
            you when new regulations or changes are published.
          </p>
        </div>
      ) : (
        <AlertsList alerts={alerts} />
      )}
    </div>
  );
}
