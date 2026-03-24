'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Shield } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { CONTIGUOUS_US_STATES } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function EarlyAccessPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    city: '',
    state: '',
    unit_count: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'early_access' }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong');
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="mb-4 size-12 text-emerald-500" />
            <h2 className="text-xl font-bold">You are on the list</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We will reach out when coverage is available in your area.
              Philadelphia-based properties are available for immediate access.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/signup">
                <Button className="bg-slate-900 text-white hover:bg-slate-800">
                  Start Free Trial (Philadelphia)
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="mb-8">
        <Logo size="md" href="/" />
      </div>

      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Request Early Access</CardTitle>
          <CardDescription>
            RegLynx is currently live for Philadelphia properties.
            Request early access for other U.S. jurisdictions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Property management company"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <select
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                >
                  <option value="">Select...</option>
                  {CONTIGUOUS_US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_count">Units Managed</Label>
                <Input
                  id="unit_count"
                  value={form.unit_count}
                  onChange={(e) => setForm({ ...form, unit_count: e.target.value })}
                  placeholder="e.g. 50"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white hover:bg-slate-800"
            >
              {loading ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Submitting...</>
              ) : (
                'Request Early Access'
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <Shield className="size-4" />
              Philadelphia properties available now
            </div>
            <p className="mt-1 text-xs text-emerald-700">
              If your properties are in Philadelphia, you can{' '}
              <Link href="/signup" className="font-medium underline">
                start your free trial immediately
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/" className="underline hover:text-slate-700">
          Back to RegLynx
        </Link>
      </p>
    </div>
  );
}
