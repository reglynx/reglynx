/**
 * GET /api/cron/evaluate-compliance
 *
 * Daily cron job that evaluates compliance for ALL properties across all orgs.
 * Also compares new evaluations against previous snapshots and fires alerts.
 *
 * Called by Vercel Cron at 7 AM ET (12:00 UTC) daily.
 * Auth: Bearer <CRON_SECRET>
 *
 * TODO (scale): add pagination for orgs/properties when count exceeds ~500.
 * TODO (optimization): skip properties with no changes in source data.
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createServiceClient } from '@/lib/supabase/server';
import { evaluateCompliance, detectAlertChanges } from '@/lib/compliance/engine';
import { sendAlertEmail } from '@/lib/emails/send';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  let evaluated = 0;
  let errored = 0;
  let alertsSent = 0;

  try {
    // Fetch all properties across all orgs
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, org_id, name, address_line1, city, state')
      .order('created_at', { ascending: true });

    if (error || !properties) {
      throw new Error(`Failed to fetch properties: ${error?.message}`);
    }

    for (const property of properties) {
      try {
        // Fetch the last snapshot's items for delta detection
        const { data: prevItems } = await supabase
          .from('compliance_items')
          .select('type, status')
          .eq('property_id', property.id);

        const previousItems = prevItems ?? [];

        // Run evaluation
        const evaluation = await evaluateCompliance(property.id, supabase);
        evaluated++;

        // Detect changes and fire alerts
        const newAlerts = detectAlertChanges(evaluation, previousItems);

        for (const alert of newAlerts) {
          // Write alert to regulatory_alerts
          const { data: insertedAlert } = await supabase
            .from('regulatory_alerts')
            .insert({
              title: `[${property.name ?? property.address_line1}] ${alert.message.slice(0, 120)}`,
              description: alert.message,
              source_url: null,
              source_name: 'RegLynx Compliance Engine',
              jurisdiction: `${property.city}_${property.state}`,
              category: alert.type,
              severity: alert.severity,
              published_date: new Date().toISOString().split('T')[0],
              affects_document_types: [],
              is_processed: false,
            })
            .select('id')
            .single();

          if (insertedAlert?.id) {
            // Link to the org
            await supabase.from('org_alerts').upsert({
              org_id: property.org_id,
              alert_id: insertedAlert.id,
              status: 'unread',
            });

            // Find org owner email and send notification
            const { data: org } = await supabase
              .from('organizations')
              .select('owner_id, name')
              .eq('id', property.org_id)
              .single();

            if (org) {
              const { data: userData } = await supabase.auth.admin.getUserById(org.owner_id);
              const ownerEmail = userData?.user?.email;
              if (ownerEmail) {
                const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.reglynx.com'}/compliance/${property.id}`;
                try {
                  await sendAlertEmail(
                    ownerEmail,
                    `Compliance Alert: ${property.name ?? property.address_line1}`,
                    alert.message,
                    `${property.city}, ${property.state}`,
                    dashboardUrl,
                  );
                  alertsSent++;
                } catch (emailErr) {
                  console.error('[cron/evaluate-compliance] email error:', emailErr);
                }
              }
            }
          }
        }
      } catch (propError) {
        errored++;
        Sentry.captureException(propError, {
          tags: { property_id: property.id, cron: 'evaluate-compliance' },
        });
        console.error(`[cron/evaluate-compliance] property ${property.id} error:`, propError);
      }
    }

    return NextResponse.json({
      message: 'Compliance evaluation complete',
      evaluated,
      errored,
      alertsSent,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('[cron/evaluate-compliance] fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
