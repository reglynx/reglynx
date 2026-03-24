/**
 * POST /api/leads
 *
 * Public endpoint — no authentication required.
 * Accepts a lead submission from the /early-access page and inserts it
 * into the leads table. RLS allows anon inserts.
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

interface LeadPayload {
  email?: string;
  company_name?: string;
  city?: string;
  state?: string;
  property_count?: number;
  message?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST(req: Request) {
  let body: LeadPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body.email ?? '').trim();
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 422 });
  }

  const propertyCount =
    body.property_count !== undefined
      ? Math.max(0, Math.floor(Number(body.property_count)))
      : null;

  // Use service client — bypasses RLS so we don't need a session
  const supabase = createServiceClient();

  const { error } = await supabase.from('leads').insert({
    email,
    company_name: (body.company_name ?? '').trim() || null,
    city:          (body.city         ?? '').trim() || null,
    state:         (body.state        ?? '').trim() || null,
    property_count: isNaN(propertyCount as number) ? null : propertyCount,
    message:       (body.message      ?? '').trim() || null,
    status: 'new',
  });

  if (error) {
    console.error('[leads] insert error:', error.message);
    return NextResponse.json({ error: 'Failed to submit. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

/**
 * GET /api/leads — Admin: list leads (requires service key auth header)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Support CSV export via ?format=csv
  const url = new URL(request.url);
  if (url.searchParams.get('format') === 'csv') {
    const headers = ['email', 'company_name', 'city', 'state', 'property_count', 'message', 'status', 'created_at'];
    const csvRows = [headers.join(',')];
    for (const row of data || []) {
      csvRows.push(
        headers.map((h) => `"${String((row as Record<string, unknown>)[h] || '').replace(/"/g, '""')}"`).join(','),
      );
    }

    return new Response(csvRows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=reglynx-leads.csv',
      },
    });
  }

  return NextResponse.json({ leads: data, count: data?.length || 0 });
}
