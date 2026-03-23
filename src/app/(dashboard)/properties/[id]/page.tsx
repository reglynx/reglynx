import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import {
  Building2,
  MapPin,
  Calendar,
  Home,
  ArrowLeft,
  Plus,
  FileText,
  CheckCircle2,
  Circle,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { DocumentCard } from '@/components/dashboard/DocumentCard';
import { PROPERTY_TYPES, DOCUMENT_TYPES } from '@/lib/constants';
import type { Organization, Property, Document } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers — determine required doc types for this property
// ---------------------------------------------------------------------------

function getRequiredDocTypes(property: Property): string[] {
  const docs = ['fair_housing_policy', 'emergency_action_plan'];
  if (property.year_built && property.year_built < 1978) docs.push('lead_disclosure');
  if (property.state === 'PA') docs.push('landlord_tenant_rights');
  if (
    property.city?.toLowerCase() === 'philadelphia' &&
    property.state === 'PA'
  ) {
    docs.push('phila_rental_license');
    if (property.year_built && property.year_built < 1978)
      docs.push('phila_lead_safe');
  }
  return docs;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch org
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle<Organization>();

  if (!org) redirect('/onboarding');

  // Fetch property (scoped to org for safety)
  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('org_id', org.id)
    .single<Property>();

  if (!property) notFound();

  // Fetch documents for this property
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('property_id', property.id)
    .order('updated_at', { ascending: false });

  const docList: Document[] = documents ?? [];

  // Required vs existing doc types
  const requiredTypes = getRequiredDocTypes(property);
  const existingTypes = new Set(docList.map((d) => d.document_type));

  const typeLabel =
    PROPERTY_TYPES[property.property_type as keyof typeof PROPERTY_TYPES] ??
    property.property_type;

  const fullAddress = [
    property.address_line1,
    property.address_line2,
    `${property.city}, ${property.state} ${property.zip}`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/properties"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Properties
      </Link>

      {/* ---- Property detail card ---- */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">{property.name}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {fullAddress}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary">{typeLabel}</Badge>
            <Link
              href={`/compliance/${property.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-1.5'}
            >
              <ShieldCheck className="size-3.5" />
              Compliance
            </Link>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Units</p>
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Home className="size-3.5 text-muted-foreground" />
                {property.unit_count}
              </p>
            </div>

            {property.year_built && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Year Built</p>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {property.year_built}
                </p>
              </div>
            )}

            {property.county && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">County</p>
                <p className="text-sm font-medium">{property.county}</p>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            {property.is_section8 && (
              <Badge variant="secondary">Section 8</Badge>
            )}
            {property.is_tax_credit && (
              <Badge variant="secondary">Tax Credit</Badge>
            )}
            {property.has_lead_paint && (
              <Badge variant="destructive">Lead Paint</Badge>
            )}
            {property.has_pool && <Badge variant="outline">Pool</Badge>}
            {property.has_elevator && (
              <Badge variant="outline">Elevator</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---- Required documents checklist ---- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Required Documents</CardTitle>
          <Link
              href={`/documents/generate?property_id=${property.id}`}
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              <Plus className="size-4" />
              Generate Draft
          </Link>
        </CardHeader>
        <CardContent>
          {requiredTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No specific requirements detected for this property configuration.
            </p>
          ) : (
            <ul className="space-y-2">
              {requiredTypes.map((docType) => {
                const info =
                  DOCUMENT_TYPES[docType as keyof typeof DOCUMENT_TYPES];
                const exists = existingTypes.has(docType);
                return (
                  <li
                    key={docType}
                    className="flex items-center gap-2 text-sm"
                  >
                    {exists ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <Circle className="size-4 text-slate-300" />
                    )}
                    <span className={exists ? 'text-foreground' : 'text-muted-foreground'}>
                      {info?.label ?? docType}
                    </span>
                    {exists && (
                      <Badge variant="secondary" className="ml-auto text-[0.65rem]">
                        Generated
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ---- Documents list ---- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Documents</h2>
          <span className="text-sm text-muted-foreground">
            {docList.length} {docList.length === 1 ? 'document' : 'documents'}
          </span>
        </div>

        {docList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <FileText className="size-6 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              No documents yet
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Generate your first compliance document for this property to get
              started.
            </p>
            <Link
                href={`/documents/generate?property_id=${property.id}`}
                className={buttonVariants({ variant: "default", className: "mt-6" })}
              >
                <Plus className="size-4" />
                Generate Draft
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {docList.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
