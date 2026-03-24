export const DOCUMENT_TYPES = {
  fair_housing_policy: {
    label: 'Fair Housing Policy',
    category: 'federal' as const,
    description: 'Federal Fair Housing Act compliance policy',
  },
  lead_disclosure: {
    label: 'Lead-Based Paint Disclosure',
    category: 'federal' as const,
    description: 'EPA/HUD lead-based paint disclosure for pre-1978 properties',
  },
  emergency_action_plan: {
    label: 'Emergency Action Plan',
    category: 'federal' as const,
    description: 'OSHA-compliant Emergency Action Plan',
  },
  ada_policy: {
    label: 'ADA Compliance Policy',
    category: 'federal' as const,
    description: 'Americans with Disabilities Act compliance policy',
  },
  landlord_tenant_rights: {
    label: 'Landlord-Tenant Rights Disclosure',
    category: 'state' as const,
    description: 'State-specific landlord-tenant law disclosure',
  },
  phila_rental_license: {
    label: 'Rental License Compliance Checklist',
    category: 'local' as const,
    description: 'Philadelphia rental license and inspection requirements',
  },
  phila_lead_safe: {
    label: 'Lead Safe Certification Compliance',
    category: 'local' as const,
    description: 'Philadelphia lead-safe certification requirements',
  },
} as const;

export type DocumentType = keyof typeof DOCUMENT_TYPES;

export const JURISDICTIONS = {
  federal: { label: 'Federal', type: 'federal' },
  PA: { label: 'Pennsylvania', type: 'state' },
  Philadelphia_PA: { label: 'Philadelphia, PA', type: 'local' },
} as const;

export type Jurisdiction = keyof typeof JURISDICTIONS;

export const PROPERTY_TYPES = {
  residential_multifamily: 'Residential - Multifamily',
  residential_single: 'Residential - Single Family',
  commercial: 'Commercial',
  mixed_use: 'Mixed Use',
} as const;

export const SUBSCRIPTION_PLANS = {
  starter: {
    name: 'Starter',
    price: 147,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER || process.env.STRIPE_PRICE_ID_STARTER || '',
    description: 'For individual landlords getting started.',
    features: [
      'Up to 5 properties',
      '10 document drafts/month',
      'Federal + 1 state jurisdiction',
      'Email alerts',
      'PDF export',
    ],
    limits: {
      properties: 5,
      documentsPerMonth: 10,
      jurisdictions: 2,
    },
  },
  pilot: {
    name: 'Philadelphia Pilot',
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PILOT || process.env.STRIPE_PRICE_ID_PILOT || '',
    description: 'Early access: Philadelphia rental property compliance monitoring.',
    features: [
      'Up to 5 properties',
      'Philadelphia Open Data monitoring',
      'L&I violations + rental license checks',
      'Daily compliance evaluation',
      'Email alerts for critical issues',
      'Compliance reports with source coverage',
      'Priority pilot support',
    ],
    limits: {
      properties: 5,
      documentsPerMonth: 20,
      jurisdictions: 3,
    },
  },
  professional: {
    name: 'Professional',
    price: 297,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PROFESSIONAL || process.env.STRIPE_PRICE_ID_PROFESSIONAL || '',
    description: 'For property managers with growing portfolios.',
    features: [
      'Up to 25 properties',
      'Unlimited document drafts',
      'Federal + all states + local',
      'Priority alerts',
      'PDF export',
      'Team access (up to 5)',
    ],
    limits: {
      properties: 25,
      documentsPerMonth: Infinity,
      jurisdictions: Infinity,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 597,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE || process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
    description: 'For large portfolios and property management companies.',
    features: [
      'Unlimited properties',
      'Unlimited document drafts',
      'All jurisdictions',
      'White-label option',
      'API access',
      'Dedicated support',
      'Unlimited team members',
    ],
    limits: {
      properties: Infinity,
      documentsPerMonth: Infinity,
      jurisdictions: Infinity,
    },
  },
};

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

export const STATUS_COLORS = {
  current: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  draft: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  needs_review: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  outdated: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
} as const;

export const STATUS_LABELS: Record<string, string> = {
  current: 'Current Draft',
  draft: 'New Draft',
  needs_review: 'Needs Review',
  outdated: 'Outdated',
};

export const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
} as const;

export const ENTITY_TYPES = [
  'LLC',
  'Corporation',
  'S-Corporation',
  'Limited Partnership',
  'Sole Proprietorship',
  'Non-Profit',
  'Other',
] as const;

// ---------------------------------------------------------------------------
// U.S. States — Contiguous 48 only (Phase 1 scope)
// ---------------------------------------------------------------------------

export const CONTIGUOUS_US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
] as const;

/** @deprecated Use CONTIGUOUS_US_STATES instead */
export const US_STATES = CONTIGUOUS_US_STATES;

export const EXCLUDED_US_STATES = [
  { code: 'AK', name: 'Alaska' },
  { code: 'HI', name: 'Hawaii' },
] as const;

export const CONTIGUOUS_STATE_CODES: string[] = CONTIGUOUS_US_STATES.map((s) => s.code);

export function isStateSupported(stateCode: string): boolean {
  return CONTIGUOUS_STATE_CODES.includes(stateCode.toUpperCase());
}

export function getStateName(stateCode: string): string | undefined {
  return CONTIGUOUS_US_STATES.find(
    (s) => s.code === stateCode.toUpperCase()
  )?.name;
}

// ---------------------------------------------------------------------------
// Coverage status messages (enterprise-grade language)
// ---------------------------------------------------------------------------

export const COVERAGE_MESSAGES = {
  active: 'Coverage active',
  partial: 'Partial coverage available',
  pending: 'Coverage pending — property intake available',
  unsupported: 'Coverage is not yet active in this jurisdiction',
  excluded: 'This jurisdiction is not included in the current service area',
} as const;

export const LEGAL_DISCLAIMER = `DRAFT — REVIEW WITH QUALIFIED COUNSEL BEFORE IMPLEMENTATION

This document TEMPLATE was generated by RegLynx based on published
federal, state, and local regulations as of the generation date.
This is NOT legal advice. RegLynx is not a law firm and does not
provide legal services. This template is a starting point that MUST
be reviewed and approved by qualified legal counsel before use in
your operations. RegLynx makes no warranty regarding the completeness
or accuracy of regulatory information. Use of this template is at
your own risk.

RegLynx | reglynx.com | support@reglynx.com
RCCHM Consulting Group | Philadelphia, PA`;

export const FOOTER_LEGAL_LINE =
  'RegLynx is not a law firm and does not provide legal advice. All generated document templates should be reviewed by qualified counsel before implementation.';



export const DOCUMENT_TYPE_NAMES: Record<string, string> = {
  fair_housing_policy: 'Fair Housing Policy',
  lead_disclosure: 'Lead-Based Paint Disclosure',
  emergency_action_plan: 'Emergency Action Plan',
  ada_policy: 'ADA Compliance Policy',
  landlord_tenant_rights: 'PA Landlord-Tenant Rights Disclosure',
  phila_rental_license: 'Philadelphia Rental License Checklist',
  phila_lead_safe: 'Philadelphia Lead Safe Certification',
};

export function getDocumentTypeName(docType: string): string {
  return DOCUMENT_TYPE_NAMES[docType] || docType;
}
