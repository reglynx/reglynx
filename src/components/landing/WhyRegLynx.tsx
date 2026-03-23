"use client";

import { useRouter } from "next/navigation";

import {
  Shield,
  Clock,
  DollarSign,
  AlertTriangle,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const PENALTY_STATS = [
  { label: "Fair Housing 1st offense", amount: "$16,000+" },
  { label: "Lead paint per violation", amount: "$27,018" },
  { label: "Philly non-compliance", amount: "$2,000/day" },
  { label: "OSHA per violation", amount: "$15,625" },
];

const STEPS = [
  {
    n: "1",
    title: "Add Your Property",
    desc: "Enter the address, year built, property type, and city. Takes about 2 minutes.",
    color: "bg-violet-600",
  },
  {
    n: "2",
    title: "Click 'Generate Draft'",
    desc: "Pick the document you need. Our team drafts it with YOUR city’s rules and real regulation citations.",
    color: "bg-slate-900",
  },
  {
    n: "3",
    title: "Review & Download",
    desc: "Get a professional PDF draft. Hand it to your attorney for a quick sign-off — not a $5,000 rewrite.",
    color: "bg-emerald-600",
  },
];

const DOCUMENTS = [
  {
    name: "Fair Housing Policy",
    scope: "Federal + PA + Philly",
    detail: "All 7 federal protected classes plus state and city additions (source of income, domestic violence survivor status, etc.)",
    icon: Shield,
    docType: "fair_housing_policy",
    jurisdiction: "federal",
  },
  {
    name: "Lead Paint Disclosure",
    scope: "Pre-1978 buildings",
    detail: "EPA/HUD compliant. Includes the $27K penalty warning. Philly requires lead-safe cert before a child under 6 moves in.",
    icon: AlertTriangle,
    docType: "lead_disclosure",
    jurisdiction: "federal",
  },
  {
    name: "Emergency Action Plan",
    scope: "Every property",
    detail: "OSHA 29 CFR 1910.38 — evacuation routes, alarm systems, emergency contacts, training requirements.",
    icon: Clock,
    docType: "emergency_action_plan",
    jurisdiction: "federal",
  },
  {
    name: "ADA Compliance Policy",
    scope: "Every PM company",
    detail: "Reasonable accommodation procedures, service animal policy, accessible communication, grievance process.",
    icon: Shield,
    docType: "ada_policy",
    jurisdiction: "federal",
  },
  {
    name: "PA Landlord-Tenant Disclosure",
    scope: "Pennsylvania",
    detail: "Security deposit limits, entry notice requirements, habitability standards, PA-specific protections.",
    icon: FileText,
    docType: "landlord_tenant_rights",
    jurisdiction: "PA",
  },
  {
    name: "Philly Rental License Checklist",
    scope: "Philadelphia",
    detail: "L&I requirements, inspections, lead-safe cert, Good Cause Eviction, Partners for Good Housing booklet.",
    icon: MapPin,
    docType: "phila_rental_license",
    jurisdiction: "Philadelphia_PA",
  },
];

const COMPARISON_ROWS = [
  { label: "Cost per document", lawyer: "$2,000–$5,000", diy: "Free", rl: "~$15–$30", lIcon: "x", dIcon: "check", rIcon: "check" },
  { label: "Time to draft", lawyer: "2–4 weeks", diy: "2–4 hours searching", rl: "30 seconds", lIcon: "x", dIcon: "dash", rIcon: "check" },
  { label: "Covers your city’s rules?", lawyer: "Yes (if you specify)", diy: "Usually no", rl: "Auto-detects", lIcon: "check", dIcon: "x", rIcon: "check" },
  { label: "Alerts when rules change?", lawyer: "Only if you pay again", diy: "No", rl: "Yes — monitors daily", lIcon: "x", dIcon: "x", rIcon: "check" },
  { label: "Real regulation citations?", lawyer: "Yes", diy: "Maybe", rl: "Verified sources only", lIcon: "check", dIcon: "dash", rIcon: "check" },
  { label: "Full audit trail?", lawyer: "Paper files", diy: "None", rl: "Digital log of every action", lIcon: "dash", dIcon: "x", rIcon: "check" },
  { label: "Available 24/7?", lawyer: "No", diy: "Sort of", rl: "Yes", lIcon: "x", dIcon: "dash", rIcon: "check" },
];

function StatusIcon({ type }: { type: string }) {
  if (type === "check") return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
  if (type === "x") return <XCircle className="w-5 h-5 text-red-600 shrink-0" />;
  return <MinusCircle className="w-5 h-5 text-amber-500 shrink-0" />;
}

export default function WhyRegLynx() {
  const router = useRouter();

  const handleDocumentClick = (docType: string, jurisdiction: string) => {
    router.push(`/signup?intent=generate&doc_type=${docType}&jurisdiction=${jurisdiction}`);
  };

  const handleCTA = () => {
    router.push("/signup");
  };

  return (
    <>
      {/* === SECTION: THE PAIN === */}
      <section id="why-reglynx" className="bg-gradient-to-b from-slate-900 to-slate-800 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-amber-400 text-sm font-bold tracking-[3px] uppercase mb-4">
            Why Choose RegLynx?
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Because &ldquo;We&rsquo;ll Deal With It Later&rdquo;<br />
            Costs $16,000 When L&I Shows Up
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            Every property management company needs compliance documents. Most don&rsquo;t have them &mdash; or have outdated ones. RegLynx fixes that in 30 seconds.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {PENALTY_STATS.map((p) => (
              <div
                key={p.label}
                className="bg-red-500/15 border border-red-500/30 rounded-xl px-5 py-3 min-w-[160px]"
              >
                <div className="text-2xl font-extrabold text-red-300">{p.amount}</div>
                <div className="text-xs text-slate-400 mt-1">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === SECTION: HOW IT WORKS === */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">How It Works</h3>
            <p className="text-slate-500">Three steps. No law degree required.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="bg-slate-50 rounded-2xl p-8 text-center w-full md:w-[240px] border border-slate-200">
                  <div className={`w-12 h-12 rounded-full ${s.color} text-white inline-flex items-center justify-center text-xl font-extrabold mb-3`}>
                    {s.n}
                  </div>
                  <div className="text-base font-bold text-slate-900 mb-2">{s.title}</div>
                  <div className="text-sm text-slate-500 leading-relaxed">{s.desc}</div>
                </div>
                {i < 2 && (
                  <svg className="hidden md:block w-7 h-7 text-slate-300 shrink-0" fill="none" viewBox="0 0 28 28">
                    <path d="M7 14h14m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === SECTION: DOCUMENTS WE GENERATE === */}
      <section className="bg-slate-50 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">Documents We Generate For You</h3>
            <p className="text-slate-500">Each one tailored to your property&rsquo;s city, state, and characteristics. Click any to get started.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOCUMENTS.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.docType}
                  onClick={() => handleDocumentClick(d.docType, d.jurisdiction)}
                  className="bg-white rounded-xl p-6 border border-slate-200 text-left hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex gap-3 items-start mb-2">
                    <Icon className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {d.name}
                      </div>
                      <div className="text-xs font-semibold text-emerald-600 mt-0.5">{d.scope}</div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500 leading-relaxed">{d.detail}</div>
                  <div className="mt-3 text-xs font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Generate this draft →
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* === SECTION: COMPARISON TABLE === */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">RegLynx vs. What You&rsquo;re Doing Now</h3>
            <p className="text-slate-500">The math speaks for itself.</p>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900">
                    <th className="px-5 py-3.5 text-left text-white text-sm font-semibold w-[28%]"></th>
                    <th className="px-4 py-3.5 text-center text-slate-400 text-sm font-semibold w-[24%]">Hire a Lawyer</th>
                    <th className="px-4 py-3.5 text-center text-slate-400 text-sm font-semibold w-[24%]">DIY / Google</th>
                    <th className="px-4 py-3.5 text-center text-emerald-400 text-sm font-bold w-[24%] bg-emerald-600/15">RegLynx</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={i} className="hover:bg-emerald-50/50 transition-colors even:bg-slate-50/50">
                      <td className="px-5 py-3 text-sm font-semibold text-slate-900">{row.label}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <StatusIcon type={row.lIcon} />
                          <span className="text-sm text-slate-500">{row.lawyer}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <StatusIcon type={row.dIcon} />
                          <span className="text-sm text-slate-500">{row.diy}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center bg-emerald-600/5">
                        <div className="flex items-center justify-center gap-2">
                          <StatusIcon type={row.rIcon} />
                          <span className="text-sm font-semibold text-emerald-700">{row.rl}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards version */}
            <div className="md:hidden p-4 space-y-4">
              {COMPARISON_ROWS.map((row, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-4">
                  <div className="font-semibold text-slate-900 text-sm mb-3">{row.label}</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Lawyer</span>
                      <div className="flex items-center gap-1.5"><StatusIcon type={row.lIcon} /><span className="text-slate-600">{row.lawyer}</span></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">DIY</span>
                      <div className="flex items-center gap-1.5"><StatusIcon type={row.dIcon} /><span className="text-slate-600">{row.diy}</span></div>
                    </div>
                    <div className="flex justify-between items-center bg-emerald-50 -mx-2 px-2 py-1 rounded">
                      <span className="text-emerald-700 font-semibold">RegLynx</span>
                      <div className="flex items-center gap-1.5"><StatusIcon type={row.rIcon} /><span className="font-semibold text-emerald-700">{row.rl}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* === SECTION: BOTTOM CTA === */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <DollarSign className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-2 leading-tight">
            We Don&rsquo;t Replace Your Lawyer.<br />
            We Replace the $3,000 First Draft.
          </h3>
          <p className="text-lg text-slate-400 mb-8 leading-relaxed">
            Your attorney still reviews it &mdash; but now that&rsquo;s a $200 review,<br className="hidden md:block" />
            not a $5,000 drafting job.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button
              onClick={handleCTA}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold px-8 py-6 rounded-xl shadow-lg shadow-emerald-600/30"
            >
              Start Free 14-Day Trial
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="border-slate-600 text-white hover:bg-slate-700 text-base font-semibold px-8 py-6 rounded-xl"
            >
              See Pricing →
            </Button>
          </div>
          <p className="text-sm text-slate-500">No credit card required · Cancel anytime · Plans from $147/mo</p>
        </div>
      </section>

      {/* === TRUST LINE === */}
      <section className="bg-slate-900 border-t border-slate-800 py-4 px-6 text-center">
        <p className="text-sm text-slate-400 mb-1">
          Built by a property management professional with 10+ years of compliance experience managing Philadelphia multifamily properties.
        </p>
        <p className="text-xs text-slate-600">
          RegLynx is not a law firm and does not provide legal advice. All generated document templates should be reviewed by qualified counsel before implementation.
        </p>
      </section>
    </>
  );
}
