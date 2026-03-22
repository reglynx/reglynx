import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';
import { FOOTER_LEGAL_LINE } from '@/lib/constants';
import {
  FileText,
  Bell,
  MapPin,
  ClipboardList,
  Users,
  Download,
  Shield,
  ArrowRight,
  Check,
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Document Template Drafting',
    description:
      'Generate jurisdiction-specific compliance document templates in seconds. Fair Housing policies, OSHA checklists, lead disclosures, and more.',
  },
  {
    icon: Bell,
    title: 'Regulatory Change Monitoring',
    description:
      'Stay informed when regulations change. Get alerts when your document templates may need updating based on new rules.',
  },
  {
    icon: MapPin,
    title: 'Multi-Jurisdiction Coverage',
    description:
      'Federal, state, and local requirements in one place. Templates account for jurisdiction-specific requirements and protected classes.',
  },
  {
    icon: ClipboardList,
    title: 'Full Audit Trail',
    description:
      'Track every document generated, reviewed, and downloaded. Demonstrate your compliance efforts with a complete history.',
  },
  {
    icon: Users,
    title: 'Team Access',
    description:
      'Invite your compliance team, property managers, and leadership. Role-based access keeps everyone aligned.',
  },
  {
    icon: Download,
    title: 'PDF Export',
    description:
      'Download draft documents as professionally formatted PDFs, ready for your legal counsel to review and approve.',
  },
];

const plans = [
  {
    name: 'Starter',
    price: 147,
    description: 'For small property managers getting started with compliance.',
    features: [
      'Up to 5 properties',
      '10 document drafts/month',
      'Federal + 1 state jurisdiction',
      'Email alerts',
      'PDF export',
    ],
  },
  {
    name: 'Professional',
    price: 297,
    popular: true,
    description: 'For growing companies that need full jurisdiction coverage.',
    features: [
      'Up to 25 properties',
      'Unlimited document drafts',
      'Federal + all states + local',
      'Priority alerts',
      'PDF export',
      'Team access (up to 5)',
    ],
  },
  {
    name: 'Enterprise',
    price: 597,
    description: 'For large operators and management companies.',
    features: [
      'Unlimited properties',
      'Unlimited document drafts',
      'All jurisdictions',
      'White-label option',
      'API access',
      'Dedicated support',
      'Unlimited team members',
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="sm" />
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-slate-600 hover:text-slate-900">
                Features
              </a>
              <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900">
                Pricing
              </a>
              <a
                href="mailto:hello@reglynx.com"
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Contact
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-[#059669] text-white text-sm font-medium hover:bg-[#047857] transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium mb-8">
            <Shield className="w-3.5 h-3.5" />
            Compliance document templates for property managers
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0f172a] leading-tight tracking-tight">
            Stop Paying Lawyers $3,000{' '}
            <span className="text-slate-400">For First Drafts.</span>
          </h1>
          <h2 className="text-xl sm:text-2xl text-[#0f172a] font-semibold mt-4">
            Generate Compliance Document Templates in 30 Seconds.
          </h2>
          <p className="text-lg text-[#334155] mt-6 max-w-2xl mx-auto leading-relaxed">
            RegLynx monitors regulatory changes and drafts jurisdiction-specific compliance
            document templates for property managers. Ready for your review. Always current.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-[#059669] text-white font-semibold text-base hover:bg-[#047857] transition-colors shadow-lg shadow-emerald-500/20"
            >
              Start Free 14-Day Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <span className="text-sm text-slate-500">No credit card required</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-[#f8fafc] border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0f172a]">
              Everything you need for compliance document management
            </h2>
            <p className="text-lg text-[#334155] mt-4 max-w-2xl mx-auto">
              Generate, monitor, and maintain jurisdiction-specific compliance document
              templates — designed to support your compliance efforts.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-[#0f172a] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#334155] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0f172a]">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-[#334155] mt-4">
              Start with a 14-day free trial. No credit card required.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-8 flex flex-col ${
                  plan.popular
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white relative'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold text-[#0f172a]">{plan.name}</h3>
                <p className="text-sm text-[#334155] mt-1">{plan.description}</p>
                <div className="mt-6 mb-6">
                  <span className="text-4xl font-bold text-[#0f172a]">${plan.price}</span>
                  <span className="text-slate-500">/month</span>
                </div>
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-[#334155]">
                      <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-8 inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium text-sm transition-colors ${
                    plan.popular
                      ? 'bg-[#059669] text-white hover:bg-[#047857]'
                      : 'bg-slate-100 text-[#0f172a] hover:bg-slate-200'
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-[#f8fafc] border-y border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg text-[#334155] italic leading-relaxed">
            &ldquo;Built by a property management professional with 10+ years of compliance
            experience managing Philadelphia multifamily properties.&rdquo;
          </p>
          <p className="mt-4 text-sm font-medium text-[#0f172a]">
            Ramesses Management &amp; Contracting LLC
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#0f172a]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to streamline your compliance workflow?
          </h2>
          <p className="text-lg text-slate-300 mt-4">
            Generate your first compliance document template in under a minute.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-[#059669] text-white font-semibold text-base hover:bg-[#047857] transition-colors mt-8"
          >
            Start Free 14-Day Trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-sm text-slate-400 mt-6">
            Questions?{' '}
            <a href="mailto:hello@reglynx.com" className="text-emerald-400 hover:underline">
              Email us at hello@reglynx.com
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f172a] border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div>
              <Logo size="sm" />
              <p className="text-sm text-slate-400 mt-3 max-w-xs">
                RegLynx — A product of Ramesses Management &amp; Contracting LLC
              </p>
              <p className="text-sm text-slate-500 mt-2">
                1700 Market St., Suite 1005, Philadelphia, PA 19103
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-8">
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Product</h4>
                <ul className="space-y-2">
                  <li>
                    <a href="#features" className="text-sm text-slate-400 hover:text-white">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="text-sm text-slate-400 hover:text-white">
                      Pricing
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Legal</h4>
                <ul className="space-y-2">
                  <li>
                    <a href="/privacy" className="text-sm text-slate-400 hover:text-white">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="/terms" className="text-sm text-slate-400 hover:text-white">
                      Terms of Service
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Contact</h4>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="mailto:hello@reglynx.com"
                      className="text-sm text-slate-400 hover:text-white"
                    >
                      hello@reglynx.com
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:support@reglynx.com"
                      className="text-sm text-slate-400 hover:text-white"
                    >
                      support@reglynx.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-10 pt-8">
            <p className="text-xs text-slate-500 text-center">{FOOTER_LEGAL_LINE}</p>
            <p className="text-xs text-slate-500 text-center mt-2">
              &copy; 2026 RegLynx. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
