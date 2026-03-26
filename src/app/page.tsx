import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';
import { FOOTER_LEGAL_LINE } from '@/lib/constants';
import WhyRegLynx from '@/components/landing/WhyRegLynx';
import { AddressSearch } from '@/components/landing/AddressSearch';
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
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

const features = [
  {
    icon: ShieldCheck,
    title: 'Live Compliance Monitoring',
    description:
      'Pulls L&I violations, rental license status, and permit data directly from Philadelphia Open Data. Know your risk before the city does.',
  },
  {
    icon: FileText,
    title: 'AI Document Generation',
    description:
      'Generate Fair Housing policies, lead disclosures, OSHA plans, and more — drafted from verified regulatory citations, ready for counsel review.',
  },
  {
    icon: Bell,
    title: 'Regulatory Alerts',
    description:
      'Get notified when regulations change that affect your properties. Never miss a compliance deadline or new requirement.',
  },
  {
    icon: AlertTriangle,
    title: 'Fine Exposure Tracking',
    description:
      'See your estimated fine exposure across all properties. Prioritize which violations to address first based on financial risk.',
  },
  {
    icon: ClipboardList,
    title: 'Compliance Audit Trail',
    description:
      'Every document, check, and action is logged. Demonstrate due diligence with a complete compliance history.',
  },
  {
    icon: Download,
    title: 'Reports & Export',
    description:
      'Generate compliance reports per property. Export documents as PDF. Share with investors, auditors, or counsel.',
  },
];

const plans = [
  {
    name: 'Philadelphia Pilot',
    price: 49,
    popular: true,
    description: 'Live compliance monitoring for Philadelphia rental properties.',
    features: [
      'Up to 5 properties',
      'Live L&I violation monitoring',
      'Rental license tracking',
      'Daily compliance evaluation',
      '20 AI document drafts/month',
      'Email alerts for critical issues',
      'Compliance reports',
      'Priority pilot support',
    ],
  },
  {
    name: 'Starter',
    price: 147,
    description: 'Document generation for property managers in any state.',
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
    description: 'Full coverage for growing portfolios.',
    features: [
      'Up to 25 properties',
      'Unlimited document drafts',
      'All jurisdictions',
      'Priority alerts',
      'Team access (up to 5)',
      'PDF export',
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
              <a href="#why-reglynx" className="text-sm text-slate-600 hover:text-emerald-600 font-medium transition-colors">
                Why RegLynx?
              </a>
              <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900">
                Pricing
              </a>
              <a href="mailto:hello@reglynx.com" className="text-sm text-slate-600 hover:text-slate-900">
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
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium mb-6">
            <Shield className="w-3.5 h-3.5" />
            Now live: Philadelphia rental property compliance monitoring
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0f172a] leading-tight tracking-tight">
            Know Your Property&apos;s{' '}
            <span className="text-emerald-600">Compliance Risk</span>{' '}
            <span className="text-slate-400">Before the City Does.</span>
          </h1>

          <p className="text-lg sm:text-xl text-[#334155] mt-6 max-w-2xl mx-auto leading-relaxed">
            RegLynx scans live city records for violations, license gaps, and compliance
            issues — then generates the documents you need to fix them. Built for
            Philadelphia property managers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-[#059669] text-white font-semibold text-base hover:bg-[#047857] transition-colors shadow-lg shadow-emerald-500/20"
            >
              Start Free 14-Day Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <span className="text-sm text-slate-500">
              $49/mo after trial &middot; No credit card required
            </span>
          </div>
        </div>
      </section>

      {/* Address Search Lead Magnet */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <AddressSearch />
      </section>

      {/* Features */}
      <section
        id="features"
        className="py-24 bg-[#f8fafc] border-y border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0f172a]">
              Operational compliance, not just documents
            </h2>
            <p className="text-lg text-[#334155] mt-4 max-w-2xl mx-auto">
              Monitor live city data, track violations, generate required documents,
              and stay audit-ready across your portfolio.
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
                <h3 className="text-lg font-semibold text-[#0f172a] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#334155] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why RegLynx */}
      <WhyRegLynx />

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
                    Recommended
                  </div>
                )}

                <h3 className="text-lg font-semibold text-[#0f172a]">
                  {plan.name}
                </h3>
                <p className="text-sm text-[#334155] mt-1">
                  {plan.description}
                </p>

                <div className="mt-6 mb-6">
                  <span className="text-4xl font-bold text-[#0f172a]">
                    ${plan.price}
                  </span>
                  <span className="text-slate-500">/month</span>
                </div>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-[#334155]"
                    >
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

          <p className="text-center text-sm text-slate-500 mt-8">
            Enterprise plans available for 25+ properties.{' '}
            <a href="mailto:hello@reglynx.com" className="text-emerald-600 hover:underline">Contact us</a>
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-[#f8fafc] border-y border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg text-[#334155] italic leading-relaxed">
            &ldquo;Built by a property management professional with 10+ years of
            compliance experience managing Philadelphia multifamily
            properties.&rdquo;
          </p>
          <p className="mt-4 text-sm font-medium text-[#0f172a]">
            RCCHM Consulting Group
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#0f172a]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Stop guessing. Start monitoring.
          </h2>
          <p className="text-lg text-slate-300 mt-4">
            See your property&apos;s compliance status in minutes, not weeks.
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
            <a
              href="mailto:hello@reglynx.com"
              className="text-emerald-400 hover:underline"
            >
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
                RegLynx &mdash; A product of RCCHM Consulting Group
              </p>
              <p className="text-sm text-slate-500 mt-2">
                1700 Market St. Suite 1005, Philadelphia, PA 19103
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-8">
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Product</h4>
                <ul className="space-y-2">
                  <li><a href="#features" className="text-sm text-slate-400 hover:text-white">Features</a></li>
                  <li><a href="#why-reglynx" className="text-sm text-slate-400 hover:text-white">Why RegLynx?</a></li>
                  <li><a href="#pricing" className="text-sm text-slate-400 hover:text-white">Pricing</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Legal</h4>
                <ul className="space-y-2">
                  <li><Link href="/privacy" className="text-sm text-slate-400 hover:text-white">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="text-sm text-slate-400 hover:text-white">Terms of Service</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Contact</h4>
                <ul className="space-y-2">
                  <li><a href="mailto:hello@reglynx.com" className="text-sm text-slate-400 hover:text-white">hello@reglynx.com</a></li>
                  <li><a href="mailto:support@reglynx.com" className="text-sm text-slate-400 hover:text-white">support@reglynx.com</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-10 pt-8">
            <p className="text-xs text-slate-500 text-center">
              {FOOTER_LEGAL_LINE}
            </p>
            <p className="text-xs text-slate-500 text-center mt-2">
              &copy; 2026 RegLynx. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
