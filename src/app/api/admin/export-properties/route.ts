/**
 * GET /api/admin/export-properties
 *
 * Returns a CSV of all properties with their compliance status, notes, and
 * last checked timestamp. Admin-gated via ADMIN_EMAILS env var.
 */

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
}

function escapeCsv(val: string | null | undefined): string {
  const s = val ?? '';
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminEmails = getAdminEmails();
  const isAdmin =
    adminEmails.size === 0
      ? process.env.NODE_ENV === 'development'
      : adminEmails.has((user.email ?? '').toLowerCase());
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const service = createServiceClient();

  const [{ data: properties }, { data: snapshots }, { data: orgs }] = await Promise.all([
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
      .select('id, name, subscription_plan'),
  ]);

  // Latest snapshot per property
  const latestSnapshot = new Map<string, { overall_status: string; computed_at: string }>();
  for (const snap of snapshots ?? []) {
    if (!latestSnapshot.has(snap.property_id)) {
      latestSnapshot.set(snap.property_id, snap);
    }
  }

  const orgMap = new Map((orgs ?? []).map((o) => [o.id, o]));

  const header = ['property_name', 'address', 'city', 'state', 'zip', 'org', 'plan', 'status', 'last_checked', 'internal_notes'].join(',');

  const rows = (properties ?? []).map((p) => {
    const snap = latestSnapshot.get(p.id);
    const org = orgMap.get(p.org_id);
    return [
      escapeCsv(p.name),
      escapeCsv(p.address_line1),
      escapeCsv(p.city),
      escapeCsv(p.state),
      escapeCsv(p.zip),
      escapeCsv(org?.name),
      escapeCsv(org?.subscription_plan),
      escapeCsv(snap?.overall_status ?? 'not_evaluated'),
      escapeCsv(snap?.computed_at ? new Date(snap.computed_at).toISOString().split('T')[0] : ''),
      escapeCsv(p.internal_notes),
    ].join(',');
  });

  const csv = [header, ...rows].join('\r\n');
  const filename = `reglynx-pilot-properties-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
