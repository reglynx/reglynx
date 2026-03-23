/**
 * POST /api/compliance/evaluate
 *
 * Trigger compliance evaluation for a specific property.
 * Runs all adapters, stores source records, evaluates items, writes snapshot.
 * Creates org alerts and sends email for critical/warning items.
 *
 * Body: { property_id: string }
 * Auth: Supabase session (user must own the property's org)
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { evaluateCompliance } from '@/lib/compliance/engine';
import { sendComplianceAlertEmail } from '@/lib/emails/send';
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
      .select('id, address_line1, city, state')
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

    // ── Create org alerts for actionable items ──────────────────────────────
    const alertableItems = evaluation.items.filter(
      (i) =>
        // Never create alerts or send email for mock/demo-only items
        i.provenance !== 'mock_demo_only' &&
        (i.status === 'open_violation' ||
          i.status === 'expired' ||
          i.status === 'expiring'),
    );

    const propertyAddress = [property.address_line1, property.city, property.state]
      .filter(Boolean)
      .join(', ');

    let hasCritical = false;
    let firstCriticalItem: typeof alertableItems[0] | null = null;

    for (const item of alertableItems) {
      const severity =
        item.status === 'open_violation' || item.status === 'expired'
          ? 'critical'
          : 'warning';

      if (severity === 'critical' && !hasCritical) {
        hasCritical = true;
        firstCriticalItem = item;
      }

      const { data: newAlert } = await serviceClient
        .from('regulatory_alerts')
        .insert({
          title: `${item.label} — ${propertyAddress}`,
          description: item.notes ?? `${item.label} requires attention.`,
          source_url: null,
          source_name: 'compliance_engine',
          jurisdiction: 'Philadelphia, PA',
          category: 'property_compliance',
          severity,
          effective_date: item.dueDate ?? null,
          published_date: new Date().toISOString().split('T')[0],
          affects_document_types: [],
          is_processed: false,
        })
        .select('id')
        .single();

      if (newAlert?.id) {
        await serviceClient
          .from('org_alerts')
          .insert({
            org_id: org.id,
            alert_id: newAlert.id,
            status: 'unread',
          });
      }
    }

    // ── Send email for critical items ───────────────────────────────────────
    if (hasCritical && firstCriticalItem && user.email) {
      sendComplianceAlertEmail(
        user.email,
        propertyAddress,
        firstCriticalItem.label,
        firstCriticalItem.notes ?? firstCriticalItem.label,
      ).catch((err) => console.error('[compliance/evaluate] email error:', err));
    }

    return NextResponse.json(evaluation, { status: 200 });
  } catch (error) {
    Sentry.captureException(error);
    console.error('[compliance/evaluate] error:', error);
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 });
  }
}
