import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchAllPropertyManagementDocuments,
  mapDocumentSeverity,
  getAffectedDocumentTypes,
  type FederalRegisterDocument,
} from '@/lib/regulatory-sources/federal-register';
import {
  fetchOpenCommentPeriods,
  filterPropertyManagementDockets,
} from '@/lib/regulatory-sources/regulations-gov';
import { sendAlertEmail } from '@/lib/emails/send';
import type { Organization, Property } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalOrgAlerts = 0;

  try {
    // ── 1. Fetch from Federal Register ──────────────────────────────────────
    const frDocuments = await fetchAllPropertyManagementDocuments(30);

    for (const doc of frDocuments) {
      // Check if this document_number already exists
      const { data: existing } = await supabase
        .from('regulatory_alerts')
        .select('id')
        .eq('source_name', 'Federal Register')
        .eq('source_url', doc.html_url)
        .maybeSingle();

      if (existing) {
        totalSkipped++;
        continue;
      }

      const severity = mapDocumentSeverity(doc.type);
      const affectedTypes = getAffectedDocumentTypes(doc);

      // Insert new regulatory alert
      const { data: alert, error: insertError } = await supabase
        .from('regulatory_alerts')
        .insert({
          title: doc.title,
          description: doc.abstract ?? `${doc.type} published by the Federal Register. Document number: ${doc.document_number}. Review the full text for details relevant to your operations.`,
          source_url: doc.html_url,
          source_name: 'Federal Register',
          jurisdiction: 'federal',
          category: 'regulatory_update',
          severity,
          published_date: doc.publication_date,
          affects_document_types: affectedTypes,
          is_processed: false,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting Federal Register alert:', insertError);
        continue;
      }

      totalInserted++;

      // ── 2. Match to orgs and create org_alerts ─────────────────────────
      if (alert) {
        const orgAlertsCreated = await distributeAlertToOrgs(supabase, alert.id, 'federal');
        totalOrgAlerts += orgAlertsCreated;
      }
    }

    // ── 3. Fetch from Regulations.gov (open comment periods) ────────────────
    const rgDocs = await fetchOpenCommentPeriods();
    if (rgDocs) {
      const relevant = filterPropertyManagementDockets(rgDocs);
      for (const doc of relevant) {
        const sourceUrl = `https://www.regulations.gov/document/${doc.id}`;

        const { data: existing } = await supabase
          .from('regulatory_alerts')
          .select('id')
          .eq('source_url', sourceUrl)
          .maybeSingle();

        if (existing) {
          totalSkipped++;
          continue;
        }

        const commentEnd = doc.attributes.commentEndDate
          ? ` Comment period ends: ${doc.attributes.commentEndDate}.`
          : '';

        const { data: alert, error: insertError } = await supabase
          .from('regulatory_alerts')
          .insert({
            title: `[OPEN COMMENT] ${doc.attributes.title}`,
            description: `A proposed rule with an open comment period was found on Regulations.gov. Docket: ${doc.attributes.docketId ?? 'N/A'}.${commentEnd} This is an opportunity to comment on a regulation that may affect your properties.`,
            source_url: sourceUrl,
            source_name: 'Regulations.gov',
            jurisdiction: 'federal',
            category: 'open_comment',
            severity: 'warning',
            published_date: doc.attributes.postedDate,
            affects_document_types: ['fair_housing_policy', 'emergency_action_plan'],
            is_processed: false,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting Regulations.gov alert:', insertError);
          continue;
        }

        totalInserted++;
        if (alert) {
          const orgAlertsCreated = await distributeAlertToOrgs(supabase, alert.id, 'federal');
          totalOrgAlerts += orgAlertsCreated;
        }
      }
    }

    return NextResponse.json({
      message: 'Fetch regulations cron complete',
      inserted: totalInserted,
      skipped: totalSkipped,
      orgAlertsCreated: totalOrgAlerts,
    });
  } catch (error) {
    console.error('Fetch regulations cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Find orgs affected by a jurisdiction and create org_alerts + send emails.
 * Returns the number of org_alerts created.
 */
async function distributeAlertToOrgs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  alertId: string,
  jurisdiction: string,
): Promise<number> {
  try {
    let propertiesQuery = supabase
      .from('properties')
      .select('org_id, state, city');

    if (jurisdiction !== 'federal') {
      const parts = jurisdiction.split('_');
      if (parts.length > 1) {
        const state = parts[parts.length - 1];
        const city = parts.slice(0, -1).join(' ');
        propertiesQuery = propertiesQuery.eq('state', state).ilike('city', city);
      } else {
        propertiesQuery = propertiesQuery.eq('state', jurisdiction);
      }
    }

    const { data: matchingProperties } = await propertiesQuery;
    if (!matchingProperties || matchingProperties.length === 0) return 0;

    const orgIds = [
      ...new Set(
        (matchingProperties as Pick<Property, 'org_id'>[]).map((p) => p.org_id),
      ),
    ];

    // Insert org_alerts (ignore duplicates)
    const orgAlertRows = orgIds.map((orgId) => ({
      org_id: orgId,
      alert_id: alertId,
      status: 'unread' as const,
    }));

    const { error: insertError } = await supabase
      .from('org_alerts')
      .upsert(orgAlertRows, { onConflict: 'org_id,alert_id', ignoreDuplicates: true });

    if (insertError) {
      console.error('Error creating org_alerts:', insertError);
      return 0;
    }

    // Send email notifications
    const { data: alertData } = await supabase
      .from('regulatory_alerts')
      .select('title, description, jurisdiction')
      .eq('id', alertId)
      .maybeSingle();

    if (alertData) {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.reglynx.com'}/alerts`;
      for (const orgId of orgIds) {
        const { data: org } = await supabase
          .from('organizations')
          .select('owner_id, name')
          .eq('id', orgId)
          .maybeSingle();

        if (!org) continue;
        const typedOrg = org as Pick<Organization, 'owner_id' | 'name'>;

        const { data: userData } = await supabase.auth.admin.getUserById(typedOrg.owner_id);
        const ownerEmail = userData?.user?.email;
        if (!ownerEmail) continue;

        try {
          await sendAlertEmail(
            ownerEmail,
            alertData.title,
            alertData.description,
            alertData.jurisdiction,
            dashboardUrl,
          );
        } catch (emailError) {
          console.error(`Failed to send alert email to ${ownerEmail}:`, emailError);
        }
      }
    }

    return orgAlertRows.length;
  } catch (error) {
    console.error('distributeAlertToOrgs error:', error);
    return 0;
  }
}
