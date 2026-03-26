'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, FileText, Database } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { Document, Property } from '@/lib/types';

export default function ExportPage() {
  const [exportingDocs, setExportingDocs] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  async function exportDocumentsAsMarkdown() {
    setExportingDocs(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!org) return;

      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false });

      if (!docs || docs.length === 0) {
        alert('No documents to export.');
        return;
      }

      // Combine all docs into a single markdown file
      const content = (docs as Document[])
        .map(
          (d) =>
            `# ${d.title}\n\n**Type:** ${d.document_type}  \n**Jurisdiction:** ${d.jurisdiction}  \n**Status:** ${d.status}  \n**Generated:** ${new Date(d.created_at).toLocaleDateString()}\n\n---\n\n${d.content_markdown}\n\n---\n`,
        )
        .join('\n\n');

      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reglynx_documents_${org.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportingDocs(false);
    }
  }

  async function exportDataAsCSV() {
    setExportingData(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (!org) return;

      const [{ data: properties }, { data: docs }] = await Promise.all([
        supabase.from('properties').select('*').eq('org_id', org.id),
        supabase.from('documents').select('*').eq('org_id', org.id),
      ]);

      // Properties CSV
      const propHeaders = ['id', 'name', 'address_line1', 'city', 'state', 'zip', 'property_type', 'unit_count', 'year_built', 'created_at'];
      const propRows = (properties as Property[] ?? []).map((p) =>
        propHeaders.map((h) => JSON.stringify((p as unknown as Record<string, unknown>)[h] ?? '')).join(','),
      );
      const propCsv = [propHeaders.join(','), ...propRows].join('\n');

      // Documents CSV
      const docHeaders = ['id', 'title', 'document_type', 'jurisdiction', 'status', 'version', 'created_at'];
      const docRows = (docs as Document[] ?? []).map((d) =>
        docHeaders.map((h) => JSON.stringify((d as unknown as Record<string, unknown>)[h] ?? '')).join(','),
      );
      const docCsv = [docHeaders.join(','), ...docRows].join('\n');

      const combined = `PROPERTIES\n${propCsv}\n\nDOCUMENTS\n${docCsv}`;
      const blob = new Blob([combined], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reglynx_data_${org.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportingData(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Settings
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Download className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle>Data Export</CardTitle>
              <CardDescription>Download your data at any time</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <FileText className="size-5 text-slate-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">All Documents</p>
                <p className="text-xs text-muted-foreground">
                  Download all generated compliance documents as a combined Markdown file
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportDocumentsAsMarkdown}
              disabled={exportingDocs}
            >
              {exportingDocs ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-start justify-between rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <Database className="size-5 text-slate-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">All Data (CSV)</p>
                <p className="text-xs text-muted-foreground">
                  Download properties and document metadata as CSV
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportDataAsCSV}
              disabled={exportingData}
            >
              {exportingData ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Exports contain all your organization&apos;s data. Documents are exported as Markdown text. To receive a full PDF archive, contact{' '}
            <a href="mailto:support@reglynx.com" className="underline">
              support@reglynx.com
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
