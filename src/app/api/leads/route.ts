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
