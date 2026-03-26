-- =============================================================================
-- RegLynx — Complete Database Setup (Idempotent)
-- Paste into Supabase SQL Editor. Safe to run multiple times.
-- All statements use IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── organizations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   text        NOT NULL,
  owner_id               uuid        NOT NULL,
  industry               text        DEFAULT 'property_management',
  entity_type            text,
  employee_count         integer,
  unit_count             integer,
  website                text,
  phone                  text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  subscription_status    text        NOT NULL DEFAULT 'trialing',
  subscription_plan      text        NOT NULL DEFAULT 'starter',
  trial_ends_at          timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ── properties ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  address_line1    text        NOT NULL,
  address_line2    text,
  city             text        NOT NULL,
  state            text        NOT NULL,
  zip              text        NOT NULL,
  county           text,
  country          text        DEFAULT 'US',
  property_type    text        NOT NULL DEFAULT 'residential_multifamily',
  unit_count       integer     DEFAULT 1,
  year_built       integer,
  has_lead_paint   boolean     DEFAULT false,
  has_pool         boolean     DEFAULT false,
  has_elevator     boolean     DEFAULT false,
  is_section8      boolean     DEFAULT false,
  is_tax_credit    boolean     DEFAULT false,
  internal_notes   text,
  input_address    text,
  normalized_address text,
  latitude         numeric(10,7),
  longitude        numeric(10,7),
  address_provider text,
  address_confidence real,
  jurisdiction_city   text,
  jurisdiction_county text,
  jurisdiction_state  text,
  national_property_id text,
  local_parcel_id  text,
  local_tax_id     text,
  provider_name    text,
  provider_confidence numeric(4,3),
  identity_provider text,
  identity_confidence real,
  identity_resolved_at timestamptz,
  archived_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── documents ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id           uuid        REFERENCES properties(id) ON DELETE SET NULL,
  title                 text        NOT NULL,
  document_type         text        NOT NULL,
  category              text        NOT NULL DEFAULT 'federal',
  jurisdiction          text        NOT NULL DEFAULT 'federal',
  status                text        NOT NULL DEFAULT 'draft',
  content_markdown      text,
  content_html          text,
  storage_path          text,
  version               integer     DEFAULT 1,
  regulation_references jsonb       DEFAULT '[]'::jsonb,
  generated_by          text        DEFAULT 'ai',
  reviewed_at           timestamptz,
  reviewed_by           uuid,
  expires_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── document_templates ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_templates (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type         text        NOT NULL,
  jurisdiction          text        NOT NULL,
  title                 text        NOT NULL,
  description           text,
  prompt_template       text        NOT NULL,
  regulation_references jsonb       DEFAULT '[]'::jsonb,
  is_active             boolean     DEFAULT true,
  version               integer     DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_type, jurisdiction)
);

-- ── regulatory_alerts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regulatory_alerts (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title                  text        NOT NULL,
  description            text,
  source_url             text,
  source_name            text,
  jurisdiction           text        NOT NULL,
  category               text        NOT NULL DEFAULT 'general',
  severity               text        NOT NULL DEFAULT 'info',
  effective_date         date,
  published_date         date,
  affects_document_types jsonb       DEFAULT '[]'::jsonb,
  is_processed           boolean     DEFAULT false,
  compliance_item_id     uuid,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- ── org_alerts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_alerts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_id   uuid        NOT NULL REFERENCES regulatory_alerts(id) ON DELETE CASCADE,
  status     text        NOT NULL DEFAULT 'unread',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, alert_id)
);

-- ── audit_log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     uuid,
  action      text        NOT NULL,
  entity_type text,
  entity_id   text,
  metadata    jsonb       DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── team_members ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL,
  role          text        NOT NULL DEFAULT 'member',
  invited_email text,
  joined_at     timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. COMPLIANCE MONITORING TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── property_aliases ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_aliases (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id        uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  external_source_id text        NOT NULL,
  source_name        text        NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, source_name)
);

-- ── source_records ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS source_records (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  source_type    text        NOT NULL,
  source_name    text        NOT NULL,
  source_url     text,
  raw_data       jsonb       NOT NULL DEFAULT '{}',
  retrieved_at   timestamptz NOT NULL DEFAULT now(),
  effective_date date,
  UNIQUE (property_id, source_name, source_type, effective_date)
);

-- ── compliance_items ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_items (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  type                text        NOT NULL,
  label               text        NOT NULL,
  status              text        NOT NULL DEFAULT 'unknown',
  due_date            date,
  source_record_id    uuid        REFERENCES source_records(id) ON DELETE SET NULL,
  confidence_level    text        NOT NULL DEFAULT 'needs_review',
  notes               text,
  provenance          text        NOT NULL DEFAULT 'pending_source_verification',
  source_retrieved_at timestamptz,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, type)
);

-- ── status_snapshots ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS status_snapshots (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  org_id         uuid,
  overall_status text        NOT NULL,
  item_summary   jsonb       NOT NULL DEFAULT '{}',
  computed_at    timestamptz NOT NULL DEFAULT now()
);

-- ── reports ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NOT NULL,
  property_id  uuid        REFERENCES properties(id) ON DELETE SET NULL,
  report_type  text        NOT NULL DEFAULT 'monthly',
  generated_at timestamptz NOT NULL DEFAULT now(),
  file_url     text,
  summary_data jsonb       NOT NULL DEFAULT '{}'
);

-- ── leads ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text        NOT NULL,
  name           text,
  company        text,
  company_name   text,
  city           text,
  state          text,
  unit_count     text,
  property_count integer,
  message        text,
  source         text        DEFAULT 'early_access',
  status         text        NOT NULL DEFAULT 'new',
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── jurisdiction_coverage ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jurisdiction_coverage (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  country            text        NOT NULL DEFAULT 'US',
  state              text,
  city               text,
  jurisdiction_key   text        NOT NULL UNIQUE,
  coverage_status    text        NOT NULL DEFAULT 'unsupported',
  adapters_available jsonb       DEFAULT '[]'::jsonb,
  intake_enabled     boolean     DEFAULT true,
  billing_enabled    boolean     DEFAULT false,
  waitlist_enabled   boolean     DEFAULT false,
  notes              text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations (owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_org ON properties (org_id);
CREATE INDEX IF NOT EXISTS idx_properties_state ON properties (state);
CREATE INDEX IF NOT EXISTS idx_properties_city_state ON properties (city, state);
CREATE INDEX IF NOT EXISTS idx_properties_archived ON properties (archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_local_parcel_id ON properties (local_parcel_id) WHERE local_parcel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents (org_id);
CREATE INDEX IF NOT EXISTS idx_documents_property ON documents (property_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log (org_id);
CREATE INDEX IF NOT EXISTS idx_org_alerts_org ON org_alerts (org_id);
CREATE INDEX IF NOT EXISTS idx_source_records_property ON source_records (property_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_property ON compliance_items (property_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_status ON compliance_items (status);
CREATE INDEX IF NOT EXISTS idx_compliance_items_provenance ON compliance_items (provenance);
CREATE INDEX IF NOT EXISTS idx_status_snapshots_property ON status_snapshots (property_id);
CREATE INDEX IF NOT EXISTS idx_status_snapshots_computed ON status_snapshots (computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_org ON reports (org_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdiction_coverage ENABLE ROW LEVEL SECURITY;

-- Organizations: owner can do everything
DO $$ BEGIN
CREATE POLICY "org_owner_all" ON organizations
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Properties: org owner access
DO $$ BEGIN
CREATE POLICY "org_owner_properties" ON properties
  FOR ALL USING (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Documents: org owner access
DO $$ BEGIN
CREATE POLICY "org_owner_documents" ON documents
  FOR ALL USING (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Document templates: public read
DO $$ BEGIN
CREATE POLICY "templates_public_read" ON document_templates FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Regulatory alerts: public read
DO $$ BEGIN
CREATE POLICY "alerts_public_read" ON regulatory_alerts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Org alerts: org owner access
DO $$ BEGIN
CREATE POLICY "org_owner_org_alerts" ON org_alerts
  FOR ALL USING (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Audit log: org owner access
DO $$ BEGIN
CREATE POLICY "org_owner_audit_log" ON audit_log
  FOR ALL USING (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Team members: org owner access
DO $$ BEGIN
CREATE POLICY "org_owner_team" ON team_members
  FOR ALL USING (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Compliance tables: property-scoped access via org
DO $$ BEGIN
CREATE POLICY "org_access_property_aliases" ON property_aliases
  USING (property_id IN (SELECT p.id FROM properties p JOIN organizations o ON o.id = p.org_id WHERE o.owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "org_access_source_records" ON source_records
  USING (property_id IN (SELECT p.id FROM properties p JOIN organizations o ON o.id = p.org_id WHERE o.owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "org_access_compliance_items" ON compliance_items
  USING (property_id IN (SELECT p.id FROM properties p JOIN organizations o ON o.id = p.org_id WHERE o.owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "org_access_status_snapshots" ON status_snapshots
  USING (property_id IN (SELECT p.id FROM properties p JOIN organizations o ON o.id = p.org_id WHERE o.owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE POLICY "org_access_reports" ON reports
  USING (org_id IN (SELECT o.id FROM organizations o WHERE o.owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Leads: public insert, no public read
DO $$ BEGIN
CREATE POLICY "leads_insert_public" ON leads FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Jurisdiction coverage: public read
DO $$ BEGIN
CREATE POLICY "jurisdiction_coverage_public_read" ON jurisdiction_coverage FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. SEED: 11 Document Templates
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO document_templates (document_type, jurisdiction, title, description, prompt_template, regulation_references, is_active, version)
VALUES
  ('fair_housing_policy', 'federal', 'Federal Fair Housing Policy', 'Fair Housing Act compliance policy — federal jurisdiction.',
   'Draft a comprehensive Fair Housing Policy for {{org_name}}, a {{entity_type}} that manages {{unit_count}} units. Include all seven federally protected classes, prohibited conduct, reasonable accommodation obligations, complaint procedure, and staff acknowledgment section.',
   '[{"code":"42 U.S.C. §§ 3601-3619","title":"Fair Housing Act","url":"https://www.justice.gov/crt/fair-housing-act-1"}]', true, 1),

  ('fair_housing_policy', 'PA', 'Pennsylvania Fair Housing Policy', 'Fair Housing policy for Pennsylvania — includes PHRA protected classes.',
   'Draft a Fair Housing Policy for {{org_name}} in Pennsylvania. Include federal and Pennsylvania Human Relations Act protected classes, prohibited conduct under both laws, and PHRC referral procedure.',
   '[{"code":"43 P.S. §§ 951-963","title":"Pennsylvania Human Relations Act","url":"https://www.phrc.pa.gov/"}]', true, 1),

  ('fair_housing_policy', 'Philadelphia_PA', 'Philadelphia Fair Housing Policy', 'Fair Housing policy for Philadelphia — federal, PA, and city protected classes.',
   'Draft a Fair Housing Policy for {{org_name}} in Philadelphia, PA. Include federal, Pennsylvania, and Philadelphia Fair Practices Ordinance protected classes including source of income and Section 8.',
   '[{"code":"Philadelphia Code Chapter 9-1100","title":"Philadelphia Fair Practices Ordinance","url":"https://codelibrary.amlegal.com/codes/philadelphia/latest/philadelphia_pa/0-0-0-200094"}]', true, 1),

  ('lead_disclosure', 'federal', 'Lead-Based Paint Disclosure', 'EPA/HUD lead disclosure for pre-1978 properties.',
   'Draft a Lead-Based Paint Disclosure for {{org_name}} for {{property_name}} at {{property_address}}. Year built: {{year_built}}. Include lessor disclosure, EPA pamphlet acknowledgment, and signature section.',
   '[{"code":"42 U.S.C. § 4852d","title":"Residential Lead-Based Paint Hazard Reduction Act","url":"https://www.epa.gov/lead/residential-lead-based-paint-hazard-reduction-act-title-x-section-1018"}]', true, 1),

  ('lead_disclosure', 'PA', 'Pennsylvania Lead-Based Paint Disclosure', 'Lead disclosure for PA pre-1978 properties.',
   'Draft a Lead-Based Paint Disclosure for {{org_name}} for {{property_name}} at {{property_address}} in Pennsylvania. Include federal and PA Lead Certification Act requirements.',
   '[{"code":"35 P.S. § 5901","title":"PA Lead Certification Act","url":"https://www.health.pa.gov/topics/Environmental/Lead/Pages/Lead.aspx"}]', true, 1),

  ('lead_disclosure', 'Philadelphia_PA', 'Philadelphia Lead-Based Paint Disclosure', 'Lead disclosure for Philadelphia pre-1978 properties.',
   'Draft a Lead-Based Paint Disclosure for {{org_name}} for {{property_name}} at {{property_address}} in Philadelphia. Include federal, PA, and Philadelphia Bill No. 200725 requirements.',
   '[{"code":"Bill No. 200725","title":"Philadelphia Lead Disclosure Law","url":"https://www.phila.gov/programs/lead-and-healthy-homes-program/"}]', true, 1),

  ('emergency_action_plan', 'federal', 'Emergency Action Plan (OSHA)', 'OSHA-compliant EAP for property management.',
   'Draft an Emergency Action Plan for {{org_name}} operating {{unit_count}} units. Include OSHA-required emergency reporting, escape routes, employee accounting, alarm systems, and training.',
   '[{"code":"29 CFR 1910.38","title":"Emergency Action Plans","url":"https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.38"}]', true, 1),

  ('ada_policy', 'federal', 'ADA Compliance Policy', 'ADA compliance policy for property management.',
   'Draft an ADA Compliance Policy for {{org_name}} managing {{unit_count}} units. Include reasonable accommodation and modification obligations, grievance procedure, and ADA Coordinator designation.',
   '[{"code":"42 U.S.C. § 12101","title":"Americans with Disabilities Act","url":"https://www.ada.gov/law-and-regs/ada/"}]', true, 1),

  ('landlord_tenant_rights', 'PA', 'Pennsylvania Landlord-Tenant Rights Disclosure', 'PA landlord-tenant law disclosure.',
   'Draft a Pennsylvania Landlord-Tenant Rights Disclosure for {{org_name}} for {{property_name}} at {{property_address}}. Cover security deposits, habitability warranty, notice requirements, and eviction procedures.',
   '[{"code":"68 P.S. §§ 250.101-250.602","title":"PA Landlord and Tenant Act of 1951","url":"https://www.legis.state.pa.us/"}]', true, 1),

  ('phila_rental_license', 'Philadelphia_PA', 'Philadelphia Rental License Compliance Checklist', 'Philadelphia rental license and inspection requirements.',
   'Draft a Philadelphia Rental License Compliance Checklist for {{org_name}} at {{property_address}}. Cover Rental License, Certificate of Rental Suitability, Property Maintenance Code, and inspection requirements.',
   '[{"code":"Philadelphia Code § 9-3901","title":"Rental License Requirement","url":"https://www.phila.gov/services/permits-violations-licenses/get-a-license/business-licenses/rental-property/"}]', true, 1),

  ('phila_lead_safe', 'Philadelphia_PA', 'Philadelphia Lead Safe Certification Compliance', 'Philadelphia lead-safe certification for pre-1978 units.',
   'Draft a Philadelphia Lead Safe Certification Compliance document for {{org_name}} for {{property_name}} at {{property_address}} built {{year_built}}. Cover certification requirements, inspections, record-keeping, and penalties.',
   '[{"code":"Bill No. 200725","title":"Philadelphia Lead Disclosure and Certification Law","url":"https://www.phila.gov/programs/lead-and-healthy-homes-program/"}]', true, 1)

ON CONFLICT (document_type, jurisdiction) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'Tables created:' AS info, count(*) AS count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'organizations', 'properties', 'documents', 'document_templates',
    'regulatory_alerts', 'org_alerts', 'audit_log', 'team_members',
    'compliance_items', 'source_records', 'status_snapshots',
    'leads', 'property_aliases', 'reports', 'jurisdiction_coverage'
  );

SELECT 'Document templates seeded:' AS info, count(*) AS count
FROM document_templates;
