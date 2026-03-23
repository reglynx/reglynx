'use client';

import { useState } from 'react';
import { Check, Loader2, StickyNote } from 'lucide-react';

interface PropertyNotesEditorProps {
  propertyId: string;
  initialNotes: string | null;
}

export function PropertyNotesEditor({ propertyId, initialNotes }: PropertyNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_notes: notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
        <StickyNote className="size-3.5" />
        Internal Notes
      </div>
      <textarea
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
        rows={4}
        placeholder="Atlas mismatch, address issue, missing evidence, demo notes…"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
      />
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-3 animate-spin" />
          ) : saved ? (
            <Check className="size-3" />
          ) : null}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save Notes'}
        </button>
        <span className="text-[11px] text-muted-foreground">Visible to team only · not sent to tenants</span>
      </div>
    </div>
  );
}
