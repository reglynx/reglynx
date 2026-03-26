'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { DownloadDisclaimerModal } from '@/components/documents/DownloadDisclaimerModal';
import { createClient } from '@/lib/supabase/client';
import type { Document } from '@/lib/types';

interface DocumentViewerClientProps {
  document: Document;
  userId: string;
}

export function DocumentViewerClient({
  document: doc,
  userId,
}: DocumentViewerClientProps) {
  const router = useRouter();
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  async function handleMarkReviewed() {
    setMarking(true);
    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      await supabase
        .from('documents')
        .update({
          status: 'current',
          reviewed_at: now,
          reviewed_by: userId,
        })
        .eq('id', doc.id);

      // Log to audit
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();

      if (org) {
        await supabase.from('audit_log').insert({
          org_id: org.id,
          user_id: userId,
          action: 'document_reviewed',
          entity_type: 'document',
          entity_id: doc.id,
          metadata: { reviewed_at: now },
        });
      }

      router.refresh();
    } catch {
      console.error('Failed to mark document as reviewed');
    } finally {
      setMarking(false);
    }
  }

  function handleDownloadConfirm() {
    // Create a plain-text download of the markdown content
    const blob = new Blob([doc.content_markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}_v${doc.version}.md`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Document content */}
      <Card>
        <CardContent>
          <DocumentViewer content={doc.content_markdown} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => setDisclaimerOpen(true)}
        >
          Download Draft as PDF
        </Button>

        {doc.status === 'draft' && (
          <Button
            onClick={handleMarkReviewed}
            disabled={marking}
          >
            {marking ? 'Updating...' : 'I have reviewed this draft'}
          </Button>
        )}
      </div>

      <DownloadDisclaimerModal
        documentId={doc.id}
        open={disclaimerOpen}
        onOpenChange={setDisclaimerOpen}
        onConfirm={handleDownloadConfirm}
      />
    </>
  );
}
