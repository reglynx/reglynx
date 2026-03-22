import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';

export const metadata = {
  title: 'Privacy Policy — RegLynx',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-6">
          <Logo size="sm" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: March 21, 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              1. Introduction
            </h2>
            <p className="mt-2">
              Ramesses Management &amp; Contracting LLC (&quot;Company&quot;,
              &quot;we&quot;, &quot;us&quot;) operates RegLynx
              (&quot;Service&quot;). This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you
              use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              2. Information We Collect
            </h2>
            <p className="mt-2 font-medium">Account Information:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Name, email address, and company name</li>
              <li>Property addresses and details you enter</li>
              <li>Payment information (processed securely by Stripe)</li>
            </ul>
            <p className="mt-3 font-medium">Usage Information:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Documents generated and downloaded</li>
              <li>Features used and pages visited</li>
              <li>Device and browser information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              3. How We Use Your Information
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>To provide and maintain the Service</li>
              <li>To generate compliance document templates</li>
              <li>To send regulatory alerts relevant to your jurisdictions</li>
              <li>To process payments and manage subscriptions</li>
              <li>To send transactional emails (welcome, alerts, billing)</li>
              <li>To improve the Service and develop new features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              4. Data Sharing
            </h2>
            <p className="mt-2">
              We do not sell your personal information. We share data only with:
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                <strong>Stripe</strong> — for payment processing
              </li>
              <li>
                <strong>Supabase</strong> — for database and authentication
                services
              </li>
              <li>
                <strong>Anthropic</strong> — for AI-powered document generation
                (property data is sent to generate templates)
              </li>
              <li>
                <strong>Resend</strong> — for transactional email delivery
              </li>
              <li>
                <strong>Vercel</strong> — for application hosting
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              5. Data Security
            </h2>
            <p className="mt-2">
              We implement industry-standard security measures including
              encrypted data transmission (TLS/SSL), secure authentication, and
              row-level security on our database. However, no method of
              electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              6. Data Retention
            </h2>
            <p className="mt-2">
              We retain your data for as long as your account is active or as
              needed to provide the Service. You may request deletion of your
              account and associated data by contacting{' '}
              <a
                href="mailto:support@reglynx.com"
                className="text-emerald-600 hover:underline"
              >
                support@reglynx.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              7. Cookies
            </h2>
            <p className="mt-2">
              We use essential cookies for authentication and session
              management. We do not use third-party advertising or tracking
              cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              8. Your Rights
            </h2>
            <p className="mt-2">You have the right to:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Access and receive a copy of your data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              9. Children&apos;s Privacy
            </h2>
            <p className="mt-2">
              The Service is not intended for individuals under 18 years of age.
              We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              10. Changes to This Policy
            </h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. We will
              notify you of significant changes by email or through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              11. Contact Us
            </h2>
            <p className="mt-2">
              For questions about this Privacy Policy, contact us at{' '}
              <a
                href="mailto:support@reglynx.com"
                className="text-emerald-600 hover:underline"
              >
                support@reglynx.com
              </a>
            </p>
            <p className="mt-1">
              Ramesses Management &amp; Contracting LLC
              <br />
              1700 Market St., Suite 1005, Philadelphia, PA 19103
            </p>
          </section>
        </div>

        <div className="mt-12 border-t pt-6 text-center text-xs text-slate-400">
          <p>
            &copy; 2026 RegLynx. All rights reserved. |{' '}
            <Link href="/terms" className="hover:underline">
              Terms of Service
            </Link>{' '}
            |{' '}
            <Link href="/" className="hover:underline">
              Home
            </Link>
          </p>
          <p className="mt-1 italic">
            RegLynx is not a law firm and does not provide legal advice. All
            generated document templates should be reviewed by qualified counsel
            before implementation.
          </p>
        </div>
      </main>
    </div>
  );
}
