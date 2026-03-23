'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, MapPin, ShieldCheck, Building2, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

export default function EarlyAccessPage() {
  const [form, setForm] = useState({
    email: '',
    company_name: '',
    city: '',
    state: '',
    property_count: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.email.trim()) {
      setError('Email address is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          property_count: form.property_count ? Number(form.property_count) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo size="sm" />
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">

          {/* Left: positioning copy */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                </span>
                Philadelphia monitoring is active
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                Rental property compliance,<br />
                <span className="text-blue-600">backed by public data.</span>
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed">
                RegLynx monitors your properties against live government sources —
                L&I violations, rental licenses, permits, and more — so you know
                before the city does.
              </p>
            </div>

            {/* What's live now */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
                What&apos;s active now
              </p>
              <ul className="space-y-2.5">
                {[
                  { icon: <ShieldCheck className="size-4 text-emerald-500" />, text: 'Philadelphia compliance monitoring — live L&I and license data' },
                  { icon: <MapPin className="size-4 text-emerald-500" />,     text: 'Nationwide address support and property identity resolution' },
                  { icon: <Building2 className="size-4 text-emerald-500" />,  text: 'Multi-property dashboard with daily alerts' },
                ].map(({ icon, text }, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 shrink-0">{icon}</span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Expansion notice */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-1.5">
              <p className="text-sm font-semibold text-blue-800">
                Nationwide address support is expanding
              </p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Philadelphia is our first fully-monitored city. Additional jurisdictions
                are being added as local open-data sources are integrated. Joining the
                waitlist gets you early access for your city.
              </p>
            </div>

            {/* Social proof stub */}
            <div className="border-t border-slate-200 pt-6">
              <p className="text-xs text-slate-500 leading-relaxed">
                Built for residential landlords, property managers, and real estate
                investors who need reliable compliance monitoring without the legal overhead.
                Not a law firm. Not legal advice.
              </p>
            </div>
          </div>

          {/* Right: form */}
          <div>
            {submitted ? (
              <div className="rounded-xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
                <CheckCircle2 className="mx-auto mb-4 size-12 text-emerald-500" />
                <h2 className="text-xl font-bold text-slate-900">You&apos;re on the list</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  We&apos;ll reach out as soon as coverage is active in your area.
                  Philadelphia users can{' '}
                  <Link href="/signup" className="text-blue-600 hover:underline font-medium">
                    sign up now
                  </Link>.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm space-y-5"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Request Early Access</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Philadelphia access is available now. Join the list for other cities.
                  </p>
                </div>

                {error && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </p>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                    Work email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>

                {/* Company */}
                <div className="space-y-1.5">
                  <label htmlFor="company_name" className="block text-sm font-medium text-slate-700">
                    Company or portfolio name
                  </label>
                  <input
                    id="company_name"
                    name="company_name"
                    type="text"
                    value={form.company_name}
                    onChange={handleChange}
                    placeholder="Acme Properties LLC"
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>

                {/* City + State */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="city" className="block text-sm font-medium text-slate-700">
                      City
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Philadelphia"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="state" className="block text-sm font-medium text-slate-700">
                      State
                    </label>
                    <select
                      id="state"
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      <option value="">State</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Property count */}
                <div className="space-y-1.5">
                  <label htmlFor="property_count" className="block text-sm font-medium text-slate-700">
                    Number of rental units
                  </label>
                  <input
                    id="property_count"
                    name="property_count"
                    type="number"
                    min={1}
                    max={10000}
                    value={form.property_count}
                    onChange={handleChange}
                    placeholder="e.g. 12"
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700">
                    Anything else? <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us about your portfolio or what you need..."
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                  {submitting ? 'Submitting…' : 'Request Early Access'}
                </button>

                <p className="text-center text-[11px] text-slate-400">
                  No spam. No commitment. We&apos;ll only reach out about access.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
