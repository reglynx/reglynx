'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  ENTITY_TYPES,
  PROPERTY_TYPES,
  SUBSCRIPTION_PLANS,
  CONTIGUOUS_US_STATES,
  isStateSupported,
  COVERAGE_MESSAGES,
} from '@/lib/constants';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompanyData {
  name: string;
  entity_type: string;
  employee_count: string;
  unit_count: string;
}

interface PropertyData {
  name: string;
  address_line1: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  year_built: string;
  has_lead_paint: boolean;
  is_section8: boolean;
  is_tax_credit: boolean;
}

interface JurisdictionData {
  [key: string]: boolean;
}

const STEPS = [
  { label: 'Company Info', number: 1 },
  { label: 'First Property', number: 2 },
  { label: 'Jurisdictions', number: 3 },
  { label: 'Terms & Plan', number: 4 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Step 1: Company
  const [company, setCompany] = useState<CompanyData>({
    name: '',
    entity_type: 'LLC',
    employee_count: '',
    unit_count: '',
  });

  // Step 2: Property
  const [property, setProperty] = useState<PropertyData>({
    name: '',
    address_line1: '',
    city: '',
    state: '',
    zip: '',
    property_type: 'residential_multifamily',
    year_built: '',
    has_lead_paint: false,
    is_section8: false,
    is_tax_credit: false,
  });

  // Step 3: Jurisdictions
  const [jurisdictions, setJurisdictions] = useState<JurisdictionData>({
    federal: true,
    PA: true,
    Philadelphia_PA: true,
  });

  // Step 4: Terms & Plan
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('starter');

  // ---------------------------------------------------------------------------
  // Step handlers
  // ---------------------------------------------------------------------------

  async function handleStep1Next() {
    if (!company.name.trim()) {
      setError('Company name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in');
        setIsLoading(false);
        return;
      }

      // Check if org already exists for this user
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (existingOrg) {
        setOrgId(existingOrg.id);
        setStep(2);
        setIsLoading(false);
        return;
      }

      const { data: org, error: insertError } = await supabase
        .from('organizations')
        .insert({
          name: company.name.trim(),
          owner_id: user.id,
          entity_type: company.entity_type,
          employee_count: company.employee_count
            ? parseInt(company.employee_count, 10)
            : null,
          unit_count: company.unit_count
            ? parseInt(company.unit_count, 10)
            : null,
          industry: 'property_management',
          subscription_status: 'trialing',
          subscription_plan: 'starter',
        })
        .select('id')
        .single();

      if (insertError) {
        setError(insertError.message);
        setIsLoading(false);
        return;
      }

      setOrgId(org.id);
      setStep(2);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStep2Next() {
    if (!property.name.trim() || !property.address_line1.trim()) {
      setError('Property name and address are required');
      return;
    }
    if (!property.city.trim()) {
      setError('City is required');
      return;
    }
    if (!property.state) {
      setError('Please select a state');
      return;
    }
    if (!property.zip.trim()) {
      setError('ZIP code is required');
      return;
    }
    if (!isStateSupported(property.state)) {
      setError(COVERAGE_MESSAGES.unsupported);
      return;
    }
    if (!orgId) {
      setError('Organization not found. Please go back to step 1.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const inputAddress = [
        property.address_line1.trim(),
        property.city.trim(),
        property.state,
        property.zip.trim(),
      ].filter(Boolean).join(', ');

      const { error: insertError } = await supabase
        .from('properties')
        .insert({
          org_id: orgId,
          name: property.name.trim(),
          address_line1: property.address_line1.trim(),
          city: property.city.trim(),
          state: property.state.toUpperCase(),
          zip: property.zip.trim(),
          country: 'US',
          input_address: inputAddress,
          property_type: property.property_type,
          unit_count: 1,
          year_built: property.year_built
            ? parseInt(property.year_built, 10)
            : null,
          has_lead_paint: property.has_lead_paint,
          is_section8: property.is_section8,
          is_tax_credit: property.is_tax_credit,
          has_pool: false,
          has_elevator: false,
        });

      if (insertError) {
        setError(insertError.message);
        setIsLoading(false);
        return;
      }

      setStep(3);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  function handleStep3Next() {
    setError(null);
    setStep(4);
  }

  async function handleFinish() {
    if (!termsAccepted) {
      setError('You must accept the terms to continue');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const plan =
        SUBSCRIPTION_PLANS[selectedPlan as keyof typeof SUBSCRIPTION_PLANS];
      if (!plan) {
        setError('Please select a plan');
        setIsLoading(false);
        return;
      }

      // Set onboarding_complete flag in user metadata
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { onboarding_complete: true },
      });

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create checkout session');
        setIsLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const progressValue = (step / STEPS.length) * 100;

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s) => (
            <div
              key={s.number}
              className={`flex items-center gap-2 text-sm ${
                s.number === step
                  ? 'font-semibold text-slate-900'
                  : s.number < step
                    ? 'text-emerald-600'
                    : 'text-muted-foreground'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  s.number < step
                    ? 'bg-emerald-100 text-emerald-700'
                    : s.number === step
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {s.number < step ? <Check className="h-3.5 w-3.5" /> : s.number}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ---- Step 1: Company Info ---- */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              Tell us about your property management company
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                placeholder="e.g. Acme Property Management LLC"
                value={company.name}
                onChange={(e) =>
                  setCompany({ ...company, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity_type">Entity Type</Label>
              <select
                id="entity_type"
                value={company.entity_type}
                onChange={(e) =>
                  setCompany({ ...company, entity_type: e.target.value })
                }
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_count">Employee Count</Label>
                <Input
                  id="employee_count"
                  type="number"
                  min={0}
                  placeholder="e.g. 10"
                  value={company.employee_count}
                  onChange={(e) =>
                    setCompany({ ...company, employee_count: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_count">Total Units Managed</Label>
                <Input
                  id="unit_count"
                  type="number"
                  min={0}
                  placeholder="e.g. 50"
                  value={company.unit_count}
                  onChange={(e) =>
                    setCompany({ ...company, unit_count: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleStep1Next}
                disabled={isLoading}
                className="bg-[#0f172a] text-white hover:bg-[#1e293b]"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Step 2: First Property ---- */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Add Your First Property</CardTitle>
            <CardDescription>
              Enter the details for your first property. You can add more later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prop_name">Property Name *</Label>
              <Input
                id="prop_name"
                placeholder="e.g. Oak Street Apartments"
                value={property.name}
                onChange={(e) =>
                  setProperty({ ...property, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                placeholder="123 Main St"
                value={property.address_line1}
                onChange={(e) =>
                  setProperty({ ...property, address_line1: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <select
                  id="state"
                  value={property.state}
                  onChange={(e) =>
                    setProperty({ ...property, state: e.target.value })
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Select state...</option>
                  {CONTIGUOUS_US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="e.g. Philadelphia"
                  value={property.city}
                  onChange={(e) =>
                    setProperty({ ...property, city: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP *</Label>
                <Input
                  id="zip"
                  placeholder="19103"
                  value={property.zip}
                  onChange={(e) =>
                    setProperty({ ...property, zip: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prop_type">Property Type</Label>
                <select
                  id="prop_type"
                  value={property.property_type}
                  onChange={(e) =>
                    setProperty({ ...property, property_type: e.target.value })
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {Object.entries(PROPERTY_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year_built">Year Built</Label>
                <Input
                  id="year_built"
                  type="number"
                  placeholder="e.g. 1965"
                  value={property.year_built}
                  onChange={(e) =>
                    setProperty({ ...property, year_built: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Property Flags</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={property.has_lead_paint}
                    onChange={(e) =>
                      setProperty({
                        ...property,
                        has_lead_paint: e.target.checked,
                      })
                    }
                    className="size-4 rounded border-slate-300"
                  />
                  Has lead-based paint (pre-1978)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={property.is_section8}
                    onChange={(e) =>
                      setProperty({
                        ...property,
                        is_section8: e.target.checked,
                      })
                    }
                    className="size-4 rounded border-slate-300"
                  />
                  Section 8
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={property.is_tax_credit}
                    onChange={(e) =>
                      setProperty({
                        ...property,
                        is_tax_credit: e.target.checked,
                      })
                    }
                    className="size-4 rounded border-slate-300"
                  />
                  Tax Credit (LIHTC)
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleStep2Next}
                disabled={isLoading}
                className="bg-[#0f172a] text-white hover:bg-[#1e293b]"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Step 3: Jurisdiction Selection ---- */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Coverage</CardTitle>
            <CardDescription>
              RegLynx monitors regulatory requirements across federal, state, and
              local jurisdictions. Coverage below reflects the jurisdictions
              relevant to the property you entered.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {/* Federal — always active */}
              <label className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={jurisdictions.federal ?? true}
                  onChange={(e) =>
                    setJurisdictions({
                      ...jurisdictions,
                      federal: e.target.checked,
                    })
                  }
                  className="size-4 rounded border-slate-300"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Federal</p>
                  <p className="text-xs text-muted-foreground">
                    Fair Housing, Lead-Based Paint Disclosure, ADA, OSHA
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Active
                </span>
              </label>

              {/* State — based on property */}
              {property.state && (
                <label className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={jurisdictions[property.state] ?? true}
                    onChange={(e) =>
                      setJurisdictions({
                        ...jurisdictions,
                        [property.state]: e.target.checked,
                      })
                    }
                    className="size-4 rounded border-slate-300"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {CONTIGUOUS_US_STATES.find((s) => s.code === property.state)?.name || property.state}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      State-level landlord-tenant regulations
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    property.state === 'PA'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {property.state === 'PA' ? 'Active' : 'Pending'}
                  </span>
                </label>
              )}

              {/* Local — Philadelphia detection */}
              {property.state === 'PA' && property.city.toLowerCase().includes('philadelphia') && (
                <label className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={jurisdictions.Philadelphia_PA ?? true}
                    onChange={(e) =>
                      setJurisdictions({
                        ...jurisdictions,
                        Philadelphia_PA: e.target.checked,
                      })
                    }
                    className="size-4 rounded border-slate-300"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Philadelphia, PA</p>
                    <p className="text-xs text-muted-foreground">
                      Rental license, lead-safe certification, L&I monitoring
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Active
                  </span>
                </label>
              )}
            </div>

            {property.state && property.state !== 'PA' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-medium">Coverage pending</p>
                <p className="mt-1 text-xs text-amber-600">
                  Property intake is available for all contiguous U.S. states.
                  Compliance monitoring adapters for{' '}
                  {CONTIGUOUS_US_STATES.find((s) => s.code === property.state)?.name || property.state}{' '}
                  are being developed. You will be notified when local coverage goes live.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleStep3Next}
                className="bg-[#0f172a] text-white hover:bg-[#1e293b]"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Step 4: Terms & Plan Selection ---- */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Terms of Use</CardTitle>
              <CardDescription>
                Please review and accept the terms before continuing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                By using RegLynx, you acknowledge that: (1) RegLynx generates
                document TEMPLATES based on published regulations, (2) RegLynx
                is not a law firm and does not provide legal advice, (3) All
                generated templates should be reviewed by qualified legal
                counsel before implementation, (4) You are responsible for
                verifying the accuracy and applicability of all documents to
                your specific situation.
              </div>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-slate-300"
                />
                <span className="text-sm">
                  I have read and accept the terms above
                </span>
              </label>
            </CardContent>
          </Card>

          {/* Plan Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Plan</CardTitle>
              <CardDescription>
                All plans include a 14-day free trial. No charge until trial
                ends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {(
                  Object.entries(SUBSCRIPTION_PLANS) as [
                    string,
                    (typeof SUBSCRIPTION_PLANS)[keyof typeof SUBSCRIPTION_PLANS],
                  ][]
                ).map(([key, plan]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPlan(key)}
                    className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                      selectedPlan === key
                        ? 'border-slate-900 bg-slate-50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {selectedPlan === key && (
                      <div className="absolute -top-2.5 right-3 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                        Selected
                      </div>
                    )}
                    <p className="text-base font-semibold">{plan.name}</p>
                    <p className="mt-1 text-2xl font-bold">
                      ${plan.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /mo
                      </span>
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-xs text-slate-600"
                        >
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                setStep(3);
              }}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleFinish}
              disabled={isLoading || !termsAccepted}
              className="bg-[#0f172a] text-white hover:bg-[#1e293b]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting checkout...
                </>
              ) : (
                <>
                  Start Free Trial
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
