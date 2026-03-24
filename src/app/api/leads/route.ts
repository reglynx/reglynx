import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/leads — Store an early-access lead
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, city, state, unit_count, source } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    const { error } = await supabase.from('leads').insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: company?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      unit_count: unit_count?.toString() || null,
      source: source || 'early_access',
    });

    if (error) {
      console.error('[leads] insert error:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
    const headers = ['name', 'email', 'company', 'city', 'state', 'unit_count', 'source', 'created_at'];
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
