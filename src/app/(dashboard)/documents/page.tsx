import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button-variants';
import { DocumentCard } from '@/components/dashboard/DocumentCard';
import type { Organization, Document } from '@/lib/types';

export default async function DocumentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle<Organization>();

  if (orgError) {
    console.error('Org fetch error:', orgError);
  }

  if (!org) redirect('/onboarding');

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false });

  const documentList: Document[] = documents ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Manage your compliance document templates.
          </p>
        </div>
        <Link href="/documents/generate" className={buttonVariants({ variant: "default" })}>
            <Plus className="size-4" />
            Generate Draft
        </Link>
      </div>

      {/* Document list or empty state */}
      {documentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <FileText className="size-6 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            No documents yet
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Generate your first compliance document draft to get started.
          </p>
          <Link href="/documents/generate" className={buttonVariants({ variant: "default", className: "mt-6" })}>
              <Plus className="size-4" />
              Generate your first draft
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documentList.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
