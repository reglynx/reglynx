import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DOCUMENT_TYPES, JURISDICTIONS } from '@/lib/constants';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import type { Organization, Document } from '@/lib/types';
import { DocumentViewerClient } from './DocumentViewerClient';

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle<Organization>();

  if (!org) redirect('/onboarding');

  // Fetch document scoped to org
  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('org_id', org.id)
    .single<Document>();

  if (!doc) notFound();

  const docTypeConfig =
    DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES];
  const jurisdictionConfig =
    JURISDICTIONS[doc.jurisdiction as keyof typeof JURISDICTIONS];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Draft warning banner */}
      {doc.status === 'draft' && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-800">
          DRAFT — REVIEW WITH QUALIFIED COUNSEL BEFORE IMPLEMENTATION
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {docTypeConfig && <span>{docTypeConfig.label}</span>}
            <span className="text-slate-300">|</span>
            <span>{jurisdictionConfig?.label ?? doc.jurisdiction}</span>
            <span className="text-slate-300">|</span>
            <span>Version {doc.version}</span>
            <span className="text-slate-300">|</span>
            <span>
              Created{' '}
              {new Date(doc.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
        <DocumentStatusBadge status={doc.status} />
      </div>

      {/* Regulation References */}
      {doc.regulation_references && doc.regulation_references.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            Regulation References
          </h3>
          <div className="flex flex-wrap gap-2">
            {doc.regulation_references.map((ref, i) => (
              <a
                key={i}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-emerald-700"
                title={ref.title}
              >
                {ref.code}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Document content + actions (client component) */}
      <DocumentViewerClient
        document={doc}
        userId={user.id}
      />

      {/* Verification info */}
      {doc.reviewed_at && (
        <p className="text-xs text-muted-foreground">
          Reviewed:{' '}
          {new Date(doc.reviewed_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Last verified: Template version {doc.version},{' '}
        {new Date(doc.updated_at).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
    </div>
  );
}
