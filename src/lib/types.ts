export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  industry: string;
  entity_type: string | null;
  employee_count: number | null;
  unit_count: number | null;
  website: string | null;
  phone: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled';
  subscription_plan: 'starter' | 'pilot' | 'professional' | 'enterprise';
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  org_id: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  county: string | null;
  country: string;
  property_type: 'residential_multifamily' | 'residential_single' | 'commercial' | 'mixed_use';
  unit_count: number;
  year_built: number | null;
  has_lead_paint: boolean;
  has_pool: boolean;
  has_elevator: boolean;
  is_section8: boolean;
  is_tax_credit: boolean;
  internal_notes: string | null;
  // Address normalization
  input_address: string | null;
  normalized_address: string | null;
  latitude: number | null;
  longitude: number | null;
  address_provider: string | null;
  address_confidence: number | null;
  // Identity resolution
  jurisdiction_city: string | null;
  jurisdiction_county: string | null;
  jurisdiction_state: string | null;
  national_property_id: string | null;
  local_parcel_id: string | null;
  local_tax_id: string | null;
  provider_name: string | null;
  provider_confidence: number | null;
  identity_provider: string | null;
  identity_confidence: number | null;
  identity_resolved_at: string | null;
  // Archive support
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Address provider types (Phase 3)
// ---------------------------------------------------------------------------

export interface NormalizedAddress {
  street: string;
  unit: string | null;
  city: string;
  state: string;
  zip: string;
  county: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  formattedAddress: string;
  provider: string;
  confidence: number;
}

export interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

// ---------------------------------------------------------------------------
// Property identity types (Phase 4)
// ---------------------------------------------------------------------------

export interface PropertyIdentity {
  nationalPropertyId: string | null;
  localParcelId: string | null;
  localTaxId: string | null;
  provider: string;
  confidence: number;
  resolvedAt: string;
  rawResponse?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Jurisdiction coverage types (Phase 5)
// ---------------------------------------------------------------------------

export type CoverageStatus = 'active' | 'partial' | 'pending' | 'unsupported';

export interface JurisdictionCoverage {
  id: string;
  country: string;
  state: string | null;
  city: string | null;
  jurisdiction_key: string;
  coverage_status: CoverageStatus;
  adapters_available: string[];
  intake_enabled: boolean;
  billing_enabled: boolean;
  waitlist_enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Compliance adapter types (Phase 6)
// ---------------------------------------------------------------------------

export interface ComplianceRecord {
  id: string;
  type: string;
  status: string;
  description: string;
  date: string | null;
  sourceUrl: string | null;
  rawData?: Record<string, unknown>;
}

export interface ComplianceResult {
  adapterName: string;
  jurisdiction: string;
  matchMethod: 'local_id' | 'normalized_address' | 'fallback';
  matchState: 'matched' | 'partial' | 'no_match';
  recordCount: number;
  sourceEndpoint: string;
  noMatchReason: string | null;
  records: ComplianceRecord[];
  checkedAt: string;
}

export interface Document {
  id: string;
  org_id: string;
  property_id: string | null;
  title: string;
  document_type: string;
  category: 'federal' | 'state' | 'local' | 'internal';
  jurisdiction: string;
  status: 'current' | 'outdated' | 'needs_review' | 'draft';
  content_markdown: string;
  content_html: string | null;
  storage_path: string | null;
  version: number;
  regulation_references: RegulationReference[];
  generated_by: 'ai' | 'manual' | 'template';
  reviewed_at: string | null;
  reviewed_by: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegulationReference {
  code: string;
  title: string;
  url: string;
}

export interface RegulatoryAlert {
  id: string;
  title: string;
  description: string;
  source_url: string | null;
  source_name: string | null;
  jurisdiction: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  effective_date: string | null;
  published_date: string | null;
  affects_document_types: string[];
  is_processed: boolean;
  created_at: string;
}

export interface OrgAlert {
  id: string;
  org_id: string;
  alert_id: string;
  status: 'unread' | 'read' | 'acted' | 'dismissed';
  created_at: string;
  alert?: RegulatoryAlert;
}

export interface DocumentTemplate {
  id: string;
  document_type: string;
  jurisdiction: string;
  title: string;
  description: string | null;
  prompt_template: string;
  regulation_references: RegulationReference[];
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  org_id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TeamMember {
  id: string;
  org_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invited_email: string | null;
  joined_at: string;
}
