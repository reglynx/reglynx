/**
 * /admin/leads — Lead submission viewer
 *
 * Admin-only. Shows all early-access lead submissions with export to CSV.
 * Uses the service client to bypass RLS (no SELECT policy for regular users).
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Users } from 'lucide-react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeadsExportButton } from './LeadsExportButton';

interface Lead {
  id: string;
  email: string;
  company_name: string | null;
  city: string | null;
  state: string | null;
  property_count: number | null;
  message: string | null;
  status: string;
  created_at: string;
}

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
}

export default async function AdminLeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminEmails = getAdminEmails();
  const isAdmin =
    adminEmails.size === 0
      ? process.env.NODE_ENV === 'development'
      : adminEmails.has((user.email ?? '').toLowerCase());

  if (!isAdmin) redirect('/dashboard');

  const serviceClient = createServiceClient();
  const { data: leadsData } = await serviceClient
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  const leads: Lead[] = leadsData ?? [];

  const byState = leads.reduce<Record<string, number>>((acc, l) => {
    if (l.state) acc[l.state] = (acc[l.state] ?? 0) + 1;
    return acc;
  }, {});

  const topStates = Object.entries(byState)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/properties"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Admin
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl font-bold">Early Access Leads</h1>
        </div>
        <LeadsExportButton leads={leads} />
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm shadow-sm">
          <Users className="size-4 text-blue-500" />
          <span className="font-semibold">{leads.length}</span>
          <span className="text-muted-foreground">total leads</span>
        </div>
        {topStates.map(([state, count]) => (
          <div key={state} className="flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm shadow-sm">
            <span className="font-semibold text-slate-700">{state}</span>
            <span className="text-muted-foreground">{count}</span>
          </div>
        ))}
      </div>

      {/* Leads table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Submissions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Company</th>
                    <th className="px-4 py-3 text-left font-medium">City</th>
                    <th className="px-4 py-3 text-left font-medium">St</th>
                    <th className="px-4 py-3 text-right font-medium">Units</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Submitted</th>
                    <th className="px-4 py-3 text-left font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{lead.email}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.company_name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.city ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.state ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {lead.property_count ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          lead.status === 'new'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : lead.status === 'contacted'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-slate-500 text-xs">
                        {lead.message ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
