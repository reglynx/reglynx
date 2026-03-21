'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface DownloadDisclaimerModalProps {
  documentId: string;
  onConfirm: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DownloadDisclaimerModal({
  documentId,
  onConfirm,
  open,
  onOpenChange,
}: DownloadDisclaimerModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [logging, setLogging] = useState(false);

  async function handleDownload() {
    setLogging(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (org) {
          await supabase.from('audit_log').insert({
            org_id: org.id,
            user_id: user.id,
            action: 'download_disclaimer_acknowledged',
            entity_type: 'document',
            entity_id: documentId,
            metadata: { acknowledged_at: new Date().toISOString() },
          });
        }
      }
    } catch {
      // Non-blocking: don't prevent download if audit log fails
      console.error('Failed to log disclaimer acknowledgment');
    } finally {
      setLogging(false);
      setAcknowledged(false);
      onConfirm();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Disclaimer</DialogTitle>
          <DialogDescription>
            Please review and acknowledge the following before downloading.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            This document template was generated based on published federal,
            state, and local regulations. It does NOT constitute legal advice.
            You should have this document reviewed by qualified legal counsel
            before implementing it in your operations.
          </div>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span className="text-slate-700">
              I understand this is a draft template and I will review it with
              qualified counsel before use.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button
            onClick={handleDownload}
            disabled={!acknowledged || logging}
          >
            {logging ? 'Processing...' : 'Download Draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
