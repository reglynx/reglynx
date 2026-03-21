import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';

export const metadata = {
  title: 'Terms of Service — RegLynx',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-6">
          <Logo size="sm" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: March 21, 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              1. Acceptance of Terms
            </h2>
            <p className="mt-2">
              By accessing or using RegLynx (&quot;Service&quot;), a product of
              Ramesses Management &amp; Contracting LLC (&quot;Company&quot;,
              &quot;we&quot;, &quot;us&quot;), you agree to be bound by these
              Terms of Service. If you do not agree to these terms, do not use
              the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              2. Description of Service
            </h2>
            <p className="mt-2">
              RegLynx provides compliance document template generation and
              regulatory change monitoring tools for property management
              companies. The Service generates document templates based on
              published federal, state, and local regulations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              3. Important Disclaimers
            </h2>
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-800">
                RegLynx is NOT a law firm and does NOT provide legal advice.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
                <li>
                  All generated documents are TEMPLATES based on published
                  regulations
                </li>
                <li>
                  Templates must be reviewed by qualified legal counsel before
                  implementation
                </li>
                <li>
                  We make no warranty regarding the completeness, accuracy, or
                  applicability of any generated document
                </li>
                <li>
                  You are solely responsible for verifying compliance with all
                  applicable laws and regulations
                </li>
                <li>
                  Use of generated templates is at your own risk
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              4. User Accounts
            </h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account. You must provide accurate and complete information when
              creating an account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              5. Subscription and Payment
            </h2>
            <p className="mt-2">
              The Service is offered on a subscription basis with a 14-day free
              trial. Subscription fees are billed monthly. You may cancel your
              subscription at any time through your account settings. Refunds
              are handled in accordance with our refund policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              6. Intellectual Property
            </h2>
            <p className="mt-2">
              Documents generated through the Service are based on publicly
              available regulations. You retain ownership of any customized
              content you input. The Service itself, including its design,
              functionality, and branding, remains the property of Ramesses
              Management &amp; Contracting LLC.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              7. Limitation of Liability
            </h2>
            <p className="mt-2">
              To the maximum extent permitted by law, Ramesses Management &amp;
              Contracting LLC shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including but not
              limited to loss of profits, data, or business opportunities,
              arising from your use of or inability to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              8. Governing Law
            </h2>
            <p className="mt-2">
              These Terms shall be governed by and construed in accordance with
              the laws of the Commonwealth of Pennsylvania, without regard to
              its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              9. Contact Information
            </h2>
            <p className="mt-2">
              For questions about these Terms, contact us at{' '}
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
              1401 Spruce Street, Philadelphia, PA 19102
            </p>
          </section>
        </div>

        <div className="mt-12 border-t pt-6 text-center text-xs text-slate-400">
          <p>
            &copy; 2026 RegLynx. All rights reserved. |{' '}
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
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
