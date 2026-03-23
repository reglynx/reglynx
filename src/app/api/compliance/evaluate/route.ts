/**
 * POST /api/compliance/evaluate
 *
 * Trigger compliance evaluation for a specific property.
 * Runs all adapters, stores source records, evaluates items, writes snapshot.
 *
 * Body: { property_id: string }
 * Auth: Supabase session (user must own the property's org)
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { evaluateCompliance } from '@/lib/compliance/engine';
import type { Organization } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { property_id } = body as { property_id: string };

    if (!property_id) {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 });
    }

    // Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify org owns this property
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single<Pick<Organization, 'id'>>();

    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', property_id)
      .eq('org_id', org.id)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Run evaluation with service client (needs to write to DB)
    const serviceClient = createServiceClient();
    const evaluation = await evaluateCompliance(property_id, serviceClient);

    // Log to audit_log
    await supabase.from('audit_log').insert({
      org_id: org.id,
      user_id: user.id,
      action: 'compliance_evaluated',
      entity_type: 'property',
      entity_id: property_id,
      metadata: {
        overall_status: evaluation.overallStatus,
        item_summary: evaluation.itemSummary,
        triggered_by: 'manual',
      },
    });

    return NextResponse.json(evaluation, { status: 200 });
  } catch (error) {
    Sentry.captureException(error);
    console.error('[compliance/evaluate] error:', error);
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 });
  }
}
