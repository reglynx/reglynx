import { redirect } from 'next/navigation';
import { Building2, FileText, AlertTriangle, CalendarClock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ComplianceScore } from '@/components/dashboard/ComplianceScore';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { DocumentCard } from '@/components/dashboard/DocumentCard';
import type { Organization, Property, Document, OrgAlert, RegulatoryAlert } from '@/lib/types';

// ---------------------------------------------------------------------------
// Compliance helpers
// ---------------------------------------------------------------------------

function getRequiredDocTypes(property: Property): string[] {
  const docs = ['emergency_action_plan'];
  if (property.year_built && property.year_built < 1978) docs.push('lead_disclosure');
  if (property.state === 'PA') docs.push('landlord_tenant_rights');
  if (property.city === 'Philadelphia' && property.state === 'PA') {
    docs.push('phila_rental_license');
    if (property.year_built && property.year_built < 1978) docs.push('phila_lead_safe');
  }
  return docs;
}

function calculateComplianceScore(properties: Property[], documents: Document[]): number {
  let totalRequired = 0;
  let totalCurrent = 0;

  for (const property of properties) {
    const required = getRequiredDocTypes(property);
    totalRequired += required.length;
    for (const docType of required) {
      const doc = documents.find(
        (d) =>
          d.property_id === property.id &&
          d.document_type === docType &&
          d.status === 'current',
      );
      if (doc) totalCurrent++;
    }
  }

  // Org-level documents
  const orgLevel = ['fair_housing_policy', 'ada_policy', 'emergency_action_plan'];
  totalRequired += orgLevel.length;
  for (const docType of orgLevel) {
    const doc = documents.find(
      (d) => d.document_type === docType && !d.property_id && d.status === 'current',
    );
    if (doc) totalCurrent++;
  }

  return totalRequired === 0 ? 0 : Math.round((totalCurrent / totalRequired) * 100);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch organization
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .single<Organization>();

  if (!org) redirect('/onboarding');

  // Parallel data fetches
  const [propertiesRes, documentsRes, alertsRes] = await Promise.all([
    supabase
      .from('properties')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('documents')
      .select('*')
      .eq('org_id', org.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('org_alerts')
      .select('*, alert:regulatory_alerts(*)')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const properties: Property[] = propertiesRes.data ?? [];
  const documents: Document[] = documentsRes.data ?? [];
  const orgAlerts: (OrgAlert & { alert: RegulatoryAlert })[] = alertsRes.data ?? [];

  // Compute metrics
  const complianceScore = calculateComplianceScore(properties, documents);
  const needsReviewCount = documents.filter((d) => d.status === 'needs_review').length;

  // Days until next document expiration
  const now = new Date();
  const upcomingExpirations = documents
    .filter((d) => d.expires_at && new Date(d.expires_at) > now)
    .map((d) => Math.ceil((new Date(d.expires_at!).getTime() - now.getTime()) / 86_400_000))
    .sort((a, b) => a - b);
  const daysUntilExpiration = upcomingExpirations.length > 0 ? upcomingExpirations[0] : '--';

  const stats = [
    { label: 'Total Properties', value: properties.length, icon: Building2 },
    { label: 'Total Documents', value: documents.length, icon: FileText },
    { label: 'Needs Review', value: needsReviewCount, icon: AlertTriangle },
    { label: 'Days Until Next Expiration', value: daysUntilExpiration, icon: CalendarClock },
  ];

  const recentDocuments = documents.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Compliance overview for {org.name}
        </p>
      </div>

      {/* Score + Stats */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[auto_1fr]">
        <ComplianceScore score={complianceScore} />
        <StatsGrid stats={stats} />
      </div>

      {/* Recent Alerts & Documents */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Alerts */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Alerts</h2>
          {orgAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent alerts.</p>
          ) : (
            <div className="space-y-3">
              {orgAlerts.map((a) => (
                <AlertCard key={a.id} alert={a} />
              ))}
            </div>
          )}
        </section>

        {/* Recent Documents */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Documents</h2>
          {recentDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            <div className="space-y-3">
              {recentDocuments.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
