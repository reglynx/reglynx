import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendAlertEmail } from '@/lib/emails/send';
import type { RegulatoryAlert, Property, Organization } from '@/lib/types';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    // 1. Fetch unprocessed regulatory alerts
    const { data: unprocessedAlerts, error: alertsError } = await supabase
      .from('regulatory_alerts')
      .select('*')
      .eq('is_processed', false)
      .order('created_at', { ascending: true });

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 },
      );
    }

    if (!unprocessedAlerts || unprocessedAlerts.length === 0) {
      return NextResponse.json({
        message: 'No unprocessed alerts',
        processed: 0,
      });
    }

    let totalOrgAlertsCreated = 0;
    let totalEmailsSent = 0;

    for (const alert of unprocessedAlerts as RegulatoryAlert[]) {
      // 2. Find orgs with properties in matching jurisdictions
      //    Match on state (e.g., "PA") or city_state (e.g., "Philadelphia_PA")
      //    or "federal" which applies to all orgs
      const jurisdictionParts = alert.jurisdiction.split('_');
      const state = jurisdictionParts.length > 1
        ? jurisdictionParts[jurisdictionParts.length - 1]
        : null;
      const city = jurisdictionParts.length > 1
        ? jurisdictionParts.slice(0, -1).join(' ')
        : null;

      let propertiesQuery = supabase.from('properties').select('org_id, state, city');

      if (alert.jurisdiction === 'federal') {
        // Federal alerts apply to all orgs — just get distinct org_ids
        // No filter needed
      } else if (city && state) {
        // Local jurisdiction — match city + state
        propertiesQuery = propertiesQuery
          .eq('state', state)
          .ilike('city', city);
      } else if (alert.jurisdiction.length === 2) {
        // State jurisdiction — just match state code
        propertiesQuery = propertiesQuery.eq('state', alert.jurisdiction);
      }

      const { data: matchingProperties, error: propsError } =
        await propertiesQuery;

      if (propsError) {
        console.error(
          `Error finding properties for alert ${alert.id}:`,
          propsError,
        );
        continue;
      }

      // Get unique org IDs from matching properties
      const orgIds = [
        ...new Set(
          (matchingProperties as Pick<Property, 'org_id'>[]).map(
            (p) => p.org_id,
          ),
        ),
      ];

      // 3. Create org_alerts entries for each affected org
      if (orgIds.length > 0) {
        const orgAlertRows = orgIds.map((orgId) => ({
          org_id: orgId,
          alert_id: alert.id,
          status: 'unread' as const,
        }));

        const { error: insertError } = await supabase
          .from('org_alerts')
          .insert(orgAlertRows);

        if (insertError) {
          console.error(
            `Error creating org_alerts for alert ${alert.id}:`,
            insertError,
          );
          continue;
        }

        totalOrgAlertsCreated += orgAlertRows.length;

        // 4. Send email notifications to org owners
        for (const orgId of orgIds) {
          const { data: org } = await supabase
            .from('organizations')
            .select('owner_id, name')
            .eq('id', orgId)
            .single<Pick<Organization, 'owner_id' | 'name'>>();

          if (!org) continue;

          const { data: userData } = await supabase.auth.admin.getUserById(
            org.owner_id,
          );

          const ownerEmail = userData?.user?.email;
          if (!ownerEmail) continue;

          const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.reglynx.com'}/alerts`;

          try {
            await sendAlertEmail(
              ownerEmail,
              alert.title,
              alert.description,
              alert.jurisdiction,
              dashboardUrl,
            );
            totalEmailsSent++;
          } catch (emailError) {
            console.error(
              `Failed to send alert email to ${ownerEmail}:`,
              emailError,
            );
          }
        }
      }

      // 5. Mark alert as processed
      await supabase
        .from('regulatory_alerts')
        .update({ is_processed: true })
        .eq('id', alert.id);
    }

    return NextResponse.json({
      message: 'Alert check complete',
      alertsProcessed: unprocessedAlerts.length,
      orgAlertsCreated: totalOrgAlertsCreated,
      emailsSent: totalEmailsSent,
    });
  } catch (error) {
    console.error('Alert check cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
