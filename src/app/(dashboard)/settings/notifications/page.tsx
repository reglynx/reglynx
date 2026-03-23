'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Loader2, Check } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const DIGEST_OPTIONS = [
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
  { value: 'off', label: 'Off (no digest)' },
] as const;

export default function NotificationsPage() {
  const [alertEmails, setAlertEmails] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState<'daily' | 'weekly' | 'off'>('weekly');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // In a full implementation these would load from user metadata/preferences table.
  // For now we persist to localStorage as a proof of concept.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('reglynx_notif_prefs');
      if (stored) {
        const parsed = JSON.parse(stored);
        setAlertEmails(parsed.alertEmails ?? true);
        setDigestFrequency(parsed.digestFrequency ?? 'weekly');
      }
    } catch {
      // ignore
    }
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      localStorage.setItem(
        'reglynx_notif_prefs',
        JSON.stringify({ alertEmails, digestFrequency }),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
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
              <Bell className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how and when you receive regulatory alerts
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alert emails toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Regulatory alert emails</p>
              <p className="text-xs text-muted-foreground">
                Receive an email when a new regulation affecting your properties is published
              </p>
            </div>
            <button
              onClick={() => setAlertEmails((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${alertEmails ? 'bg-emerald-500' : 'bg-slate-200'}`}
              role="switch"
              aria-checked={alertEmails}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${alertEmails ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          {/* Digest frequency */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Alert digest frequency</p>
            <div className="space-y-2">
              {DIGEST_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 cursor-pointer rounded-lg border p-3 hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name="digest"
                    value={opt.value}
                    checked={digestFrequency === opt.value}
                    onChange={() => setDigestFrequency(opt.value)}
                    className="accent-slate-900"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="mr-2 h-4 w-4" />
            ) : null}
            {saved ? 'Saved!' : 'Save preferences'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
