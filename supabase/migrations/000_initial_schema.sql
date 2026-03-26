-- =============================================================================
-- RegLynx — Initial Schema (000)
-- Creates the core tables that all other migrations depend on.
--
-- Run this FIRST in Supabase SQL Editor (Project → SQL Editor → New query).
-- Safe to re-run: all statements use IF NOT EXISTS guards.
-- =============================================================================

-- ── Enable required extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Organizations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            text NOT NULL,
  owner_id        uuid NOT NULL,  -- references auth.users(id)
  industry        text NOT NULL DEFAULT 'property_management',
  entity_type     text,
  employee_count  int,
  unit_count      int,
  website         text,
  phone           text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  subscription_status    text NOT NULL DEFAULT 'trialing',
  subscription_plan      text NOT NULL DEFAULT 'starter',
  trial_ends_at          timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Properties ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  address_line1   text NOT NULL,
  address_line2   text,
  city            text NOT NULL,
  state           text NOT NULL,
  zip             text NOT NULL,
  county          text,
  country         text NOT NULL DEFAULT 'US',
  property_type   text NOT NULL DEFAULT 'residential_multifamily',
  unit_count      int NOT NULL DEFAULT 1,
  year_built      int,
  has_lead_paint  boolean NOT NULL DEFAULT false,
  has_pool        boolean NOT NULL DEFAULT false,
  has_elevator    boolean NOT NULL DEFAULT false,
  is_section8     boolean NOT NULL DEFAULT false,
  is_tax_credit   boolean NOT NULL DEFAULT false,
  internal_notes  text,
  -- Address normalization (added by 001)
  input_address       text,
  normalized_address  text,
  latitude            double precision,
  longitude           double precision,
  address_provider    text,
  address_confidence  real,
  -- Identity resolution (added by 005)
  jurisdiction_city   text,
  jurisdiction_county text,
  jurisdiction_state  text,
  national_property_id text,
  local_parcel_id     text,
  local_tax_id        text,
  provider_name       text,
  provider_confidence real,
  identity_provider   text,
  identity_confidence real,
  identity_resolved_at timestamptz,
  -- Archive support
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Documents ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id         uuid REFERENCES properties(id) ON DELETE SET NULL,
  title               text NOT NULL,
  document_type       text NOT NULL,
  category            text NOT NULL DEFAULT 'federal',
  jurisdiction        text NOT NULL DEFAULT 'federal',
  status              text NOT NULL DEFAULT 'draft',
  content_markdown    text NOT NULL DEFAULT '',
  content_html        text,
  storage_path        text,
  version             int NOT NULL DEFAULT 1,
  regulation_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_by        text NOT NULL DEFAULT 'ai',
  reviewed_at         timestamptz,
  reviewed_by         uuid,
  expires_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Document Templates ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_templates (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type       text NOT NULL,
  jurisdiction        text NOT NULL,
  title               text NOT NULL,
  description         text,
  prompt_template     text NOT NULL,
  regulation_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active           boolean NOT NULL DEFAULT true,
  version             int NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_type, jurisdiction)
);

-- ── Regulatory Alerts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regulatory_alerts (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 text NOT NULL,
  description           text NOT NULL DEFAULT '',
  source_url            text,
  source_name           text,
  jurisdiction          text NOT NULL DEFAULT 'federal',
  category              text NOT NULL DEFAULT 'general',
  severity              text NOT NULL DEFAULT 'info',
  effective_date        date,
  published_date        date,
  affects_document_types text[] NOT NULL DEFAULT '{}',
  is_processed          boolean NOT NULL DEFAULT false,
  compliance_item_id    uuid,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ── Org Alerts (junction: which orgs have seen which alerts) ────────────────
CREATE TABLE IF NOT EXISTS org_alerts (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_id    uuid NOT NULL REFERENCES regulatory_alerts(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'unread',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, alert_id)
);

-- ── Audit Log ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      uuid NOT NULL,
  user_id     uuid,
  action      text NOT NULL,
  entity_type text,
  entity_id   text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Team Members ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  role          text NOT NULL DEFAULT 'member',
  invited_email text,
  joined_at     timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_properties_org_id ON properties(org_id);
CREATE INDEX IF NOT EXISTS idx_properties_state ON properties(state);
CREATE INDEX IF NOT EXISTS idx_properties_city_state ON properties(city, state);
CREATE INDEX IF NOT EXISTS idx_properties_local_parcel_id ON properties(local_parcel_id) WHERE local_parcel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_archived ON properties(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_lat_lng ON properties(latitude, longitude) WHERE latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_org_id ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_property_id ON documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);

CREATE INDEX IF NOT EXISTS idx_regulatory_alerts_jurisdiction ON regulatory_alerts(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_regulatory_alerts_severity ON regulatory_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_org_alerts_org_id ON org_alerts(org_id);
CREATE INDEX IF NOT EXISTS idx_org_alerts_status ON org_alerts(status);

CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

CREATE INDEX IF NOT EXISTS idx_team_members_org_id ON team_members(org_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- ── Organizations: owner can CRUD ───────────────────────────────────────────
CREATE POLICY IF NOT EXISTS "org_owner_all" ON organizations
  FOR ALL USING (owner_id = auth.uid());

-- ── Properties: access via org ownership ────────────────────────────────────
CREATE POLICY IF NOT EXISTS "property_via_org" ON properties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = properties.org_id AND o.owner_id = auth.uid()
    )
  );

-- ── Documents: access via org ownership ─────────────────────────────────────
CREATE POLICY IF NOT EXISTS "document_via_org" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = documents.org_id AND o.owner_id = auth.uid()
    )
  );

-- ── Document Templates: read-only for all authenticated users ───────────────
CREATE POLICY IF NOT EXISTS "templates_read" ON document_templates
  FOR SELECT USING (true);

-- ── Regulatory Alerts: read-only for all authenticated users ────────────────
CREATE POLICY IF NOT EXISTS "alerts_read" ON regulatory_alerts
  FOR SELECT USING (true);

-- ── Org Alerts: access via org ownership ────────────────────────────────────
CREATE POLICY IF NOT EXISTS "org_alert_via_org" ON org_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = org_alerts.org_id AND o.owner_id = auth.uid()
    )
  );

-- ── Audit Log: access via org ownership ─────────────────────────────────────
CREATE POLICY IF NOT EXISTS "audit_via_org" ON audit_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = audit_log.org_id AND o.owner_id = auth.uid()
    )
  );

-- ── Team Members: access via org ownership ──────────────────────────────────
CREATE POLICY IF NOT EXISTS "team_via_org" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = team_members.org_id AND o.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- Verification: list all created tables
-- =============================================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
