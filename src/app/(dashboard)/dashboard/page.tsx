import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Building2,
  FileText,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Circle,
  Plus,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ComplianceScore } from '@/components/dashboard/ComplianceScore';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { DocumentCard } from '@/components/dashboard/DocumentCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { DOCUMENT_TYPES } from '@/lib/constants';
import type {
  Organization,
  Property,
  Document,
  OrgAlert,
  RegulatoryAlert,
  AuditLogEntry,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Compliance helpers
// ---------------------------------------------------------------------------

function getRequiredDocTypes(property: Property): string[] {
  const docs = ['fair_housing_policy', 'emergency_action_plan'];
  if (property.year_built && property.year_built < 1978) docs.push('lead_disclosure');
  if (property.state === 'PA') docs.push('landlord_tenant_rights');
  if (property.city?.toLowerCase() === 'philadelphia' && property.state === 'PA') {
    docs.push('phila_rental_license');
    if (property.year_built && property.year_built < 1978) docs.push('phila_lead_safe');
  }
  return docs;
}

function calculateComplianceScore(
  properties: Property[],
  documents: Document[],
): { score: number; totalRequired: number; totalCurrent: number } {
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

  const score = totalRequired === 0 ? 0 : Math.round((totalCurrent / totalRequired) * 100);
  return { score, totalRequired, totalCurrent };
}

function formatAuditAction(action: string): string {
  const map: Record<string, string> = {
    document_generated: 'Document generated',
    document_reviewed: 'Document reviewed',
    property_created: 'Property added',
    property_updated: 'Property updated',
    property_deleted: 'Property deleted',
    org_created: 'Organization created',
    compliance_evaluated: 'Compliance check run',
  };
  return map[action] ?? action.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Getting Started checklist helper
// ---------------------------------------------------------------------------

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href: string;
}

function buildGettingStartedChecklist(
  properties: Property[],
  documents: Document[],
  hasReviewedDoc: boolean,
): ChecklistItem[] {
  return [
    {
      id: 'add_property',
      label: 'Add your first property',
      done: properties.length > 0,
      href: '/properties/new',
    },
    {
      id: 'generate_doc',
      label: 'Generate your first compliance document',
      done: documents.length > 0,
      href: '/documents/generate',
    },
    {
      id: 'review_doc',
      label: 'Review and download a document',
      done: hasReviewedDoc,
      href: '/documents',
    },
    {
      id: 'notifications',
      label: 'Set up your notification preferences',
      done: false, // Would require user metadata check
      href: '/settings',
    },
  ];
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
    .maybeSingle<Organization>();

  if (!org) redirect('/onboarding');

  // Parallel data fetches
  const [propertiesRes, documentsRes, alertsRes, auditRes] = await Promise.all([
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
    supabase
      .from('audit_log')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const properties: Property[] = propertiesRes.data ?? [];
  const documents: Document[] = documentsRes.data ?? [];
  const orgAlerts: (OrgAlert & { alert: RegulatoryAlert })[] = alertsRes.data ?? [];
  const auditEntries: AuditLogEntry[] = auditRes.data ?? [];

  // Compute metrics
  const { score: complianceScore, totalRequired, totalCurrent } =
    calculateComplianceScore(properties, documents);
  const needsReviewCount = documents.filter((d) => d.status === 'needs_review').length;

  // Upcoming expirations (next 90 days)
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 86_400_000);
  const upcomingExpirations = documents
    .filter((d) => d.expires_at && new Date(d.expires_at) > now && new Date(d.expires_at) <= in90Days)
    .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
    .slice(0, 5);

  const nextExpiration = documents
    .filter((d) => d.expires_at && new Date(d.expires_at) > now)
    .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())[0];

  const daysUntilExpiration = nextExpiration
    ? Math.ceil((new Date(nextExpiration.expires_at!).getTime() - now.getTime()) / 86_400_000)
    : '--';

  const stats = [
    { label: 'Total Properties', value: properties.length, icon: Building2 },
    { label: 'Total Documents', value: documents.length, icon: FileText },
    { label: 'Needs Review', value: needsReviewCount, icon: AlertTriangle },
    { label: 'Days Until Expiration', value: daysUntilExpiration, icon: CalendarClock },
  ];

  const recentDocuments = documents.slice(0, 5);
  const hasReviewedDoc = documents.some((d) => d.reviewed_at !== null);
  const gettingStarted = buildGettingStartedChecklist(properties, documents, hasReviewedDoc);
  const allChecklistDone = gettingStarted.every((item) => item.done);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Compliance overview for {org.name}</p>
        </div>
        <Link
          href="/properties/new"
          className={buttonVariants({ size: 'sm' }) + ' bg-[#0f172a] text-white hover:bg-[#1e293b]'}
        >
          <Plus className="size-3.5" />
          Add Property
        </Link>
      </div>

      {/* Getting Started checklist (hidden once all done) */}
      {!allChecklistDone && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-blue-800">
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {gettingStarted.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  {item.done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-blue-400" />
                  )}
                  {item.done ? (
                    <span className="text-slate-500 line-through">{item.label}</span>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-blue-700 hover:underline"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Score + Stats */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[auto_1fr]">
        <ComplianceScore
          score={complianceScore}
          totalRequired={totalRequired}
          totalCurrent={totalCurrent}
        />
        <StatsGrid stats={stats} />
      </div>

      {/* Upcoming Expirations */}
      {upcomingExpirations.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <CalendarClock className="size-4" />
                Upcoming Expirations (next 90 days)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {upcomingExpirations.map((doc) => {
                const days = Math.ceil(
                  (new Date(doc.expires_at!).getTime() - now.getTime()) / 86_400_000,
                );
                return (
                  <li key={doc.id} className="flex items-center justify-between text-sm">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="text-amber-800 hover:underline truncate max-w-xs"
                    >
                      {doc.title}
                    </Link>
                    <Badge variant="outline" className="ml-2 shrink-0 text-amber-700 border-amber-300">
                      {days}d
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recent Alerts & Documents */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Alerts */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Alerts</h2>
            <Link
              href="/alerts"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View all <ExternalLink className="size-3" />
            </Link>
          </div>
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Documents</h2>
            <Link
              href="/documents/generate"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <Plus className="size-3.5" />
              Generate
            </Link>
          </div>
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

      {/* Activity Timeline */}
      {auditEntries.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <Card>
            <CardContent className="py-4">
              <ol className="space-y-4">
                {auditEntries.map((entry, i) => (
                  <li key={entry.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                        <Clock className="size-3.5 text-slate-500" />
                      </div>
                      {i < auditEntries.length - 1 && (
                        <div className="mt-1 h-full w-px bg-slate-200" style={{ minHeight: 16 }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm font-medium">{formatAuditAction(entry.action)}</p>
                      {entry.entity_type && entry.entity_id && (
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.entity_type} · {entry.entity_id.slice(0, 8)}…
                        </p>
                      )}
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground pt-0.5">
                      {new Date(entry.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
